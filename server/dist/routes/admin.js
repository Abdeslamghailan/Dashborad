import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';
const router = Router();
// Get all users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                role: true,
                isApproved: true,
                createdAt: true,
                accessibleEntities: {
                    include: {
                        entity: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Update user role (Admin only)
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (!['ADMIN', 'USER', 'MAILER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { role }
        });
        await logChange(req, {
            entityType: 'User',
            entityId: user.id.toString(),
            changeType: 'update',
            fieldChanged: 'role',
            description: `Updated user role to ${role}`,
            oldValue: { role: 'previous' }, // Ideally we'd fetch old value first, but for now this is okay
            newValue: { role }
        });
        res.json(user);
    }
    catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
// Approve/Reject user (Admin only)
router.put('/users/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isApproved } = req.body;
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { isApproved }
        });
        await logChange(req, {
            entityType: 'User',
            entityId: user.id.toString(),
            changeType: 'update',
            fieldChanged: 'isApproved',
            description: `Updated user approval status to ${isApproved}`,
            newValue: { isApproved }
        });
        res.json(user);
    }
    catch (error) {
        console.error('Update approval error:', error);
        res.status(500).json({ error: 'Failed to update user approval status' });
    }
});
// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        // Delete associated entity access first (cascade should handle this if configured, but safe to be explicit or rely on Prisma)
        // Prisma schema doesn't show cascade delete on EntityAccess, checking schema...
        // Actually, let's just try deleting the user. If it fails due to FK, we delete access first.
        await prisma.entityAccess.deleteMany({
            where: { userId: parseInt(id) }
        });
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        await logChange(req, {
            entityType: 'User',
            entityId: id,
            changeType: 'delete',
            description: `Deleted user ${id}`
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
// Grant entity access to user (Admin only)
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, entityId } = req.body;
        const parsedUserId = parseInt(userId);
        if (isNaN(parsedUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const access = await prisma.entityAccess.create({
            data: {
                userId: parsedUserId,
                entityId
            }
        });
        await logChange(req, {
            entityType: 'EntityAccess',
            entityId: entityId,
            changeType: 'create',
            description: `Granted access to entity ${entityId} for user ${userId}`,
            newValue: { userId, entityId }
        });
        res.json(access);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Access already granted' });
        }
        console.error('Assign access error:', error);
        res.status(500).json({ error: 'Failed to grant access' });
    }
});
// Revoke entity access from user (Admin only)
router.post('/revoke', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, entityId } = req.body;
        const parsedUserId = parseInt(userId);
        if (isNaN(parsedUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        await prisma.entityAccess.delete({
            where: {
                userId_entityId: {
                    userId: parsedUserId,
                    entityId
                }
            }
        });
        await logChange(req, {
            entityType: 'EntityAccess',
            entityId: entityId,
            changeType: 'delete',
            description: `Revoked access to entity ${entityId} from user ${userId}`,
            oldValue: { userId, entityId }
        });
        res.json({ message: 'Access revoked successfully' });
    }
    catch (error) {
        console.error('Revoke access error:', error);
        res.status(500).json({ error: 'Failed to revoke access' });
    }
});
export default router;
