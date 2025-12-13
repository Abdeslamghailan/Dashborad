-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityAccess" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "EntityAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyPartition" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyPartition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeHistory" (
    "id" SERIAL NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "fieldChanged" TEXT,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyServer" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "ips" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mailer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningSchedule" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isNext" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningAssignment" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "mailerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "taskCode" TEXT NOT NULL,
    "taskColor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "PlanningAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningPreset" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "codes" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramManager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "portalId" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagramManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramTeamLeader" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "portalId" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagramTeamLeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerTeamLeaderLink" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "teamLeaderId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerTeamLeaderLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "teamLeaderId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagramTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramMailerAssignment" (
    "id" TEXT NOT NULL,
    "mailerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagramMailerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessionData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityAccess_userId_entityId_key" ON "EntityAccess"("userId", "entityId");

-- CreateIndex
CREATE INDEX "ChangeHistory_entityId_createdAt_idx" ON "ChangeHistory"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeHistory_entityType_createdAt_idx" ON "ChangeHistory"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "ProxyServer_entityId_idx" ON "ProxyServer"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_order_idx" ON "Team"("order");

-- CreateIndex
CREATE INDEX "Mailer_teamId_order_idx" ON "Mailer"("teamId", "order");

-- CreateIndex
CREATE INDEX "PlanningSchedule_weekStart_idx" ON "PlanningSchedule"("weekStart");

-- CreateIndex
CREATE INDEX "PlanningSchedule_isCurrent_isNext_idx" ON "PlanningSchedule"("isCurrent", "isNext");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningSchedule_year_weekNumber_key" ON "PlanningSchedule"("year", "weekNumber");

-- CreateIndex
CREATE INDEX "PlanningAssignment_scheduleId_dayOfWeek_idx" ON "PlanningAssignment"("scheduleId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "PlanningAssignment_mailerId_idx" ON "PlanningAssignment"("mailerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningAssignment_scheduleId_mailerId_dayOfWeek_key" ON "PlanningAssignment"("scheduleId", "mailerId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningPreset_label_key" ON "PlanningPreset"("label");

-- CreateIndex
CREATE INDEX "PlanningPreset_order_idx" ON "PlanningPreset"("order");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramManager_name_key" ON "DiagramManager"("name");

-- CreateIndex
CREATE INDEX "DiagramManager_order_idx" ON "DiagramManager"("order");

-- CreateIndex
CREATE INDEX "DiagramTeamLeader_order_idx" ON "DiagramTeamLeader"("order");

-- CreateIndex
CREATE INDEX "ManagerTeamLeaderLink_managerId_idx" ON "ManagerTeamLeaderLink"("managerId");

-- CreateIndex
CREATE INDEX "ManagerTeamLeaderLink_teamLeaderId_idx" ON "ManagerTeamLeaderLink"("teamLeaderId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerTeamLeaderLink_managerId_teamLeaderId_key" ON "ManagerTeamLeaderLink"("managerId", "teamLeaderId");

-- CreateIndex
CREATE INDEX "DiagramTeam_teamLeaderId_order_idx" ON "DiagramTeam"("teamLeaderId", "order");

-- CreateIndex
CREATE INDEX "DiagramMailerAssignment_teamId_idx" ON "DiagramMailerAssignment"("teamId");

-- CreateIndex
CREATE INDEX "DiagramMailerAssignment_mailerId_idx" ON "DiagramMailerAssignment"("mailerId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramMailerAssignment_mailerId_teamId_key" ON "DiagramMailerAssignment"("mailerId", "teamId");

-- CreateIndex
CREATE INDEX "DayPlan_entityId_date_idx" ON "DayPlan"("entityId", "date");

-- CreateIndex
CREATE INDEX "DayPlan_categoryId_idx" ON "DayPlan"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_entityId_categoryId_date_key" ON "DayPlan"("entityId", "categoryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Script_name_key" ON "Script"("name");

-- CreateIndex
CREATE INDEX "Script_order_idx" ON "Script"("order");

-- CreateIndex
CREATE INDEX "Script_isActive_idx" ON "Script"("isActive");

-- CreateIndex
CREATE INDEX "Scenario_scriptId_idx" ON "Scenario"("scriptId");

-- CreateIndex
CREATE INDEX "Scenario_order_idx" ON "Scenario"("order");

-- CreateIndex
CREATE INDEX "Scenario_isActive_idx" ON "Scenario"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_scriptId_name_key" ON "Scenario"("scriptId", "name");

-- AddForeignKey
ALTER TABLE "EntityAccess" ADD CONSTRAINT "EntityAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAccess" ADD CONSTRAINT "EntityAccess_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeHistory" ADD CONSTRAINT "ChangeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyServer" ADD CONSTRAINT "ProxyServer_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mailer" ADD CONSTRAINT "Mailer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAssignment" ADD CONSTRAINT "PlanningAssignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PlanningSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAssignment" ADD CONSTRAINT "PlanningAssignment_mailerId_fkey" FOREIGN KEY ("mailerId") REFERENCES "Mailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramManager" ADD CONSTRAINT "DiagramManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramTeamLeader" ADD CONSTRAINT "DiagramTeamLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerTeamLeaderLink" ADD CONSTRAINT "ManagerTeamLeaderLink_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "DiagramManager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerTeamLeaderLink" ADD CONSTRAINT "ManagerTeamLeaderLink_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "DiagramTeamLeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramTeam" ADD CONSTRAINT "DiagramTeam_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "DiagramTeamLeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramMailerAssignment" ADD CONSTRAINT "DiagramMailerAssignment_mailerId_fkey" FOREIGN KEY ("mailerId") REFERENCES "Mailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramMailerAssignment" ADD CONSTRAINT "DiagramMailerAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DiagramTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;
