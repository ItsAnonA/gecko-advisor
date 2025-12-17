#!/bin/bash
# SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
# SPDX-License-Identifier: MIT

# Re-queue orphaned scans incrementally
# Marks old orphaned scans as error and re-scans the URLs

set -e

BATCH_SIZE=${1:-50}
DELAY=${2:-60}
SERVER="root@77.42.39.221"
API_URL="https://geckoadvisor.com/api/v2/scan"
ADMIN_KEY="${ADMIN_API_KEY:-7C68wkKLIDpGHKN8LRfB1yixQsEgtT71fjikzEvU}"

echo "=========================================="
echo "Re-queue Orphaned Scans"
echo "=========================================="
echo "Batch size: $BATCH_SIZE"
echo "Delay between batches: ${DELAY}s"
echo ""

# Function to get orphan count
get_orphan_count() {
    ssh $SERVER "docker exec \$(docker ps -q --filter name=db-hkgcc) psql -U postgres -d privacy -t -c \"SELECT COUNT(*) FROM \\\"Scan\\\" WHERE status = 'queued';\"" | tr -d ' '
}

# Function to get queue stats
get_queue_stats() {
    ssh $SERVER "docker exec \$(docker ps -q --filter name=db-hkgcc) psql -U postgres -d privacy -t -c \"SELECT status, COUNT(*) FROM \\\"Scan\\\" WHERE status IN ('queued','running') GROUP BY status ORDER BY status;\"" | tr -d ' '
}

TOTAL=$(get_orphan_count)
echo "Total orphaned scans: $TOTAL"
echo ""

if [ "$TOTAL" -eq 0 ]; then
    echo "No orphaned scans to process!"
    exit 0
fi

BATCH=1
PROCESSED=0

while true; do
    ORPHAN_COUNT=$(get_orphan_count)

    if [ "$ORPHAN_COUNT" -eq 0 ]; then
        echo ""
        echo "All orphaned scans processed!"
        break
    fi

    echo "----------------------------------------"
    echo "Batch $BATCH: $ORPHAN_COUNT remaining"
    echo "----------------------------------------"

    # Get batch of orphaned URLs and mark them as error
    URLS=$(ssh $SERVER "docker exec \$(docker ps -q --filter name=db-hkgcc) psql -U postgres -d privacy -t -A -c \"
        WITH batch AS (
            SELECT id, \\\"normalizedInput\\\"
            FROM \\\"Scan\\\"
            WHERE status = 'queued'
            ORDER BY \\\"createdAt\\\" ASC
            LIMIT $BATCH_SIZE
        )
        UPDATE \\\"Scan\\\" s
        SET status = 'error', \\\"finishedAt\\\" = NOW()
        FROM batch b
        WHERE s.id = b.id
        RETURNING b.\\\"normalizedInput\\\";
    \"" | grep -v '^$')

    if [ -z "$URLS" ]; then
        echo "No more URLs found"
        break
    fi

    URL_COUNT=$(echo "$URLS" | wc -l | tr -d ' ')
    echo "  Marked $URL_COUNT as error, re-scanning..."

    # Re-scan each URL via API
    SUCCESS=0
    FAILED=0

    while IFS= read -r url; do
        if [ -n "$url" ]; then
            RESPONSE=$(curl -s -X POST "$API_URL" \
                -H "Content-Type: application/json" \
                -H "X-Admin-Key: $ADMIN_KEY" \
                -d "{\"url\": \"$url\"}" 2>/dev/null)

            if echo "$RESPONSE" | grep -q '"id"'; then
                ((SUCCESS++))
            else
                ((FAILED++))
            fi
        fi
    done <<< "$URLS"

    echo "  Re-scanned: $SUCCESS success, $FAILED failed"
    PROCESSED=$((PROCESSED + SUCCESS))

    # Show current queue status
    echo "  Queue status:"
    get_queue_stats | while read line; do echo "    $line"; done

    ((BATCH++))

    echo "  Waiting ${DELAY}s for processing..."
    sleep $DELAY
done

echo ""
echo "=========================================="
echo "Complete! Processed: $PROCESSED URLs"
echo "=========================================="
