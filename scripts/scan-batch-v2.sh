#!/bin/bash

# Batch scanner for GeckoAdvisor v2 - with rate limit handling
# Usage: ./scan-batch-v2.sh [start_index]

API_BASE="https://geckoadvisor.com/api/v2"
DELAY=5           # Normal delay between scans
RATE_LIMIT_DELAY=15  # Extra delay after rate limit
MAX_WAIT=120

# All websites to scan (100 total)
SITES=(
    "google.com"
    "bing.com"
    "duckduckgo.com"
    "yahoo.com"
    "baidu.com"
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
    "youtube.com"
    "netflix.com"
    "twitch.tv"
    "vimeo.com"
    "hulu.com"
    "disneyplus.com"
    "hbomax.com"
    "primevideo.com"
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
    "github.com"
    "stackoverflow.com"
    "microsoft.com"
    "apple.com"
    "mozilla.org"
    "meta.com"
    "nvidia.com"
    "intel.com"
    "ibm.com"
    "oracle.com"
    "paypal.com"
    "chase.com"
    "bankofamerica.com"
    "wellsfargo.com"
    "capitalone.com"
    "americanexpress.com"
    "fidelity.com"
    "schwab.com"
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
    "booking.com"
    "airbnb.com"
    "expedia.com"
    "uber.com"
    "lyft.com"
    "tripadvisor.com"
    "coursera.org"
    "udemy.com"
    "khanacademy.org"
    "edx.org"
    "duolingo.com"
    "steampowered.com"
    "epicgames.com"
    "roblox.com"
    "minecraft.net"
    "ign.com"
    "craigslist.org"
    "yelp.com"
    "imdb.com"
    "weather.com"
    "quora.com"
    "zillow.com"
    "glassdoor.com"
)

START=${1:-0}
SUCCESS=0
FAIL=0
RATE_LIMITED=0
RESULTS_FILE="/Users/pothamsettyk/Projects/Privacy-Advisor/scripts/scan-results.txt"

echo "Starting batch scan from index $START" | tee "$RESULTS_FILE"
echo "Total sites: ${#SITES[@]}" | tee -a "$RESULTS_FILE"
echo "Timestamp: $(date)" | tee -a "$RESULTS_FILE"
echo "---" | tee -a "$RESULTS_FILE"

for i in $(seq $START $((${#SITES[@]} - 1))); do
    site="${SITES[$i]}"
    echo "[$((i+1))/${#SITES[@]}] $site" | tee -a "$RESULTS_FILE"

    # Submit scan with retry for rate limiting
    retries=0
    max_retries=3
    scan_id=""

    while [ $retries -lt $max_retries ] && [ -z "$scan_id" ]; do
        resp=$(curl -s -X POST "$API_BASE/scan" -H "Content-Type: application/json" -d "{\"url\": \"https://$site\"}")

        # Check for rate limiting
        if echo "$resp" | grep -q "1015\|rate\|limit" ; then
            RATE_LIMITED=$((RATE_LIMITED + 1))
            retries=$((retries + 1))
            echo "  Rate limited, waiting ${RATE_LIMIT_DELAY}s (retry $retries/$max_retries)..." | tee -a "$RESULTS_FILE"
            sleep $RATE_LIMIT_DELAY
            continue
        fi

        scan_id=$(echo "$resp" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
        deduped=$(echo "$resp" | grep -o '"deduped":true')
    done

    if [ -z "$scan_id" ]; then
        echo "  FAILED: No scan ID after $max_retries retries" | tee -a "$RESULTS_FILE"
        FAIL=$((FAIL + 1))
        sleep $DELAY
        continue
    fi

    [ -n "$deduped" ] && echo "  (deduped)" | tee -a "$RESULTS_FILE"

    # Wait for completion
    elapsed=0
    final_status="timeout"
    while [ $elapsed -lt $MAX_WAIT ]; do
        status_resp=$(curl -s "$API_BASE/scan/$scan_id/status")
        status=$(echo "$status_resp" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        progress=$(echo "$status_resp" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        score=$(echo "$status_resp" | grep -o '"score":[0-9]*' | cut -d':' -f2)
        label=$(echo "$status_resp" | grep -o '"label":"[^"]*"' | cut -d'"' -f4)

        if [ "$status" = "done" ]; then
            echo "  OK: $score ($label)" | tee -a "$RESULTS_FILE"
            SUCCESS=$((SUCCESS + 1))
            final_status="done"
            break
        elif [ "$status" = "error" ]; then
            echo "  ERROR" | tee -a "$RESULTS_FILE"
            FAIL=$((FAIL + 1))
            final_status="error"
            break
        fi

        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ "$final_status" = "timeout" ]; then
        echo "  TIMEOUT (${elapsed}s)" | tee -a "$RESULTS_FILE"
        FAIL=$((FAIL + 1))
    fi

    sleep $DELAY
done

echo "---" | tee -a "$RESULTS_FILE"
echo "COMPLETE" | tee -a "$RESULTS_FILE"
echo "Success: $SUCCESS" | tee -a "$RESULTS_FILE"
echo "Failed: $FAIL" | tee -a "$RESULTS_FILE"
echo "Rate limited events: $RATE_LIMITED" | tee -a "$RESULTS_FILE"
echo "Finished: $(date)" | tee -a "$RESULTS_FILE"
