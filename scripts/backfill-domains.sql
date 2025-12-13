-- Data Migration: Backfill Domain table from existing Scan records
-- Run this ONCE on production database after deploying the code changes
--
-- This creates Domain records for all existing scans, linking each domain
-- to its latest scan (most recent by createdAt).
--
-- Usage:
--   psql -U postgres -d privacy -f backfill-domains.sql
-- Or via SSH to production:
--   docker exec <postgres-container> psql -U postgres -d privacy -f /path/to/backfill-domains.sql

BEGIN;

-- Check current state
SELECT 'Domain records before backfill:' AS status, COUNT(*) as count FROM "Domain";
SELECT 'Scan records to process:' AS status, COUNT(*) as count FROM "Scan" WHERE status = 'done';

-- Extract unique domains with their latest scan
-- Using a CTE to get the latest scan per domain
WITH latest_scans AS (
    SELECT DISTINCT ON (
        LOWER(
            CASE
                WHEN input LIKE 'http://%' OR input LIKE 'https://%'
                THEN regexp_replace(regexp_replace(input, '^https?://', ''), '/.*$', '')
                ELSE input
            END
        )
    )
        id,
        input,
        "createdAt",
        LOWER(
            CASE
                WHEN input LIKE 'http://%' OR input LIKE 'https://%'
                THEN regexp_replace(regexp_replace(input, '^https?://', ''), '/.*$', '')
                ELSE input
            END
        ) as domain_name
    FROM "Scan"
    WHERE status = 'done'
    ORDER BY
        LOWER(
            CASE
                WHEN input LIKE 'http://%' OR input LIKE 'https://%'
                THEN regexp_replace(regexp_replace(input, '^https?://', ''), '/.*$', '')
                ELSE input
            END
        ),
        "createdAt" DESC
),
-- Count scans per domain
scan_counts AS (
    SELECT
        LOWER(
            CASE
                WHEN input LIKE 'http://%' OR input LIKE 'https://%'
                THEN regexp_replace(regexp_replace(input, '^https?://', ''), '/.*$', '')
                ELSE input
            END
        ) as domain_name,
        COUNT(*) as scan_count,
        MIN("createdAt") as first_scanned,
        MAX("createdAt") as last_scanned
    FROM "Scan"
    WHERE status = 'done'
    GROUP BY
        LOWER(
            CASE
                WHEN input LIKE 'http://%' OR input LIKE 'https://%'
                THEN regexp_replace(regexp_replace(input, '^https?://', ''), '/.*$', '')
                ELSE input
            END
        )
)
INSERT INTO "Domain" (
    id,
    domain,
    "latestScanId",
    "firstScanned",
    "lastScanned",
    "isIndexed",
    "scanCount",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    ls.domain_name,
    ls.id,
    sc.first_scanned,
    sc.last_scanned,
    true,
    sc.scan_count,
    NOW(),
    NOW()
FROM latest_scans ls
JOIN scan_counts sc ON ls.domain_name = sc.domain_name
ON CONFLICT (domain) DO UPDATE SET
    "latestScanId" = EXCLUDED."latestScanId",
    "lastScanned" = EXCLUDED."lastScanned",
    "scanCount" = EXCLUDED."scanCount",
    "updatedAt" = NOW();

-- Verify results
SELECT 'Domain records after backfill:' AS status, COUNT(*) as count FROM "Domain";

-- Show sample of populated domains
SELECT 'Sample populated domains:' AS status;
SELECT domain, "scanCount", "lastScanned" FROM "Domain" ORDER BY "scanCount" DESC LIMIT 10;

COMMIT;
