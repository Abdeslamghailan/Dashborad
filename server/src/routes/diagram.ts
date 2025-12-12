import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';

const router = Router();
// const prisma = new PrismaClient(); // Removed local instance

// Helper function to check if user is admin
// Helper function to check if user is admin
const isAdmin = (req: AuthRequest) => {
  return req.user && req.user.role === 'ADMIN';
};

// Helper function to check if user can view (Admin or MAILER)
const canView = (req: AuthRequest) => {
  return req.user && (req.user.role === 'ADMIN' || req.user.role === 'MAILER');
};

// =====================
// FULL DIAGRAM DATA
// =====================

// Get full diagram hierarchy (for visualization)
router.get('/full', authenticateToken, async (req: AuthRequest, res) => {
  if (!canView(req)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Get all managers with their linked team leaders
    const managers = await prisma.diagramManager.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, photoUrl: true } },
        teamLeaderLinks: {
          include: {
            teamLeader: {
              include: {
                user: { select: { id: true, username: true, firstName: true, lastName: true, photoUrl: true } },
                managerLinks: true,
                teams: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                  include: {
                    mailerAssignments: {
                      include: {
                        mailer: {
                          include: { team: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Get all team leaders for assignment
    const allTeamLeaders = await prisma.diagramTeamLeader.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, photoUrl: true } },
        managerLinks: {
          include: { manager: true }
        },
        teams: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            mailerAssignments: {
              include: {
                mailer: {
                  include: { team: true }
                }
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Get all mailers for assignment
    const allMailers = await prisma.mailer.findMany({
      where: { isActive: true },
      include: { team: true },
      orderBy: [{ team: { order: 'asc' } }, { order: 'asc' }]
    });

    // Fetch users for linking
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true, firstName: true, lastName: true, photoUrl: true }
    });

    // Helper for mailer matching (since no relation yet)
    const findUser = (name: string) => {
      const cleanName = name.toLowerCase().trim();
      return allUsers.find(u => 
        (u.username && u.username.toLowerCase().trim() === cleanName) ||
        (u.firstName && u.firstName.toLowerCase().trim() === cleanName) ||
        (u.firstName && u.lastName && `${u.firstName} ${u.lastName}`.toLowerCase().trim() === cleanName)
      );
    };

    const mailersWithUsers = allMailers.map(m => ({ ...m, user: findUser(m.name) }));

    res.json({ managers, allTeamLeaders, allMailers: mailersWithUsers, allUsers });
  } catch (error) {
    console.error('Error fetching diagram:', error);
    res.status(500).json({ error: 'Failed to fetch diagram data' });
  }
});

// =====================
// MANAGER ROUTES
// =====================

// Get all managers
router.get('/managers', authenticateToken, async (req, res) => {
  if (!canView(req)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const managers = await prisma.diagramManager.findMany({
      include: {
        teamLeaderLinks: {
          include: {
            teamLeader: {
              include: { teams: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

// Create manager
router.post('/managers', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, email, phone, avatarColor, order, portalId, userId } = req.body;
    
    const maxOrder = await prisma.diagramManager.aggregate({
      _max: { order: true }
    });
    
    const manager = await prisma.diagramManager.create({
      data: {
        name,
        email,
        phone,
        avatarColor: avatarColor || generateRandomColor(),
        order: order ?? ((maxOrder._max.order ?? -1) + 1),
        portalId,
        userId: userId ? parseInt(userId) : undefined
      }
    });


    await logChange(req, {
      entityType: 'DiagramManager',
      entityId: manager.id,
      changeType: 'create',
      description: `Created manager "${name}"`,
      newValue: manager
    });

    res.json(manager);
  } catch (error: any) {
    console.error('Error creating manager:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Manager with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create manager' });
  }
});

// Update manager
router.put('/managers/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, email, phone, avatarColor, order, isActive, portalId, userId } = req.body;
    
    const manager = await prisma.diagramManager.update({
      where: { id },
      data: { 
        name, email, phone, avatarColor, order, isActive, portalId,
        userId: userId ? parseInt(userId) : null
      }
    });


    await logChange(req, {
      entityType: 'DiagramManager',
      entityId: manager.id,
      changeType: 'update',
      description: `Updated manager "${name}"`,
      newValue: manager
    });

    res.json(manager);
  } catch (error) {
    console.error('Error updating manager:', error);
    res.status(500).json({ error: 'Failed to update manager' });
  }
});

// Delete manager
router.delete('/managers/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.diagramManager.delete({ where: { id } });

    await logChange(req, {
      entityType: 'DiagramManager',
      entityId: id,
      changeType: 'delete',
      description: `Deleted manager ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting manager:', error);
    res.status(500).json({ error: 'Failed to delete manager' });
  }
});

// =====================
// TEAM LEADER ROUTES
// =====================

// Get all team leaders
router.get('/team-leaders', authenticateToken, async (req, res) => {
  if (!canView(req)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const teamLeaders = await prisma.diagramTeamLeader.findMany({
      include: {
        managerLinks: {
          include: { manager: true }
        },
        teams: true
      },
      orderBy: { order: 'asc' }
    });
    res.json(teamLeaders);
  } catch (error) {
    console.error('Error fetching team leaders:', error);
    res.status(500).json({ error: 'Failed to fetch team leaders' });
  }
});

// Create team leader
router.post('/team-leaders', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, email, phone, avatarColor, managerIds, order, portalId, userId } = req.body;
    
    const maxOrder = await prisma.diagramTeamLeader.aggregate({
      _max: { order: true }
    });
    
    const teamLeader = await prisma.diagramTeamLeader.create({
      data: {
        name,
        email,
        phone,
        avatarColor: avatarColor || generateRandomColor(),
        order: order ?? ((maxOrder._max.order ?? -1) + 1),
        portalId,
        userId: userId ? parseInt(userId) : undefined,
        // Create links to managers if provided
        managerLinks: managerIds && managerIds.length > 0 ? {
          create: managerIds.map((managerId: string, index: number) => ({
            managerId,
            isPrimary: index === 0
          }))
        } : undefined
      },
      include: {
        managerLinks: {
          include: { manager: true }
        }
      }
    });


    await logChange(req, {
      entityType: 'DiagramTeamLeader',
      entityId: teamLeader.id,
      changeType: 'create',
      description: `Created team leader "${name}"`,
      newValue: teamLeader
    });

    res.json(teamLeader);
  } catch (error) {
    console.error('Error creating team leader:', error);
    res.status(500).json({ error: 'Failed to create team leader' });
  }
});

// Update team leader
router.put('/team-leaders/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, email, phone, avatarColor, order, isActive, portalId, userId } = req.body;
    
    const teamLeader = await prisma.diagramTeamLeader.update({
      where: { id },
      data: { 
        name, email, phone, avatarColor, order, isActive, portalId,
        userId: userId ? parseInt(userId) : null
      },
      include: {
        managerLinks: {
          include: { manager: true }
        }
      }
    });


    await logChange(req, {
      entityType: 'DiagramTeamLeader',
      entityId: teamLeader.id,
      changeType: 'update',
      description: `Updated team leader "${name}"`,
      newValue: teamLeader
    });

    res.json(teamLeader);
  } catch (error) {
    console.error('Error updating team leader:', error);
    res.status(500).json({ error: 'Failed to update team leader' });
  }
});

// Delete team leader
router.delete('/team-leaders/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.diagramTeamLeader.delete({ where: { id } });

    await logChange(req, {
      entityType: 'DiagramTeamLeader',
      entityId: id,
      changeType: 'delete',
      description: `Deleted team leader ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team leader:', error);
    res.status(500).json({ error: 'Failed to delete team leader' });
  }
});

// =====================
// MANAGER-TEAM LEADER LINK ROUTES
// =====================

// Link team leader to manager
router.post('/manager-team-leader-links', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { managerId, teamLeaderId, isPrimary } = req.body;
    
    const link = await prisma.managerTeamLeaderLink.create({
      data: {
        managerId,
        teamLeaderId,
        isPrimary: isPrimary || false
      },
      include: {
        manager: true,
        teamLeader: true
      }
    });


    await logChange(req, {
      entityType: 'ManagerTeamLeaderLink',
      entityId: link.id,
      changeType: 'create',
      description: `Linked manager ${managerId} to team leader ${teamLeaderId}`,
      newValue: link
    });

    res.json(link);
  } catch (error: any) {
    console.error('Error creating link:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This link already exists' });
    }
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Remove link between manager and team leader
router.delete('/manager-team-leader-links/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.managerTeamLeaderLink.delete({ where: { id } });

    await logChange(req, {
      entityType: 'ManagerTeamLeaderLink',
      entityId: id,
      changeType: 'delete',
      description: `Deleted link ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Bulk update manager's team leaders
router.post('/managers/:id/team-leaders', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id: managerId } = req.params;
    const { teamLeaderIds } = req.body;

    // Delete existing links for this manager
    await prisma.managerTeamLeaderLink.deleteMany({
      where: { managerId }
    });

    // Create new links
    if (teamLeaderIds && teamLeaderIds.length > 0) {
      await prisma.managerTeamLeaderLink.createMany({
        data: teamLeaderIds.map((teamLeaderId: string, index: number) => ({
          managerId,
          teamLeaderId,
          isPrimary: index === 0
        }))
      });
    }

    // Return updated manager
    const manager = await prisma.diagramManager.findUnique({
      where: { id: managerId },
      include: {
        teamLeaderLinks: {
          include: { teamLeader: true }
        }
      }
    });



    await logChange(req, {
      entityType: 'DiagramManager',
      entityId: managerId,
      changeType: 'update',
      description: `Updated team leaders for manager ${managerId}`,
      newValue: { teamLeaderIds }
    });

    res.json(manager);
  } catch (error) {
    console.error('Error updating manager team leaders:', error);
    res.status(500).json({ error: 'Failed to update team leaders' });
  }
});

// Bulk update team leader's managers
router.post('/team-leaders/:id/managers', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id: teamLeaderId } = req.params;
    const { managerIds } = req.body;

    // Delete existing links for this team leader
    await prisma.managerTeamLeaderLink.deleteMany({
      where: { teamLeaderId }
    });

    // Create new links
    if (managerIds && managerIds.length > 0) {
      await prisma.managerTeamLeaderLink.createMany({
        data: managerIds.map((managerId: string, index: number) => ({
          managerId,
          teamLeaderId,
          isPrimary: index === 0
        }))
      });
    }

    // Return updated team leader
    const teamLeader = await prisma.diagramTeamLeader.findUnique({
      where: { id: teamLeaderId },
      include: {
        managerLinks: {
          include: { manager: true }
        }
      }
    });



    await logChange(req, {
      entityType: 'DiagramTeamLeader',
      entityId: teamLeaderId,
      changeType: 'update',
      description: `Updated managers for team leader ${teamLeaderId}`,
      newValue: { managerIds }
    });

    res.json(teamLeader);
  } catch (error) {
    console.error('Error updating team leader managers:', error);
    res.status(500).json({ error: 'Failed to update managers' });
  }
});

// =====================
// DIAGRAM TEAM ROUTES
// =====================

// Get all diagram teams
router.get('/teams', authenticateToken, async (req, res) => {
  if (!canView(req)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const teams = await prisma.diagramTeam.findMany({
      include: {
        teamLeader: {
          include: {
            managerLinks: {
              include: { manager: true }
            }
          }
        },
        mailerAssignments: {
          include: { mailer: true }
        }
      },
      orderBy: [{ teamLeader: { order: 'asc' } }, { order: 'asc' }]
    });
    res.json(teams);
  } catch (error) {
    console.error('Error fetching diagram teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Create diagram team
router.post('/teams', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { name, description, color, teamLeaderId, order } = req.body;
    
    const maxOrder = await prisma.diagramTeam.aggregate({
      where: { teamLeaderId },
      _max: { order: true }
    });
    
    const team = await prisma.diagramTeam.create({
      data: {
        name,
        description,
        color: color || generateRandomTeamColor(),
        teamLeaderId,
        order: order ?? ((maxOrder._max.order ?? -1) + 1)
      },
      include: { teamLeader: true }
    });


    await logChange(req, {
      entityType: 'DiagramTeam',
      entityId: team.id,
      changeType: 'create',
      description: `Created diagram team "${name}"`,
      newValue: team
    });

    res.json(team);
  } catch (error) {
    console.error('Error creating diagram team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update diagram team
router.put('/teams/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { name, description, color, teamLeaderId, order, isActive } = req.body;
    
    const team = await prisma.diagramTeam.update({
      where: { id },
      data: { name, description, color, teamLeaderId, order, isActive },
      include: { teamLeader: true }
    });


    await logChange(req, {
      entityType: 'DiagramTeam',
      entityId: team.id,
      changeType: 'update',
      description: `Updated diagram team "${name}"`,
      newValue: team
    });

    res.json(team);
  } catch (error) {
    console.error('Error updating diagram team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete diagram team
router.delete('/teams/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.diagramTeam.delete({ where: { id } });

    await logChange(req, {
      entityType: 'DiagramTeam',
      entityId: id,
      changeType: 'delete',
      description: `Deleted diagram team ${id}`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting diagram team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// =====================
// MAILER ASSIGNMENT ROUTES
// =====================

// Assign mailer to team
router.post('/assignments', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { mailerId, teamId, role, isPrimary } = req.body;
    
    const assignment = await prisma.diagramMailerAssignment.create({
      data: {
        mailerId,
        teamId,
        role,
        isPrimary
      },
      include: {
        mailer: { include: { team: true } },
        team: true
      }
    });


    await logChange(req, {
      entityType: 'DiagramMailerAssignment',
      entityId: assignment.id,
      changeType: 'create',
      description: `Assigned mailer ${mailerId} to team ${teamId}`,
      newValue: assignment
    });

    res.json(assignment);
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Mailer is already assigned to this team' });
    }
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Update mailer assignment
router.put('/assignments/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    const { role, isPrimary } = req.body;
    
    const assignment = await prisma.diagramMailerAssignment.update({
      where: { id },
      data: { role, isPrimary },
      include: {
        mailer: { include: { team: true } },
        team: true
      }
    });


    await logChange(req, {
      entityType: 'DiagramMailerAssignment',
      entityId: assignment.id,
      changeType: 'update',
      description: `Updated assignment ${id}`,
      newValue: assignment
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Remove mailer from team
router.delete('/assignments/:id', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { id } = req.params;
    await prisma.diagramMailerAssignment.delete({ where: { id } });

    await logChange(req, {
      entityType: 'DiagramMailerAssignment',
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

// Bulk assign mailers to team
router.post('/assignments/bulk', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { teamId, mailerIds } = req.body;
    
    // Remove existing assignments for this team
    await prisma.diagramMailerAssignment.deleteMany({
      where: { teamId }
    });
    
    // Create new assignments
    const assignments = await Promise.all(
      mailerIds.map((mailerId: string, index: number) =>
        prisma.diagramMailerAssignment.create({
          data: {
            mailerId,
            teamId,
            isPrimary: index === 0
          },
          include: {
            mailer: { include: { team: true } },
            team: true
          }
        })
      )
    );
    

    
    await logChange(req, {
      entityType: 'DiagramTeam',
      entityId: teamId,
      changeType: 'update',
      description: `Bulk assigned mailers to team ${teamId}`,
      newValue: { mailerIds }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Error bulk assigning mailers:', error);
    res.status(500).json({ error: 'Failed to assign mailers' });
  }
});

// =====================
// HELPER FUNCTIONS
// =====================

function generateRandomColor(): string {
  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
    '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateRandomTeamColor(): string {
  const colors = [
    '#E0E7FF', '#EDE9FE', '#FCE7F3', '#FEE2E2', '#FFEDD5',
    '#FEF3C7', '#DCFCE7', '#CCFBF1', '#CFFAFE', '#DBEAFE'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default router;
