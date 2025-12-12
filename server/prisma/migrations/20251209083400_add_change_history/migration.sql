-- CreateTable
CREATE TABLE "ChangeHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChangeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChangeHistory_entityId_createdAt_idx" ON "ChangeHistory"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ChangeHistory_entityType_createdAt_idx" ON "ChangeHistory"("entityType", "createdAt");
