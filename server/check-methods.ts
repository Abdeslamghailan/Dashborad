import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMethods() {
  try {
    console.log('🔍 Checking reporting methods in database...\n');

    const methods = await prisma.reportingMethod.findMany({
      orderBy: { order: 'asc' }
    });

    if (methods.length === 0) {
      console.log('❌ No methods found in database!');
      console.log('\n📝 Creating default methods...');
      
      const initialMethods = [
        {
          id: 'desktop',
          name: 'Desktop',
          description: 'Desktop automation and reporting',
          icon: 'Monitor',
          color: '#6366F1',
          gradient: 'from-indigo-500 to-purple-600',
          order: 0
        },
        {
          id: 'webautomate',
          name: 'Webautomate',
          description: 'Web automation and browser control',
          icon: 'Bot',
          color: '#10B981',
          gradient: 'from-emerald-500 to-teal-600',
          order: 1
        },
        {
          id: 'mobile',
          name: 'Mobile',
          description: 'Mobile app automation',
          icon: 'Smartphone',
          color: '#F59E0B',
          gradient: 'from-amber-500 to-orange-600',
          order: 2
        }
      ];

      await prisma.reportingMethod.createMany({
        data: initialMethods
      });
      
      console.log('✅ Default methods created successfully!');
    } else {
      console.log(`✅ Found ${methods.length} reporting methods:`);
      methods.forEach(method => {
        console.log(`   - ${method.name} (${method.id}) - ${method.isActive ? 'Active' : 'Inactive'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMethods();
