import prisma from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export interface ChangeHistoryEntry {
  id: number;
  entityId: string | null;
  entityType: string;
  changeType: string;
  fieldChanged: string | null;
  methodId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  profileId: string | null;
  profileName: string | null;
  batchId: string | null;
  userId: number;
  username: string;
  userRole: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface CreateHistoryParams {
  entityId?: string;
  entityType: string;
  changeType: 'create' | 'update' | 'delete';
  fieldChanged?: string;
  methodId?: string;
  categoryId?: string;
  categoryName?: string;
  profileId?: string;
  profileName?: string;
  batchId?: string;
  description: string;
  oldValue?: any;
  newValue?: any;
}

/**
 * Log a change to the history
 */
export async function logChange(
  req: AuthRequest | null,
  params: CreateHistoryParams,
  explicitActor?: { id: number; username: string; role: string }
): Promise<void> {
  try {
    let actorId: number;
    let actorUsername: string;
    let actorRole: string;

    if (explicitActor) {
      actorId = explicitActor.id;
      actorUsername = explicitActor.username;
      actorRole = explicitActor.role;
    } else if (req?.user) {
      const authUser = req.user;
      
      // Fetch full user data from database to get actual username
      const fullUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });

      if (!fullUser) {
        console.error('User not found for history logging:', authUser.id);
        return;
      }

      actorId = fullUser.id;
      actorRole = fullUser.role;
      
      // Determine best display name
      let displayName = fullUser.username;
      if (!displayName && fullUser.firstName) {
        displayName = fullUser.lastName ? `${fullUser.firstName} ${fullUser.lastName}` : fullUser.firstName;
      }
      if (!displayName) {
        displayName = `User ${fullUser.id}`;
      }
      actorUsername = displayName;
    } else {
      console.error('No user context provided for history logging');
      return;
    }
    
    await prisma.changeHistory.create({
      data: {
        entityId: params.entityId || null,
        entityType: params.entityType,
        changeType: params.changeType,
        fieldChanged: params.fieldChanged || null,
        methodId: params.methodId || null,
        categoryId: params.categoryId || null,
        categoryName: params.categoryName || null,
        profileId: params.profileId || null,
        profileName: params.profileName || null,
        batchId: params.batchId || null,
        userId: actorId,
        username: actorUsername,
        userRole: actorRole,
        description: params.description,
        oldValue: params.oldValue ? (typeof params.oldValue === 'string' ? params.oldValue : JSON.stringify(params.oldValue)) : null,
        newValue: params.newValue ? (typeof params.newValue === 'string' ? params.newValue : JSON.stringify(params.newValue)) : null,
      },
    });
  } catch (error) {
    console.error('Failed to log change history:', error);
    // Don't throw - history logging should not break the main operation
  }
}

/**
 * Get the last N changes for an entity
 */
export async function getEntityHistory(
  entityId: string,
  limit: number = 5
): Promise<ChangeHistoryEntry[]> {
  try {
    const history = await prisma.changeHistory.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return history;
  } catch (error) {
    console.error('Failed to fetch entity history:', error);
    return [];
  }
}

/**
 * Get the last N changes by type
 */
export async function getHistoryByType(
  entityType: string,
  limit: number = 5
): Promise<ChangeHistoryEntry[]> {
  try {
    const history = await prisma.changeHistory.findMany({
      where: { entityType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return history;
  } catch (error) {
    console.error('Failed to fetch history by type:', error);
    return [];
  }
}

/**
 * Get all recent changes (for admin dashboard)
 */
export async function getRecentChanges(
  limit: number = 20
): Promise<ChangeHistoryEntry[]> {
  try {
    const history = await prisma.changeHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return history;
  } catch (error) {
    console.error('Failed to fetch recent changes:', error);
    return [];
  }
}

/**
 * Delete a specific history entry
 */
export async function deleteHistoryEntry(id: number): Promise<void> {
  try {
    await prisma.changeHistory.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Failed to delete history entry:', error);
    throw error;
  }
}

/**
 * Delete all history entries
 */
export async function deleteAllHistory(): Promise<void> {
  try {
    await prisma.changeHistory.deleteMany({});
  } catch (error) {
    console.error('Failed to delete all history:', error);
    throw error;
  }
}

/**
 * Clean up old history entries (keep only last N per entity)
 */
export async function cleanupOldHistory(
  keepPerEntity: number = 50
): Promise<void> {
  try {
    // Get all unique entity IDs
    const entities = await prisma.changeHistory.findMany({
      select: { entityId: true },
      distinct: ['entityId'],
      where: { entityId: { not: null } },
    });

    for (const { entityId } of entities) {
      if (!entityId) continue;

      // Get IDs to keep
      const toKeep = await prisma.changeHistory.findMany({
        where: { entityId },
        orderBy: { createdAt: 'desc' },
        take: keepPerEntity,
        select: { id: true },
      });

      const keepIds = toKeep.map((h: any) => h.id);

      // Delete old entries
      await prisma.changeHistory.deleteMany({
        where: {
          entityId,
          id: { notIn: keepIds },
        },
      });
    }
  } catch (error) {
    console.error('Failed to cleanup old history:', error);
  }
}
