-- DIE Final Hardening: Add GSC weekly impressions and top query share
-- Migration: 20260130210000_add_gsc_impressions_weekly

-- Add weekly impressions tracking for anti-spike guards (Fix 1)
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscImpressionsWeek1" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscImpressionsWeek2" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscImpressionsWeek3" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscImpressionsWeek4" INTEGER NOT NULL DEFAULT 0;

-- Add top query share for entropy check (Fix 1)
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscTopQueryShare" DOUBLE PRECISION;

-- Note: tierChangeCount30d and tierChangeCount90d are now deprecated
-- in favor of event-based counting from TierPromotion table (Fix 8)
-- These columns remain for backwards compatibility but are no longer updated
