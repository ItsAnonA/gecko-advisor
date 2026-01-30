-- Domain Intelligence Engine Migration
-- Adds fields for intelligent scan scheduling, volatility tracking, and Tranco seeding

-- ============================================================
-- SCAN MODEL: Add domainId for efficient volatility queries
-- ============================================================

-- Add domainId column to Scan table
ALTER TABLE "Scan" ADD COLUMN "domainId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_domainId_fkey"
    FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for volatility queries (domainId + status + finishedAt)
CREATE INDEX "Scan_domain_volatility_idx" ON "Scan"("domainId", "status", "finishedAt" DESC);

-- ============================================================
-- DOMAIN MODEL: Add intelligence engine fields
-- ============================================================

-- Scan eligibility (reversible - deprioritize, not exclude)
ALTER TABLE "Domain" ADD COLUMN "eligibleForScan" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Domain" ADD COLUMN "eligibilityReason" TEXT;
ALTER TABLE "Domain" ADD COLUMN "eligibilityTaggedAt" TIMESTAMP(3);

-- Tranco seeding for initial tier assignment
ALTER TABLE "Domain" ADD COLUMN "trancoRank" INTEGER;
ALTER TABLE "Domain" ADD COLUMN "trancoLastUpdated" TIMESTAMP(3);

-- Historical peak (for conservative demotion protection)
ALTER TABLE "Domain" ADD COLUMN "historicalPeakScore" INTEGER;
ALTER TABLE "Domain" ADD COLUMN "historicalPeakDate" TIMESTAMP(3);

-- ============================================================
-- INDEXES for efficient queries
-- ============================================================

-- Index for eligible domains lookup
CREATE INDEX "Domain_eligible_idx" ON "Domain"("eligibleForScan");

-- Index for Tranco rank queries
CREATE INDEX "Domain_tranco_idx" ON "Domain"("trancoRank");

-- Index for peak score queries (demotion protection)
CREATE INDEX "Domain_peak_score_idx" ON "Domain"("historicalPeakScore");

-- Index for rescan scheduling (lastScannedAt + tier)
CREATE INDEX "Domain_rescan_idx" ON "Domain"("lastScannedAt", "indexTier");

-- ============================================================
-- SYSTEM STATE: Persistent key-value store
-- ============================================================

CREATE TABLE "SystemState" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("key")
);

-- ============================================================
-- SCHEDULER BATCH: DB-level idempotency
-- ============================================================

CREATE TABLE "SchedulerBatch" (
    "id" TEXT NOT NULL,
    "batchDate" TEXT NOT NULL,
    "batchType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "scheduled" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "budgetUsed" JSONB,
    "notes" TEXT,

    CONSTRAINT "SchedulerBatch_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: only one batch per day per type
CREATE UNIQUE INDEX "SchedulerBatch_batchDate_batchType_key" ON "SchedulerBatch"("batchDate", "batchType");
CREATE INDEX "SchedulerBatch_batchDate_idx" ON "SchedulerBatch"("batchDate");
CREATE INDEX "SchedulerBatch_status_idx" ON "SchedulerBatch"("status");
