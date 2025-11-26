#!/bin/bash
# Re-scan all existing scans to update evidence with new mixed content detection
# Uses admin bulk-scan endpoint with skipExisting=false

set -e

API_BASE="${API_BASE:-https://geckoadvisor.com}"
ADMIN_API_KEY="${ADMIN_API_KEY:?ADMIN_API_KEY required}"
BATCH_SIZE="${BATCH_SIZE:-50}"
DELAY_BETWEEN_BATCHES="${DELAY_BETWEEN_BATCHES:-5}"

# Get all unique URLs from existing scans
echo "Fetching unique URLs from database..."

# Query to get unique normalizedInput values from completed scans
URLS_FILE="/tmp/rescan-urls-$(date +%Y%m%d-%H%M%S).txt"

# Use psql or create an admin endpoint to fetch URLs
# For now, use the domains list as base
DOMAINS_FILE="$(dirname "$0")/domains-5k.txt"

if [[ ! -f "$DOMAINS_FILE" ]]; then
    echo "Error: $DOMAINS_FILE not found"
    exit 1
fi

TOTAL_LINES=$(wc -l < "$DOMAINS_FILE" | tr -d ' ')
echo "Total domains to re-scan: $TOTAL_LINES"
echo "Batch size: $BATCH_SIZE"
echo "This will force re-scan ALL domains (skipExisting=false)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

LOG_FILE="$(dirname "$0")/scan-logs/rescan-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "Logging to: $LOG_FILE"
echo "Starting re-scan at $(date)" | tee -a "$LOG_FILE"

BATCH_NUM=0
TOTAL_QUEUED=0
TOTAL_ERRORS=0

while IFS= read -r batch; do
    BATCH_NUM=$((BATCH_NUM + 1))
    
    # Convert batch lines to JSON array
    URLS_JSON=$(echo "$batch" | jq -R -s 'split("\n") | map(select(length > 0) | "https://\(.)")')
    
    echo "Batch $BATCH_NUM: Sending $(echo "$URLS_JSON" | jq length) URLs..." | tee -a "$LOG_FILE"
    
    RESPONSE=$(curl -s -X POST "$API_BASE/admin/bulk-scan" \
        -H "X-Admin-Key: $ADMIN_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"urls\": $URLS_JSON, \"skipExisting\": false}" 2>&1)
    
    QUEUED=$(echo "$RESPONSE" | jq -r '.queued // 0')
    ERRORS=$(echo "$RESPONSE" | jq -r '.errors // 0')
    BATCH_ID=$(echo "$RESPONSE" | jq -r '.batchId // "unknown"')
    
    TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
    TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
    
    echo "  Batch $BATCH_ID: queued=$QUEUED, errors=$ERRORS" | tee -a "$LOG_FILE"
    
    # Small delay to not overwhelm the queue
    sleep "$DELAY_BETWEEN_BATCHES"
    
done < <(cat "$DOMAINS_FILE" | paste -d'\n' $(printf -- "- %.0s" $(seq 1 $BATCH_SIZE)) | head -c -1)

echo "" | tee -a "$LOG_FILE"
echo "=== Re-scan Complete ===" | tee -a "$LOG_FILE"
echo "Total queued: $TOTAL_QUEUED" | tee -a "$LOG_FILE"
echo "Total errors: $TOTAL_ERRORS" | tee -a "$LOG_FILE"
echo "Finished at $(date)" | tee -a "$LOG_FILE"
