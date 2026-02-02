import { Router } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrMailer, AuthRequest } from '../middleware/auth.js';
import { getEntityHistory, getHistoryByType, getRecentChanges } from '../services/historyService.js';
import prisma from '../db.js';

const router = Router();

// 1. Specialized / Recent Routes (Must be before parameterized routes)
router.get('/recent', authenticateToken, requireAdminOrMailer, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getRecentChanges(limit);
    res.json(history);
  } catch (error) {
    console.error('Get recent changes error:', error);
    res.status(500).json({ error: 'Failed to fetch recent changes' });
  }
});

// Get specialized interval pause history
router.get('/interval-pause', authenticateToken, requireAdminOrMailer, async (req: AuthRequest, res) => {
  try {
    const {
      entityId,
      methodId,
      categoryId,
      startDate,
      endDate,
      limit = '2000'
    } = req.query;

    const where: any = {};
    if (entityId) where.entityId = entityId as string;
    if (methodId) where.methodId = methodId as string;
    if (categoryId) where.categoryId = categoryId as string;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : null;
      const end = endDate ? new Date(endDate as string) : null;
      
      if (end) {
        end.setHours(23, 59, 59, 999);
      }

      where.createdAt = {
        ...(start && { gte: start }),
        ...(end && { lte: end })
      };
    }

    // 1. Fetch from new specialized table (Safe Fetch)
    let newHistory: any[] = [];
    try {
      newHistory = await (prisma as any).intervalPauseHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string)
      });
    } catch (e) {
      console.warn('Specialized IntervalPauseHistory table not found or query failed, falling back to legacy only.');
    }

    // 2. Fetch from legacy ChangeHistory table
    const legacyWhere: any = {
      entityType: 'limits',
      fieldChanged: { startsWith: 'intervals' }
    };
    if (entityId) legacyWhere.entityId = entityId as string;
    if (methodId) legacyWhere.methodId = methodId as string;
    if (categoryId) legacyWhere.categoryId = categoryId as string;
    if (startDate || endDate) {
      legacyWhere.createdAt = where.createdAt;
    }

    const legacyHistory = await prisma.changeHistory.findMany({
      where: legacyWhere,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    // 3. Map legacy history to new format
    const mappedLegacy = legacyHistory.map(h => {
      let action = 'UPDATE';
      if (h.oldValue === 'NO' && h.newValue !== 'NO') action = 'PAUSE';
      if (h.oldValue !== 'NO' && h.newValue === 'NO') action = 'UNPAUSE';

      return {
        id: `legacy-${h.id}`,
        entityId: h.entityId,
        methodId: h.methodId || 'desktop',
        categoryId: h.categoryId,
        categoryName: h.categoryName,
        profileName: h.profileName,
        pauseType: h.fieldChanged?.replace('intervals', '') || 'Update',
        interval: h.newValue || 'NO',
        action,
        userId: h.userId,
        username: h.username,
        createdAt: h.createdAt,
        isLegacy: true
      };
    });

    // 4. Merge and sort
    const combined = [...newHistory, ...mappedLegacy]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, parseInt(limit as string));

    res.json(combined);
  } catch (error) {
    console.error('Get interval pause history error:', error);
    res.status(500).json({ error: 'Failed to fetch interval history' });
  }
});

// 2. Filtered Root Route
router.get('/', authenticateToken, requireAdminOrMailer, async (req: AuthRequest, res) => {
  try {
    const {
      entityId,
      entityType,
      username,
      changeType,
      startDate,
      endDate,
      methodId,
      categoryId,
      fieldChanged,
      limit = '100'
    } = req.query;

    const where: any = {};
    if (entityId) where.entityId = entityId as string;
    if (entityType) where.entityType = entityType as string;
    if (username) where.username = { contains: username as string };
    if (changeType) where.changeType = changeType as string;
    if (methodId) where.methodId = methodId as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (fieldChanged) where.fieldChanged = { contains: fieldChanged as string };
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    let start = startDate ? new Date(startDate as string) : threeMonthsAgo;
    let end = endDate ? new Date(endDate as string) : undefined;

    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    if (isNaN(start.getTime())) start = threeMonthsAgo;
    if (end && isNaN(end.getTime())) end = undefined;

    where.createdAt = {
      gte: start,
      ...(end && { lte: end })
    };

    const history = await prisma.changeHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json(history);
  } catch (error) {
    console.error('Get filtered history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// 3. Parameterized Routes
router.get('/entity/:entityId', authenticateToken, requireAdminOrMailer, async (req: AuthRequest, res) => {
  try {
    const { entityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const history = await getEntityHistory(entityId, limit);
    res.json(history);
  } catch (error) {
    console.error('Get entity history error:', error);
    res.status(500).json({ error: 'Failed to fetch entity history' });
  }
});

router.get('/type/:entityType', authenticateToken, requireAdminOrMailer, async (req: AuthRequest, res) => {
  try {
    const { entityType } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const history = await getHistoryByType(entityType, limit);
    res.json(history);
  } catch (error) {
    console.error('Get history by type error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Delete specific history entry (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    
    await prisma.changeHistory.delete({
      where: { id }
    });
    
    res.json({ message: 'History entry deleted' });
  } catch (error) {
    console.error('Delete history entry error:', error);
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
});

// Delete all history (Admin only)
router.delete('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    await prisma.changeHistory.deleteMany({});
    res.json({ message: 'All history deleted' });
  } catch (error) {
    console.error('Delete all history error:', error);
    res.status(500).json({ error: 'Failed to delete all history' });
  }
});

// Cleanup old history (Admin only) - Enforces 3-month retention policy
router.post('/cleanup', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await prisma.changeHistory.deleteMany({
      where: {
        createdAt: {
          lt: threeMonthsAgo
        }
      }
    });

    res.json({ 
      message: 'History cleanup completed',
      deletedCount: result.count,
      retentionPolicy: '3 months for Audit Log, unlimited for Interval Paused History'
    });
  } catch (error) {
    console.error('Cleanup history error:', error);
    res.status(500).json({ error: 'Failed to cleanup history' });
  }
});


export default router;
