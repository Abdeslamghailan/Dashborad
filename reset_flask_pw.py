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
    u = User.query.filter_by(username='admin').first()
    if u:
        print(f"Found user: {u.username}, role: {u.role}")
        # Reset to a known password
        new_password = "dropflow_admin_2024"
        u.password = generate_password_hash(new_password)
        u.role = 'admin'
        db.session.commit()
        # Verify it worked
        u2 = User.query.filter_by(username='admin').first()
        ok = check_password_hash(u2.password, new_password)
        print(f"Password reset successful: {ok}")
        print(f"New password set to: {new_password}")
    else:
        # Create admin user if somehow missing
        admin = User(username='admin', role='admin')
        admin.password = generate_password_hash("dropflow_admin_2024")
        db.session.add(admin)
        db.session.commit()
        print("Admin user created with password: dropflow_admin_2024")
