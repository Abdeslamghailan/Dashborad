# History & Audit Log - Data Retention Policies

## Overview
This document outlines the data retention policies for the History and Audit Log system.

## Retention Policies

### 1. Audit Log & History
- **Retention Period**: Last 3 months only
- **Table**: `ChangeHistory`
- **Automatic Cleanup**: Yes (daily at server startup + every 24 hours)
- **Purpose**: Tracks all system changes, user actions, entity updates, and configuration modifications

**What is stored:**
- Entity changes (create, update, delete)
- Configuration updates
- Day Plan modifications
- Reporting changes
- User actions across the platform

**Cleanup Process:**
- Automated daily cleanup removes entries older than 3 months
- Manual cleanup available via Admin API: `POST /api/history/cleanup`

### 2. Interval Paused History
- **Retention Period**: Unlimited (all records kept)
- **Table**: `IntervalPauseHistory`
- **Automatic Cleanup**: No
- **Purpose**: Tracks session pause/unpause events for quality, toxic, and search intervals

**What is stored:**
- Pause/unpause actions
- Interval changes per session
- Batch operations
- Category and method context
- Pause reasons (Quality, Toxic, Search, etc.)

**Why unlimited retention:**
- Critical for long-term analysis of session behavior
- Used for trend analysis and pattern detection
- Relatively small data footprint
- Important for compliance and auditing

## Default Date Range Filters

Both history views default to showing the **last 1 week** of data:
- Start Date: 7 days ago
- End Date: Today
- Reset button returns to this 1-week default

Users can adjust the date range as needed to view older data (within retention limits).

## Technical Implementation

### Automatic Cleanup Service
Location: `server/src/services/historyCleanup.ts`

```typescript
// Runs on server startup and every 24 hours
scheduleHistoryCleanup();
```

### Manual Cleanup Endpoint
```bash
POST /api/history/cleanup
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "message": "History cleanup completed",
  "deletedCount": 1234,
  "retentionPolicy": "3 months for Audit Log, unlimited for Interval Paused History"
}
```

## Database Schema

### ChangeHistory (3-month retention)
```prisma
model ChangeHistory {
  id           Int      @id @default(autoincrement())
  entityId     String?
  entityType   String
  changeType   String
  fieldChanged String?
  methodId     String?
  categoryId   String?
  userId       Int
  username     String
  createdAt    DateTime @default(now())
  // ... other fields
}
```

### IntervalPauseHistory (unlimited retention)
```prisma
model IntervalPauseHistory {
  id           Int      @id @default(autoincrement())
  entityId     String
  methodId     String
  categoryId   String?
  categoryName String?
  profileName  String?
  pauseType    String
  interval     String
  action       String
  batchId      String?
  userId       Int
  username     String
  createdAt    DateTime @default(now())
}
```

## Monitoring

Check cleanup logs in server console:
```
[History Cleanup] Deleted 1234 audit log entries older than 3 months
[History Cleanup] Scheduled to run every 24 hours
```

## Best Practices

1. **Regular Monitoring**: Check cleanup logs to ensure the process runs successfully
2. **Backup Before Cleanup**: Consider backing up old data before automatic deletion if needed for compliance
3. **Date Range Usage**: Use appropriate date ranges when querying to optimize performance
4. **Export Important Data**: Export critical audit logs before they expire if long-term retention is needed

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/history` | GET | Admin/Mailer | Get filtered audit log |
| `/api/history/interval-pause` | GET | Admin/Mailer | Get interval pause history |
| `/api/history/:id` | DELETE | Admin | Delete specific entry |
| `/api/history` | DELETE | Admin | Delete all history |
| `/api/history/cleanup` | POST | Admin | Manual 3-month cleanup |

## Notes

- The 3-month retention policy for Audit Log helps maintain database performance
- Interval Paused History is kept indefinitely for long-term analysis
- Both systems use efficient indexing on `createdAt` for optimal query performance
- Date filters include the full end date (23:59:59.999) to capture all entries
