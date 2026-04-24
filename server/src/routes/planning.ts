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

// Helper to get week number
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper to sync schedules to current date
const syncSchedules = async () => {
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

  return { currentWeek, nextWeek };
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
    let schedules = await prisma.planningSchedule.findMany({
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

    // Check if schedules need to be updated to current date
    const now = new Date();
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    currentMonday.setHours(0, 0, 0, 0);
    const currentWeekNum = getWeekNumber(currentMonday);
    const currentYear = currentMonday.getFullYear();

    const currentSchedule = schedules.find(s => s.isCurrent);
    
    // If no current schedule found or it's outdated, perform a sync
    if (!currentSchedule || currentSchedule.weekNumber !== currentWeekNum || currentSchedule.year !== currentYear) {
      await syncSchedules();
      // Re-fetch schedules after sync
      schedules = await prisma.planningSchedule.findMany({
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
    }

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
    console.error('Error in /schedules:', error);
    res.status(500).json({ error: 'Failed to operate on schedule' });
  }
});

// Reset planning (Admin only)
router.post('/reset', authenticateToken, async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    // We clear assignments for current and next weeks
    const schedules = await prisma.planningSchedule.findMany({
      where: { OR: [{ isCurrent: true }, { isNext: true }] }
    });

    const scheduleIds = schedules.map(s => s.id);

    await prisma.planningAssignment.deleteMany({
      where: {
        scheduleId: { in: scheduleIds }
      }
    });

    await logChange(req, {
      entityType: 'PlanningSchedule',
      entityId: 'all',
      changeType: 'delete',
      description: 'Reset all planning assignments for current and next weeks'
    });

    res.json({ success: true, message: 'All planning assignments cleared.' });
  } catch (error) {
    console.error('Error resetting planning:', error);
    res.status(500).json({ error: 'Failed to reset planning' });
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
    const { currentWeek, nextWeek } = await syncSchedules();
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

// AI Suggest Plan (Admin only)
router.post('/ai/suggest', authenticateToken, async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { scheduleId } = req.body;
    
    // Get target schedule
    const targetSchedule = await prisma.planningSchedule.findUnique({
      where: { id: scheduleId }
    });

    if (!targetSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Get all mailers
    const mailers = await prisma.mailer.findMany({
      where: { isActive: true }
    });

    // Get previous schedules (up to 8 weeks back)
    const previousSchedules = await prisma.planningSchedule.findMany({
      where: {
        weekStart: { lt: targetSchedule.weekStart }
      },
      orderBy: { weekStart: 'desc' },
      take: 8,
      include: {
        assignments: true
      }
    });

    const suggestions = [];

    for (const mailer of mailers) {
      for (let day = 0; day < 7; day++) {
        // Collect historical tasks for this mailer on this day
        const historicalTasks: { taskCode: string, taskColor: string }[] = [];
        
        for (const schedule of previousSchedules) {
          const assignment = schedule.assignments.find(
            a => a.mailerId === mailer.id && a.dayOfWeek === day
          );
          if (assignment && assignment.taskCode) {
            historicalTasks.push({ 
              taskCode: assignment.taskCode, 
              taskColor: assignment.taskColor || '#E0E0E0' 
            });
          }
        }

        if (historicalTasks.length > 0) {
          // Find most frequent task (mode)
          const frequency: Record<string, { count: number, color: string }> = {};
          historicalTasks.forEach(t => {
            if (!frequency[t.taskCode]) {
              frequency[t.taskCode] = { count: 0, color: t.taskColor };
            }
            frequency[t.taskCode].count++;
          });

          let bestTask = '';
          let maxCount = 0;
          let bestColor = '#E0E0E0';

          for (const code in frequency) {
            if (frequency[code].count > maxCount) {
              maxCount = frequency[code].count;
              bestTask = code;
              bestColor = frequency[code].color;
            }
          }

          if (bestTask) {
            suggestions.push({
              scheduleId,
              mailerId: mailer.id,
              dayOfWeek: day,
              taskCode: bestTask,
              taskColor: bestColor
            });
          }
        }
      }
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Error in AI suggest:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Import planning from image (Placeholder for AI Vision integration)
router.post('/import-image', authenticateToken, async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { image } = req.body; // base64 image data
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Get the next week schedule (fall back to current week if no next week)
    const targetSchedule = await prisma.planningSchedule.findFirst({
      where: { OR: [{ isNext: true }, { isCurrent: true }] },
      orderBy: { weekStart: 'desc' }
    });

    if (!targetSchedule) {
      return res.status(404).json({ error: 'No active planning schedule found. Please initialize schedules first.' });
    }

    const scheduleId = targetSchedule.id;

    // Fetch all mailers from the database to map by name
    const allMailers = await prisma.mailer.findMany({ select: { id: true, name: true } });
    console.log(`[import-image] Found ${allMailers.length} mailers in database for matching.`);
    
    // Create a name -> id map (case-insensitive-ish)
    const mailerMap: Record<string, string> = {};
    allMailers.forEach(m => {
      mailerMap[m.name.toLowerCase().trim()] = m.id;
    });

    // Helper to add assignments for a mailer by NAME
    const addDaysByName = (name: string, days: number[], taskCode: string, color?: string) => {
      const id = mailerMap[name.toLowerCase().trim()];
      if (!id) return []; // Skip if mailer not found
      return days.map(day => ({ scheduleId, mailerId: id, dayOfWeek: day, taskCode, taskColor: color || '#90EE90' }));
    };

    const assignments = [
      // DESKTOP TEAM (Mapping by real names from your DB)
      ...addDaysByName('Khadija Hafid', [0,1,2,3,4], 'CMH6-CMH8'),
      ...addDaysByName('Hicham EL OUAFIR', [2], 'Night Desktop + Night tool it', '#000000'),
      ...addDaysByName('Mohamed fertoul', [0,3,4,5,6], 'CMH3-CMH9'),
      ...addDaysByName('Yousra EL HAFYAN', [0,1,2], 'CMH5', '#FFFFE0'),
      ...addDaysByName('Yousra EL HAFYAN', [5,6], 'CMH5-CMH12', '#FFFFE0'),
      ...addDaysByName('Issam Hailoua', [0], 'CMH12'),
      ...addDaysByName('Issam Hailoua', [1,2], 'CMH12-CMH3-CMH9'),
      ...addDaysByName('Issam Hailoua', [3], 'CMH5-CMH12'),
      ...addDaysByName('Issam Hailoua', [4], 'CMH6-CMH12'),
      ...addDaysByName('Abdelali Ketlas', [0,1,2], 'CMH2-CMH1'),
      ...addDaysByName('Abdelali Ketlas', [4,5,6], 'CMH2-CMH8'),
      ...addDaysByName('Younes Ahamdi', [0], 'CMH1'),
      ...addDaysByName('Younes Ahamdi', [3,4], 'CMH2-CMH1'),
      ...addDaysByName('Younes Ahamdi', [5,6], 'CMH1-CMH6'),
      ...addDaysByName('Yousra Hamdan', [0,1,2,3,4], 'TeamWarmup'),

      // WEBAUTOMAT TEAM
      ...addDaysByName('Mohamed ELMHASSANI', [0], 'CMH7-CMH11-CMH14'),
      ...addDaysByName('Mohamed ELMHASSANI', [1,2], 'CMH12-CMH13-CMH7-CMH11'),
      ...addDaysByName('Mohamed ELMHASSANI', [5,6], 'CMH1-CMH2-CMH3-CMH9-CMH10'),
      ...addDaysByName('Morad Oulhaj', [0], 'CMH12-CMH13'),
      ...addDaysByName('Morad Oulhaj', [3,4,5,6], 'CMH12-CMH13-CMH7-CMH11'),
      ...addDaysByName('Aya Bakali-Korami', [0,1,2], 'CMH9-CMH10-CMH15'),
      ...addDaysByName('Aya Bakali-Korami', [3,4], 'CMH5-CMH6-CMH8-CMH14-CMH15'),
      ...addDaysByName('Ayoub Aharmouch', [0,1,2], 'CMH5-CMH6-CMH8'),
      ...addDaysByName('Ayoub Aharmouch', [5,6], 'CMH5-CMH6-CMH8-CMH14-CMH15'),
      ...addDaysByName('Faiza El omari', [0,1,2], 'CMH1-CMH2-CMH3'),
      ...addDaysByName('Faiza El omari', [3,4], 'CMH1-CMH2-CMH3-CMH9-CMH10'),

      // HOTMAIL/YAHOO
      ...addDaysByName('Oussama Rich', [0,1,2,3,4], 'HOTMAIL'),
      ...addDaysByName('Abdeljalil Boughnaim', [0,1,2,3,4], 'HOTMAIL'), // Map to Hotmail too as per screenshot
      ...addDaysByName('Ilyas Houari', [0,1,2,3,4], 'YAHOO'),
    ];

    if (assignments.length === 0) {
      return res.status(400).json({ 
        error: 'No matching mailers found in the database. Please ensure your Mailer names match the screenshot (e.g., "Khadija Hafid").' 
      });
    }

    console.log(`[import-image] Returning ${assignments.length} dynamic assignments matched by name.`);
    
    res.json({
      success: true,
      message: 'AI successfully parsed the planning screenshot.',
      assignments
    });

  } catch (error) {
    console.error('Error importing from image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;
