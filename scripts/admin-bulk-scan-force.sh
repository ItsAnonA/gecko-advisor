#!/bin/bash
# Admin Bulk Scan - Force scan all URLs (no deduplication)
#
# Usage: ADMIN_API_KEY=your_key ./admin-bulk-scan-force.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_FILE="${SCRIPT_DIR}/batch-urls-1k.txt"
API_BASE="${API_BASE:-https://geckoadvisor.com/api}"
BATCH_SIZE=100
LOG_FILE="${SCRIPT_DIR}/admin-bulk-scan-force-$(date +%Y%m%d-%H%M%S).log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Gecko Advisor - Admin Bulk Scan (FORCE - No Dedupe)       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -z "$ADMIN_API_KEY" ]; then
    echo -e "${RED}Error: ADMIN_API_KEY environment variable not set${NC}"
    exit 1
fi

if [ ! -f "$URL_FILE" ]; then
    echo -e "${RED}Error: URL file not found: $URL_FILE${NC}"
    exit 1
fi

# Extract URLs
URLS=($(grep -E '^https://' "$URL_FILE"))
TOTAL_URLS=${#URLS[@]}
TOTAL_BATCHES=$((($TOTAL_URLS + $BATCH_SIZE - 1) / $BATCH_SIZE))

echo -e "${YELLOW}Configuration:${NC}"
echo "  API Base:      $API_BASE"
echo "  Total URLs:    $TOTAL_URLS"
echo "  Batch Size:    $BATCH_SIZE"
echo "  Batches:       $TOTAL_BATCHES"
echo "  Skip Existing: ${RED}FALSE${NC} (force rescan all)"
echo "  Log File:      $LOG_FILE"
echo ""

TOTAL_QUEUED=0
TOTAL_ERRORS=0
BATCH_IDS=()

echo "$(date '+%Y-%m-%d %H:%M:%S') - FORCE bulk scan of $TOTAL_URLS URLs" >> "$LOG_FILE"
echo -e "${CYAN}Starting bulk scan (force mode)...${NC}"
echo ""

BATCH_NUM=0
for ((i = 0; i < TOTAL_URLS; i += BATCH_SIZE)); do
    BATCH_NUM=$((BATCH_NUM + 1))
    BATCH_URLS=("${URLS[@]:i:BATCH_SIZE}")
    BATCH_COUNT=${#BATCH_URLS[@]}

    echo -ne "\r${BLUE}Batch $BATCH_NUM/$TOTAL_BATCHES ($BATCH_COUNT URLs)...${NC}                    "

    JSON_URLS=$(printf '%s\n' "${BATCH_URLS[@]}" | jq -R . | jq -s .)

    # skipExisting: false = force scan all URLs
    RESPONSE=$(curl -s -X POST "${API_BASE}/admin/bulk-scan" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Key: $ADMIN_API_KEY" \
        -d "{\"urls\": $JSON_URLS, \"skipExisting\": false}" \
        --max-time 60 2>&1)

    if echo "$RESPONSE" | jq -e '.batchId' > /dev/null 2>&1; then
        BATCH_ID=$(echo "$RESPONSE" | jq -r '.batchId')
        QUEUED=$(echo "$RESPONSE" | jq -r '.queued')
        ERRORS=$(echo "$RESPONSE" | jq -r '.errors')

        BATCH_IDS+=("$BATCH_ID")
        TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
        TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

        echo "$(date '+%H:%M:%S') | Batch $BATCH_NUM | $BATCH_ID | Queued: $QUEUED | Errors: $ERRORS" >> "$LOG_FILE"
    else
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.title // .message // "Unknown"' 2>/dev/null || echo "$RESPONSE")
        echo "$(date '+%H:%M:%S') | Batch $BATCH_NUM | ERROR: $ERROR_MSG" >> "$LOG_FILE"
        TOTAL_ERRORS=$((TOTAL_ERRORS + BATCH_COUNT))
    fi

    sleep 1
done

echo ""
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Bulk scan submission complete!${NC}"
echo ""
echo -e "  ${GREEN}✓ Queued:     $TOTAL_QUEUED${NC}"
echo -e "  ${RED}✗ Errors:     $TOTAL_ERRORS${NC}"
echo ""
echo -e "${CYAN}Batch IDs (${#BATCH_IDS[@]} batches):${NC}"
printf '  %s\n' "${BATCH_IDS[@]}"
echo ""
echo "Log: $LOG_FILE"
echo ""

# Save batch IDs for monitoring
echo "${BATCH_IDS[@]}" > "${SCRIPT_DIR}/last-batch-ids.txt"
echo -e "${YELLOW}Batch IDs saved to: ${SCRIPT_DIR}/last-batch-ids.txt${NC}"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Done: $TOTAL_QUEUED queued, $TOTAL_ERRORS errors" >> "$LOG_FILE"
