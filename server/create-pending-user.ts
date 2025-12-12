import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating fake pending user...');

  const user = await prisma.user.create({
    data: {
      telegramId: 'fake_pending_user_' + Date.now(),
      username: 'pending_guy',
      firstName: 'Pending',
      lastName: 'Guy',
      role: 'USER',
      isApproved: false
    }
  });

  console.log('✅ Created user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
