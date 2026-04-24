import sys
import os
sys.path.append('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')
os.chdir('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')

from backend import create_app
from backend.extensions import db
from backend.models import User

app = create_app()
with app.app_context():
    u = User.query.filter_by(username='admin').first()
    if u:
        print(f"Current admin: username='{u.username}', email='{u.email}', role='{u.role}'")
        
        new_password = "dropflow_admin_2024"
        u.set_password(new_password)
        u.role = 'admin'
        db.session.commit()
        
        # Verify
        ok = u.check_password(new_password)
        print(f"Password reset to '{new_password}' - verified: {ok}")
    else:
        print("No admin user found!")
