#!/bin/bash

# Admin Bulk Scan Script for Gecko Advisor
# Uses the admin endpoint which bypasses Cloudflare rate limiting
#
# Usage:
#   ./admin-bulk-scan.sh                    # Scan all 5001 domains
#   ./admin-bulk-scan.sh 1 1000             # Scan lines 1-1000
#   BATCH_SIZE=50 ./admin-bulk-scan.sh      # Custom batch size (default: 100)

set -e

# Configuration
API_BASE="${API_BASE:-https://geckoadvisor.com}"
ADMIN_KEY="${ADMIN_API_KEY:-}"
BATCH_SIZE="${BATCH_SIZE:-100}"  # URLs per API request (max 100)
SITES_FILE="$(dirname "$0")/sites-5000.txt"
LOG_DIR="$(dirname "$0")/scan-logs"
RESULTS_FILE="$LOG_DIR/admin-bulk-$(date +%Y%m%d-%H%M%S).log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create log directory
mkdir -p "$LOG_DIR"

# Check for admin key
if [ -z "$ADMIN_KEY" ]; then
    echo -e "${RED}Error: ADMIN_API_KEY environment variable not set${NC}"
    echo "Usage: ADMIN_API_KEY=your-key ./admin-bulk-scan.sh [start] [end]"
    exit 1
fi

# Check sites file
if [ ! -f "$SITES_FILE" ]; then
    echo -e "${RED}Error: Sites file not found: $SITES_FILE${NC}"
    exit 1
fi

# Get domains (exclude comments and empty lines)
get_domains() {
    grep -v '^#' "$SITES_FILE" | grep -v '^$' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

TOTAL_DOMAINS=$(get_domains | wc -l | tr -d ' ')

# Parse arguments
START_LINE=${1:-1}
END_LINE=${2:-$TOTAL_DOMAINS}

# Validate range
if [ "$START_LINE" -lt 1 ]; then START_LINE=1; fi
if [ "$END_LINE" -gt "$TOTAL_DOMAINS" ]; then END_LINE=$TOTAL_DOMAINS; fi

DOMAIN_COUNT=$((END_LINE - START_LINE + 1))
BATCH_COUNT=$(( (DOMAIN_COUNT + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "=================================================="
echo "  Gecko Advisor - Admin Bulk Scanner"
echo "=================================================="
echo -e "API Target:    ${BLUE}$API_BASE${NC}"
echo -e "Total in file: $TOTAL_DOMAINS domains"
echo -e "Range:         $START_LINE to $END_LINE ($DOMAIN_COUNT domains)"
echo -e "Batch size:    $BATCH_SIZE URLs per request"
echo -e "Batches:       $BATCH_COUNT"
echo -e "Log File:      $RESULTS_FILE"
echo "=================================================="
echo ""

# Initialize results file
echo "# Admin Bulk Scan - $(date)" > "$RESULTS_FILE"
echo "# Range: $START_LINE to $END_LINE" >> "$RESULTS_FILE"
echo "# Batch size: $BATCH_SIZE" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Counters
TOTAL_QUEUED=0
TOTAL_SKIPPED=0
TOTAL_ERRORS=0
BATCH_IDS=()

# Start time
START_TIME=$(date +%s)

# Process in batches
CURRENT_LINE=$START_LINE
BATCH_NUM=1

while [ $CURRENT_LINE -le $END_LINE ]; do
    BATCH_END=$((CURRENT_LINE + BATCH_SIZE - 1))
    if [ $BATCH_END -gt $END_LINE ]; then
        BATCH_END=$END_LINE
    fi

    echo -e "${BLUE}[Batch $BATCH_NUM/$BATCH_COUNT]${NC} Lines $CURRENT_LINE-$BATCH_END"

    # Get domains for this batch and format as JSON array
    DOMAINS=$(get_domains | sed -n "${CURRENT_LINE},${BATCH_END}p" | awk '{printf "\"%s\",", "https://"$0}' | sed 's/,$//')
    JSON_BODY="{\"urls\":[$DOMAINS],\"skipExisting\":true}"

    # Submit batch
    RESPONSE=$(curl -s -X POST "$API_BASE/admin/bulk-scan" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Key: $ADMIN_KEY" \
        -d "$JSON_BODY" 2>/dev/null)

    # Parse response
    QUEUED=$(echo "$RESPONSE" | grep -o '"queued":[0-9]*' | cut -d':' -f2)
    SKIPPED=$(echo "$RESPONSE" | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
    ERRORS=$(echo "$RESPONSE" | grep -o '"errors":[0-9]*' | cut -d':' -f2)
    BATCH_ID=$(echo "$RESPONSE" | grep -o '"batchId":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$QUEUED" ]; then
        echo -e "  ${RED}ERROR: Failed to submit batch${NC}"
        echo "  Response: $RESPONSE"
        echo "BATCH $BATCH_NUM: ERROR - $RESPONSE" >> "$RESULTS_FILE"
    else
        BATCH_IDS+=("$BATCH_ID")
        TOTAL_QUEUED=$((TOTAL_QUEUED + QUEUED))
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
        TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

        echo -e "  ${GREEN}Queued: $QUEUED${NC} | ${YELLOW}Skipped: $SKIPPED${NC} | Errors: $ERRORS | BatchID: $BATCH_ID"
        echo "BATCH $BATCH_NUM: queued=$QUEUED skipped=$SKIPPED errors=$ERRORS batchId=$BATCH_ID" >> "$RESULTS_FILE"
    fi

    CURRENT_LINE=$((BATCH_END + 1))
    BATCH_NUM=$((BATCH_NUM + 1))

    # Small delay between batches to avoid overwhelming the server
    sleep 1
done

# End time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=================================================="
echo "  SUBMISSION COMPLETE"
echo "=================================================="
echo -e "  ${GREEN}Queued:${NC}   $TOTAL_QUEUED"
echo -e "  ${YELLOW}Skipped:${NC}  $TOTAL_SKIPPED"
echo -e "  ${RED}Errors:${NC}   $TOTAL_ERRORS"
echo -e "  Duration: ${DURATION}s ($((DURATION / 60))m $((DURATION % 60))s)"
echo "=================================================="
echo ""
echo "Batch IDs for status tracking:"
printf '%s\n' "${BATCH_IDS[@]}"

# Save summary
echo "" >> "$RESULTS_FILE"
echo "# Summary" >> "$RESULTS_FILE"
echo "# Total Queued: $TOTAL_QUEUED" >> "$RESULTS_FILE"
echo "# Total Skipped: $TOTAL_SKIPPED" >> "$RESULTS_FILE"
echo "# Total Errors: $TOTAL_ERRORS" >> "$RESULTS_FILE"
echo "# Duration: ${DURATION}s" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "# Batch IDs:" >> "$RESULTS_FILE"
printf '%s\n' "${BATCH_IDS[@]}" >> "$RESULTS_FILE"

echo ""
echo "To check batch status:"
echo "  curl -H 'X-Admin-Key: \$ADMIN_API_KEY' '$API_BASE/admin/bulk-scan/<batchId>'"
