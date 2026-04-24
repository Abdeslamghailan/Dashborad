import sys
import os
sys.path.append('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')
os.chdir('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')

from backend import create_app
from backend.extensions import db
from backend.models import User
from werkzeug.security import generate_password_hash, check_password_hash

app = create_app()
with app.app_context():
    # List all users to see what's there
    users = User.query.all()
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"  - username: '{u.username}', role: '{u.role}'")
    
    # Try to verify manually
    u = User.query.first()
    if u:
        correct = check_password_hash(u.password, "dropflow_admin_2024")
        correct2 = check_password_hash(u.password, "admin")
        print(f"\nPassword check 'dropflow_admin_2024': {correct}")
        print(f"Password check 'admin': {correct2}")
        
        # Try to find the login method on the User model
        if hasattr(u, 'check_password'):
            print(f"check_password method exists, testing: {u.check_password('dropflow_admin_2024')}")
