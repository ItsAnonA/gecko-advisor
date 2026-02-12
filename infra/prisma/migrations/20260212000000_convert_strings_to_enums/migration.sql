-- Convert String fields to Prisma enums (Issue #49)
-- This migration creates enum types and converts 8 String columns to use them.
-- Lowercase enum values match existing data so no transformation needed for
-- non-hyphenated values. Hyphenated values are migrated to underscores first.

-- ============================================================================
-- Step 1: Create enum types
-- ============================================================================

CREATE TYPE "ScanStatus" AS ENUM ('queued', 'running', 'done', 'error');
CREATE TYPE "ScanTargetType" AS ENUM ('url', 'app', 'address');
CREATE TYPE "ScanSource" AS ENUM ('manual', 'manual_force', 'stub', 'batch', 'admin_bulk', 'scan_queue', 'rescan_orphan', 'retry_failed');
CREATE TYPE "EvidenceKind" AS ENUM ('tracker', 'cookie', 'header', 'insecure', 'thirdparty', 'policy', 'tls', 'fingerprint', 'mixed_content', 'third_party_tracker');
CREATE TYPE "IndexTier" AS ENUM ('A', 'B', 'C');
CREATE TYPE "BatchStatus" AS ENUM ('running', 'completed', 'failed');
CREATE TYPE "NarrativeStatus" AS ENUM ('approved', 'blocked', 'error', 'skipped');
CREATE TYPE "NarrativeScope" AS ENUM ('INSIGHT', 'WEEKLY');

-- ============================================================================
-- Step 2: Migrate hyphenated values to underscores BEFORE column type change
-- ============================================================================

-- Scan.source: hyphenated values
UPDATE "Scan" SET source = 'manual_force' WHERE source = 'manual-force';
UPDATE "Scan" SET source = 'admin_bulk' WHERE source = 'admin-bulk';
UPDATE "Scan" SET source = 'scan_queue' WHERE source = 'scan-queue';
UPDATE "Scan" SET source = 'rescan_orphan' WHERE source = 'rescan-orphan';
UPDATE "Scan" SET source = 'retry_failed' WHERE source = 'retry-failed';

-- Evidence.kind: hyphenated values
UPDATE "Evidence" SET kind = 'mixed_content' WHERE kind = 'mixed-content';

-- ============================================================================
-- Step 3: ALTER COLUMN types using USING cast
-- ============================================================================

-- Scan.status
ALTER TABLE "Scan" ALTER COLUMN "status" TYPE "ScanStatus" USING ("status"::text::"ScanStatus");

-- Scan.targetType
ALTER TABLE "Scan" ALTER COLUMN "targetType" TYPE "ScanTargetType" USING ("targetType"::text::"ScanTargetType");

-- Scan.source (update default before type change)
ALTER TABLE "Scan" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Scan" ALTER COLUMN "source" TYPE "ScanSource" USING ("source"::text::"ScanSource");
ALTER TABLE "Scan" ALTER COLUMN "source" SET DEFAULT 'manual'::"ScanSource";

-- Evidence.kind
ALTER TABLE "Evidence" ALTER COLUMN "kind" TYPE "EvidenceKind" USING ("kind"::text::"EvidenceKind");

-- Domain.indexTier
ALTER TABLE "Domain" ALTER COLUMN "indexTier" DROP DEFAULT;
ALTER TABLE "Domain" ALTER COLUMN "indexTier" TYPE "IndexTier" USING ("indexTier"::text::"IndexTier");
ALTER TABLE "Domain" ALTER COLUMN "indexTier" SET DEFAULT 'C'::"IndexTier";

-- SchedulerBatch.status
ALTER TABLE "SchedulerBatch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SchedulerBatch" ALTER COLUMN "status" TYPE "BatchStatus" USING ("status"::text::"BatchStatus");
ALTER TABLE "SchedulerBatch" ALTER COLUMN "status" SET DEFAULT 'running'::"BatchStatus";

-- Insight.narrativeStatus (nullable, no default)
ALTER TABLE "Insight" ALTER COLUMN "narrativeStatus" TYPE "NarrativeStatus" USING ("narrativeStatus"::text::"NarrativeStatus");

-- Insight.narrativeScope (nullable, no default)
ALTER TABLE "Insight" ALTER COLUMN "narrativeScope" TYPE "NarrativeScope" USING ("narrativeScope"::text::"NarrativeScope");
