/*
  Warnings:

  - You are about to drop the column `managerId` on the `DiagramTeamLeader` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ManagerTeamLeaderLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT NOT NULL,
    "teamLeaderId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagerTeamLeaderLink_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "DiagramManager" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ManagerTeamLeaderLink_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "DiagramTeamLeader" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiagramTeamLeader" (
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
INSERT INTO "new_DiagramTeamLeader" ("avatarColor", "createdAt", "email", "id", "isActive", "name", "order", "phone", "updatedAt") SELECT "avatarColor", "createdAt", "email", "id", "isActive", "name", "order", "phone", "updatedAt" FROM "DiagramTeamLeader";
DROP TABLE "DiagramTeamLeader";
ALTER TABLE "new_DiagramTeamLeader" RENAME TO "DiagramTeamLeader";
CREATE INDEX "DiagramTeamLeader_order_idx" ON "DiagramTeamLeader"("order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ManagerTeamLeaderLink_managerId_idx" ON "ManagerTeamLeaderLink"("managerId");

-- CreateIndex
CREATE INDEX "ManagerTeamLeaderLink_teamLeaderId_idx" ON "ManagerTeamLeaderLink"("teamLeaderId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerTeamLeaderLink_managerId_teamLeaderId_key" ON "ManagerTeamLeaderLink"("managerId", "teamLeaderId");
