#!/bin/bash
# Re-scan domains in batches using admin bulk-scan endpoint
# Usage: ./rescan-batch.sh [start_line] [end_line]
# Runs skipExisting=false to force fresh scans with new mixed content detection

set -e

API_BASE="${API_BASE:-https://geckoadvisor.com}"
ADMIN_API_KEY="${ADMIN_API_KEY:?ADMIN_API_KEY required}"
BATCH_SIZE="${BATCH_SIZE:-50}"
DELAY="${DELAY:-3}"

SITES_FILE="$(dirname "$0")/sites-5000.txt"
LOG_DIR="$(dirname "$0")/scan-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/rescan-$(date +%Y%m%d-%H%M%S).log"

# Parse arguments
START_LINE=${1:-1}
END_LINE=${2:-99999}

echo "=== Re-Scan Starting ===" | tee "$LOG_FILE"
echo "API: $API_BASE" | tee -a "$LOG_FILE"
echo "Batch size: $BATCH_SIZE" | tee -a "$LOG_FILE"
echo "Lines: $START_LINE to $END_LINE" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Extract domains (skip comments and empty lines)
DOMAINS=$(grep -v '^#' "$SITES_FILE" | grep -v '^$' | sed -n "${START_LINE},${END_LINE}p")
TOTAL=$(echo "$DOMAINS" | wc -l | tr -d ' ')

echo "Total domains to process: $TOTAL" | tee -a "$LOG_FILE"

BATCH_NUM=0
TOTAL_QUEUED=0
TOTAL_SKIPPED=0
TOTAL_ERRORS=0

# Process in batches
echo "$DOMAINS" | while IFS= read -r domain; do
    # Skip empty lines
    [[ -z "$domain" ]] && continue

    BATCH_URLS+=("https://$domain")

    # When batch is full, send it
    if [[ ${#BATCH_URLS[@]} -ge $BATCH_SIZE ]]; then
        BATCH_NUM=$((BATCH_NUM + 1))

        # Convert to JSON array
        URLS_JSON=$(printf '%s\n' "${BATCH_URLS[@]}" | jq -R . | jq -s .)

        echo "Batch $BATCH_NUM: Sending ${#BATCH_URLS[@]} URLs..." | tee -a "$LOG_FILE"

        RESPONSE=$(curl -s -X POST "$API_BASE/admin/bulk-scan" \
            -H "X-Admin-Key: $ADMIN_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"urls\": $URLS_JSON, \"skipExisting\": false}" 2>&1)

        QUEUED=$(echo "$RESPONSE" | jq -r '.queued // 0' 2>/dev/null || echo "0")
        SKIPPED=$(echo "$RESPONSE" | jq -r '.skipped // 0' 2>/dev/null || echo "0")
        ERRORS=$(echo "$RESPONSE" | jq -r '.errors // 0' 2>/dev/null || echo "0")
        BATCH_ID=$(echo "$RESPONSE" | jq -r '.batchId // "unknown"' 2>/dev/null || echo "unknown")

        echo "  -> Batch $BATCH_ID: queued=$QUEUED, skipped=$SKIPPED, errors=$ERRORS" | tee -a "$LOG_FILE"

        TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
        TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

        # Clear batch
        BATCH_URLS=()

        sleep "$DELAY"
    fi
done

# Send remaining URLs
if [[ ${#BATCH_URLS[@]} -gt 0 ]]; then
    BATCH_NUM=$((BATCH_NUM + 1))
    URLS_JSON=$(printf '%s\n' "${BATCH_URLS[@]}" | jq -R . | jq -s .)

    echo "Batch $BATCH_NUM (final): Sending ${#BATCH_URLS[@]} URLs..." | tee -a "$LOG_FILE"

    RESPONSE=$(curl -s -X POST "$API_BASE/admin/bulk-scan" \
        -H "X-Admin-Key: $ADMIN_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"urls\": $URLS_JSON, \"skipExisting\": false}" 2>&1)

    QUEUED=$(echo "$RESPONSE" | jq -r '.queued // 0' 2>/dev/null || echo "0")
    SKIPPED=$(echo "$RESPONSE" | jq -r '.skipped // 0' 2>/dev/null || echo "0")
    ERRORS=$(echo "$RESPONSE" | jq -r '.errors // 0' 2>/dev/null || echo "0")

    TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
    TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
    TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
fi

echo "" | tee -a "$LOG_FILE"
echo "=== Re-Scan Complete ===" | tee -a "$LOG_FILE"
echo "Total queued: $TOTAL_QUEUED" | tee -a "$LOG_FILE"
echo "Total skipped: $TOTAL_SKIPPED" | tee -a "$LOG_FILE"
echo "Total errors: $TOTAL_ERRORS" | tee -a "$LOG_FILE"
echo "Finished at $(date)" | tee -a "$LOG_FILE"
