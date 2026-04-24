import sys
import os
sys.path.append('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')
os.chdir('C:/Users/admin_1/Desktop/CMHW-MANAGER-V2')

from backend import create_app
from backend.extensions import db
from backend.models import Entity

app = create_app()
with app.app_context():
    entities = Entity.query.all()
    print(f"Total entities in Flask DB: {len(entities)}")
    for e in entities:
        print(f" - {e.name}")
