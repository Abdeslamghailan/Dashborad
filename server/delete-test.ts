import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const idToDelete = 'ent_cmh2';
  console.log(`Attempting to delete entity: ${idToDelete}`);

  try {
    const deleted = await prisma.entity.delete({
      where: { id: idToDelete }
    });
    console.log('Deleted successfully:', deleted);
  } catch (error) {
    console.error('Error deleting entity:', error);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
