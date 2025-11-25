#!/bin/bash

# Batch scanner for GeckoAdvisor
# Usage: ./scan-batch.sh [start_index]

API_BASE="https://geckoadvisor.com/api/v2"
DELAY=3
MAX_WAIT=90

# All websites to scan (100 total, deduplicated)
SITES=(
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
    # Tech Companies (10)
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
    # Misc Popular (7)
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

echo "Starting batch scan from index $START"
echo "Total sites: ${#SITES[@]}"
echo "---"

for i in $(seq $START $((${#SITES[@]} - 1))); do
    site="${SITES[$i]}"
    echo "[$((i+1))/${#SITES[@]}] Scanning $site..."

    # Submit scan
    resp=$(curl -s -X POST "$API_BASE/scan" -H "Content-Type: application/json" -d "{\"url\": \"https://$site\"}")
    scan_id=$(echo "$resp" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
    deduped=$(echo "$resp" | grep -o '"deduped":true')

    if [ -z "$scan_id" ]; then
        echo "  FAILED: No scan ID returned"
        echo "$resp"
        FAIL=$((FAIL + 1))
        sleep $DELAY
        continue
    fi

    if [ -n "$deduped" ]; then
        echo "  Already scanned recently (deduped), checking status..."
    fi

    # Wait for completion
    elapsed=0
    while [ $elapsed -lt $MAX_WAIT ]; do
        status_resp=$(curl -s "$API_BASE/scan/$scan_id/status")
        status=$(echo "$status_resp" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        progress=$(echo "$status_resp" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        score=$(echo "$status_resp" | grep -o '"score":[0-9]*' | cut -d':' -f2)
        label=$(echo "$status_resp" | grep -o '"label":"[^"]*"' | cut -d'"' -f4)

        if [ "$status" = "done" ]; then
            echo "  SUCCESS: Score=$score ($label)"
            SUCCESS=$((SUCCESS + 1))
            break
        elif [ "$status" = "error" ]; then
            echo "  ERROR: Scan failed"
            FAIL=$((FAIL + 1))
            break
        fi

        printf "\r  Progress: %s%% (%ss)  " "${progress:-0}" "$elapsed"
        sleep 3
        elapsed=$((elapsed + 3))
    done

    if [ $elapsed -ge $MAX_WAIT ]; then
        echo "  TIMEOUT after ${MAX_WAIT}s"
        FAIL=$((FAIL + 1))
    fi

    echo ""
    sleep $DELAY
done

echo "---"
echo "Complete! Success: $SUCCESS, Failed: $FAIL"
