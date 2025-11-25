#!/bin/bash

# Batch scanner for 1000+ websites
# Usage: ./scan-1000.sh [start_index]
# Example: ./scan-1000.sh 150  # Resume from site 150

API_BASE="https://geckoadvisor.com/api/v2"
SITES_FILE="$(dirname "$0")/sites-1000.txt"
DELAY=3              # Delay between scans (seconds)
RATE_LIMIT_DELAY=30  # Delay after rate limit (seconds)
MAX_WAIT=120         # Max wait for scan completion
BATCH_SIZE=50        # Save progress every N scans

# Results file with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="$(dirname "$0")/results"
mkdir -p "$RESULTS_DIR"
RESULTS_FILE="$RESULTS_DIR/scan-results-$TIMESTAMP.txt"
PROGRESS_FILE="$RESULTS_DIR/scan-progress.txt"

# Read sites from file (skip comments and empty lines) - macOS compatible
SITES=()
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^# ]] && continue
    [[ -z "$line" ]] && continue
    # Trim whitespace
    line=$(echo "$line" | xargs)
    [[ -n "$line" ]] && SITES+=("$line")
done < "$SITES_FILE"

START=${1:-0}
SUCCESS=0
FAIL=0
RATE_LIMITED=0
DEDUPED=0
TOTAL=${#SITES[@]}

echo "============================================" | tee "$RESULTS_FILE"
echo "Gecko Advisor Batch Scanner" | tee -a "$RESULTS_FILE"
echo "============================================" | tee -a "$RESULTS_FILE"
echo "Sites file: $SITES_FILE" | tee -a "$RESULTS_FILE"
echo "Total sites: $TOTAL" | tee -a "$RESULTS_FILE"
echo "Starting from: $START" | tee -a "$RESULTS_FILE"
echo "Started: $(date)" | tee -a "$RESULTS_FILE"
echo "============================================" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Function to save progress
save_progress() {
    echo "$1" > "$PROGRESS_FILE"
    echo "Progress saved: site $1 of $TOTAL (Success: $SUCCESS, Failed: $FAIL, Deduped: $DEDUPED)" | tee -a "$RESULTS_FILE"
}

for i in $(seq $START $((TOTAL - 1))); do
    site="${SITES[$i]}"

    # Skip empty entries
    if [ -z "$site" ]; then
        continue
    fi

    echo "[$((i+1))/$TOTAL] Scanning: $site" | tee -a "$RESULTS_FILE"

    # Submit scan with retry for rate limiting
    retries=0
    max_retries=5
    scan_id=""
    was_deduped=""

    while [ $retries -lt $max_retries ] && [ -z "$scan_id" ]; do
        resp=$(curl -s -X POST "$API_BASE/scan" \
            -H "Content-Type: application/json" \
            -d "{\"url\": \"https://$site\"}" \
            --connect-timeout 10 \
            --max-time 30)

        # Check for rate limiting (various patterns)
        if echo "$resp" | grep -qiE "1015|rate.?limit|too.?many|429" ; then
            RATE_LIMITED=$((RATE_LIMITED + 1))
            retries=$((retries + 1))
            wait_time=$((RATE_LIMIT_DELAY * retries))
            echo "  Rate limited, waiting ${wait_time}s (retry $retries/$max_retries)..." | tee -a "$RESULTS_FILE"
            sleep $wait_time
            continue
        fi

        # Check for error response
        if echo "$resp" | grep -qiE '"type":"about:blank"|"status":4[0-9][0-9]|"status":5[0-9][0-9]' ; then
            error_msg=$(echo "$resp" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
            echo "  API Error: $error_msg" | tee -a "$RESULTS_FILE"
            break
        fi

        scan_id=$(echo "$resp" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
        was_deduped=$(echo "$resp" | grep -o '"deduped":true')
    done

    if [ -z "$scan_id" ]; then
        echo "  FAILED: No scan ID after $max_retries retries" | tee -a "$RESULTS_FILE"
        FAIL=$((FAIL + 1))
        sleep $DELAY
        continue
    fi

    if [ -n "$was_deduped" ]; then
        echo "  (using cached result)" | tee -a "$RESULTS_FILE"
        DEDUPED=$((DEDUPED + 1))
    fi

    # Wait for completion
    elapsed=0
    final_status="timeout"
    while [ $elapsed -lt $MAX_WAIT ]; do
        status_resp=$(curl -s "$API_BASE/scan/$scan_id/status" --connect-timeout 10 --max-time 15)
        status=$(echo "$status_resp" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        progress=$(echo "$status_resp" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        score=$(echo "$status_resp" | grep -o '"score":[0-9]*' | cut -d':' -f2)
        label=$(echo "$status_resp" | grep -o '"label":"[^"]*"' | cut -d'"' -f4)

        if [ "$status" = "done" ]; then
            echo "  OK: Score $score ($label)" | tee -a "$RESULTS_FILE"
            SUCCESS=$((SUCCESS + 1))
            final_status="done"
            break
        elif [ "$status" = "error" ]; then
            error=$(echo "$status_resp" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
            echo "  ERROR: $error" | tee -a "$RESULTS_FILE"
            FAIL=$((FAIL + 1))
            final_status="error"
            break
        fi

        # Show progress
        if [ -n "$progress" ] && [ "$progress" != "0" ]; then
            printf "\r  Progress: %s%%" "$progress"
        fi

        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ "$final_status" = "timeout" ]; then
        echo "  TIMEOUT after ${elapsed}s" | tee -a "$RESULTS_FILE"
        FAIL=$((FAIL + 1))
    fi

    # Save progress periodically
    if [ $(((i + 1) % BATCH_SIZE)) -eq 0 ]; then
        save_progress $((i + 1))
    fi

    sleep $DELAY
done

echo "" | tee -a "$RESULTS_FILE"
echo "============================================" | tee -a "$RESULTS_FILE"
echo "SCAN COMPLETE" | tee -a "$RESULTS_FILE"
echo "============================================" | tee -a "$RESULTS_FILE"
echo "Total scanned: $TOTAL" | tee -a "$RESULTS_FILE"
echo "Successful: $SUCCESS" | tee -a "$RESULTS_FILE"
echo "Failed: $FAIL" | tee -a "$RESULTS_FILE"
echo "Deduped (cached): $DEDUPED" | tee -a "$RESULTS_FILE"
echo "Rate limit events: $RATE_LIMITED" | tee -a "$RESULTS_FILE"
echo "Finished: $(date)" | tee -a "$RESULTS_FILE"
echo "Results saved to: $RESULTS_FILE" | tee -a "$RESULTS_FILE"
echo "============================================" | tee -a "$RESULTS_FILE"

# Clean up progress file
rm -f "$PROGRESS_FILE"
