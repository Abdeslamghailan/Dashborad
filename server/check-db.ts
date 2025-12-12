import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- USERS ---');
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ ...u, password: u.password ? 'SET' : 'NULL' })));

  console.log('\n--- ENTITIES ---');
  const entities = await prisma.entity.findMany();
  console.log(entities);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
