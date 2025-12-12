import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const entities = await prisma.entity.findMany();
  console.log('Entities:', entities);
  
  const accesses = await prisma.entityAccess.findMany();
  console.log('Entity Accesses:', accesses);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
