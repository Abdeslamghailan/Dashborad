from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime, timedelta
import time
import pytz

app = Flask(__name__)
CORS(app)  # Enable CORS for dashboard

# Database path - adjust this to your actual database location
DATABASE_PATH = '/home/abdelgh9/gmail.db'

# ==================== TIMEZONE CONFIGURATION ====================
LOCAL_TIMEZONE = pytz.timezone('Europe/Paris')
UTC_TIMEZONE = pytz.utc

def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_local_time():
    """Get current time in local timezone (Europe/Paris)"""
    utc_now = datetime.now(UTC_TIMEZONE)
    local_now = utc_now.astimezone(LOCAL_TIMEZONE)
    return local_now

def format_date_hour_file(date_obj=None):
    """Format date like: 20-01-2026 14-20 (in local timezone)"""
    if date_obj is None:
        date_obj = get_local_time()
    elif isinstance(date_obj, str):
        try:
            if 'T' in date_obj and 'Z' in date_obj:
                date_obj = datetime.fromisoformat(date_obj.replace('Z', '+00:00'))
                date_obj = UTC_TIMEZONE.localize(date_obj)
                date_obj = date_obj.astimezone(LOCAL_TIMEZONE)
            else:
                date_obj = datetime.strptime(date_obj, '%d-%m-%Y %H-%M')
                date_obj = LOCAL_TIMEZONE.localize(date_obj)
        except:
            date_obj = get_local_time()
    elif date_obj.tzinfo is None:
        date_obj = UTC_TIMEZONE.localize(date_obj)
        date_obj = date_obj.astimezone(LOCAL_TIMEZONE)

    return date_obj.strftime('%d-%m-%Y %H-%M')

# ==================== ENHANCED ALL-DATA ENDPOINT ====================

