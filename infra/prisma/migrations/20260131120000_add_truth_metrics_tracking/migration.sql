-- Phase 3C Observation: Truth-Centric Metrics
-- Add enums and fields for tracking epistemic validity

-- Create InsightOutcome enum
CREATE TYPE "InsightOutcome" AS ENUM ('PENDING', 'CONFIRMED', 'PARTIAL', 'REVERSED', 'INCONCLUSIVE', 'SUPERSEDED');

-- Create StabilityConfidenceTier enum
CREATE TYPE "StabilityConfidenceTier" AS ENUM ('FULL', 'PARTIAL', 'PROVISIONAL');

-- Add truth-centric fields to Insight model
ALTER TABLE "Insight" ADD COLUMN "outcome" "InsightOutcome" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Insight" ADD COLUMN "outcomeDetails" TEXT;
ALTER TABLE "Insight" ADD COLUMN "outcomeValidatedAt" TIMESTAMP(3);
ALTER TABLE "Insight" ADD COLUMN "predictedOutcome" TEXT;
ALTER TABLE "Insight" ADD COLUMN "actualOutcome" TEXT;
ALTER TABLE "Insight" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Insight" ADD COLUMN "reversedAt" TIMESTAMP(3);
ALTER TABLE "Insight" ADD COLUMN "supersededAt" TIMESTAMP(3);
ALTER TABLE "Insight" ADD COLUMN "supersededById" TEXT;
ALTER TABLE "Insight" ADD COLUMN "incorrectDetectedAt" TIMESTAMP(3);
ALTER TABLE "Insight" ADD COLUMN "retractionPublishedAt" TIMESTAMP(3);
ALTER TABLE "Insight" ADD COLUMN "retractionLatencyHours" DOUBLE PRECISION;

-- Add indexes for Insight truth tracking
CREATE INDEX "Insight_outcome_createdAt_idx" ON "Insight"("outcome", "createdAt");
CREATE INDEX "Insight_outcomeValidatedAt_idx" ON "Insight"("outcomeValidatedAt");

-- Add confidence tier fields to DomainStability
ALTER TABLE "DomainStability" ADD COLUMN "confidenceTier" "StabilityConfidenceTier" NOT NULL DEFAULT 'PROVISIONAL';
ALTER TABLE "DomainStability" ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DomainStability" ADD COLUMN "timeSpanDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DomainStability" ADD COLUMN "tierAssignedAt" TIMESTAMP(3);
ALTER TABLE "DomainStability" ADD COLUMN "tierValidatedAt" TIMESTAMP(3);
ALTER TABLE "DomainStability" ADD COLUMN "tierValidationResult" BOOLEAN;
ALTER TABLE "DomainStability" ADD COLUMN "actualVolatility" DOUBLE PRECISION;
ALTER TABLE "DomainStability" ADD COLUMN "tierAccurate" BOOLEAN;

-- Add index for confidence tier
CREATE INDEX "DomainStability_confidenceTier_idx" ON "DomainStability"("confidenceTier");

-- Create GovernanceMetrics table for tracking enforcement
CREATE TABLE "GovernanceMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "narrativesAttempted" INTEGER NOT NULL DEFAULT 0,
    "narrativesBlocked" INTEGER NOT NULL DEFAULT 0,
    "narrativesApproved" INTEGER NOT NULL DEFAULT 0,
    "blockRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forbiddenCausalCount" INTEGER NOT NULL DEFAULT 0,
    "missingHedgeCount" INTEGER NOT NULL DEFAULT 0,
    "overconfidentCount" INTEGER NOT NULL DEFAULT 0,
    "retractionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "retractionsPassed" INTEGER NOT NULL DEFAULT 0,
    "retractionsFailed" INTEGER NOT NULL DEFAULT 0,
    "insightsGenerated" INTEGER NOT NULL DEFAULT 0,
    "insightsFailedQuality" INTEGER NOT NULL DEFAULT 0,
    "insightsPublished" INTEGER NOT NULL DEFAULT 0,
    "scansProcessed" INTEGER NOT NULL DEFAULT 0,
    "scansWithNoChange" INTEGER NOT NULL DEFAULT 0,
    "changesBelow" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceMetrics_pkey" PRIMARY KEY ("id")
);

-- Create unique index on date
CREATE UNIQUE INDEX "GovernanceMetrics_date_key" ON "GovernanceMetrics"("date");

-- Create index for date queries
CREATE INDEX "GovernanceMetrics_date_idx" ON "GovernanceMetrics"("date");
