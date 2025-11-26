#!/bin/bash

# Parallel batch scanner for 5000 domains - LOCAL EXECUTION
# Usage: ./scan-5000-parallel.sh [start_line] [end_line]
# Example: ./scan-5000-parallel.sh 1 1000    # Scan lines 1-1000
# Example: ./scan-5000-parallel.sh           # Scan all

set -e

# Configuration
API_BASE="${API_BASE:-http://localhost:5000/api/v2}"  # Local by default
CONCURRENT_JOBS=10        # Number of parallel scans
MAX_WAIT=90               # Max seconds to wait for single scan
SITES_FILE="$(dirname "$0")/sites-5000.txt"
LOG_DIR="$(dirname "$0")/scan-logs"
PROGRESS_FILE="$LOG_DIR/progress.txt"
RESULTS_FILE="$LOG_DIR/results-$(date +%Y%m%d-%H%M%S).txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create log directory
mkdir -p "$LOG_DIR"

# Check if sites file exists
if [ ! -f "$SITES_FILE" ]; then
    echo -e "${RED}Error: Sites file not found: $SITES_FILE${NC}"
    exit 1
fi

# Filter out comments and empty lines, get domains
get_domains() {
    grep -v '^#' "$SITES_FILE" | grep -v '^$' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Count total domains
TOTAL_DOMAINS=$(get_domains | wc -l | tr -d ' ')

# Parse arguments
START_LINE=${1:-1}
END_LINE=${2:-$TOTAL_DOMAINS}

# Validate range
if [ "$START_LINE" -lt 1 ]; then START_LINE=1; fi
if [ "$END_LINE" -gt "$TOTAL_DOMAINS" ]; then END_LINE=$TOTAL_DOMAINS; fi

echo "=================================================="
echo "  Gecko Advisor - Parallel Batch Scanner (5000)"
echo "=================================================="
echo -e "API Target:    ${BLUE}$API_BASE${NC}"
echo -e "Sites File:    $SITES_FILE"
echo -e "Total Domains: $TOTAL_DOMAINS"
echo -e "Range:         $START_LINE to $END_LINE"
echo -e "Concurrency:   $CONCURRENT_JOBS parallel jobs"
echo -e "Log File:      $RESULTS_FILE"
echo "=================================================="
echo ""

# Counters (using files for parallel job communication)
echo "0" > "$LOG_DIR/success_count"
echo "0" > "$LOG_DIR/fail_count"
echo "0" > "$LOG_DIR/skip_count"
echo "$START_LINE" > "$LOG_DIR/current_line"

# Function to scan a single domain
scan_domain() {
    local line_num=$1
    local domain=$2
    local log_prefix="[$line_num/$END_LINE]"

    # Skip empty domains
    if [ -z "$domain" ]; then
        return
    fi

    # Submit scan
    local resp
    resp=$(curl -s -X POST "$API_BASE/scan" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"https://$domain\"}" 2>/dev/null || echo '{"error":"curl_failed"}')

    local scan_id
    scan_id=$(echo "$resp" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
    local deduped
    deduped=$(echo "$resp" | grep -o '"deduped":true')

    if [ -z "$scan_id" ]; then
        echo -e "${RED}$log_prefix FAIL${NC} $domain - No scan ID"
        echo "$line_num|$domain|FAIL|No scan ID" >> "$RESULTS_FILE"
        local fail_count=$(cat "$LOG_DIR/fail_count")
        echo $((fail_count + 1)) > "$LOG_DIR/fail_count"
        return
    fi

    if [ -n "$deduped" ]; then
        echo -e "${YELLOW}$log_prefix SKIP${NC} $domain - Already scanned (deduped)"
        echo "$line_num|$domain|SKIP|Deduped" >> "$RESULTS_FILE"
        local skip_count=$(cat "$LOG_DIR/skip_count")
        echo $((skip_count + 1)) > "$LOG_DIR/skip_count"
        return
    fi

    # Wait for completion
    local elapsed=0
    while [ $elapsed -lt $MAX_WAIT ]; do
        local status_resp
        status_resp=$(curl -s "$API_BASE/scan/$scan_id/status" 2>/dev/null || echo '{}')
        local status
        status=$(echo "$status_resp" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        local score
        score=$(echo "$status_resp" | grep -o '"score":[0-9]*' | cut -d':' -f2)
        local label
        label=$(echo "$status_resp" | grep -o '"label":"[^"]*"' | cut -d'"' -f4)

        if [ "$status" = "done" ]; then
            echo -e "${GREEN}$log_prefix OK${NC} $domain - Score: $score ($label)"
            echo "$line_num|$domain|OK|$score|$label" >> "$RESULTS_FILE"
            local success_count=$(cat "$LOG_DIR/success_count")
            echo $((success_count + 1)) > "$LOG_DIR/success_count"
            return
        elif [ "$status" = "error" ]; then
            echo -e "${RED}$log_prefix ERR${NC} $domain - Scan error"
            echo "$line_num|$domain|ERROR|Scan failed" >> "$RESULTS_FILE"
            local fail_count=$(cat "$LOG_DIR/fail_count")
            echo $((fail_count + 1)) > "$LOG_DIR/fail_count"
            return
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    # Timeout
    echo -e "${RED}$log_prefix TMO${NC} $domain - Timeout after ${MAX_WAIT}s"
    echo "$line_num|$domain|TIMEOUT|${MAX_WAIT}s" >> "$RESULTS_FILE"
    local fail_count=$(cat "$LOG_DIR/fail_count")
    echo $((fail_count + 1)) > "$LOG_DIR/fail_count"
}

# Export function and variables for parallel execution
export -f scan_domain
export API_BASE MAX_WAIT LOG_DIR RESULTS_FILE END_LINE
export GREEN RED YELLOW BLUE NC

# Initialize results file
echo "# Scan Results - $(date)" > "$RESULTS_FILE"
echo "# Format: line_num|domain|status|details" >> "$RESULTS_FILE"
echo "# Range: $START_LINE to $END_LINE" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Start time
START_TIME=$(date +%s)

# Run scans in parallel using xargs
# Each domain is processed by scan_domain function
get_domains | sed -n "${START_LINE},${END_LINE}p" | nl -v $START_LINE | \
    xargs -P $CONCURRENT_JOBS -I {} bash -c 'scan_domain $(echo "{}" | awk "{print \$1}") $(echo "{}" | awk "{print \$2}")'

# End time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Final stats
SUCCESS=$(cat "$LOG_DIR/success_count")
FAIL=$(cat "$LOG_DIR/fail_count")
SKIP=$(cat "$LOG_DIR/skip_count")
TOTAL=$((SUCCESS + FAIL + SKIP))

echo ""
echo "=================================================="
echo "  SCAN COMPLETE"
echo "=================================================="
echo -e "  ${GREEN}Success:${NC}  $SUCCESS"
echo -e "  ${RED}Failed:${NC}   $FAIL"
echo -e "  ${YELLOW}Skipped:${NC}  $SKIP"
echo -e "  Total:    $TOTAL"
echo -e "  Duration: ${DURATION}s ($((DURATION / 60))m $((DURATION % 60))s)"
echo -e "  Results:  $RESULTS_FILE"
echo "=================================================="

# Append summary to results
echo "" >> "$RESULTS_FILE"
echo "# Summary" >> "$RESULTS_FILE"
echo "# Success: $SUCCESS" >> "$RESULTS_FILE"
echo "# Failed: $FAIL" >> "$RESULTS_FILE"
echo "# Skipped: $SKIP" >> "$RESULTS_FILE"
echo "# Duration: ${DURATION}s" >> "$RESULTS_FILE"

# Clean up temp files
rm -f "$LOG_DIR/success_count" "$LOG_DIR/fail_count" "$LOG_DIR/skip_count" "$LOG_DIR/current_line"

echo ""
echo "To resume from where you left off, run:"
echo "  ./scan-5000-parallel.sh $((END_LINE + 1))"
