#!/bin/bash
# Monitor bulk scan progress
# Usage: ADMIN_API_KEY=your_key ./monitor-bulk-scan.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_BASE="${API_BASE:-https://geckoadvisor.com/api}"
BATCH_FILE="${SCRIPT_DIR}/last-batch-ids.txt"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "$ADMIN_API_KEY" ]; then
    echo -e "${RED}Error: ADMIN_API_KEY not set${NC}"
    exit 1
fi

if [ ! -f "$BATCH_FILE" ]; then
    echo -e "${RED}Error: No batch IDs file found${NC}"
    exit 1
fi

BATCH_IDS=($(cat "$BATCH_FILE"))

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Bulk Scan Progress Monitor                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_DONE=0
TOTAL_RUNNING=0
TOTAL_QUEUED=0
TOTAL_ERROR=0
TOTAL_SCANS=0

for BATCH_ID in "${BATCH_IDS[@]}"; do
    RESPONSE=$(curl -s -H "X-Admin-Key: $ADMIN_API_KEY" "${API_BASE}/admin/bulk-scan/$BATCH_ID" 2>&1)

    if echo "$RESPONSE" | jq -e '.total' > /dev/null 2>&1; then
        TOTAL=$(echo "$RESPONSE" | jq -r '.total')
        DONE=$(echo "$RESPONSE" | jq -r '.done')
        RUNNING=$(echo "$RESPONSE" | jq -r '.running')
        QUEUED=$(echo "$RESPONSE" | jq -r '.queued')
        ERROR=$(echo "$RESPONSE" | jq -r '.error')

        TOTAL_SCANS=$((TOTAL_SCANS + TOTAL))
        TOTAL_DONE=$((TOTAL_DONE + DONE))
        TOTAL_RUNNING=$((TOTAL_RUNNING + RUNNING))
        TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
        TOTAL_ERROR=$((TOTAL_ERROR + ERROR))

        printf "  Batch %-26s: %3d done, %3d running, %3d queued, %3d error\n" "$BATCH_ID" "$DONE" "$RUNNING" "$QUEUED" "$ERROR"
    else
        echo -e "  Batch $BATCH_ID: ${RED}Error fetching status${NC}"
    fi
done

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Overall Progress:${NC}"
echo ""

if [ $TOTAL_SCANS -gt 0 ]; then
    PERCENT=$((TOTAL_DONE * 100 / TOTAL_SCANS))
    echo -e "  Total:    $TOTAL_SCANS"
    echo -e "  ${GREEN}Done:     $TOTAL_DONE ($PERCENT%)${NC}"
    echo -e "  ${YELLOW}Running:  $TOTAL_RUNNING${NC}"
    echo -e "  ${BLUE}Queued:   $TOTAL_QUEUED${NC}"
    echo -e "  ${RED}Errors:   $TOTAL_ERROR${NC}"

    # Progress bar
    BAR_WIDTH=50
    FILLED=$((PERCENT * BAR_WIDTH / 100))
    EMPTY=$((BAR_WIDTH - FILLED))
    printf "\n  ["
    printf "%${FILLED}s" | tr ' ' '█'
    printf "%${EMPTY}s" | tr ' ' '░'
    printf "] %d%%\n" "$PERCENT"
fi
echo ""
