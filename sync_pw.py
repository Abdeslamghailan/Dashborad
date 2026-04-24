import sys
import os
sys.path.append('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')
os.chdir('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')

from backend import create_app
from backend.extensions import db
from backend.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    u = User.query.filter_by(username='admin').first()
    if u:
        print(f"Setting password for {u.username}")
        # Match the password in .env: cmhw_proxy_2024
        u.password = generate_password_hash("cmhw_proxy_2024")
        u.role = 'admin'
        db.session.commit()
        print("Admin user updated with correct password and role.")
    else:
        print("Admin user not found.")
