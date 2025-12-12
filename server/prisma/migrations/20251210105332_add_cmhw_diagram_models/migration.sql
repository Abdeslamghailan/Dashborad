-- CreateTable
CREATE TABLE "DiagramManager" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiagramTeamLeader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarColor" TEXT,
    "managerId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiagramTeamLeader_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "DiagramManager" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagramTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "teamLeaderId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiagramTeam_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "DiagramTeamLeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagramMailerAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mailerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiagramMailerAssignment_mailerId_fkey" FOREIGN KEY ("mailerId") REFERENCES "Mailer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagramMailerAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DiagramTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiagramManager_name_key" ON "DiagramManager"("name");

-- CreateIndex
CREATE INDEX "DiagramManager_order_idx" ON "DiagramManager"("order");

-- CreateIndex
CREATE INDEX "DiagramTeamLeader_managerId_order_idx" ON "DiagramTeamLeader"("managerId", "order");

-- CreateIndex
CREATE INDEX "DiagramTeam_teamLeaderId_order_idx" ON "DiagramTeam"("teamLeaderId", "order");

-- CreateIndex
CREATE INDEX "DiagramMailerAssignment_teamId_idx" ON "DiagramMailerAssignment"("teamId");

-- CreateIndex
CREATE INDEX "DiagramMailerAssignment_mailerId_idx" ON "DiagramMailerAssignment"("mailerId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramMailerAssignment_mailerId_teamId_key" ON "DiagramMailerAssignment"("mailerId", "teamId");
