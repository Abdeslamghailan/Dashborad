import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';

const router = Router();

// Helper function to check if user is admin
const isAdmin = (req: AuthRequest) => {
  return req.user && req.user.role === 'ADMIN';
};

// =====================
// SCRIPT ROUTES
// =====================

// Get all scripts with their scenarios
router.get('/scripts', authenticateToken, async (req, res) => {
  try {
    const scripts = await prisma.script.findMany({
      where: { isActive: true },
      include: {
        scenarios: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });
    res.json(scripts);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// Get all scripts (including inactive) - Admin only
router.get('/scripts/all', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const scripts = await prisma.script.findMany({
      include: {
        scenarios: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });
    res.json(scripts);
  } catch (error) {
    console.error('Error fetching all scripts:', error);
    res.status(500).json({ error: 'Failed to fetch scripts' });
  }
});

// Get a single script by ID
router.get('/scripts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        scenarios: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    res.json(script);
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

// Create a new script (Admin only)
router.post('/scripts', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Script name is required' });
    }

    // Get max order if not provided
    let scriptOrder = order;
    if (scriptOrder === undefined || scriptOrder === null) {
      const maxOrder = await prisma.script.aggregate({
        _max: { order: true }
      });
      scriptOrder = (maxOrder._max.order ?? -1) + 1;
    }

    const script = await prisma.script.create({
      data: {
        name,
        description,
        order: scriptOrder
      },
      include: {
        scenarios: true
      }
    });

    await logChange(req, {
      entityType: 'Script',
      entityId: script.id,
      changeType: 'create',
      description: `Created script "${name}"`,
      newValue: script
    });

    res.json(script);
  } catch (error: any) {
    console.error('Error creating script:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Script name already exists' });
    }
    res.status(500).json({ error: 'Failed to create script' });
  }
});

// Update a script (Admin only)
router.put('/scripts/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;

    const oldScript = await prisma.script.findUnique({ where: { id } });

    const script = await prisma.script.update({
      where: { id },
      data: {
        name,
        description,
        order,
        isActive
      },
      include: {
        scenarios: true
      }
    });

    await logChange(req, {
      entityType: 'Script',
      entityId: script.id,
      changeType: 'update',
      description: `Updated script "${name}"`,
      oldValue: oldScript,
      newValue: script
    });

    res.json(script);
  } catch (error: any) {
    console.error('Error updating script:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Script name already exists' });
    }
    res.status(500).json({ error: 'Failed to update script' });
  }
});

// Delete a script (Admin only)
router.delete('/scripts/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    
    // Get script name for logging
    const script = await prisma.script.findUnique({ where: { id } });
    
    await prisma.script.delete({ where: { id } });

    await logChange(req, {
      entityType: 'Script',
      entityId: id,
      changeType: 'delete',
      description: `Deleted script "${script?.name || id}"`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Failed to delete script' });
  }
});

// =====================
// SCENARIO ROUTES
// =====================

// Get all scenarios
router.get('/scenarios', authenticateToken, async (req, res) => {
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { isActive: true },
      include: {
        script: true
      },
      orderBy: [{ script: { order: 'asc' } }, { order: 'asc' }]
    });
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Get all scenarios (including inactive) - Admin only
router.get('/scenarios/all', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const scenarios = await prisma.scenario.findMany({
      include: {
        script: true
      },
      orderBy: [{ script: { order: 'asc' } }, { order: 'asc' }]
    });
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching all scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Get scenarios by script ID
router.get('/scenarios/by-script/:scriptId', authenticateToken, async (req, res) => {
  try {
    const { scriptId } = req.params;
    const scenarios = await prisma.scenario.findMany({
      where: { 
        scriptId,
        isActive: true 
      },
      include: {
        script: true
      },
      orderBy: { order: 'asc' }
    });
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios by script:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Get a single scenario by ID
router.get('/scenarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const scenario = await prisma.scenario.findUnique({
      where: { id },
      include: {
        script: true
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

// Create a new scenario (Admin only)
router.post('/scenarios', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, scriptId, description, order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Scenario name is required' });
    }

    if (!scriptId) {
      return res.status(400).json({ error: 'Script ID is required' });
    }

    // Verify script exists
    const script = await prisma.script.findUnique({ where: { id: scriptId } });
    if (!script) {
      return res.status(400).json({ error: 'Script not found' });
    }

    // Get max order if not provided
    let scenarioOrder = order;
    if (scenarioOrder === undefined || scenarioOrder === null) {
      const maxOrder = await prisma.scenario.aggregate({
        where: { scriptId },
        _max: { order: true }
      });
      scenarioOrder = (maxOrder._max.order ?? -1) + 1;
    }

    const scenario = await prisma.scenario.create({
      data: {
        name,
        scriptId,
        description,
        order: scenarioOrder
      },
      include: {
        script: true
      }
    });

    await logChange(req, {
      entityType: 'Scenario',
      entityId: scenario.id,
      changeType: 'create',
      description: `Created scenario "${name}" for script "${script.name}"`,
      newValue: scenario
    });

    res.json(scenario);
  } catch (error: any) {
    console.error('Error creating scenario:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Scenario name already exists for this script' });
    }
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

// Update a scenario (Admin only)
router.put('/scenarios/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, scriptId, description, order, isActive } = req.body;

    // If changing script, verify new script exists
    if (scriptId) {
      const script = await prisma.script.findUnique({ where: { id: scriptId } });
      if (!script) {
        return res.status(400).json({ error: 'Script not found' });
      }
    }

    const oldScenario = await prisma.scenario.findUnique({ where: { id } });

    const scenario = await prisma.scenario.update({
      where: { id },
      data: {
        name,
        scriptId,
        description,
        order,
        isActive
      },
      include: {
        script: true
      }
    });

    await logChange(req, {
      entityType: 'Scenario',
      entityId: scenario.id,
      changeType: 'update',
      description: `Updated scenario "${name}"`,
      oldValue: oldScenario,
      newValue: scenario
    });

    res.json(scenario);
  } catch (error: any) {
    console.error('Error updating scenario:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Scenario name already exists for this script' });
    }
    res.status(500).json({ error: 'Failed to update scenario' });
  }
});

// Delete a scenario (Admin only)
router.delete('/scenarios/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    
    // Get scenario name for logging
    const scenario = await prisma.scenario.findUnique({ where: { id } });
    
    await prisma.scenario.delete({ where: { id } });

    await logChange(req, {
      entityType: 'Scenario',
      entityId: id,
      changeType: 'delete',
      description: `Deleted scenario "${scenario?.name || id}"`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// Find scenario by name (for auto-loading script)
router.get('/scenarios/find-by-name/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const scenario = await prisma.scenario.findFirst({
      where: { 
        name,
        isActive: true 
      },
      include: {
        script: true
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (error) {
    console.error('Error finding scenario by name:', error);
    res.status(500).json({ error: 'Failed to find scenario' });
  }
});

export default router;
