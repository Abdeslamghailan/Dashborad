import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

import { logChange } from '../services/historyService.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/proxy-partition
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MAILER') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    // We use ID 1 as a singleton
    const partition = await prisma.proxyPartition.findUnique({
      where: { id: 1 }
    });

    if (!partition) {
      return res.json({}); // Return empty object if no data yet
    }

    res.json(JSON.parse(partition.data));
  } catch (error) {
    console.error('Error fetching proxy partition:', error);
    res.status(500).json({ error: 'Failed to fetch proxy partition data' });
  }
});

// POST /api/proxy-partition
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MAILER') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const data = req.body;

    // Upsert the singleton record
    const partition = await prisma.proxyPartition.upsert({
      where: { id: 1 },
      update: {
        data: JSON.stringify(data)
      },
      create: {
        id: 1,
        data: JSON.stringify(data)
      }
    });

    await logChange(req, {
      entityType: 'ProxyPartition',
      entityId: '1',
      changeType: 'update',
      description: 'Updated proxy partition data',
      newValue: data
    });

    res.json({ success: true, updatedAt: partition.updatedAt });
  } catch (error) {
    console.error('Error saving proxy partition:', error);
    res.status(500).json({ error: 'Failed to save proxy partition data' });
  }
});

export default router;
