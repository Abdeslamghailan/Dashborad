import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';

const router = Router();

// Get day plan for an entity on a specific date
router.get('/:entityId/:date', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityId, date } = req.params;
    
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    
    const dayPlans = await prisma.dayPlan.findMany({
      where: {
        entityId,
        date: dateObj
      }
    });
    
    // Convert to a map by categoryId
    const planMap: Record<string, Record<number, { step: number; start: number }>> = {};
    dayPlans.forEach(plan => {
      planMap[plan.categoryId] = JSON.parse(plan.sessionData);
    });
    
    res.json(planMap);
  } catch (error) {
    console.error('Get day plan error:', error);
    res.status(500).json({ error: 'Failed to fetch day plan' });
  }
});

// Save/update day plan for an entity
router.post('/:entityId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Only ADMIN and MAILER can modify day plans
    if (userRole === 'USER') {
      return res.status(403).json({ error: 'Users can only view day plans' });
    }
    
    const { date, categoryId, sessionData } = req.body;
    
    if (!date || !categoryId || !sessionData) {
      return res.status(400).json({ error: 'Missing required fields: date, categoryId, sessionData' });
    }
    
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    
    // Fetch old plan for history
    const oldDayPlan = await prisma.dayPlan.findUnique({
      where: {
        entityId_categoryId_date: {
          entityId,
          categoryId,
          date: dateObj
        }
      }
    });

    // Upsert the day plan
    const dayPlan = await prisma.dayPlan.upsert({
      where: {
        entityId_categoryId_date: {
          entityId,
          categoryId,
          date: dateObj
        }
      },
      update: {
        sessionData: JSON.stringify(sessionData),
        updatedBy: userId,
        updatedAt: new Date()
      },
      create: {
        entityId,
        categoryId,
        date: dateObj,
        sessionData: JSON.stringify(sessionData),
        createdBy: userId,
        updatedBy: userId
      }
    });
    

    
    // Only log if data changed or it's a new record
    const oldSessionDataStr = oldDayPlan?.sessionData || '';
    const newSessionDataStr = JSON.stringify(sessionData);

    if (!oldDayPlan || oldSessionDataStr !== newSessionDataStr) {
      await logChange(req, {
        entityType: 'DayPlan',
        entityId: entityId,
        changeType: 'update',
        fieldChanged: 'Day Plan',
        description: `Updated day plan for entity ${entityId}, category ${categoryId}, date ${date}`,
        oldValue: oldDayPlan,
        newValue: dayPlan
      });
    }

    res.json(dayPlan);
  } catch (error) {
    console.error('Save day plan error:', error);
    res.status(500).json({ error: 'Failed to save day plan' });
  }
});

// Bulk save day plans (for saving multiple categories at once)
router.post('/:entityId/bulk', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Only ADMIN and MAILER can modify day plans
    if (userRole === 'USER') {
      return res.status(403).json({ error: 'Users can only view day plans' });
    }
    
    const { date, plans } = req.body; // plans: { [categoryId]: { [sessionIdx]: { step, start } } }
    
    if (!date || !plans) {
      return res.status(400).json({ error: 'Missing required fields: date, plans' });
    }
    
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    
    const results = [];
    
    for (const [categoryId, sessionData] of Object.entries(plans)) {
      // Fetch old plan for history
      const oldDayPlan = await prisma.dayPlan.findUnique({
        where: {
          entityId_categoryId_date: {
            entityId,
            categoryId,
            date: dateObj
          }
        }
      });

      const dayPlan = await prisma.dayPlan.upsert({
        where: {
          entityId_categoryId_date: {
            entityId,
            categoryId,
            date: dateObj
          }
        },
        update: {
          sessionData: JSON.stringify(sessionData),
          updatedBy: userId,
          updatedAt: new Date()
        },
        create: {
          entityId,
          categoryId,
          date: dateObj,
          sessionData: JSON.stringify(sessionData),
          createdBy: userId,
          updatedBy: userId
        }
      });
      
      // Only log if data changed or it's a new record
      const oldSessionDataStr = oldDayPlan?.sessionData || '';
      const newSessionDataStr = JSON.stringify(sessionData);

      if (!oldDayPlan || oldSessionDataStr !== newSessionDataStr) {
        await logChange(req, {
          entityType: 'DayPlan',
          entityId: entityId,
          changeType: 'update',
          fieldChanged: 'Day Plan',
          description: `Updated day plan for entity ${entityId}, category ${categoryId}, date ${date}`,
          oldValue: oldDayPlan,
          newValue: dayPlan
        });
      }

      results.push(dayPlan);
    }
    
    res.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Bulk save day plan error:', error);
    res.status(500).json({ error: 'Failed to save day plans' });
  }
});

// Delete day plan for a specific category
router.delete('/:entityId/:categoryId/:date', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { entityId, categoryId, date } = req.params;
    const userRole = req.user!.role;
    
    // Only ADMIN and MAILER can delete day plans
    if (userRole === 'USER') {
      return res.status(403).json({ error: 'Users can only view day plans' });
    }
    
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    
    // Fetch old plan for history
    const oldDayPlan = await prisma.dayPlan.findUnique({
      where: {
        entityId_categoryId_date: {
          entityId,
          categoryId,
          date: dateObj
        }
      }
    });

    await prisma.dayPlan.delete({
      where: {
        entityId_categoryId_date: {
          entityId,
          categoryId,
          date: dateObj
        }
      }
    });
    

    
    await logChange(req, {
      entityType: 'DayPlan',
      entityId: entityId,
      changeType: 'delete',
      description: `Deleted day plan for entity ${entityId}, category ${categoryId}, date ${date}`,
      oldValue: oldDayPlan
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete day plan error:', error);
    res.status(500).json({ error: 'Failed to delete day plan' });
  }
});

export default router;
