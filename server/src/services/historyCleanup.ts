import prisma from '../db.js';

/**
 * Cleanup job to maintain data retention policies:
 * - Audit Log & History: Keep only last 3 months
 * - Interval Paused History: Keep all records (no limit)
 */
export async function cleanupOldHistory() {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Delete Audit Log entries older than 3 months
    const result = await prisma.changeHistory.deleteMany({
      where: {
        createdAt: {
          lt: threeMonthsAgo
        }
      }
    });

    console.log(`[History Cleanup] Deleted ${result.count} audit log entries older than 3 months`);
    
    // Note: IntervalPauseHistory is NOT cleaned up - we keep all records
    
    return result.count;
  } catch (error) {
    console.error('[History Cleanup] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Schedule the cleanup to run daily at 2 AM
 */
export function scheduleHistoryCleanup() {
  // Run cleanup immediately on startup
  cleanupOldHistory().catch(err => 
    console.error('[History Cleanup] Initial cleanup failed:', err)
  );

  // Then run every 24 hours
  setInterval(() => {
    cleanupOldHistory().catch(err => 
      console.error('[History Cleanup] Scheduled cleanup failed:', err)
    );
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

  console.log('[History Cleanup] Scheduled to run every 24 hours');
}
