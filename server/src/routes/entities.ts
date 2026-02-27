import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logChange, logIntervalPause } from '../services/historyService.js';

function generateBatchId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const router = Router();

// Get all entities (filtered by user permissions)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let entities;

    if (userRole === 'ADMIN' || userRole === 'MAILER') {
      // Admin and Mailer can see all entities
      entities = await prisma.entity.findMany({
        orderBy: { name: 'asc' }
      });
    } else {
      // Regular users can only see entities they have access to
      const userWithAccess = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          accessibleEntities: {
            include: {
              entity: true
            }
          }
        }
      });

      if (!userWithAccess) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Extract entities from the access records
      entities = userWithAccess.accessibleEntities.map(access => access.entity);
      // Sort by name
      entities.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Parse JSON data for each entity
    const entitiesWithData = entities.map(entity => ({
      ...entity,
      ...JSON.parse(entity.data)
    }));

    res.json(entitiesWithData);
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Get single entity
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const entity = await prisma.entity.findUnique({
      where: { id }
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Access check: USER role must have explicit access
    if (userRole === 'USER') {
      const hasAccess = await prisma.entityAccess.findUnique({
        where: {
          userId_entityId: {
            userId: userId,
            entityId: id
          }
        }
      });

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this entity' });
      }
    }
    // ADMIN and MAILER can access any entity without explicit permission

    const entityWithData = {
      ...entity,
      ...JSON.parse(entity.data)
    };

    // Log the status values being returned
    console.log('[Backend GET] Entity categories status:', entityWithData.reporting?.parentCategories?.map((c: any) => ({
      name: c.name,
      status: c.planConfiguration?.status
    })));

    res.json(entityWithData);
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

// Create entity (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, status, reporting, limitsConfiguration, notes, noteCards, enabledMethods, methodsData, botConfig } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    // Enforce ID format: ent_{name} (lowercase, spaces replaced by underscores)
    const id = `ent_${name.toLowerCase().trim().replace(/\s+/g, '_')}`;

    // Check if entity with this ID already exists
    const existingEntity = await prisma.entity.findUnique({
      where: { id }
    });

    if (existingEntity) {
      return res.status(400).json({ error: 'An entity with this name already exists' });
    }

    const entityData = {
      status: status || 'active',
      reporting,
      limitsConfiguration,
      notes: notes || '',
      noteCards: noteCards || [],
      enabledMethods: enabledMethods || ['desktop'],
      methodsData: methodsData || {},
      botConfig: botConfig || { token: '', chatId: '' }
    };

    const entity = await prisma.entity.create({
      data: {
        id,
        name,
        data: JSON.stringify(entityData)
      }
    });

    // Log the creation
    await logChange(req, {
      entityId: id,
      entityType: 'entity',
      changeType: 'create',
      description: `Created entity "${name}"`,
      newValue: entityData
    });

    res.json({
      ...entity,
      ...JSON.parse(entity.data)
    });
  } catch (error: any) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: error.message || 'Failed to create entity' });
  }
});

