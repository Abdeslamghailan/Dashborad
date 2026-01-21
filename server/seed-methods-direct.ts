import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'prisma', 'dev.db');

const db = new Database(dbPath);

console.log('🔍 Checking reporting methods...\n');

// Check if methods exist
const methods = db.prepare('SELECT * FROM ReportingMethod ORDER BY "order"').all();

if (methods.length === 0) {
  console.log('❌ No methods found. Creating default methods...\n');
  
  const insert = db.prepare(`
    INSERT INTO ReportingMethod (id, name, description, icon, color, gradient, "order", isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  
  const initialMethods = [
    ['desktop', 'Desktop', 'Desktop automation and reporting', 'Monitor', '#6366F1', 'from-indigo-500 to-purple-600', 0, 1, now, now],
    ['webautomate', 'Webautomate', 'Web automation and browser control', 'Bot', '#10B981', 'from-emerald-500 to-teal-600', 1, 1, now, now],
    ['mobile', 'Mobile', 'Mobile app automation', 'Smartphone', '#F59E0B', 'from-amber-500 to-orange-600', 2, 1, now, now]
  ];

  for (const method of initialMethods) {
    insert.run(...method);
    console.log(`✅ Created method: ${method[1]}`);
  }
  
  console.log('\n✅ All methods created successfully!');
} else {
  console.log(`✅ Found ${methods.length} reporting methods:`);
  methods.forEach((method: any) => {
    console.log(`   - ${method.name} (${method.id}) - ${method.isActive ? 'Active' : 'Inactive'}`);
  });
}

db.close();
