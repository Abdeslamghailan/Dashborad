
import prisma from './src/db';

async function testStopPlan() {
  console.log('🧪 Starting Test: Stop Plan Persistence');

  const testId = 'ent_test_stop_plan';
  
  // 1. Clean up previous test
  try {
    await prisma.entity.delete({ where: { id: testId } });
  } catch (e) {}

  // 2. Create Entity with ACTIVE plan
  console.log('1. Creating entity with ACTIVE plan...');
  const initialData = {
    status: 'active',
    reporting: {
      parentCategories: [
        {
          id: 'cat_1',
          name: 'Test Category',
          profiles: [],
          planConfiguration: {
            drops: [],
            seeds: 100,
            timeConfig: { startTime: '09:00', endTime: '18:00' },
            scriptName: 'Test Script',
            scenario: 'Test Scenario',
            status: 'active', // <--- ACTIVE
            mode: 'auto'
          }
        }
      ]
    },
    limitsConfiguration: [],
    notes: ''
  };

  await prisma.entity.create({
    data: {
      id: testId,
      name: 'Test Stop Plan',
      data: JSON.stringify(initialData)
    }
  });

  // 3. Verify Active
  const created = await prisma.entity.findUnique({ where: { id: testId } });
  const createdData = JSON.parse(created?.data || '{}');
  console.log('   Current Status:', createdData.reporting.parentCategories[0].planConfiguration.status);

  if (createdData.reporting.parentCategories[0].planConfiguration.status !== 'active') {
    console.error('❌ Failed: Initial status is not active');
    return;
  }

  // 4. Update to STOPPED
  console.log('2. Updating to STOPPED...');
  
  // Simulate what the frontend sends: The WHOLE reporting object with the change
  const updatedReporting = {
    ...createdData.reporting,
  };
  updatedReporting.parentCategories[0].planConfiguration.status = 'stopped'; // <--- CHANGE TO STOPPED

  const updateData = {
    ...createdData,
    reporting: updatedReporting
  };

  await prisma.entity.update({
    where: { id: testId },
    data: {
      data: JSON.stringify(updateData)
    }
  });

  // 5. Verify Stopped
  const updated = await prisma.entity.findUnique({ where: { id: testId } });
  const updatedData = JSON.parse(updated?.data || '{}');
  const newStatus = updatedData.reporting.parentCategories[0].planConfiguration.status;
  
  console.log('   New Status:', newStatus);

  if (newStatus === 'stopped') {
    console.log('✅ SUCCESS: Plan status updated to STOPPED correctly.');
  } else {
    console.error('❌ FAILED: Plan status did NOT update. Still:', newStatus);
  }

  // Cleanup
  await prisma.entity.delete({ where: { id: testId } });
}

testStopPlan()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
