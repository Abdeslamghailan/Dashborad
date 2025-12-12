-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Scenario_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
