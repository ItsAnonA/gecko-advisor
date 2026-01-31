-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('NONE', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateTable
CREATE TABLE "DomainChange" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "previousScanId" TEXT NOT NULL,
    "scoreBefore" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "trackerCountBefore" INTEGER NOT NULL,
    "trackerCountAfter" INTEGER NOT NULL,
    "trackersAdded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trackersRemoved" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fingerprintingBefore" BOOLEAN NOT NULL DEFAULT false,
    "fingerprintingAfter" BOOLEAN NOT NULL DEFAULT false,
    "fingerprintingChanged" BOOLEAN NOT NULL DEFAULT false,
    "changeType" "ChangeType" NOT NULL DEFAULT 'NONE',
    "significanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "changeReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainChange_domainId_scanId_key" ON "DomainChange"("domainId", "scanId");

-- CreateIndex
CREATE INDEX "DomainChange_domainId_detectedAt_idx" ON "DomainChange"("domainId", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "DomainChange_changeType_detectedAt_idx" ON "DomainChange"("changeType", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "DomainChange_significanceScore_idx" ON "DomainChange"("significanceScore" DESC);

-- AddForeignKey
ALTER TABLE "DomainChange" ADD CONSTRAINT "DomainChange_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainChange" ADD CONSTRAINT "DomainChange_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainChange" ADD CONSTRAINT "DomainChange_previousScanId_fkey" FOREIGN KEY ("previousScanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
