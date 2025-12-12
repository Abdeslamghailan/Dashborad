import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Creating admin user...');

  const user = await prisma.user.upsert({
    where: { telegramId: 'admin_placeholder' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
      username: 'admin'
    },
    create: {
      telegramId: 'admin_placeholder',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
      isApproved: true,
      firstName: 'Admin',
      lastName: 'User'
    },
  });

  console.log('✅ Admin user created/updated:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
