#!/bin/bash

# Top 100 Websites Scanner for GeckoAdvisor
# This script scans popular websites to populate the Recent Scans section

API_BASE="https://geckoadvisor.com/api/v2"
DELAY_BETWEEN_SCANS=3  # seconds
MAX_WAIT_TIME=120      # max seconds to wait for scan completion

# Results tracking
SUCCESSFUL=0
FAILED=0
TIMEOUT=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Top 100 websites organized by category
declare -a WEBSITES=(
    # Search Engines (5)
    "google.com"
    "bing.com"
    "duckduckgo.com"
    "yahoo.com"
    "baidu.com"

    # Social Media (12)
    "facebook.com"
    "twitter.com"
    "instagram.com"
    "linkedin.com"
    "tiktok.com"
    "reddit.com"
    "pinterest.com"
    "snapchat.com"
    "tumblr.com"
    "discord.com"
    "telegram.org"
    "whatsapp.com"

    # Video & Streaming (8)
    "youtube.com"
    "netflix.com"
    "twitch.tv"
    "vimeo.com"
    "hulu.com"
    "disneyplus.com"
    "hbomax.com"
    "primevideo.com"

    # E-commerce (12)
    "amazon.com"
    "ebay.com"
    "walmart.com"
    "etsy.com"
    "alibaba.com"
    "shopify.com"
    "target.com"
    "bestbuy.com"
    "costco.com"
    "homedepot.com"
    "wayfair.com"
    "aliexpress.com"

    # News & Media (12)
    "cnn.com"
    "bbc.com"
    "nytimes.com"
    "washingtonpost.com"
    "reuters.com"
    "theguardian.com"
    "foxnews.com"
    "nbcnews.com"
    "huffpost.com"
    "forbes.com"
    "bloomberg.com"
    "wsj.com"

    # Tech Companies (12)
    "github.com"
    "stackoverflow.com"
    "microsoft.com"
    "apple.com"
    "mozilla.org"
    "google.com"
    "amazon.com"
    "meta.com"
    "nvidia.com"
    "intel.com"
    "ibm.com"
    "oracle.com"

    # Finance (8)
    "paypal.com"
    "chase.com"
    "bankofamerica.com"
    "wellsfargo.com"
    "capitalone.com"
    "americanexpress.com"
    "fidelity.com"
    "schwab.com"

    # Productivity & Tools (10)
    "wikipedia.org"
    "wordpress.com"
    "medium.com"
    "spotify.com"
    "dropbox.com"
    "notion.so"
    "slack.com"
    "zoom.us"
    "trello.com"
    "canva.com"

    # Travel & Transportation (6)
    "booking.com"
    "airbnb.com"
    "expedia.com"
    "uber.com"
    "lyft.com"
    "tripadvisor.com"

    # Education (5)
    "coursera.org"
    "udemy.com"
    "khanacademy.org"
    "edx.org"
    "duolingo.com"

    # Gaming (5)
    "steampowered.com"
    "epicgames.com"
    "roblox.com"
    "minecraft.net"
    "ign.com"

    # Misc Popular (5)
    "craigslist.org"
    "yelp.com"
    "imdb.com"
    "weather.com"
    "quora.com"
)

