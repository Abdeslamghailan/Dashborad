import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';
const router = Router();
// Get all entities (filtered by user permissions)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        let entities;
        if (userRole === 'ADMIN' || userRole === 'MAILER') {
            // Admin and Mailer can see all entities
            entities = await prisma.entity.findMany({
                orderBy: { name: 'asc' }
            });
        }
        else {
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
    }
    catch (error) {
        console.error('Get entities error:', error);
        res.status(500).json({ error: 'Failed to fetch entities' });
    }
});
// Get single entity
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
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
        res.json(entityWithData);
    }
    catch (error) {
        console.error('Get entity error:', error);
        res.status(500).json({ error: 'Failed to fetch entity' });
    }
});
// Create entity (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, status, reporting, limitsConfiguration, notes } = req.body;
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
            notes: notes || ''
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
    }
    catch (error) {
        console.error('Create entity error:', error);
        res.status(500).json({ error: 'Failed to create entity' });
    }
});
// Update entity
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { name, status, reporting, limitsConfiguration, notes } = req.body;
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
        const entityData = {
            status: status || 'active',
            reporting,
            limitsConfiguration,
            notes: notes !== undefined ? notes : ''
        };
        const entity = await prisma.entity.update({
            where: { id },
            data: {
                name,
                data: JSON.stringify(entityData)
            }
        });
        // Determine what changed
        let changedFields = [];
        if (JSON.stringify(existingData.reporting) !== JSON.stringify(reporting))
            changedFields.push('reporting');
        if (JSON.stringify(existingData.limitsConfiguration) !== JSON.stringify(limitsConfiguration))
            changedFields.push('limits');
        if (existingData.notes !== notes)
            changedFields.push('notes');
        if (existingData.status !== status)
            changedFields.push('status');
        if (existingEntity?.name !== name)
            changedFields.push('name');
        // Log the update
        await logChange(req, {
            entityId: id,
            entityType: 'entity',
            changeType: 'update',
            fieldChanged: changedFields.join(', '),
            description: `Updated ${changedFields.join(', ')} for "${name}"`,
            oldValue: existingData,
            newValue: entityData
        });
        res.json({
            ...entity,
            ...JSON.parse(entity.data)
        });
    }
    catch (error) {
        console.error('Update entity error:', error);
        res.status(500).json({ error: 'Failed to update entity' });
    }
});
// Delete entity (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
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
    }
    catch (error) {
        console.error('Delete entity error:', error);
        res.status(500).json({ error: 'Failed to delete entity' });
    }
});
export default router;
