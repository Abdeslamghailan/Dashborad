import prisma from './src/db.js';

async function approveAdmin() {
  try {
    await prisma.user.updateMany({
      where: { role: 'ADMIN' },
      data: { isApproved: true }
    });
    console.log('All admins approved.');
  } catch (error) {
    console.error('Error approving admins:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveAdmin();
