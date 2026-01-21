/**
 * Data Export Script - Exports all database data to JSON files
 * Use this to backup data before migrating to a new database
 * 
 * Run with: npx tsx export-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function exportData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = path.join(__dirname, `data-export-${timestamp}`);
  
  // Create export directory
  fs.mkdirSync(exportDir, { recursive: true });
  console.log(`📁 Created export directory: ${exportDir}`);

  try {
    // Export Users
    console.log('📤 Exporting Users...');
    const users = await prisma.user.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`   ✅ Exported ${users.length} users`);

    // Export Entities
    console.log('📤 Exporting Entities...');
    const entities = await prisma.entity.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'entities.json'),
      JSON.stringify(entities, null, 2)
    );
    console.log(`   ✅ Exported ${entities.length} entities`);

    // Export Entity Access
    console.log('📤 Exporting Entity Access...');
    const entityAccess = await prisma.entityAccess.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'entity-access.json'),
      JSON.stringify(entityAccess, null, 2)
    );
    console.log(`   ✅ Exported ${entityAccess.length} entity access records`);

    // Export Proxy Servers
    console.log('📤 Exporting Proxy Servers...');
    const proxyServers = await prisma.proxyServer.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'proxy-servers.json'),
      JSON.stringify(proxyServers, null, 2)
    );
    console.log(`   ✅ Exported ${proxyServers.length} proxy servers`);

    // Export Proxy Partition
    console.log('📤 Exporting Proxy Partition...');
    const proxyPartition = await prisma.proxyPartition.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'proxy-partition.json'),
      JSON.stringify(proxyPartition, null, 2)
    );
    console.log(`   ✅ Exported ${proxyPartition.length} proxy partition records`);

    // Export Change History
    console.log('📤 Exporting Change History...');
    const changeHistory = await prisma.changeHistory.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'change-history.json'),
      JSON.stringify(changeHistory, null, 2)
    );
    console.log(`   ✅ Exported ${changeHistory.length} change history records`);

    // Export Teams
    console.log('📤 Exporting Teams...');
    const teams = await prisma.team.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'teams.json'),
      JSON.stringify(teams, null, 2)
    );
    console.log(`   ✅ Exported ${teams.length} teams`);

    // Export Mailers
    console.log('📤 Exporting Mailers...');
    const mailers = await prisma.mailer.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'mailers.json'),
      JSON.stringify(mailers, null, 2)
    );
    console.log(`   ✅ Exported ${mailers.length} mailers`);

    // Export Planning Schedules
    console.log('📤 Exporting Planning Schedules...');
    const planningSchedules = await prisma.planningSchedule.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'planning-schedules.json'),
      JSON.stringify(planningSchedules, null, 2)
    );
    console.log(`   ✅ Exported ${planningSchedules.length} planning schedules`);

    // Export Planning Assignments
    console.log('📤 Exporting Planning Assignments...');
    const planningAssignments = await prisma.planningAssignment.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'planning-assignments.json'),
      JSON.stringify(planningAssignments, null, 2)
    );
    console.log(`   ✅ Exported ${planningAssignments.length} planning assignments`);

    // Export Planning Presets
    console.log('📤 Exporting Planning Presets...');
    const planningPresets = await prisma.planningPreset.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'planning-presets.json'),
      JSON.stringify(planningPresets, null, 2)
    );
    console.log(`   ✅ Exported ${planningPresets.length} planning presets`);

    console.log(`   ✅ Exported ${planningPresets.length} planning presets`);

    // Export Day Plans
    console.log('📤 Exporting Day Plans...');
    const dayPlans = await prisma.dayPlan.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'day-plans.json'),
      JSON.stringify(dayPlans, null, 2)
    );
    console.log(`   ✅ Exported ${dayPlans.length} day plans`);

    // Export Scripts
    console.log('📤 Exporting Scripts...');
    const scripts = await prisma.script.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'scripts.json'),
      JSON.stringify(scripts, null, 2)
    );
    console.log(`   ✅ Exported ${scripts.length} scripts`);

    // Export Scenarios
    console.log('📤 Exporting Scenarios...');
    const scenarios = await prisma.scenario.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'scenarios.json'),
      JSON.stringify(scenarios, null, 2)
    );
    console.log(`   ✅ Exported ${scenarios.length} scenarios`);

    console.log('\n✅ =============================================');
    console.log('✅ DATA EXPORT COMPLETE!');
    console.log(`✅ All data exported to: ${exportDir}`);
    console.log('✅ =============================================\n');

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
