import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('🔍 Checking database for admin user...\n');

    // Find admin user
    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'admin' },
          { role: 'ADMIN' }
        ]
      }
    });

    if (!admin) {
      console.log('❌ No admin user found in database!');
      console.log('\n📝 Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await prisma.user.create({
        data: {
          telegramId: 'admin_local',
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          isApproved: true
        }
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('✅ Admin user found:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${admin.username || 'N/A'}`);
      console.log(`   Telegram ID: ${admin.telegramId}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Approved: ${admin.isApproved}`);
      console.log(`   Has Password: ${admin.password ? 'Yes' : 'No'}`);
      
      if (!admin.password) {
        console.log('\n⚠️  Admin user has no password! Setting password to "admin123"...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.update({
          where: { id: admin.id },
          data: { password: hashedPassword }
        });
        console.log('✅ Password set successfully!');
      }
      
      if (!admin.isApproved) {
        console.log('\n⚠️  Admin user is not approved! Approving...');
        await prisma.user.update({
          where: { id: admin.id },
          data: { isApproved: true }
        });
        console.log('✅ Admin user approved!');
      }
    }

    console.log('\n✅ Database check complete!');
    console.log('\nYou can now login with:');
    console.log('   Username: admin');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
