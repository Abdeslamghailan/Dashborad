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
        print(f"Fixing user: {u.username}, current role: {u.role}")
        u.role = 'admin'
        db.session.commit()
        print("Role updated to admin.")
    else:
        print("Admin user not found in DB.")
