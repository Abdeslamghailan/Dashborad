import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- DATABASE CHECK ---');
  try {
    const allCount = await prisma.changeHistory.count();
    console.log('Total ChangeHistory:', allCount);

    const intervalEntries = await prisma.changeHistory.findMany({
      where: {
        fieldChanged: { contains: 'intervals' }
      },
      take: 5
    });
    console.log('Interval entries sample:', JSON.stringify(intervalEntries, null, 2));

    const specificCheck = await prisma.changeHistory.findMany({
        where: {
            fieldChanged: { contains: 'intervals Quality' }
        },
        take: 2
    });
    console.log('Specific "intervals Quality" check:', JSON.stringify(specificCheck, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
