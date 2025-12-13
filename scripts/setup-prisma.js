import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const prismaDir = path.join(serverDir, 'prisma');

const sourceSchema = path.join(prismaDir, 'schema.postgresql.prisma');
const targetSchema = path.join(prismaDir, 'schema.prisma');

console.log('🔄 Setting up Prisma for production...');

try {
  // 1. Copy schema file
  console.log(`📂 Copying ${sourceSchema} to ${targetSchema}...`);
  fs.copyFileSync(sourceSchema, targetSchema);
  console.log('✅ Schema copied successfully.');

  // 2. Run prisma generate
  console.log('⚙️ Running prisma generate...');
  // Use npx to ensure we use the local prisma binary
  // Add --no-engine if we want to save space, but we need the engine for the runtime
  execSync(`npx prisma generate --schema="${targetSchema}"`, { 
    cwd: rootDir, 
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  console.log('✅ Prisma client generated successfully.');

} catch (error) {
  console.error('❌ Error setting up Prisma:', error);
  process.exit(1);
}
