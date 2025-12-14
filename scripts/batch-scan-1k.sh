#!/bin/bash
# Batch scan 1000+ websites
# Usage: ./batch-scan-1k.sh [concurrency] [delay_ms]
#
# Example: ./batch-scan-1k.sh 10 500
#   - 10 concurrent requests
#   - 500ms delay between batches

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL_FILE="${SCRIPT_DIR}/batch-urls-1k.txt"
API_BASE="${API_BASE:-https://geckoadvisor.com/api/v2}"
CONCURRENCY="${1:-5}"
DELAY_MS="${2:-1000}"
LOG_FILE="${SCRIPT_DIR}/batch-scan-1k-$(date +%Y%m%d-%H%M%S).log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Gecko Advisor - Batch Scanner (1K+ URLs)           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  API Base:     $API_BASE"
echo "  URL File:     $URL_FILE"
echo "  Concurrency:  $CONCURRENCY"
echo "  Delay:        ${DELAY_MS}ms"
echo "  Log File:     $LOG_FILE"
echo ""

# Check if URL file exists
if [ ! -f "$URL_FILE" ]; then
    echo -e "${RED}Error: URL file not found: $URL_FILE${NC}"
    exit 1
fi

# Count URLs (excluding comments and empty lines)
TOTAL_URLS=$(grep -E '^https://' "$URL_FILE" | wc -l | tr -d ' ')
echo -e "${GREEN}Total URLs to scan: $TOTAL_URLS${NC}"
echo ""

# Initialize counters
SUCCESS=0
FAILED=0
SKIPPED=0

# Function to scan a single URL
scan_url() {
    local url="$1"
    local result

    result=$(curl -s -X POST "${API_BASE}/scan" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"${url}\"}" \
        --max-time 30 2>/dev/null)

    if echo "$result" | grep -q '"scanId"'; then
        local scan_id=$(echo "$result" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
        echo "SUCCESS|$url|$scan_id"
    elif echo "$result" | grep -q '"existingScanId"'; then
        local scan_id=$(echo "$result" | grep -o '"existingScanId":"[^"]*"' | cut -d'"' -f4)
        echo "EXISTING|$url|$scan_id"
    elif echo "$result" | grep -q 'rate limit'; then
        echo "RATE_LIMITED|$url|"
        sleep 5
    else
        local error=$(echo "$result" | grep -o '"title":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        echo "FAILED|$url|$error"
    fi
}

# Export function for parallel execution
export -f scan_url
export API_BASE

echo -e "${YELLOW}Starting batch scan...${NC}"
echo "Press Ctrl+C to stop"
echo ""
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting batch scan of $TOTAL_URLS URLs" >> "$LOG_FILE"

# Process URLs with progress
COUNTER=0
grep -E '^https://' "$URL_FILE" | while read -r url; do
    COUNTER=$((COUNTER + 1))

    # Show progress every 10 URLs
    if [ $((COUNTER % 10)) -eq 0 ]; then
        PERCENT=$((COUNTER * 100 / TOTAL_URLS))
        echo -ne "\r${BLUE}Progress: ${COUNTER}/${TOTAL_URLS} (${PERCENT}%)${NC}    "
    fi

    # Scan URL
    result=$(scan_url "$url")
    status=$(echo "$result" | cut -d'|' -f1)
    scan_id=$(echo "$result" | cut -d'|' -f3)

    # Log result
    echo "$(date '+%H:%M:%S') | $status | $url | $scan_id" >> "$LOG_FILE"

    case $status in
        SUCCESS)
            SUCCESS=$((SUCCESS + 1))
            ;;
        EXISTING)
            SKIPPED=$((SKIPPED + 1))
            ;;
        *)
            FAILED=$((FAILED + 1))
            ;;
    esac

    # Rate limiting delay
    sleep "0.$(printf '%03d' $DELAY_MS)"
done

echo ""
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Batch scan complete!${NC}"
echo ""
echo -e "  ${GREEN}✓ New scans:    $SUCCESS${NC}"
echo -e "  ${YELLOW}○ Existing:     $SKIPPED${NC}"
echo -e "  ${RED}✗ Failed:       $FAILED${NC}"
echo ""
echo "Log file: $LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Completed: $SUCCESS new, $SKIPPED existing, $FAILED failed" >> "$LOG_FILE"
