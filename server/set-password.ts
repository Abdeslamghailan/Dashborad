import prisma from './src/db.js';
import bcrypt from 'bcryptjs';

async function setAdminPassword() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: npx tsx set-password.ts <username> <password>');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.updateMany({
      where: { username },
      data: { password: hashedPassword, role: 'ADMIN' }
    });

    if (user.count === 0) {
      console.error(`User with username "${username}" not found.`);
      
      // Option to create if not exists
      console.log('Creating new admin user...');
      await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'ADMIN',
          telegramId: `admin_${Date.now()}` // Temporary telegram ID
        }
      });
      console.log('Admin user created successfully.');
    } else {
      console.log(`Password updated for user "${username}".`);
    }
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();