@app.route('/api/all-data')
def all_data():
    """
    Return data with optional filtering support
    
    Query Parameters:
    - entities: comma-separated list of entities (e.g., "Entity1,Entity2")
    - date: specific date in YYYY-MM-DD format
    - hours: comma-separated list of hours (e.g., "10,11,12")
    - limit: max records per table (default: no limit, use 1000 for testing)
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
        
        # Entity filter (extract from session field)
        if entities:
            entity_conditions = []
            for entity in entities:
                entity_conditions.append("session LIKE ?")
                params.append(f'{entity}%')
            where_clauses.append(f"({' OR '.join(entity_conditions)})")
        
        # Date filter (convert YYYY-MM-DD to DD-MM-YYYY format)
        if date_param:
            try:
                # Parse YYYY-MM-DD and convert to DD-MM-YYYY
                date_obj = datetime.strptime(date_param, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d-%m-%Y')
                where_clauses.append("timestamp LIKE ?")
                params.append(f'{formatted_date}%')
            except ValueError:
                pass  # Invalid date format, skip filter
        
        # Hours filter (extract hour from timestamp)
        if hours:
            hour_conditions = []
            for hour in hours:
                # Timestamp format: DD-MM-YYYY HH-MM
                # We need to match the HH part
                hour_padded = hour.zfill(2)
                hour_conditions.append("timestamp LIKE ?")
                params.append(f'% {hour_padded}-%')
            where_clauses.append(f"({' OR '.join(hour_conditions)})")
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        limit_sql = f"LIMIT {limit}" if limit else ""
        
        conn = get_db_connection()
        all_data = {}
        
        # 1. Spam Actions
        query = f'''
            SELECT raw_data, session, profile, count, timestamp, timestamp_utc
            FROM spam_actions
            WHERE {where_sql}
            ORDER BY timestamp DESC
            {limit_sql}
        '''
        spam_actions = conn.execute(query, params).fetchall()
        
        all_data['spam_actions'] = [{
            'raw': row['raw_data'],
            'parsed': {
                'session': row['session'],
                'profile': row['profile'],
                'count': row['count'],
                'timestamp': row['timestamp'],
                'timestamp_utc': row['timestamp_utc']
            }
        } for row in spam_actions]
        
        # 2. Inbox Actions
        query = f'''
            SELECT raw_data, session, profile, action_type, archive_action, timestamp, timestamp_utc
            FROM inbox_actions
            WHERE {where_sql}
            ORDER BY timestamp DESC
            {limit_sql}
        '''
        inbox_actions = conn.execute(query, params).fetchall()
        
        all_data['inbox_actions'] = [{
            'raw': row['raw_data'],
            'parsed': {
                'session': row['session'],
                'profile': row['profile'],
                'action_type': row['action_type'],
                'archive_action': row['archive_action'],
                'timestamp': row['timestamp'],
                'timestamp_utc': row['timestamp_utc']
            }
        } for row in inbox_actions]
        
        # 3. Spam Domains
        query = f'''
            SELECT raw_data, session, profile, domain, sender, timestamp, timestamp_utc
            FROM spam_domains
            WHERE {where_sql}
            ORDER BY timestamp DESC
            {limit_sql}
        '''
        spam_domains = conn.execute(query, params).fetchall()
        
        all_data['spam_domains'] = [{
            'raw': row['raw_data'],
            'parsed': {
                'session': row['session'],
                'profile': row['profile'],
                'domain': row['domain'],
                'sender': row['sender'],
                'timestamp': row['timestamp'],
                'timestamp_utc': row['timestamp_utc']
            }
        } for row in spam_domains]
        
        # 4. Inbox Domains
        query = f'''
            SELECT raw_data, session, profile, domain, sender, timestamp, timestamp_utc
            FROM inbox_domains
            WHERE {where_sql}
            ORDER BY timestamp DESC
            {limit_sql}
        '''
        inbox_domains = conn.execute(query, params).fetchall()
        
        all_data['inbox_domains'] = [{
            'raw': row['raw_data'],
            'parsed': {
                'session': row['session'],
                'profile': row['profile'],
                'domain': row['domain'],
                'sender': row['sender'],
                'timestamp': row['timestamp'],
                'timestamp_utc': row['timestamp_utc']
            }
        } for row in inbox_domains]
        
        # 5. Get statistics for filtered data
        stats_query = f'''
            SELECT
                (SELECT COUNT(*) FROM spam_actions WHERE {where_sql}) as total_spam_actions,
                (SELECT COUNT(*) FROM inbox_actions WHERE {where_sql}) as total_inbox_actions,
                (SELECT COUNT(DISTINCT session) FROM spam_actions WHERE {where_sql}) as unique_sessions,
                (SELECT COUNT(DISTINCT profile) FROM spam_actions WHERE {where_sql}) as unique_profiles,
                (SELECT COUNT(DISTINCT domain) FROM spam_domains WHERE {where_sql}) as unique_spam_domains,
                (SELECT COUNT(DISTINCT domain) FROM inbox_domains WHERE {where_sql}) as unique_inbox_domains
        '''
        stats = conn.execute(stats_query, params * 6).fetchone()
        
        conn.close()
        
        local_now = get_local_time()
        utc_now = local_now.astimezone(UTC_TIMEZONE)
        
        return jsonify({
            'status': 'success',
            'data': all_data,
            'statistics': dict(stats) if stats else {},
            'filters_applied': {
                'entities': entities if entities else None,
                'date': date_param if date_param else None,
                'hours': hours if hours else None,
                'limit': limit if limit else None
            },
            'record_counts': {
                'spam_actions': len(all_data['spam_actions']),
                'inbox_actions': len(all_data['inbox_actions']),
                'spam_domains': len(all_data['spam_domains']),
                'inbox_domains': len(all_data['inbox_domains']),
                'total': len(all_data['spam_actions']) + len(all_data['inbox_actions']) + 
                        len(all_data['spam_domains']) + len(all_data['inbox_domains'])
            },
            'time_info': {
                'current_utc': utc_now.isoformat(),
                'current_local': local_now.isoformat(),
                'current_local_formatted': local_now.strftime('%d-%m-%Y %H:%M:%S'),
                'timezone': str(LOCAL_TIMEZONE),
                'note': 'All timestamps in database are in local timezone (Europe/Paris)'
            },
            'metadata': {
                'timestamp': local_now.isoformat(),
                'data_format': 'file_compatible',
                'filtering_enabled': True,
                'backward_compatible': True
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== RELATIONSHIPS ENDPOINT ====================

@app.route('/api/inbox-relationships')
def inbox_relationships():
    """Get inbox relationships (from_name -> domains) with optional filtering"""
    try:
        # Get filter parameters
        entities_param = request.args.get('entities', '')
        date_param = request.args.get('date', '')
        
        entities = [e.strip() for e in entities_param.split(',') if e.strip()] if entities_param else []
        
        where_clauses = []
        params = []
        
        if entities:
            entity_conditions = []
            for entity in entities:
                entity_conditions.append("session LIKE ?")
                params.append(f'{entity}%')
            where_clauses.append(f"({' OR '.join(entity_conditions)})")
        
        if date_param:
            try:
                date_obj = datetime.strptime(date_param, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d-%m-%Y')
                where_clauses.append("timestamp LIKE ?")
                params.append(f'{formatted_date}%')
            except ValueError:
                pass
        
        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        
        conn = get_db_connection()
        
        query = f'''
            SELECT sender as from_name, domain, COUNT(*) as count
            FROM inbox_domains
            WHERE {where_sql} AND sender IS NOT NULL AND domain IS NOT NULL
            GROUP BY sender, domain
            ORDER BY count DESC
        '''
        
        relationships = conn.execute(query, params).fetchall()
        conn.close()
        
        result = [{
            'fromName': row['from_name'],
            'domain': row['domain'],
            'count': row['count']
        } for row in relationships]
        
        return jsonify({
            'status': 'success',
            'data': result,
            'count': len(result)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Enhanced Gmail Analytics API with Filtering")
    print("=" * 60)
    print(f"Database: {DATABASE_PATH}")
    print(f"Timezone: {LOCAL_TIMEZONE}")
    print(f"API Endpoint: http://localhost:5000/api/all-data")
    print("")
    print("Filter Examples:")
    print("  By Entity: ?entities=Entity1,Entity2")
    print("  By Date: ?date=2026-01-23")
    print("  By Hours: ?hours=10,11,12")
    print("  Combined: ?entities=Entity1&date=2026-01-23&hours=10")
    print("  With Limit: ?limit=1000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
