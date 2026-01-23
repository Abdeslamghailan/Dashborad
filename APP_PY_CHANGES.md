# Key Changes to app.py

## Main Change: Enhanced `/api/all-data` Endpoint

### BEFORE (Original):
```python
@app.route('/api/all-data')
def all_data():
    """Return ALL data in file format with CORRECT LOCAL TIME"""
    try:
        conn = get_db_connection()
        
        # Get all data - NO FILTERING
        spam_actions = conn.execute('''
            SELECT raw_data, session, profile, count, timestamp, timestamp_utc
            FROM spam_actions
            ORDER BY timestamp DESC
        ''').fetchall()
        
        # ... similar for other tables
        # Returns EVERYTHING from database
```

### AFTER (Enhanced):
```python
@app.route('/api/all-data')
def all_data():
    """
    Return data with optional filtering support
    
    Query Parameters:
    - entities: comma-separated list of entities
    - date: specific date in YYYY-MM-DD format
    - hours: comma-separated list of hours
    - limit: max records per table
    """
    try:
        # Get filter parameters
        entities_param = request.args.get('entities', '')
        date_param = request.args.get('date', '')
        hours_param = request.args.get('hours', '')
        limit_param = request.args.get('limit', '')
        
        # Parse parameters
        entities = [e.strip() for e in entities_param.split(',') if e.strip()] if entities_param else []
        hours = [h.strip() for h in hours_param.split(',') if h.strip()] if hours_param else []
        limit = int(limit_param) if limit_param and limit_param.isdigit() else None
        
        # Build WHERE clause
        where_clauses = []
        params = []
        
        # Entity filter
        if entities:
            entity_conditions = []
            for entity in entities:
                entity_conditions.append("session LIKE ?")
                params.append(f'{entity}%')
            where_clauses.append(f"({' OR '.join(entity_conditions)})")
        
        # Date filter (convert YYYY-MM-DD to DD-MM-YYYY)
        if date_param:
            try:
                date_obj = datetime.strptime(date_param, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d-%m-%Y')
                where_clauses.append("timestamp LIKE ?")
                params.append(f'{formatted_date}%')
            except ValueError:
                pass
        
        # Hours filter
        if hours:
            hour_conditions = []
            for hour in hours:
                hour_padded = hour.zfill(2)
                hour_conditions.append("timestamp LIKE ?")
                params.append(f'% {hour_padded}-%')
            where_clauses.append(f"({' OR '.join(hour_conditions)})")
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        limit_sql = f"LIMIT {limit}" if limit else ""
        
        conn = get_db_connection()
        
        # Query with filters
        query = f'''
            SELECT raw_data, session, profile, count, timestamp, timestamp_utc
            FROM spam_actions
            WHERE {where_sql}
            ORDER BY timestamp DESC
            {limit_sql}
        '''
        spam_actions = conn.execute(query, params).fetchall()
        
        # ... similar for other tables
        
        # Return filtered data with metadata
        return jsonify({
            'status': 'success',
            'data': all_data,
            'filters_applied': {
                'entities': entities if entities else None,
                'date': date_param if date_param else None,
                'hours': hours if hours else None,
                'limit': limit if limit else None
            },
            'record_counts': {
                'spam_actions': len(all_data['spam_actions']),
                'inbox_actions': len(all_data['inbox_actions']),
                # ...
            }
        })
```

## Additional Change: Added CORS Support

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for dashboard
```

This allows the dashboard (running on different domain) to access the API.

## What This Achieves

1. **Backward Compatible**: Still works without parameters
2. **Flexible Filtering**: Supports multiple filter combinations
3. **Performance**: Only queries/returns requested data
4. **Transparency**: Returns metadata about applied filters
5. **Timezone Smart**: Converts date formats automatically

## Example Usage

```bash
# No filters - returns all data (backward compatible)
GET /api/all-data

# Filter by entity
GET /api/all-data?entities=CMH5

# Filter by date
GET /api/all-data?date=2026-01-23

# Filter by hours
GET /api/all-data?hours=10,11,12

# Combined filters
GET /api/all-data?entities=CMH5,Entity2&date=2026-01-23&hours=10,11,12

# With limit for testing
GET /api/all-data?entities=CMH5&limit=100
```

## Response Format

```json
{
  "status": "success",
  "data": {
    "spam_actions": [...],
    "inbox_actions": [...],
    "spam_domains": [...],
    "inbox_domains": [...]
  },
  "filters_applied": {
    "entities": ["CMH5"],
    "date": "2026-01-23",
    "hours": ["10", "11", "12"],
    "limit": null
  },
  "record_counts": {
    "spam_actions": 45,
    "inbox_actions": 23,
    "spam_domains": 12,
    "inbox_domains": 8,
    "total": 88
  },
  "time_info": {
    "current_local": "2026-01-23T12:00:00+01:00",
    "timezone": "Europe/Paris"
  }
}
```

## Installation on PythonAnywhere

1. **Backup current file:**
   ```bash
   cp /home/abdelgh9/app.py /home/abdelgh9/app_backup.py
   ```

2. **Install CORS (if not already installed):**
   ```bash
   pip install flask-cors --user
   ```

3. **Upload new file:**
   - Upload `app_updated.py` to `/home/abdelgh9/`
   - Rename to `app.py` (or copy content)

4. **Reload web app:**
   - Go to Web tab in PythonAnywhere
   - Click "Reload" button

5. **Test:**
   ```bash
   curl https://abdelgh9.pythonanywhere.com/api/all-data
   curl "https://abdelgh9.pythonanywhere.com/api/all-data?entities=CMH5&date=2026-01-23"
   ```

## Verification

After deployment, check:
- ✅ API responds without parameters (backward compatibility)
- ✅ API responds with entity filter
- ✅ API responds with date filter  
- ✅ API responds with combined filters
- ✅ Response includes `filters_applied` metadata
- ✅ Response includes `record_counts`
- ✅ Dashboard can connect (CORS enabled)
