-- CreateTable
CREATE TABLE "PlanningPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "codes" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanningPreset_label_key" ON "PlanningPreset"("label");

-- CreateIndex
CREATE INDEX "PlanningPreset_order_idx" ON "PlanningPreset"("order");
