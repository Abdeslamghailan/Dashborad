import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const entities = await prisma.entity.findMany({
    select: { id: true, name: true }
  });
  console.log('Entities:', JSON.stringify(entities, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
