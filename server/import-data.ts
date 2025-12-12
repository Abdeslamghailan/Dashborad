/**
 * Data Import Script - Imports JSON data into the database
 * Use this to restore data after migrating to a new database (PostgreSQL on Railway)
 * 
 * Run with: npx tsx import-data.ts <export-folder-path>
 * Example: npx tsx import-data.ts ./data-export-2025-12-12T15-30-00-000Z
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function loadJson(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️ File not found: ${filePath}, skipping...`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function importData(exportDir: string) {
  console.log(`📁 Importing data from: ${exportDir}`);
  
  if (!fs.existsSync(exportDir)) {
    console.error(`❌ Export directory not found: ${exportDir}`);
    process.exit(1);
  }

  try {
    // Import Users (without IDs to let PostgreSQL auto-generate them)
    console.log('📥 Importing Users...');
    const users = loadJson(path.join(exportDir, 'users.json'));
    for (const user of users) {
      await prisma.user.upsert({
        where: { telegramId: user.telegramId },
        update: {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          password: user.password,
          role: user.role,
          isApproved: user.isApproved,
        },
        create: {
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
          password: user.password,
          role: user.role,
          isApproved: user.isApproved,
        }
      });
    }
    console.log(`   ✅ Imported ${users.length} users`);

    // Import Entities
    console.log('📥 Importing Entities...');
    const entities = loadJson(path.join(exportDir, 'entities.json'));
    for (const entity of entities) {
      await prisma.entity.upsert({
        where: { id: entity.id },
        update: {
          name: entity.name,
          data: entity.data,
        },
        create: {
          id: entity.id,
          name: entity.name,
          data: entity.data,
        }
      });
    }
    console.log(`   ✅ Imported ${entities.length} entities`);

    // Import Proxy Servers
    console.log('📥 Importing Proxy Servers...');
    const proxyServers = loadJson(path.join(exportDir, 'proxy-servers.json'));
    for (const proxy of proxyServers) {
      await prisma.proxyServer.upsert({
        where: { id: proxy.id },
        update: {
          entityId: proxy.entityId,
          serverName: proxy.serverName,
          ips: proxy.ips,
          status: proxy.status,
        },
        create: {
          id: proxy.id,
          entityId: proxy.entityId,
          serverName: proxy.serverName,
          ips: proxy.ips,
          status: proxy.status,
        }
      });
    }
    console.log(`   ✅ Imported ${proxyServers.length} proxy servers`);

    // Import Proxy Partition
    console.log('📥 Importing Proxy Partition...');
    const proxyPartition = loadJson(path.join(exportDir, 'proxy-partition.json'));
    for (const partition of proxyPartition) {
      await prisma.proxyPartition.upsert({
        where: { id: partition.id },
        update: { data: partition.data },
        create: { id: partition.id, data: partition.data }
      });
    }
    console.log(`   ✅ Imported ${proxyPartition.length} proxy partition records`);

    // Import Teams
    console.log('📥 Importing Teams...');
    const teams = loadJson(path.join(exportDir, 'teams.json'));
    for (const team of teams) {
      await prisma.team.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          displayName: team.displayName,
          order: team.order,
          color: team.color,
        },
        create: {
          id: team.id,
          name: team.name,
          displayName: team.displayName,
          order: team.order,
          color: team.color,
        }
      });
    }
    console.log(`   ✅ Imported ${teams.length} teams`);

    // Import Mailers
    console.log('📥 Importing Mailers...');
    const mailers = loadJson(path.join(exportDir, 'mailers.json'));
    for (const mailer of mailers) {
      await prisma.mailer.upsert({
        where: { id: mailer.id },
        update: {
          name: mailer.name,
          teamId: mailer.teamId,
          order: mailer.order,
          isActive: mailer.isActive,
        },
        create: {
          id: mailer.id,
          name: mailer.name,
          teamId: mailer.teamId,
          order: mailer.order,
          isActive: mailer.isActive,
        }
      });
    }
    console.log(`   ✅ Imported ${mailers.length} mailers`);

    // Import Planning Schedules
    console.log('📥 Importing Planning Schedules...');
    const planningSchedules = loadJson(path.join(exportDir, 'planning-schedules.json'));
    for (const schedule of planningSchedules) {
      await prisma.planningSchedule.upsert({
        where: { id: schedule.id },
        update: {
          weekStart: new Date(schedule.weekStart),
          weekEnd: new Date(schedule.weekEnd),
          weekNumber: schedule.weekNumber,
          year: schedule.year,
          isCurrent: schedule.isCurrent,
          isNext: schedule.isNext,
        },
        create: {
          id: schedule.id,
          weekStart: new Date(schedule.weekStart),
          weekEnd: new Date(schedule.weekEnd),
          weekNumber: schedule.weekNumber,
          year: schedule.year,
          isCurrent: schedule.isCurrent,
          isNext: schedule.isNext,
        }
      });
    }
    console.log(`   ✅ Imported ${planningSchedules.length} planning schedules`);

    // Import Planning Assignments
    console.log('📥 Importing Planning Assignments...');
    const planningAssignments = loadJson(path.join(exportDir, 'planning-assignments.json'));
    for (const assignment of planningAssignments) {
      await prisma.planningAssignment.upsert({
        where: { id: assignment.id },
        update: {
          scheduleId: assignment.scheduleId,
          mailerId: assignment.mailerId,
          dayOfWeek: assignment.dayOfWeek,
          taskCode: assignment.taskCode,
          taskColor: assignment.taskColor,
          notes: assignment.notes,
          createdBy: assignment.createdBy,
          updatedBy: assignment.updatedBy,
        },
        create: {
          id: assignment.id,
          scheduleId: assignment.scheduleId,
          mailerId: assignment.mailerId,
          dayOfWeek: assignment.dayOfWeek,
          taskCode: assignment.taskCode,
          taskColor: assignment.taskColor,
          notes: assignment.notes,
          createdBy: assignment.createdBy,
          updatedBy: assignment.updatedBy,
        }
      });
    }
    console.log(`   ✅ Imported ${planningAssignments.length} planning assignments`);

    // Import Planning Presets
    console.log('📥 Importing Planning Presets...');
    const planningPresets = loadJson(path.join(exportDir, 'planning-presets.json'));
    for (const preset of planningPresets) {
      await prisma.planningPreset.upsert({
        where: { id: preset.id },
        update: {
          label: preset.label,
          codes: preset.codes,
          color: preset.color,
          order: preset.order,
        },
        create: {
          id: preset.id,
          label: preset.label,
          codes: preset.codes,
          color: preset.color,
          order: preset.order,
        }
      });
    }
    console.log(`   ✅ Imported ${planningPresets.length} planning presets`);

    // Import Diagram Managers
    console.log('📥 Importing Diagram Managers...');
    const diagramManagers = loadJson(path.join(exportDir, 'diagram-managers.json'));
    for (const manager of diagramManagers) {
      await prisma.diagramManager.upsert({
        where: { id: manager.id },
        update: {
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          avatarColor: manager.avatarColor,
          order: manager.order,
          isActive: manager.isActive,
          portalId: manager.portalId,
        },
        create: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          avatarColor: manager.avatarColor,
          order: manager.order,
          isActive: manager.isActive,
          portalId: manager.portalId,
        }
      });
    }
    console.log(`   ✅ Imported ${diagramManagers.length} diagram managers`);

    // Import Diagram Team Leaders
    console.log('📥 Importing Diagram Team Leaders...');
    const diagramTeamLeaders = loadJson(path.join(exportDir, 'diagram-team-leaders.json'));
    for (const leader of diagramTeamLeaders) {
      await prisma.diagramTeamLeader.upsert({
        where: { id: leader.id },
        update: {
          name: leader.name,
          email: leader.email,
          phone: leader.phone,
          avatarColor: leader.avatarColor,
          order: leader.order,
          isActive: leader.isActive,
          portalId: leader.portalId,
        },
        create: {
          id: leader.id,
          name: leader.name,
          email: leader.email,
          phone: leader.phone,
          avatarColor: leader.avatarColor,
          order: leader.order,
          isActive: leader.isActive,
          portalId: leader.portalId,
        }
      });
    }
    console.log(`   ✅ Imported ${diagramTeamLeaders.length} diagram team leaders`);

    // Import Manager Team Leader Links
    console.log('📥 Importing Manager Team Leader Links...');
    const links = loadJson(path.join(exportDir, 'manager-team-leader-links.json'));
    for (const link of links) {
      await prisma.managerTeamLeaderLink.upsert({
        where: { id: link.id },
        update: {
          managerId: link.managerId,
          teamLeaderId: link.teamLeaderId,
          isPrimary: link.isPrimary,
        },
        create: {
          id: link.id,
          managerId: link.managerId,
          teamLeaderId: link.teamLeaderId,
          isPrimary: link.isPrimary,
        }
      });
    }
    console.log(`   ✅ Imported ${links.length} manager-team leader links`);

    // Import Diagram Teams
    console.log('📥 Importing Diagram Teams...');
    const diagramTeams = loadJson(path.join(exportDir, 'diagram-teams.json'));
    for (const team of diagramTeams) {
      await prisma.diagramTeam.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          description: team.description,
          color: team.color,
          teamLeaderId: team.teamLeaderId,
          order: team.order,
          isActive: team.isActive,
        },
        create: {
          id: team.id,
          name: team.name,
          description: team.description,
          color: team.color,
          teamLeaderId: team.teamLeaderId,
          order: team.order,
          isActive: team.isActive,
        }
      });
    }
    console.log(`   ✅ Imported ${diagramTeams.length} diagram teams`);

    // Import Diagram Mailer Assignments
    console.log('📥 Importing Diagram Mailer Assignments...');
    const diagramMailerAssignments = loadJson(path.join(exportDir, 'diagram-mailer-assignments.json'));
    for (const assignment of diagramMailerAssignments) {
      await prisma.diagramMailerAssignment.upsert({
        where: { id: assignment.id },
        update: {
          mailerId: assignment.mailerId,
          teamId: assignment.teamId,
          role: assignment.role,
          isPrimary: assignment.isPrimary,
          joinedAt: new Date(assignment.joinedAt),
        },
        create: {
          id: assignment.id,
          mailerId: assignment.mailerId,
          teamId: assignment.teamId,
          role: assignment.role,
          isPrimary: assignment.isPrimary,
          joinedAt: new Date(assignment.joinedAt),
        }
      });
    }
    console.log(`   ✅ Imported ${diagramMailerAssignments.length} diagram mailer assignments`);

    // Import Day Plans
    console.log('📥 Importing Day Plans...');
    const dayPlans = loadJson(path.join(exportDir, 'day-plans.json'));
    for (const plan of dayPlans) {
      await prisma.dayPlan.upsert({
        where: { id: plan.id },
        update: {
          entityId: plan.entityId,
          categoryId: plan.categoryId,
          date: new Date(plan.date),
          sessionData: plan.sessionData,
          createdBy: plan.createdBy,
          updatedBy: plan.updatedBy,
        },
        create: {
          id: plan.id,
          entityId: plan.entityId,
          categoryId: plan.categoryId,
          date: new Date(plan.date),
          sessionData: plan.sessionData,
          createdBy: plan.createdBy,
          updatedBy: plan.updatedBy,
        }
      });
    }
    console.log(`   ✅ Imported ${dayPlans.length} day plans`);

    // Import Scripts
    console.log('📥 Importing Scripts...');
    const scripts = loadJson(path.join(exportDir, 'scripts.json'));
    for (const script of scripts) {
      await prisma.script.upsert({
        where: { id: script.id },
        update: {
          name: script.name,
          description: script.description,
          order: script.order,
          isActive: script.isActive,
        },
        create: {
          id: script.id,
          name: script.name,
          description: script.description,
          order: script.order,
          isActive: script.isActive,
        }
      });
    }
    console.log(`   ✅ Imported ${scripts.length} scripts`);

    // Import Scenarios
    console.log('📥 Importing Scenarios...');
    const scenarios = loadJson(path.join(exportDir, 'scenarios.json'));
    for (const scenario of scenarios) {
      await prisma.scenario.upsert({
        where: { id: scenario.id },
        update: {
          name: scenario.name,
          scriptId: scenario.scriptId,
          description: scenario.description,
          order: scenario.order,
          isActive: scenario.isActive,
        },
        create: {
          id: scenario.id,
          name: scenario.name,
          scriptId: scenario.scriptId,
          description: scenario.description,
          order: scenario.order,
          isActive: scenario.isActive,
        }
      });
    }
    console.log(`   ✅ Imported ${scenarios.length} scenarios`);

    console.log('\n✅ =============================================');
    console.log('✅ DATA IMPORT COMPLETE!');
    console.log('✅ =============================================\n');

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get export directory from command line argument
const exportDir = process.argv[2];
if (!exportDir) {
  console.error('❌ Please provide the export directory path');
  console.error('Usage: npx tsx import-data.ts <export-folder-path>');
  console.error('Example: npx tsx import-data.ts ./data-export-2025-12-12T15-30-00-000Z');
  process.exit(1);
}

importData(exportDir);
