import prisma from './src/db.js';

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isApproved: true,
        createdAt: true
      }
    });
    
    console.log('Total users:', users.length);
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
