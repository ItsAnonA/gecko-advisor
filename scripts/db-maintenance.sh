#!/bin/bash
# SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
# SPDX-License-Identifier: MIT
#
# Database Maintenance Script
# Removes old scans keeping only the latest N per domain
# Can be run as a weekly cron job
#
# Usage:
#   ./db-maintenance.sh [--dry-run] [--keep=N]
#
# Options:
#   --dry-run    Show what would be deleted without making changes
#   --keep=N     Keep N most recent scans per domain (default: 2)
#
# Environment variables:
#   DATABASE_URL    PostgreSQL connection string (required)
#   OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_BUCKET,
#   OBJECT_STORAGE_ACCESS_KEY, OBJECT_STORAGE_SECRET_KEY (optional, for R2 cleanup)

set -euo pipefail

# Parse arguments
DRY_RUN=false
KEEP_N=2

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --keep=*)
            KEEP_N="${arg#*=}"
            shift
            ;;
    esac
done

echo "=== Gecko Advisor Database Maintenance ==="
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "Keep N scans per domain: $KEEP_N"
echo ""

# Check required environment
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

# Extract psql connection details from DATABASE_URL
# Format: postgresql://user:pass@host:port/database
PSQL_CMD="psql $DATABASE_URL"

echo "=== Step 1: Count scans to clean ==="

# Count non-done scans
NON_DONE=$($PSQL_CMD -t -A -c "
    SELECT COUNT(*) FROM \"Scan\"
    WHERE status != 'done'
    AND id NOT IN (SELECT \"latestScanId\" FROM \"Domain\" WHERE \"latestScanId\" IS NOT NULL);
")
echo "Non-done scans (error/queued/running): $NON_DONE"

# Count done scans beyond rank N
BEYOND_RANK=$($PSQL_CMD -t -A -c "
    WITH ranked_done AS (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY \"normalizedInput\" ORDER BY \"createdAt\" DESC) as rn
        FROM \"Scan\"
        WHERE status = 'done'
    )
    SELECT COUNT(*) FROM ranked_done
    WHERE rn > $KEEP_N
    AND id NOT IN (SELECT \"latestScanId\" FROM \"Domain\" WHERE \"latestScanId\" IS NOT NULL);
")
echo "Done scans beyond rank $KEEP_N: $BEYOND_RANK"

TOTAL_TO_DELETE=$((NON_DONE + BEYOND_RANK))
echo "Total scans to delete: $TOTAL_TO_DELETE"
echo ""

if [ "$TOTAL_TO_DELETE" -eq 0 ]; then
    echo "No scans to clean up. Exiting."
    exit 0
fi

if [ "$DRY_RUN" = true ]; then
    echo "=== DRY RUN - No changes made ==="
    exit 0
fi

echo "=== Step 2: Export scan IDs for R2 cleanup ==="
SCAN_IDS_FILE="/tmp/scan_ids_to_delete_$(date +%Y%m%d_%H%M%S).txt"

# Export done scan IDs (only these have R2 objects)
$PSQL_CMD -t -A -c "
    WITH ranked_done AS (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY \"normalizedInput\" ORDER BY \"createdAt\" DESC) as rn
        FROM \"Scan\"
        WHERE status = 'done'
    )
    SELECT id FROM ranked_done
    WHERE rn > $KEEP_N
    AND id NOT IN (SELECT \"latestScanId\" FROM \"Domain\" WHERE \"latestScanId\" IS NOT NULL);
" > "$SCAN_IDS_FILE"

R2_COUNT=$(wc -l < "$SCAN_IDS_FILE" | tr -d ' ')
echo "Exported $R2_COUNT scan IDs to $SCAN_IDS_FILE"

echo "=== Step 3: Delete R2 objects (if configured) ==="
if [ -n "${OBJECT_STORAGE_ENDPOINT:-}" ] && [ -n "${OBJECT_STORAGE_BUCKET:-}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/r2-batch-delete.mjs" ]; then
        node "$SCRIPT_DIR/r2-batch-delete.mjs" < "$SCAN_IDS_FILE"
    else
        echo "Warning: r2-batch-delete.mjs not found, skipping R2 cleanup"
    fi
else
    echo "Skipping R2 cleanup (OBJECT_STORAGE_* not configured)"
fi

echo ""
echo "=== Step 4: Delete database records ==="

# Delete non-done scans in batches
echo "Deleting non-done scans..."
while true; do
    DELETED=$($PSQL_CMD -t -A -c "
        WITH to_delete AS (
            SELECT id FROM \"Scan\"
            WHERE status != 'done'
            AND id NOT IN (SELECT \"latestScanId\" FROM \"Domain\" WHERE \"latestScanId\" IS NOT NULL)
            LIMIT 5000
        )
        DELETE FROM \"Scan\" WHERE id IN (SELECT id FROM to_delete)
        RETURNING id;
    " | wc -l | tr -d ' ')

    if [ "$DELETED" -eq 0 ]; then
        break
    fi
    echo "  Deleted $DELETED non-done scans"
done

# Delete done scans beyond rank N
echo "Deleting done scans beyond rank $KEEP_N..."
$PSQL_CMD -c "
    WITH ranked_done AS (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY \"normalizedInput\" ORDER BY \"createdAt\" DESC) as rn
        FROM \"Scan\"
        WHERE status = 'done'
    ),
    to_delete AS (
        SELECT id FROM ranked_done
        WHERE rn > $KEEP_N
        AND id NOT IN (SELECT \"latestScanId\" FROM \"Domain\" WHERE \"latestScanId\" IS NOT NULL)
    )
    DELETE FROM \"Scan\" WHERE id IN (SELECT id FROM to_delete);
"

echo ""
echo "=== Step 5: Update stale Domain references ==="
UPDATED=$($PSQL_CMD -t -A -c "
    WITH latest_by_input AS (
        SELECT DISTINCT ON (\"normalizedInput\")
            \"normalizedInput\",
            id as actual_latest_id,
            \"createdAt\"
        FROM \"Scan\"
        WHERE status = 'done'
        ORDER BY \"normalizedInput\", \"createdAt\" DESC
    ),
    domain_updates AS (
        SELECT
            d.id as domain_id,
            lbi.actual_latest_id as new_scan_id,
            lbi.\"createdAt\" as scan_date
        FROM \"Domain\" d
        JOIN \"Scan\" s ON s.id = d.\"latestScanId\"
        JOIN latest_by_input lbi ON lbi.\"normalizedInput\" = s.\"normalizedInput\"
        WHERE d.\"latestScanId\" != lbi.actual_latest_id
        AND lbi.actual_latest_id NOT IN (
            SELECT \"latestScanId\" FROM \"Domain\" WHERE \"latestScanId\" IS NOT NULL
        )
    )
    UPDATE \"Domain\" d
    SET
        \"latestScanId\" = du.new_scan_id,
        \"lastScanned\" = du.scan_date,
        \"updatedAt\" = NOW()
    FROM domain_updates du
    WHERE d.id = du.domain_id
    RETURNING d.id;
" | wc -l | tr -d ' ')
echo "Updated $UPDATED stale domain references"

echo ""
echo "=== Step 6: Final counts ==="
$PSQL_CMD -c "
    SELECT
        'Scans' as table_name,
        COUNT(*) as count
    FROM \"Scan\"
    UNION ALL
    SELECT 'Evidence', COUNT(*) FROM \"Evidence\"
    UNION ALL
    SELECT 'Issue', COUNT(*) FROM \"Issue\";
"

# Cleanup temp file
rm -f "$SCAN_IDS_FILE"

echo ""
echo "=== Maintenance complete ==="
echo "Finished: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
