-- Phase 2B: Categories, Classification, and Tier System

-- CreateTable: Category (if not exists)
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "benchmarks" JSONB,
    "benchmarksCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IndexingSnapshot (if not exists)
CREATE TABLE IF NOT EXISTS "IndexingSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tierACount" INTEGER NOT NULL DEFAULT 0,
    "tierBCount" INTEGER NOT NULL DEFAULT 0,
    "tierCCount" INTEGER NOT NULL DEFAULT 0,
    "sitemapTotal" INTEGER NOT NULL DEFAULT 0,
    "gscIndexed" INTEGER,
    "gscNotIndexed" INTEGER,
    "netChange" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TierPromotion (if not exists)
CREATE TABLE IF NOT EXISTS "TierPromotion" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "fromTier" TEXT NOT NULL,
    "toTier" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierPromotion_pkey" PRIMARY KEY ("id")
);

-- Add Phase 2A fields to Domain (SEO Tier System)
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "indexTier" TEXT NOT NULL DEFAULT 'C';
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "tierScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "tierCalculatedAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "tierRank" INTEGER;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "lastPromotedAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "lastDemotedAt" TIMESTAMP(3);

-- Add GSC signals to Domain
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscClicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscImpressions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "gscLastUpdated" TIMESTAMP(3);

-- Add Phase 2B Category Classification fields to Domain
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "categoryConfidence" DOUBLE PRECISION;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "classifiedAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "classifiedBy" TEXT;

-- Add Phase 2B Freshness/Rescan fields to Domain
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "lastScannedAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "scanScheduledAt" TIMESTAMP(3);
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "rescanPriority" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: Category (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Category_slug_idx" ON "Category"("slug");

-- CreateIndex: IndexingSnapshot (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "IndexingSnapshot_date_key" ON "IndexingSnapshot"("date");

-- CreateIndex: TierPromotion (if not exists)
CREATE INDEX IF NOT EXISTS "TierPromotion_domainId_idx" ON "TierPromotion"("domainId");
CREATE INDEX IF NOT EXISTS "TierPromotion_createdAt_idx" ON "TierPromotion"("createdAt" DESC);

-- CreateIndex: Domain tier and category indexes (if not exists)
CREATE INDEX IF NOT EXISTS "Domain_tier_idx" ON "Domain"("indexTier", "tierScore" DESC);
CREATE INDEX IF NOT EXISTS "Domain_tier_rank_idx" ON "Domain"("indexTier", "tierRank");
CREATE INDEX IF NOT EXISTS "Domain_category_idx" ON "Domain"("categoryId");

-- AddForeignKey: Domain -> Category (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Domain_categoryId_fkey'
    ) THEN
        ALTER TABLE "Domain" ADD CONSTRAINT "Domain_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: TierPromotion -> Domain (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TierPromotion_domainId_fkey'
    ) THEN
        ALTER TABLE "TierPromotion" ADD CONSTRAINT "TierPromotion_domainId_fkey"
        FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
