-- Data Migration: Update scan labels from old format to new format
-- Run this ONCE on production database after deploying the code changes
--
-- Old labels: 'Safe', 'Caution', 'High Risk'
-- New labels: 'Low Privacy Risk', 'Moderate Privacy Risk', 'High Privacy Risk'
--
-- Usage:
--   psql -U postgres -d privacy -f migrate-labels.sql
-- Or via SSH to production:
--   docker exec <postgres-container> psql -U postgres -d privacy -f /path/to/migrate-labels.sql

BEGIN;

-- Check counts before migration
SELECT 'Before migration:' AS status;
SELECT label, COUNT(*) FROM "Scan" WHERE label IN ('Safe', 'Caution', 'High Risk') GROUP BY label;

-- Perform updates
UPDATE "Scan" SET label = 'Low Privacy Risk' WHERE label = 'Safe';
UPDATE "Scan" SET label = 'Moderate Privacy Risk' WHERE label = 'Caution';
UPDATE "Scan" SET label = 'High Privacy Risk' WHERE label = 'High Risk';

-- Verify migration
SELECT 'After migration:' AS status;
SELECT label, COUNT(*) FROM "Scan" WHERE label IN ('Low Privacy Risk', 'Moderate Privacy Risk', 'High Privacy Risk') GROUP BY label;

COMMIT;

-- Summary
SELECT 'Migration complete! Total scans with new labels:' AS status, COUNT(*) as count
FROM "Scan"
WHERE label IN ('Low Privacy Risk', 'Moderate Privacy Risk', 'High Privacy Risk');
