-- Week 1 Hardening: Anti-thrash tracking and daily reports
-- Migration: 20260130200000_add_antithrash_and_reports

-- Add anti-thrash tracking fields to Domain
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "lastTierChangedAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "tierChangeCount30d" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "tierChangeCount90d" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "promotionConfidence" DOUBLE PRECISION;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "lastPromotionCheck" TIMESTAMP(3);

-- Add GSC weekly breakdown for confidence calculation
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscClicksWeek1" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscClicksWeek2" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscClicksWeek3" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscClicksWeek4" INTEGER NOT NULL DEFAULT 0;

-- Add confidence field to TierPromotion for audit trail
ALTER TABLE "TierPromotion" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;

-- Create DailyReport table for operational reports
CREATE TABLE IF NOT EXISTS "DailyReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on date
CREATE UNIQUE INDEX IF NOT EXISTS "DailyReport_date_key" ON "DailyReport"("date");

-- Create indexes for anti-thrash queries
CREATE INDEX IF NOT EXISTS "Domain_tier_changed_idx" ON "Domain"("lastTierChangedAt");
CREATE INDEX IF NOT EXISTS "Domain_thrash_idx" ON "Domain"("tierChangeCount90d");

-- Add index for TierPromotion by target tier and date (for daily reserve checks)
CREATE INDEX IF NOT EXISTS "TierPromotion_toTier_createdAt_idx" ON "TierPromotion"("toTier", "createdAt" DESC);
