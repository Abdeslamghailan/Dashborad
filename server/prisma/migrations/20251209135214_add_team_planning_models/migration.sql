-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Mailer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mailer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanningSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isNext" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanningAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "mailerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "taskCode" TEXT NOT NULL,
    "taskColor" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "PlanningAssignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PlanningSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanningAssignment_mailerId_fkey" FOREIGN KEY ("mailerId") REFERENCES "Mailer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
