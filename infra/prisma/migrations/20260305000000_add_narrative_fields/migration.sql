-- AlterTable: Add pre-computed narrative fields to Domain model
-- Phase A SEO Architecture: fields computed nightly by precompute-domain-narrative.ts

ALTER TABLE "Domain" ADD COLUMN "trackerPercentile" DOUBLE PRECISION;
ALTER TABLE "Domain" ADD COLUMN "scorePercentile" DOUBLE PRECISION;
ALTER TABLE "Domain" ADD COLUMN "categoryRank" INTEGER;
ALTER TABLE "Domain" ADD COLUMN "globalRank" INTEGER;
ALTER TABLE "Domain" ADD COLUMN "hasRareTracker" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Domain" ADD COLUMN "rarestTracker" TEXT;
ALTER TABLE "Domain" ADD COLUMN "rarestTrackerDomainCount" INTEGER;
ALTER TABLE "Domain" ADD COLUMN "narrativeComputedAt" TIMESTAMP(3);