// Update entity
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { name, status, reporting, limitsConfiguration, notes, noteCards, enabledMethods, methodsData, botConfig } = req.body;
    
    // DEBUG LOGGING
    if (reporting && reporting.parentCategories) {
      reporting.parentCategories.forEach((cat: any) => {
        console.log(`[UPDATE] Category ${cat.name} Status:`, cat.planConfiguration?.status);
      });
    }

    // Check permissions
    if (userRole === 'USER') {
      // Check if user has access to this entity
      const hasAccess = await prisma.entityAccess.findUnique({
        where: {
          userId_entityId: {
            userId: userId,
            entityId: id
          }
        }
      });

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this entity' });
      }

      // Users can only update reporting plan
      // Fetch existing entity to preserve other fields
      const existingEntity = await prisma.entity.findUnique({
        where: { id }
      });

      if (!existingEntity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      const existingData = JSON.parse(existingEntity.data);
      
      const entityData = {
        ...existingData,
        reporting // Only allow updating reporting
      };

      const entity = await prisma.entity.update({
        where: { id },
        data: {
          // Name cannot be changed by USER
          data: JSON.stringify(entityData)
        }
      });
      
      // Log the update
      await logChange(req, {
        entityId: id,
        entityType: 'entity',
        changeType: 'update',
        fieldChanged: 'reporting',
        description: `Updated reporting configuration for "${existingEntity.name}"`,
        oldValue: existingData.reporting,
        newValue: reporting
      });
      
      return res.json({
        ...entity,
        ...JSON.parse(entity.data)
      });
    }

    // ADMIN and MAILER have full update access
    // Get existing data for comparison
    const existingEntity = await prisma.entity.findUnique({ where: { id } });
    const existingData = existingEntity ? JSON.parse(existingEntity.data) : {};
    
    console.log('[Backend] Received reporting data:', JSON.stringify(reporting.parentCategories.map((c: any) => ({
      name: c.name,
      status: c.planConfiguration?.status
    })), null, 2));
    
    const entityData = {
      status: status || 'active',
      reporting,
      limitsConfiguration,
      notes: notes !== undefined ? notes : (existingData.notes || ''),
      noteCards: noteCards !== undefined ? noteCards : (existingData.noteCards || []),
      enabledMethods: enabledMethods !== undefined ? enabledMethods : (existingData.enabledMethods || ['desktop']),
      methodsData: methodsData !== undefined ? methodsData : (existingData.methodsData || {}),
      botConfig: botConfig !== undefined ? botConfig : (existingData.botConfig || { token: '', chatId: '' })
    };

    const entity = await prisma.entity.update({
      where: { id },
      data: {
        name,
        data: JSON.stringify(entityData)
      }
    });
    
    console.log('[Backend] Saved entity data:', JSON.stringify(JSON.parse(entity.data).reporting.parentCategories.map((c: any) => ({
      name: c.name,
      status: c.planConfiguration?.status
    })), null, 2));

    // Determine what changed
    // Determine what changed and log granularly
    const batchId = generateBatchId();
    
    // 1. Check Reporting (Default Method)
    if (reporting && existingData.reporting && reporting.parentCategories) {
      const oldCats = existingData.reporting.parentCategories || [];
      const newCats = reporting.parentCategories || [];

      for (const newCat of newCats) {
        const oldCat = oldCats.find((c: any) => c.id === newCat.id);
        if (oldCat) {
          // Compare planConfiguration
          const newPlan = newCat.planConfiguration;
          const oldPlan = oldCat.planConfiguration;
          
          if (newPlan && oldPlan) {
            // 1. Check simple fields
            const simpleFields = ['status', 'mode', 'scriptName', 'scenario'];
            for (const field of simpleFields) {
              if (newPlan[field] !== oldPlan[field]) {
                await logChange(req, {
                  entityId: id,
                  entityType: 'reporting',
                  changeType: 'update',
                  fieldChanged: field,
                  categoryId: newCat.id,
                  categoryName: newCat.name,
                  methodId: 'desktop',
                  description: `Changed ${field} for "${newCat.name}" (Desktop)`,
                  oldValue: oldPlan[field],
                  newValue: newPlan[field],
                  batchId
                });
              }
            }

            // 2. Check Drops (Granular)
            if (newPlan.drops && oldPlan.drops) {
              // Assuming drops are ordered or can be matched by ID
              const maxDrops = Math.max(newPlan.drops.length, oldPlan.drops.length);
              for (let i = 0; i < maxDrops; i++) {
                const newDrop = newPlan.drops[i];
                const oldDrop = oldPlan.drops[i];

                if (!oldDrop && newDrop) {
                   await logChange(req, {
                    entityId: id,
                    entityType: 'reporting',
                    changeType: 'create',
                    fieldChanged: `drop[${i}]`,
                    categoryId: newCat.id,
                    categoryName: newCat.name,
                    methodId: 'desktop',
                    description: `Added Drop ${i+1} for "${newCat.name}"`,
                    newValue: newDrop,
                    batchId
                  });
                } else if (oldDrop && !newDrop) {
                   await logChange(req, {
                    entityId: id,
                    entityType: 'reporting',
                    changeType: 'delete',
                    fieldChanged: `drop[${i}]`,
                    categoryId: newCat.id,
                    categoryName: newCat.name,
                    methodId: 'desktop',
                    description: `Removed Drop ${i+1} for "${newCat.name}"`,
                    oldValue: oldDrop,
                    batchId
                  });
                } else if (oldDrop && newDrop) {
                  if (oldDrop.value !== newDrop.value) {
                    await logChange(req, {
                      entityId: id,
                      entityType: 'reporting',
                      changeType: 'update',
                      fieldChanged: `drop[${i}].value`,
                      categoryId: newCat.id,
                      categoryName: newCat.name,
                      methodId: 'desktop',
                      description: `Changed Drop ${i+1} value for "${newCat.name}"`,
                      oldValue: oldDrop.value,
                      newValue: newDrop.value,
                      batchId
                    });
                  }
                  if (oldDrop.time !== newDrop.time) {
                    await logChange(req, {
                      entityId: id,
                      entityType: 'reporting',
                      changeType: 'update',
                      fieldChanged: `drop[${i}].time`,
                      categoryId: newCat.id,
                      categoryName: newCat.name,
                      methodId: 'desktop',
                      description: `Changed Drop ${i+1} time for "${newCat.name}"`,
                      oldValue: oldDrop.time,
                      newValue: newDrop.time,
                      batchId
                    });
                  }
                }
              }
            }

            // 3. Check TimeConfig
            if (newPlan.timeConfig && oldPlan.timeConfig) {
               if (newPlan.timeConfig.startTime !== oldPlan.timeConfig.startTime) {
                  await logChange(req, {
                    entityId: id,
                    entityType: 'reporting',
                    changeType: 'update',
                    fieldChanged: 'startTime',
                    categoryId: newCat.id,
                    categoryName: newCat.name,
                    methodId: 'desktop',
                    description: `Changed Start Time for "${newCat.name}"`,
                    oldValue: oldPlan.timeConfig.startTime,
                    newValue: newPlan.timeConfig.startTime,
                    batchId
                  });
               }
            }
          }
        }
      }
    }

    // 2. Check Methods Data
    if (methodsData && existingData.methodsData) {
      for (const [methodId, methodData] of Object.entries(methodsData)) {
        const oldMethodData = existingData.methodsData[methodId];
        if (!oldMethodData) continue;

        // @ts-ignore
        const newCats = methodData.parentCategories || [];
        // @ts-ignore
        const oldCats = oldMethodData.parentCategories || [];

        for (const newCat of newCats) {
          const oldCat = oldCats.find((c: any) => c.id === newCat.id);
          if (oldCat) {
             const newPlan = newCat.planConfiguration;
             const oldPlan = oldCat.planConfiguration;
             
             if (newPlan && oldPlan) {
               // 1. Check simple fields
               const simpleFields = ['status', 'mode', 'scriptName', 'scenario'];
               for (const field of simpleFields) {
                 if (newPlan[field] !== oldPlan[field]) {
                   await logChange(req, {
                     entityId: id,
                     entityType: 'reporting',
                     changeType: 'update',
                     fieldChanged: field,
                     categoryId: newCat.id,
                     categoryName: newCat.name,
                     methodId: methodId,
                     description: `Changed ${field} for "${newCat.name}" (${methodId})`,
                     oldValue: oldPlan[field],
                     newValue: newPlan[field],
                     batchId
                   });
                 }
               }

               // 2. Check Drops (Granular)
               if (newPlan.drops && oldPlan.drops) {
                 const maxDrops = Math.max(newPlan.drops.length, oldPlan.drops.length);
                 for (let i = 0; i < maxDrops; i++) {
                   const newDrop = newPlan.drops[i];
                   const oldDrop = oldPlan.drops[i];

                   if (!oldDrop && newDrop) {
                      await logChange(req, {
                       entityId: id,
                       entityType: 'reporting',
                       changeType: 'create',
                       fieldChanged: `drop[${i}]`,
                       categoryId: newCat.id,
                       categoryName: newCat.name,
                       methodId: methodId,
                       description: `Added Drop ${i+1} for "${newCat.name}" (${methodId})`,
                       newValue: newDrop,
                       batchId
                     });
                   } else if (oldDrop && !newDrop) {
                      await logChange(req, {
                       entityId: id,
                       entityType: 'reporting',
                       changeType: 'delete',
                       fieldChanged: `drop[${i}]`,
                       categoryId: newCat.id,
                       categoryName: newCat.name,
                       methodId: methodId,
                       description: `Removed Drop ${i+1} for "${newCat.name}" (${methodId})`,
                       oldValue: oldDrop,
                       batchId
                     });
                   } else if (oldDrop && newDrop) {
                     if (oldDrop.value !== newDrop.value) {
                       await logChange(req, {
                         entityId: id,
                         entityType: 'reporting',
                         changeType: 'update',
                         fieldChanged: `drop[${i}].value`,
                         categoryId: newCat.id,
                         categoryName: newCat.name,
                         methodId: methodId,
                         description: `Changed Drop ${i+1} value for "${newCat.name}" (${methodId})`,
                         oldValue: oldDrop.value,
                         newValue: newDrop.value,
                         batchId
                       });
                     }
                     if (oldDrop.time !== newDrop.time) {
                       await logChange(req, {
                         entityId: id,
                         entityType: 'reporting',
                         changeType: 'update',
                         fieldChanged: `drop[${i}].time`,
                         categoryId: newCat.id,
                         categoryName: newCat.name,
                         methodId: methodId,
                         description: `Changed Drop ${i+1} time for "${newCat.name}" (${methodId})`,
                         oldValue: oldDrop.time,
                         newValue: newDrop.time,
                         batchId
                       });
                     }
                   }
                 }
               }

               // 3. Check TimeConfig
               if (newPlan.timeConfig && oldPlan.timeConfig) {
                  if (newPlan.timeConfig.startTime !== oldPlan.timeConfig.startTime) {
                     await logChange(req, {
                       entityId: id,
                       entityType: 'reporting',
                       changeType: 'update',
                       fieldChanged: 'startTime',
                       categoryId: newCat.id,
                       categoryName: newCat.name,
                       methodId: methodId,
                       description: `Changed Start Time for "${newCat.name}" (${methodId})`,
                       oldValue: oldPlan.timeConfig.startTime,
                       newValue: newPlan.timeConfig.startTime,
                       batchId
                     });
                  }
               }
             }
          }
        }
      }
    }

    // 4. Check Limits Configuration (Legacy & Methods Data)
    const logLimitChanges = async (methodId: string, newLimits: any[], oldLimits: any[], currentReporting: any) => {
      const getCatName = (catId: string) => {
        if (!currentReporting || !currentReporting.parentCategories) return null;
        const cat = currentReporting.parentCategories.find((c: any) => c.id === catId);
        return cat ? cat.name : null;
      };

      for (const newLimit of newLimits) {
        const oldLimit = oldLimits.find((l: any) =>
          l.profileName === newLimit.profileName &&
          (l.categoryId === newLimit.categoryId || (!l.categoryId && !newLimit.categoryId))
        );

        if (oldLimit) {
          const intervalFields = ['intervalsQuality', 'intervalsPausedSearch', 'intervalsToxic', 'intervalsOther', 'limitActiveSession'];
          for (const field of intervalFields) {
            if (newLimit[field] !== oldLimit[field]) {
              // Log to general audit
              await logChange(req, {
                entityId: id,
                entityType: 'limits',
                changeType: 'update',
                fieldChanged: field,
                methodId,
                categoryId: newLimit.categoryId,
                categoryName: getCatName(newLimit.categoryId),
                profileName: newLimit.profileName,
                description: `Changed ${field} for "${newLimit.profileName}" (${methodId})`,
                oldValue: oldLimit[field],
                newValue: newLimit[field],
                batchId
              });

              // Log to specialized interval history (if it's an interval field)
              if (field.startsWith('intervals')) {
                let action = 'UPDATE';
                if (oldLimit[field] === 'NO' && newLimit[field] !== 'NO') action = 'PAUSE';
                if (oldLimit[field] !== 'NO' && newLimit[field] === 'NO') action = 'UNPAUSE';

                await logIntervalPause(req, {
                  entityId: id,
                  methodId,
                  categoryId: newLimit.categoryId,
                  categoryName: getCatName(newLimit.categoryId),
                  profileName: newLimit.profileName,
                  pauseType: field.replace('intervals', ''),
                  interval: newLimit[field] || 'NO',
                  action
                });
              }
            }
          }
        } else if (newLimit.intervalsQuality || newLimit.intervalsPausedSearch || newLimit.intervalsToxic || newLimit.intervalsOther) {
          await logChange(req, {
            entityId: id,
            entityType: 'limits',
            changeType: 'create',
            methodId,
            categoryId: newLimit.categoryId,
            categoryName: getCatName(newLimit.categoryId),
            profileName: newLimit.profileName,
            description: `Added limits configuration for "${newLimit.profileName}" (${methodId})`,
            newValue: newLimit,
            batchId
          });
          
          // Log initial pauses if any
          const intervalFields = ['intervalsQuality', 'intervalsPausedSearch', 'intervalsToxic', 'intervalsOther'];
          for (const field of intervalFields) {
            if (newLimit[field] && newLimit[field] !== 'NO') {
              await logIntervalPause(req, {
                entityId: id,
                methodId,
                categoryId: newLimit.categoryId,
                categoryName: getCatName(newLimit.categoryId),
                profileName: newLimit.profileName,
                pauseType: field.replace('intervals', ''),
                interval: newLimit[field],
                action: 'PAUSE'
              });
            }
          }
        }
      }
    };

    // Check legacy limits
    if (limitsConfiguration && existingData.limitsConfiguration) {
      await logLimitChanges('desktop', limitsConfiguration, existingData.limitsConfiguration, reporting);
    }

    // Check methodsData limits
    if (methodsData && existingData.methodsData) {
      for (const [mId, mData] of Object.entries(methodsData)) {
        const oldMData = existingData.methodsData[mId];
        if (oldMData && (mData as any).limitsConfiguration && oldMData.limitsConfiguration) {
          await logLimitChanges(mId, (mData as any).limitsConfiguration, oldMData.limitsConfiguration, (mData as any).reporting || reporting);
        }
      }
    }

    // 5. Check Note Cards
    if (noteCards !== undefined && existingData.noteCards) {
      const oldNotes = existingData.noteCards || [];
      const newNotes = noteCards || [];
      
      // Check for updates and removals
      for (const oldNote of oldNotes) {
        const newNote = newNotes.find((n: any) => n.id === oldNote.id);
        if (!newNote) {
          await logChange(req, {
            entityId: id,
            entityType: 'notes',
            changeType: 'delete',
            fieldChanged: 'Note Card',
            description: `Removed note: "${oldNote.title || 'Untitled'}"`,
            oldValue: oldNote,
            batchId
          });
        } else if (oldNote.content !== newNote.content || oldNote.title !== newNote.title || oldNote.color !== newNote.color) {
          await logChange(req, {
            entityId: id,
            entityType: 'notes',
            changeType: 'update',
            fieldChanged: 'Note Card',
            description: `Updated note: "${newNote.title || 'Untitled'}"`,
            oldValue: oldNote,
            newValue: newNote,
            batchId
          });
        }
      }
      
      // Check for additions
      for (const newNote of newNotes) {
        const oldNote = oldNotes.find((n: any) => n.id === newNote.id);
        if (!oldNote) {
          await logChange(req, {
            entityId: id,
            entityType: 'notes',
            changeType: 'create',
            fieldChanged: 'Note Card',
            description: `Added new note: "${newNote.title || 'Untitled'}"`,
            newValue: newNote,
            batchId
          });
        }
      }
    }

    // 6. Check Top Level Fields
    let topLevelChanges = [];
    if (existingData.notes !== notes) topLevelChanges.push('notes');
    if (existingData.status !== status) topLevelChanges.push('status');
    if (existingEntity?.name !== name) topLevelChanges.push('name');

    if (topLevelChanges.length > 0) {
       await logChange(req, {
        entityId: id,
        entityType: 'entity',
        changeType: 'update',
        fieldChanged: topLevelChanges.join(', '),
        description: `Updated ${topLevelChanges.join(', ')} for "${name}"`,
        oldValue: existingData, // Keep full object for top level for now
        newValue: entityData,
        batchId
      });
    }

    res.json({
      ...entity,
      ...JSON.parse(entity.data)
    });
  } catch (error: any) {
    console.error('Update entity error:', error);
    res.status(500).json({ error: error.message || 'Failed to update entity' });
  }
});

// Delete entity (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get entity name before deletion
    const entity = await prisma.entity.findUnique({ where: { id } });
    const entityName = entity?.name || id;

    await prisma.entity.delete({
      where: { id }
    });

    // Log the deletion
    await logChange(req, {
      entityId: id,
      entityType: 'entity',
      changeType: 'delete',
      description: `Deleted entity "${entityName}"`,
      oldValue: entity ? JSON.parse(entity.data) : null
    });

    res.json({ message: 'Entity deleted successfully' });
  } catch (error) {
    console.error('Delete entity error:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

export default router;
