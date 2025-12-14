#!/bin/bash
# Scan all URLs from batch-urls-1k.txt in random order
# Usage: ./scan-all-random.sh [delay_seconds]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_FILE="${SCRIPT_DIR}/batch-urls-1k.txt"
DELAY="${1:-3}"
LOG_FILE="${SCRIPT_DIR}/scan-all-$(date +%Y%m%d-%H%M%S).log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Gecko Advisor - Full Batch Scanner (Randomized)       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Count total URLs
TOTAL=$(grep -E '^https://' "$URL_FILE" | wc -l | tr -d ' ')
echo -e "${YELLOW}Total URLs: $TOTAL${NC}"
echo -e "${YELLOW}Delay: ${DELAY}s between requests${NC}"
echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
echo ""

# Initialize counters
SUCCESS=0
EXISTING=0
FAILED=0
COUNTER=0

# Start time
START_TIME=$(date +%s)

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting scan of $TOTAL URLs (randomized)" >> "$LOG_FILE"

# Shuffle URLs using awk (macOS compatible)
shuffle_urls() {
    awk 'BEGIN{srand()} {print rand()"\t"$0}' | sort -n | cut -f2-
}

# Shuffle and process URLs
grep -E '^https://' "$URL_FILE" | shuffle_urls | while read -r url; do
    COUNTER=$((COUNTER + 1))

    # Progress display
    PERCENT=$((COUNTER * 100 / TOTAL))
    ELAPSED=$(($(date +%s) - START_TIME))
    if [ $COUNTER -gt 1 ]; then
        ETA=$(( (ELAPSED * TOTAL / COUNTER) - ELAPSED ))
        ETA_MIN=$((ETA / 60))
        ETA_SEC=$((ETA % 60))
        echo -ne "\r${BLUE}[$COUNTER/$TOTAL] ${PERCENT}% | ETA: ${ETA_MIN}m ${ETA_SEC}s${NC}    "
    fi

    # Make API request
    result=$(curl -s -X POST "https://geckoadvisor.com/api/v2/scan" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"${url}\"}" \
        --max-time 30 2>/dev/null)

    # Parse result
    if echo "$result" | grep -q '"scanId"'; then
        scan_id=$(echo "$result" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
        echo "$(date '+%H:%M:%S') | NEW | $url | $scan_id" >> "$LOG_FILE"
        SUCCESS=$((SUCCESS + 1))
    elif echo "$result" | grep -q '"existingScanId"'; then
        scan_id=$(echo "$result" | grep -o '"existingScanId":"[^"]*"' | cut -d'"' -f4)
        echo "$(date '+%H:%M:%S') | EXISTS | $url | $scan_id" >> "$LOG_FILE"
        EXISTING=$((EXISTING + 1))
    elif echo "$result" | grep -q 'rate limit\|1015'; then
        echo "$(date '+%H:%M:%S') | RATE_LIMITED | $url | Waiting 10s..." >> "$LOG_FILE"
        FAILED=$((FAILED + 1))
        sleep 10
    else
        error=$(echo "$result" | grep -o '"title":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "Unknown")
        echo "$(date '+%H:%M:%S') | FAILED | $url | $error" >> "$LOG_FILE"
        FAILED=$((FAILED + 1))
    fi

    # Print status every 50 URLs
    if [ $((COUNTER % 50)) -eq 0 ]; then
        echo ""
        echo -e "  ${GREEN}✓ New: $SUCCESS${NC} | ${YELLOW}○ Existing: $EXISTING${NC} | ${RED}✗ Failed: $FAILED${NC}"
    fi

    sleep "$DELAY"
done

# Final summary
ELAPSED=$(($(date +%s) - START_TIME))
ELAPSED_MIN=$((ELAPSED / 60))
ELAPSED_SEC=$((ELAPSED % 60))

echo ""
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Batch scan complete!${NC}"
echo ""
echo -e "  ${GREEN}✓ New scans:    $SUCCESS${NC}"
echo -e "  ${YELLOW}○ Existing:     $EXISTING${NC}"
echo -e "  ${RED}✗ Failed:       $FAILED${NC}"
echo ""
echo "Total time: ${ELAPSED_MIN}m ${ELAPSED_SEC}s"
echo "Log file: $LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Completed in ${ELAPSED_MIN}m ${ELAPSED_SEC}s: $SUCCESS new, $EXISTING existing, $FAILED failed" >> "$LOG_FILE"
