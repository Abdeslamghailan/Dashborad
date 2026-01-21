import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Resetting password for user: ${username}`);

  try {
    // Find user by username first
    let user = await prisma.user.findFirst({
      where: { username: username }
    });

    if (user) {
      console.log('Found existing admin user, updating password...');
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          isApproved: true
        }
      });
    } else {
      console.log('Creating new admin user...');
      user = await prisma.user.create({
        data: {
          telegramId: 'admin_manual_' + Date.now(),
          username: username,
          password: hashedPassword,
          role: 'ADMIN',
          isApproved: true,
          firstName: 'Admin',
          lastName: 'User'
        }
      });
    }
    console.log('✅ Admin user updated/created successfully:', user);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
