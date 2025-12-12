-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "sessionData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiagramManager" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "portalId" TEXT,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiagramManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiagramManager" ("avatarColor", "createdAt", "email", "id", "isActive", "name", "order", "phone", "updatedAt") SELECT "avatarColor", "createdAt", "email", "id", "isActive", "name", "order", "phone", "updatedAt" FROM "DiagramManager";
DROP TABLE "DiagramManager";
ALTER TABLE "new_DiagramManager" RENAME TO "DiagramManager";
CREATE UNIQUE INDEX "DiagramManager_name_key" ON "DiagramManager"("name");
CREATE INDEX "DiagramManager_order_idx" ON "DiagramManager"("order");
CREATE TABLE "new_DiagramTeamLeader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatarColor" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "portalId" TEXT,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiagramTeamLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DiagramTeamLeader" ("avatarColor", "createdAt", "email", "id", "isActive", "name", "order", "phone", "updatedAt") SELECT "avatarColor", "createdAt", "email", "id", "isActive", "name", "order", "phone", "updatedAt" FROM "DiagramTeamLeader";
DROP TABLE "DiagramTeamLeader";
ALTER TABLE "new_DiagramTeamLeader" RENAME TO "DiagramTeamLeader";
CREATE INDEX "DiagramTeamLeader_order_idx" ON "DiagramTeamLeader"("order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DayPlan_entityId_date_idx" ON "DayPlan"("entityId", "date");

-- CreateIndex
CREATE INDEX "DayPlan_categoryId_idx" ON "DayPlan"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_entityId_categoryId_date_key" ON "DayPlan"("entityId", "categoryId", "date");
