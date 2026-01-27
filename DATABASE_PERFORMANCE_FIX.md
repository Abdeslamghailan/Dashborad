# Database Performance Fix

## Problem Identified

The API is slow because:
1. **No database indexes** on the `timestamp` field
2. **Full table scans** on 40,000+ records
3. **String pattern matching** with LIKE queries is slow

## Solution: Add Database Indexes

You need to add indexes to your SQLite database to speed up queries.

### Step 1: Connect to PythonAnywhere

1. Go to https://www.pythonanywhere.com
2. Open a **Bash console**

### Step 2: Create Index Script

```bash
cd /home/abdelgh9
nano add_indexes.py
```

Paste this code:

```python
import sqlite3

DATABASE_PATH = '/home/abdelgh9/gmail.db'

def add_indexes():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    print("Adding indexes to improve query performance...")
    
    try:
        # Add indexes on timestamp for all tables
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_spam_actions_timestamp ON spam_actions(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_inbox_actions_timestamp ON inbox_actions(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_spam_domains_timestamp ON spam_domains(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_inbox_domains_timestamp ON inbox_domains(timestamp)')
        
        # Add indexes on session for entity filtering
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_spam_actions_session ON spam_actions(session)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_inbox_actions_session ON inbox_actions(session)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_spam_domains_session ON spam_domains(session)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_inbox_domains_session ON inbox_domains(session)')
        
        # Add composite indexes for common queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_spam_actions_session_timestamp ON spam_actions(session, timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_inbox_actions_session_timestamp ON inbox_actions(session, timestamp)')
        
        conn.commit()
        print("✅ Indexes created successfully!")
        
        # Show index info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
        indexes = cursor.fetchall()
        print(f"\nTotal indexes created: {len(indexes)}")
        for idx in indexes:
            print(f"  - {idx[0]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    add_indexes()
```

Save and exit (Ctrl+X, Y, Enter)

### Step 3: Run the Script

```bash
python3 add_indexes.py
```

Expected output:
```
Adding indexes to improve query performance...
✅ Indexes created successfully!

Total indexes created: 10
  - idx_spam_actions_timestamp
  - idx_inbox_actions_timestamp
  - idx_spam_domains_timestamp
  - idx_inbox_domains_timestamp
  - idx_spam_actions_session
  - idx_inbox_actions_session
  - idx_spam_domains_session
  - idx_inbox_domains_session
  - idx_spam_actions_session_timestamp
  - idx_inbox_actions_session_timestamp
```

### Step 4: Reload Web App

1. Go to **Web** tab
2. Click green **Reload** button

### Step 5: Test Performance

```bash
# Should now be MUCH faster
curl "https://abdelgh9.pythonanywhere.com/api/all-data?date=2026-01-23&limit=1000"
```

## Expected Performance Improvement

**Before indexes:**
- Query time: 10-30 seconds
- Full table scan on 40,000+ records

**After indexes:**
- Query time: 0.5-2 seconds ✅
- Index lookup (much faster)

## Alternative: Reduce Default Limit

If indexes don't help enough, reduce the limit in the frontend:

Edit `DashboardReporting.tsx` line ~1317:
```typescript
// Change from 10000 to 1000
params.append('limit', '1000');
```

This will make it even faster but show less data.

## Verification

After adding indexes, test:

```bash
# Test with date filter
curl "https://abdelgh9.pythonanywhere.com/api/all-data?date=2026-01-23&limit=1000"

# Test with entity and date
curl "https://abdelgh9.pythonanywhere.com/api/all-data?entities=CMH5&date=2026-01-23"
```

Both should respond in under 2 seconds.

---

**Next**: Add the indexes to your database to dramatically improve performance!
