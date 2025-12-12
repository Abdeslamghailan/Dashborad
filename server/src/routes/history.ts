import { Router } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrMailer, AuthRequest } from '../middleware/auth.js';
import { getEntityHistory, getHistoryByType, getRecentChanges } from '../services/historyService.js';
import prisma from '../db.js';

const router = Router();

// Get history for a specific entity
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

// Get history by type (e.g., "proxy", "reporting", "limits")
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

// Get recent changes (admin/mailer only)
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

// Get all history with filters (admin/mailer only)
router.get('/', authenticateToken, requireAdminOrMailer, async (req: AuthRequest, res) => {
  try {
    const {
      entityId,
      entityType,
      username,
      changeType,
      startDate,
      endDate,
      limit = '100'
    } = req.query;

    // Build where clause
    const where: any = {};
    
    if (entityId) where.entityId = entityId as string;
    if (entityType) where.entityType = entityType as string;
    if (username) where.username = { contains: username as string };
    if (changeType) where.changeType = changeType as string;
    
    // Date range filter (default to last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    let start = startDate ? new Date(startDate as string) : threeMonthsAgo;
    let end = endDate ? new Date(endDate as string) : undefined;

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

export default router;
