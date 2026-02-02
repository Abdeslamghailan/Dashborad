import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.resolve(rootDir, 'server', 'prisma');

const sourceSchema = path.resolve(prismaDir, 'schema.postgresql.prisma');
const targetSchema = path.resolve(prismaDir, 'schema.prisma');

console.log('🔄 Setting up Prisma for production...');
console.log(`📂 Root: ${rootDir}`);
console.log(`📂 Prisma Dir: ${prismaDir}`);

try {
  // 1. Copy schema file
  if (!fs.existsSync(sourceSchema)) {
    console.error(`❌ Source schema NOT found: ${sourceSchema}`);
    process.exit(1);
  }

  console.log(`📂 Copying schema...`);
  fs.copyFileSync(sourceSchema, targetSchema);
  console.log('✅ Schema copied successfully.');

  // 2. Run prisma generate
  console.log('⚙️ Running prisma generate...');
  
  // Choose command based on platform
  const prismaCmd = process.platform === 'win32' ? 'npx prisma generate' : 'npx prisma generate';
  
  execSync(`${prismaCmd} --schema="${targetSchema}"`, { 
    cwd: rootDir, 
    stdio: 'inherit',
    env: { 
        ...process.env, 
        FORCE_COLOR: '1',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy' // Dummy URL just for generation
    }
  });
  console.log('✅ Prisma client generated successfully.');

} catch (error) {
  console.error('❌ Error setting up Prisma:', error.message);
  process.exit(1);
}
