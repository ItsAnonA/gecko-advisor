-- Phase 3C: Insight Engine Migration
-- Adds DomainStability, CategoryTrend, TrackerTrend, Insight, and WeeklyReport models

-- CreateEnums
CREATE TYPE "DomainTrend" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE');
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "TrendDirection" AS ENUM ('UP', 'DOWN', 'FLAT');
CREATE TYPE "InsightType" AS ENUM ('DOMAIN_IMPROVEMENT', 'DOMAIN_REGRESSION', 'CATEGORY_TREND', 'TRACKER_SURGE', 'TRACKER_DECLINE', 'FINGERPRINTING_SHIFT', 'ANOMALY', 'WEEKLY_SUMMARY');
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable: DomainStability
CREATE TABLE "DomainStability" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "volatilityIndex" DOUBLE PRECISION NOT NULL,
    "stabilityScore" DOUBLE PRECISION NOT NULL,
    "trend" "DomainTrend" NOT NULL,
    "trendStrength" DOUBLE PRECISION NOT NULL,
    "avgScoreLast30d" DOUBLE PRECISION NOT NULL,
    "avgScoreLast90d" DOUBLE PRECISION NOT NULL,
    "scoreStdDev30d" DOUBLE PRECISION NOT NULL,
    "scoreStdDev90d" DOUBLE PRECISION NOT NULL,
    "changesLast30d" INTEGER NOT NULL,
    "changesLast90d" INTEGER NOT NULL,
    "majorChangesLast90d" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainStability_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CategoryTrend
CREATE TABLE "CategoryTrend" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL,
    "avgScorePrevPeriod" DOUBLE PRECISION NOT NULL,
    "scoreChange" DOUBLE PRECISION NOT NULL,
    "scoreTrend" "TrendDirection" NOT NULL,
    "avgTrackerCount" DOUBLE PRECISION NOT NULL,
    "avgTrackerCountPrev" DOUBLE PRECISION NOT NULL,
    "trackerCountChange" DOUBLE PRECISION NOT NULL,
    "trackerTrend" "TrendDirection" NOT NULL,
    "fingerprintingRate" DOUBLE PRECISION NOT NULL,
    "fingerprintingRatePrev" DOUBLE PRECISION NOT NULL,
    "fingerprintingTrend" "TrendDirection" NOT NULL,
    "domainsImproving" INTEGER NOT NULL,
    "domainsDeclining" INTEGER NOT NULL,
    "domainsStable" INTEGER NOT NULL,
    "topImprovements" JSONB NOT NULL,
    "topRegressions" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TrackerTrend
CREATE TABLE "TrackerTrend" (
    "id" TEXT NOT NULL,
    "trackerDomain" TEXT NOT NULL,
    "trackerName" TEXT,
    "trackerCategory" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "domainCount" INTEGER NOT NULL,
    "domainCountPrev" INTEGER NOT NULL,
    "adoptionChange" DOUBLE PRECISION NOT NULL,
    "adoptionTrend" "TrendDirection" NOT NULL,
    "tierACount" INTEGER NOT NULL,
    "tierBCount" INTEGER NOT NULL,
    "tierCCount" INTEGER NOT NULL,
    "topCategories" JSONB NOT NULL,
    "newAdoptions" INTEGER NOT NULL,
    "removals" INTEGER NOT NULL,
    "netChange" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackerTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Insight
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "domainId" TEXT,
    "categoryId" TEXT,
    "trackerDomain" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isPublishable" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WeeklyReport
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "domainsScanned" INTEGER NOT NULL,
    "changesDetected" INTEGER NOT NULL,
    "avgScoreChange" DOUBLE PRECISION NOT NULL,
    "topImprovements" JSONB NOT NULL,
    "topRegressions" JSONB NOT NULL,
    "categorySummary" JSONB NOT NULL,
    "trackerSummary" JSONB NOT NULL,
    "keyInsights" JSONB NOT NULL,
    "narrativeSummary" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes: DomainStability
CREATE UNIQUE INDEX "DomainStability_domainId_key" ON "DomainStability"("domainId");
CREATE INDEX "DomainStability_trend_stabilityScore_idx" ON "DomainStability"("trend", "stabilityScore");
CREATE INDEX "DomainStability_volatilityIndex_idx" ON "DomainStability"("volatilityIndex" DESC);

-- CreateIndexes: CategoryTrend
CREATE UNIQUE INDEX "CategoryTrend_categoryId_periodStart_periodType_key" ON "CategoryTrend"("categoryId", "periodStart", "periodType");
CREATE INDEX "CategoryTrend_periodType_periodStart_idx" ON "CategoryTrend"("periodType", "periodStart");

-- CreateIndexes: TrackerTrend
CREATE UNIQUE INDEX "TrackerTrend_trackerDomain_periodStart_periodType_key" ON "TrackerTrend"("trackerDomain", "periodStart", "periodType");
CREATE INDEX "TrackerTrend_adoptionTrend_adoptionChange_idx" ON "TrackerTrend"("adoptionTrend", "adoptionChange");
CREATE INDEX "TrackerTrend_periodType_periodStart_idx" ON "TrackerTrend"("periodType", "periodStart");

-- CreateIndexes: Insight
CREATE INDEX "Insight_insightType_createdAt_idx" ON "Insight"("insightType", "createdAt");
CREATE INDEX "Insight_severity_createdAt_idx" ON "Insight"("severity", "createdAt");
CREATE INDEX "Insight_isPublishable_createdAt_idx" ON "Insight"("isPublishable", "createdAt");

-- CreateIndexes: WeeklyReport
CREATE UNIQUE INDEX "WeeklyReport_weekStart_key" ON "WeeklyReport"("weekStart");

-- AddForeignKey: DomainStability
ALTER TABLE "DomainStability" ADD CONSTRAINT "DomainStability_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: CategoryTrend
ALTER TABLE "CategoryTrend" ADD CONSTRAINT "CategoryTrend_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
