import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Path to the database file (relative to this file: ../../prisma/dev.db)
const DB_PATH = path.join(__dirname, '../../prisma/dev.db');
// Path to the backups directory (relative to this file: ../../backups)
const BACKUP_DIR = path.join(__dirname, '../../backups');
// Configuration
const MAX_BACKUPS = 30; // Keep last 30 backups
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
/**
 * Performs a backup of the SQLite database.
 */
export const performBackup = async () => {
    try {
        // Ensure backup directory exists
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        // Check if database file exists
        if (!fs.existsSync(DB_PATH)) {
            console.error(`Database file not found at ${DB_PATH}. Skipping backup.`);
            return;
        }
        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `dev_backup_${timestamp}.db`);
        // Copy the file
        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`[Backup] Database backup created successfully: ${backupPath}`);
        // Clean up old backups
        cleanOldBackups();
    }
    catch (error) {
        console.error('[Backup] Backup failed:', error);
    }
};
/**
 * Deletes old backups, keeping only the most recent ones.
 */
const cleanOldBackups = () => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('dev_backup_') && f.endsWith('.db'))
            .map(f => ({
            name: f,
            path: path.join(BACKUP_DIR, f),
            time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
        }))
            .sort((a, b) => b.time - a.time); // Newest first
        if (files.length > MAX_BACKUPS) {
            const toDelete = files.slice(MAX_BACKUPS);
            for (const file of toDelete) {
                fs.unlinkSync(file.path);
                console.log(`[Backup] Deleted old backup: ${file.name}`);
            }
        }
    }
    catch (error) {
        console.error('[Backup] Error cleaning old backups:', error);
    }
};
/**
 * Initializes the backup scheduler.
 */
export const initBackupService = () => {
    console.log('[Backup] Initializing backup service...');
    // Perform an initial backup on startup
    performBackup();
    // Schedule periodic backups
    setInterval(performBackup, BACKUP_INTERVAL_MS);
    console.log(`[Backup] Scheduled backups every ${BACKUP_INTERVAL_MS / 1000 / 60 / 60} hours.`);
};
