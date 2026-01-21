import { Router } from 'express';
import prisma from '../db';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all reporting methods
router.get('/', authenticateToken, async (req, res) => {
  try {
    const methods = await prisma.reportingMethod.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(methods);
  } catch (error) {
    console.error('Failed to fetch methods:', error);
    res.status(500).json({ error: 'Failed to fetch reporting methods' });
  }
});

// Create a new reporting method
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, name, description, icon, color, gradient, order, isActive } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ error: 'ID and Name are required' });
    }

    const method = await prisma.reportingMethod.create({
      data: {
        id,
        name,
        description,
        icon: icon || 'Box',
        color: color || '#6366F1',
        gradient: gradient || 'from-indigo-500 to-purple-600',
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json(method);
  } catch (error) {
    console.error('Failed to create method:', error);
    res.status(500).json({ error: 'Failed to create reporting method' });
  }
});

// Update a reporting method
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, gradient, order, isActive } = req.body;

    const method = await prisma.reportingMethod.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        color,
        gradient,
        order,
        isActive
      }
    });

    res.json(method);
  } catch (error) {
    console.error('Failed to update method:', error);
    res.status(500).json({ error: 'Failed to update reporting method' });
  }
});

// Delete a reporting method
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.reportingMethod.delete({
      where: { id }
    });
    res.json({ message: 'Method deleted successfully' });
  } catch (error) {
    console.error('Failed to delete method:', error);
    res.status(500).json({ error: 'Failed to delete reporting method' });
  }
});

// Seed initial methods if none exist
router.post('/seed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const count = await prisma.reportingMethod.count();
    if (count > 0) {
      return res.status(400).json({ error: 'Methods already exist' });
    }

    const initialMethods = [
      {
        id: 'desktop',
        name: 'Desktop',
        description: 'Desktop automation and reporting',
        icon: 'Monitor',
        color: '#6366F1',
        gradient: 'from-indigo-500 to-purple-600',
        order: 0
      },
      {
        id: 'webautomate',
        name: 'Webautomate',
        description: 'Web automation and browser control',
        icon: 'Bot',
        color: '#10B981',
        gradient: 'from-emerald-500 to-teal-600',
        order: 1
      },
      {
        id: 'mobile',
        name: 'Mobile',
        description: 'Mobile app automation',
        icon: 'Smartphone',
        color: '#F59E0B',
        gradient: 'from-amber-500 to-orange-600',
        order: 2
      }
    ];

    await prisma.reportingMethod.createMany({
      data: initialMethods
    });

    res.json({ message: 'Initial methods seeded successfully' });
  } catch (error) {
    console.error('Failed to seed methods:', error);
    res.status(500).json({ error: 'Failed to seed reporting methods' });
  }
});

export default router;
