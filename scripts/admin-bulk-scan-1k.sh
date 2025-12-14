#!/bin/bash
# Admin Bulk Scan - 1000 Unique Sites
# Uses the admin API endpoint (no rate limiting)
#
# Usage: ADMIN_API_KEY=your_key ./admin-bulk-scan-1k.sh
#
# The admin endpoint accepts 100 URLs per batch, so this script
# will make 10 API calls to scan all 1000 URLs.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_FILE="${SCRIPT_DIR}/batch-urls-1k.txt"
API_BASE="${API_BASE:-https://geckoadvisor.com/api}"
BATCH_SIZE=100
LOG_FILE="${SCRIPT_DIR}/admin-bulk-scan-$(date +%Y%m%d-%H%M%S).log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Gecko Advisor - Admin Bulk Scan (1K Unique Sites)      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for admin API key
if [ -z "$ADMIN_API_KEY" ]; then
    echo -e "${RED}Error: ADMIN_API_KEY environment variable not set${NC}"
    echo ""
    echo "Usage: ADMIN_API_KEY=your_key ./admin-bulk-scan-1k.sh"
    exit 1
fi

# Check if URL file exists
if [ ! -f "$URL_FILE" ]; then
    echo -e "${RED}Error: URL file not found: $URL_FILE${NC}"
    exit 1
fi

# Extract URLs (only https:// lines, skip comments)
URLS=($(grep -E '^https://' "$URL_FILE"))
TOTAL_URLS=${#URLS[@]}

echo -e "${YELLOW}Configuration:${NC}"
echo "  API Base:      $API_BASE"
echo "  URL File:      $URL_FILE"
echo "  Total URLs:    $TOTAL_URLS"
echo "  Batch Size:    $BATCH_SIZE"
echo "  Batches:       $((($TOTAL_URLS + $BATCH_SIZE - 1) / $BATCH_SIZE))"
echo "  Log File:      $LOG_FILE"
echo ""

# Initialize counters
TOTAL_QUEUED=0
TOTAL_SKIPPED=0
TOTAL_ERRORS=0
BATCH_IDS=()

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting admin bulk scan of $TOTAL_URLS URLs" >> "$LOG_FILE"
echo -e "${CYAN}Starting bulk scan...${NC}"
echo ""

# Process URLs in batches
BATCH_NUM=0
for ((i = 0; i < TOTAL_URLS; i += BATCH_SIZE)); do
    BATCH_NUM=$((BATCH_NUM + 1))

    # Get URLs for this batch
    BATCH_URLS=("${URLS[@]:i:BATCH_SIZE}")
    BATCH_COUNT=${#BATCH_URLS[@]}

    echo -ne "\r${BLUE}Processing batch $BATCH_NUM of $((($TOTAL_URLS + $BATCH_SIZE - 1) / $BATCH_SIZE)) ($BATCH_COUNT URLs)...${NC}          "

    # Build JSON array of URLs
    JSON_URLS=$(printf '%s\n' "${BATCH_URLS[@]}" | jq -R . | jq -s .)

    # Make API request
    RESPONSE=$(curl -s -X POST "${API_BASE}/admin/bulk-scan" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Key: $ADMIN_API_KEY" \
        -d "{\"urls\": $JSON_URLS, \"skipExisting\": true}" \
        --max-time 60 2>&1)

    # Parse response
    if echo "$RESPONSE" | jq -e '.batchId' > /dev/null 2>&1; then
        BATCH_ID=$(echo "$RESPONSE" | jq -r '.batchId')
        QUEUED=$(echo "$RESPONSE" | jq -r '.queued')
        SKIPPED=$(echo "$RESPONSE" | jq -r '.skipped')
        ERRORS=$(echo "$RESPONSE" | jq -r '.errors')

        BATCH_IDS+=("$BATCH_ID")
        TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
        TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

        echo "$(date '+%H:%M:%S') | Batch $BATCH_NUM | ID: $BATCH_ID | Queued: $QUEUED | Skipped: $SKIPPED | Errors: $ERRORS" >> "$LOG_FILE"
    else
        # Error response
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.title // .message // "Unknown error"' 2>/dev/null || echo "$RESPONSE")
        echo "$(date '+%H:%M:%S') | Batch $BATCH_NUM | ERROR: $ERROR_MSG" >> "$LOG_FILE"
        TOTAL_ERRORS=$((TOTAL_ERRORS + BATCH_COUNT))
    fi

    # Small delay between batches to avoid overwhelming the server
    sleep 1
done

echo ""
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Bulk scan submission complete!${NC}"
echo ""
echo -e "  ${GREEN}✓ Queued:     $TOTAL_QUEUED${NC}"
echo -e "  ${YELLOW}○ Skipped:    $TOTAL_SKIPPED${NC} (already scanned in last 24h)"
echo -e "  ${RED}✗ Errors:     $TOTAL_ERRORS${NC}"
echo ""
echo -e "${CYAN}Batch IDs:${NC}"
for bid in "${BATCH_IDS[@]}"; do
    echo "  - $bid"
done
echo ""
echo "Log file: $LOG_FILE"
echo ""
echo -e "${YELLOW}Monitor progress:${NC}"
echo "  # Check batch status:"
for bid in "${BATCH_IDS[@]:0:3}"; do
    echo "  curl -H 'X-Admin-Key: \$ADMIN_API_KEY' ${API_BASE}/admin/bulk-scan/$bid"
done
if [ ${#BATCH_IDS[@]} -gt 3 ]; then
    echo "  # ... and $((${#BATCH_IDS[@]} - 3)) more batches"
fi
echo ""

# Log summary
echo "$(date '+%Y-%m-%d %H:%M:%S') - Completed: $TOTAL_QUEUED queued, $TOTAL_SKIPPED skipped, $TOTAL_ERRORS errors" >> "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Batch IDs: ${BATCH_IDS[*]}" >> "$LOG_FILE"
