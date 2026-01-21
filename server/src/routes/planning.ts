import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';

const router = Router();
// const prisma = new PrismaClient(); // Removed local instance

// Helper function to check if user is admin or mailer
// Helper function to check if user is admin or mailer
const isAdminOrMailer = (req: AuthRequest) => {
  return req.user && (req.user.role === 'ADMIN' || req.user.role === 'MAILER');
};

const isAdmin = (req: AuthRequest) => {
  return req.user && req.user.role === 'ADMIN';
};

// Get all teams with their mailers
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        mailers: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Create a new team (Admin only)
router.post('/teams', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, displayName, order, color } = req.body;
    const team = await prisma.team.create({
      data: { name, displayName, order: order || 0, color }
    });
    
    await logChange(req, {
      entityType: 'Team',
      entityId: team.id,
      changeType: 'create',
      description: `Created team "${name}"`,
      newValue: team
    });

    res.json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update a team (Admin only)
router.put('/teams/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, displayName, order, color } = req.body;
    const team = await prisma.team.update({
      where: { id },
      data: { name, displayName, order, color }
    });

    await logChange(req, {
      entityType: 'Team',
      entityId: team.id,
      changeType: 'update',
      description: `Updated team "${name}"`,
      newValue: team
    });

    res.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete a team (Admin only)
router.delete('/teams/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.team.delete({ where: { id } });

    await logChange(req, {
      entityType: 'Team',
      entityId: id,
      changeType: 'delete',
      description: `Deleted team ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Get all mailers
router.get('/mailers', authenticateToken, async (req, res) => {
  try {
    const mailers = await prisma.mailer.findMany({
      include: { team: true },
      orderBy: [{ team: { order: 'asc' } }, { order: 'asc' }]
    });
    res.json(mailers);
  } catch (error) {
    console.error('Error fetching mailers:', error);
    res.status(500).json({ error: 'Failed to fetch mailers' });
  }
});

// Create a new mailer (Admin only)
router.post('/mailers', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, teamId, order } = req.body;
    const mailer = await prisma.mailer.create({
      data: { name, teamId, order: order || 0 },
      include: { team: true }
    });

    await logChange(req, {
      entityType: 'Mailer',
      entityId: mailer.id,
      changeType: 'create',
      description: `Created mailer "${name}"`,
      newValue: mailer
    });

    res.json(mailer);
  } catch (error) {
    console.error('Error creating mailer:', error);
    res.status(500).json({ error: 'Failed to create mailer' });
  }
});

// Update a mailer (Admin only)
router.put('/mailers/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, teamId, order, isActive } = req.body;
    const mailer = await prisma.mailer.update({
      where: { id },
      data: { name, teamId, order, isActive },
      include: { team: true }
    });

    await logChange(req, {
      entityType: 'Mailer',
      entityId: mailer.id,
      changeType: 'update',
      description: `Updated mailer "${name}"`,
      newValue: mailer
    });

    res.json(mailer);
  } catch (error) {
    console.error('Error updating mailer:', error);
    res.status(500).json({ error: 'Failed to update mailer' });
  }
});

// Delete a mailer (Admin only)
router.delete('/mailers/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.mailer.delete({ where: { id } });

    await logChange(req, {
      entityType: 'Mailer',
      entityId: id,
      changeType: 'delete',
      description: `Deleted mailer ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mailer:', error);
    res.status(500).json({ error: 'Failed to delete mailer' });
  }
});

// Get current and next week schedules with assignments
router.get('/schedules/current', authenticateToken, async (req, res) => {
  try {
    const schedules = await prisma.planningSchedule.findMany({
      where: {
        OR: [{ isCurrent: true }, { isNext: true }]
      },
      include: {
        assignments: {
          include: {
            mailer: {
              include: { team: true }
            }
          }
        }
      },
      orderBy: { weekStart: 'asc' }
    });
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get historical schedules (3 months, Admin only)
router.get('/schedules/history', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const schedules = await prisma.planningSchedule.findMany({
      where: {
        weekStart: { gte: threeMonthsAgo }
      },
      include: {
        assignments: {
          include: {
            mailer: {
              include: { team: true }
            }
          }
        }
      },
      orderBy: { weekStart: 'desc' }
    });
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Create or update schedule (Admin only)
router.post('/schedules', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { weekStart, weekEnd, weekNumber, year, isCurrent, isNext } = req.body;
    
    // Check if schedule already exists
    const existing = await prisma.planningSchedule.findUnique({
      where: { year_weekNumber: { year, weekNumber } }
    });

    let schedule;
    if (existing) {
      schedule = await prisma.planningSchedule.update({
        where: { id: existing.id },
        data: { weekStart: new Date(weekStart), weekEnd: new Date(weekEnd), isCurrent, isNext }
      });
    } else {
      schedule = await prisma.planningSchedule.create({
        data: {
          weekStart: new Date(weekStart),
          weekEnd: new Date(weekEnd),
          weekNumber,
          year,
          isCurrent,
          isNext
        }
      });
    }
    res.json(schedule);

    await logChange(req, {
      entityType: 'PlanningSchedule',
      entityId: schedule.id,
      changeType: existing ? 'update' : 'create',
      description: `${existing ? 'Updated' : 'Created'} schedule for Week ${weekNumber}, ${year}`,
      newValue: schedule
    });
  } catch (error) {
    console.error('Error creating/updating schedule:', error);
    res.status(500).json({ error: 'Failed to create/update schedule' });
  }
});

// Bulk update assignments (Admin only)
router.post('/assignments/bulk', authenticateToken, async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { assignments } = req.body; // Array of { scheduleId, mailerId, dayOfWeek, taskCode, taskColor, notes }
    const userId = req.user!.id;

    const results = await Promise.all(
      assignments.map(async (assignment: { scheduleId: string; mailerId: string; dayOfWeek: number; taskCode: string; taskColor?: string; notes?: string }) => {
        const { scheduleId, mailerId, dayOfWeek, taskCode, taskColor, notes } = assignment;
        
        // If taskCode is empty, delete the assignment
        if (!taskCode) {
          try {
            await prisma.planningAssignment.delete({
              where: {
                scheduleId_mailerId_dayOfWeek: {
                  scheduleId,
                  mailerId,
                  dayOfWeek
                }
              }
            });
            return { status: 'deleted', scheduleId, mailerId, dayOfWeek };
          } catch (e) {
            // Ignore if record doesn't exist
            return { status: 'not_found', scheduleId, mailerId, dayOfWeek };
          }
          }


        // Fetch old assignment for history
        const oldAssignment = await prisma.planningAssignment.findUnique({
          where: {
            scheduleId_mailerId_dayOfWeek: {
              scheduleId,
              mailerId,
              dayOfWeek
            }
          }
        });

        const result = await prisma.planningAssignment.upsert({
          where: {
            scheduleId_mailerId_dayOfWeek: {
              scheduleId,
              mailerId,
              dayOfWeek
            }
          },
          update: {
            taskCode,
            taskColor,
            notes,
            updatedBy: Number(userId)
          },
          create: {
            scheduleId,
            mailerId,
            dayOfWeek,
            taskCode,
            taskColor,
            notes,
            createdBy: Number(userId),
            updatedBy: Number(userId)
          }
        });

        await logChange(req, {
             entityType: 'PlanningAssignment',
             entityId: result.id,
             changeType: 'update',
             description: `Assignment updated for mailer ${mailerId} on schedule ${scheduleId}`,
             oldValue: oldAssignment,
             newValue: result
        });
        
        return result;
      })
    );

    // Check for errors in results
    const errors = results.filter((r: any) => r.status === 'error');
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Some assignments failed', details: errors });
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error updating assignments:', error);
    res.status(500).json({ 
      error: 'Failed to update assignments', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Delete assignment (Admin only)
router.delete('/assignments/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.planningAssignment.delete({ where: { id } });

    await logChange(req, {
      entityType: 'PlanningAssignment',
      entityId: id,
      changeType: 'delete',
      description: `Deleted assignment ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// Initialize current and next week schedules
router.post('/schedules/initialize', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const now = new Date();
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    currentMonday.setHours(0, 0, 0, 0);

    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);
    currentSunday.setHours(23, 59, 59, 999);

    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    // Get week numbers
    const getWeekNumber = (date: Date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const currentWeekNum = getWeekNumber(currentMonday);
    const nextWeekNum = getWeekNumber(nextMonday);

    // Clear old current/next flags
    await prisma.planningSchedule.updateMany({
      where: { OR: [{ isCurrent: true }, { isNext: true }] },
      data: { isCurrent: false, isNext: false }
    });

    // Create or update current week
    const currentWeek = await prisma.planningSchedule.upsert({
      where: {
        year_weekNumber: {
          year: currentMonday.getFullYear(),
          weekNumber: currentWeekNum
        }
      },
      update: { isCurrent: true, isNext: false },
      create: {
        weekStart: currentMonday,
        weekEnd: currentSunday,
        weekNumber: currentWeekNum,
        year: currentMonday.getFullYear(),
        isCurrent: true,
        isNext: false
      }
    });

    // Create or update next week
    const nextWeek = await prisma.planningSchedule.upsert({
      where: {
        year_weekNumber: {
          year: nextMonday.getFullYear(),
          weekNumber: nextWeekNum
        }
      },
      update: { isCurrent: false, isNext: true },
      create: {
        weekStart: nextMonday,
        weekEnd: nextSunday,
        weekNumber: nextWeekNum,
        year: nextMonday.getFullYear(),
        isCurrent: false,
        isNext: true
      }
    });

    res.json({ currentWeek, nextWeek });
  } catch (error) {
    console.error('Error initializing schedules:', error);
    res.status(500).json({ error: 'Failed to initialize schedules' });
  }
});

// =====================
// PRESET ROUTES
// =====================

// Default presets to seed if none exist
const DEFAULT_PRESETS = [
  { label: 'CMH3-CMH9', codes: ['CMH3', 'CMH9'], color: '#90EE90', order: 0 },
  { label: 'CMH12-CMH5-CMH16', codes: ['CMH12', 'CMH5', 'CMH16'], color: '#FFFFE0', order: 1 },
  { label: 'HOTMAIL-Gmail', codes: ['HOTMAIL', 'Gmail'], color: '#FFD700', order: 2 },
  { label: 'Desktop-Webautomat', codes: ['Desktop', 'Webautomat'], color: '#FFA500', order: 3 },
  { label: 'Night Desktop-Night tool it', codes: ['Night Desktop', 'Night tool it'], color: '#FFA500', order: 4 },
  { label: 'congé', codes: ['congé'], color: '#FFB6C1', order: 5 }
];

// Get all presets
router.get('/presets', authenticateToken, async (req, res) => {
  try {
    let presets = await prisma.planningPreset.findMany({
      orderBy: { order: 'asc' }
    });

    // If no presets exist, seed with defaults
    if (presets.length === 0) {
      await Promise.all(
        DEFAULT_PRESETS.map((preset) =>
          prisma.planningPreset.create({
            data: {
              label: preset.label,
              codes: JSON.stringify(preset.codes),
              color: preset.color,
              order: preset.order
            }
          })
        )
      );
      presets = await prisma.planningPreset.findMany({
        orderBy: { order: 'asc' }
      });
    }

    // Parse codes JSON for frontend
    const parsedPresets = presets.map((preset) => ({
      ...preset,
      codes: JSON.parse(preset.codes)
    }));

    res.json(parsedPresets);
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// Create a new preset (Admin only)
router.post('/presets', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { label, codes, color, order } = req.body;
    
    // Validate codes
    if (!Array.isArray(codes) || !codes.every(c => typeof c === 'string')) {
        return res.status(400).json({ error: 'Codes must be an array of strings' });
    }

    // Get max order if not provided
    let presetOrder = order;
    if (presetOrder === undefined || presetOrder === null) {
      const maxOrder = await prisma.planningPreset.aggregate({
        _max: { order: true }
      });
      presetOrder = (maxOrder._max.order ?? -1) + 1;
    }

    const preset = await prisma.planningPreset.create({
      data: {
        label,
        codes: JSON.stringify(codes),
        color,
        order: presetOrder
      }
    });
    
    res.json({
      ...preset,
      codes: JSON.parse(preset.codes)
    });

    await logChange(req, {
      entityType: 'PlanningPreset',
      entityId: preset.id,
      changeType: 'create',
      description: `Created preset "${label}"`,
      newValue: preset
    });
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Update a preset (Admin only)
router.put('/presets/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { label, codes, color, order } = req.body;
    
    // Validate codes
    if (codes && (!Array.isArray(codes) || !codes.every((c: any) => typeof c === 'string'))) {
        return res.status(400).json({ error: 'Codes must be an array of strings' });
    }

    const preset = await prisma.planningPreset.update({
      where: { id },
      data: {
        label,
        codes: codes ? JSON.stringify(codes) : undefined,
        color,
        order
      }
    });
    
    res.json({
      ...preset,
      codes: JSON.parse(preset.codes)
    });

    await logChange(req, {
      entityType: 'PlanningPreset',
      entityId: preset.id,
      changeType: 'update',
      description: `Updated preset "${label}"`,
      newValue: preset
    });
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

// Delete a preset (Admin only)
router.delete('/presets/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.planningPreset.delete({ where: { id } });

    await logChange(req, {
      entityType: 'PlanningPreset',
      entityId: id,
      changeType: 'delete',
      description: `Deleted preset ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

export default router;