# Remove duplicates
WEBSITES=($(echo "${WEBSITES[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))

echo "=============================================="
echo "  GeckoAdvisor Top Sites Scanner"
echo "=============================================="
echo "Total unique sites to scan: ${#WEBSITES[@]}"
echo "API Base: $API_BASE"
echo "Delay between scans: ${DELAY_BETWEEN_SCANS}s"
echo "=============================================="
echo ""

# Function to submit a scan
submit_scan() {
    local url="https://$1"
    local response

    response=$(curl -s -X POST "$API_BASE/scan" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$url\"}" \
        2>/dev/null)

    echo "$response"
}

# Function to check scan status
check_status() {
    local scan_id="$1"
    local response

    response=$(curl -s "$API_BASE/scan/$scan_id/status" 2>/dev/null)
    echo "$response"
}

# Function to wait for scan completion
wait_for_scan() {
    local scan_id="$1"
    local site="$2"
    local elapsed=0
    local status=""

    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        local response=$(check_status "$scan_id")
        status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        local progress=$(echo "$response" | grep -o '"progress":[0-9]*' | cut -d':' -f2)

        if [ "$status" = "done" ]; then
            return 0
        elif [ "$status" = "error" ]; then
            return 1
        fi

        # Show progress
        printf "\r  Progress: %s%% (%ss elapsed)" "${progress:-0}" "$elapsed"

        sleep 2
        elapsed=$((elapsed + 2))
    done

    return 2  # timeout
}

# Log file
LOG_FILE="/Users/pothamsettyk/Projects/Privacy-Advisor/scripts/scan-results-$(date +%Y%m%d-%H%M%S).log"
echo "Scan started at $(date)" > "$LOG_FILE"

# Process each website
count=0
for site in "${WEBSITES[@]}"; do
    count=$((count + 1))

    echo -e "${BLUE}[$count/${#WEBSITES[@]}]${NC} Scanning: ${YELLOW}$site${NC}"

    # Submit scan
    response=$(submit_scan "$site")

    # Extract scan ID (handle both id and scanId fields)
    scan_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -z "$scan_id" ]; then
        scan_id=$(echo "$response" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
    fi

    # Check for errors
    error=$(echo "$response" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$scan_id" ]; then
        echo -e "  ${RED}FAILED${NC}: Could not submit scan - ${error:-Unknown error}"
        echo "FAILED: $site - ${error:-No scan ID returned}" >> "$LOG_FILE"
        FAILED=$((FAILED + 1))
    else
        echo "  Scan ID: $scan_id"

        # Wait for completion
        wait_for_scan "$scan_id" "$site"
        result=$?
        echo ""  # New line after progress

        if [ $result -eq 0 ]; then
            echo -e "  ${GREEN}SUCCESS${NC}: Scan completed"
            echo "SUCCESS: $site - ID: $scan_id" >> "$LOG_FILE"
            SUCCESSFUL=$((SUCCESSFUL + 1))
        elif [ $result -eq 1 ]; then
            echo -e "  ${RED}ERROR${NC}: Scan failed"
            echo "ERROR: $site - ID: $scan_id" >> "$LOG_FILE"
            FAILED=$((FAILED + 1))
        else
            echo -e "  ${YELLOW}TIMEOUT${NC}: Scan took too long"
            echo "TIMEOUT: $site - ID: $scan_id" >> "$LOG_FILE"
            TIMEOUT=$((TIMEOUT + 1))
        fi
    fi

    # Delay before next scan
    if [ $count -lt ${#WEBSITES[@]} ]; then
        echo "  Waiting ${DELAY_BETWEEN_SCANS}s before next scan..."
        sleep $DELAY_BETWEEN_SCANS
    fi

    echo ""
done

# Final report
echo "=============================================="
echo "  Scan Complete - Final Report"
echo "=============================================="
echo -e "${GREEN}Successful:${NC} $SUCCESSFUL"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Timeout:${NC} $TIMEOUT"
echo "Total: $((SUCCESSFUL + FAILED + TIMEOUT))"
echo ""
echo "Results saved to: $LOG_FILE"
echo "=============================================="

# Append summary to log
echo "" >> "$LOG_FILE"
echo "=============================================" >> "$LOG_FILE"
echo "SUMMARY" >> "$LOG_FILE"
echo "Successful: $SUCCESSFUL" >> "$LOG_FILE"
echo "Failed: $FAILED" >> "$LOG_FILE"
echo "Timeout: $TIMEOUT" >> "$LOG_FILE"
echo "Completed at: $(date)" >> "$LOG_FILE"
