#!/bin/bash
# Scan 20 random websites

echo "Scanning 20 random websites..."
echo ""

scan_url() {
  local url="$1"
  echo -n "→ $url ... "
  result=$(curl -s -X POST "https://geckoadvisor.com/api/v2/scan" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${url}\"}" \
    --max-time 30 2>/dev/null)

  if echo "$result" | grep -q '"scanId"'; then
    scan_id=$(echo "$result" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Queued ($scan_id)"
  elif echo "$result" | grep -q '"existingScanId"'; then
    scan_id=$(echo "$result" | grep -o '"existingScanId":"[^"]*"' | cut -d'"' -f4)
    echo "○ Exists ($scan_id)"
  else
    error=$(echo "$result" | grep -o '"title":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "Error")
    echo "✗ $error"
  fi
  sleep 1
}

# 20 Random URLs from mixed categories
scan_url "https://pitchfork.com"
scan_url "https://sky.com"
scan_url "https://calm.com"
scan_url "https://gameinformer.com"
scan_url "https://tmz.com"
scan_url "https://securityaffairs.co"
scan_url "https://genius.com"
scan_url "https://chicagotribune.com"
scan_url "https://trakt.tv"
scan_url "https://thesun.co.uk"
scan_url "https://complex.com"
scan_url "https://gap.com"
scan_url "https://gorillas.io"
scan_url "https://qantas.com"
scan_url "https://speedrun.com"
scan_url "https://maccosmetics.com"
scan_url "https://yale.edu"
scan_url "https://deadspin.com"
scan_url "https://atptour.com"
scan_url "https://disneyplus.com"

echo ""
echo "Done! 20 scans queued."
