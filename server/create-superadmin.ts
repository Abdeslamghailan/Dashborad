import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'superadmin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Creating superadmin user...');

  const user = await prisma.user.upsert({
    where: { telegramId: 'superadmin_id' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
      username: 'superadmin'
    },
    create: {
      telegramId: 'superadmin_id',
      username: 'superadmin',
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
      firstName: 'Super',
      lastName: 'Admin'
    },
  });

  console.log('✅ SuperAdmin created:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
