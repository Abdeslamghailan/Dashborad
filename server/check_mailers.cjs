
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const mailers = await prisma.mailer.findMany({
    include: { team: true }
  });
  console.log(JSON.stringify(mailers, null, 2));
  await prisma.$disconnect();
}

check();
