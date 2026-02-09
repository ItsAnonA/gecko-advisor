-- AlterTable
ALTER TABLE "Insight" ADD COLUMN "narrative" TEXT,
ADD COLUMN "narrativeStatus" TEXT,
ADD COLUMN "narrativeScope" TEXT;

-- CreateIndex
CREATE INDEX "Insight_narrativeStatus_createdAt_idx" ON "Insight"("narrativeStatus", "createdAt");
