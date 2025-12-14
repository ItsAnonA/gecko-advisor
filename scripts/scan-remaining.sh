#!/bin/bash
echo "Scanning remaining URLs with 2s delay..."

scan() {
  local url="$1"
  echo -n "→ $url ... "
  result=$(curl -s -X POST "https://geckoadvisor.com/api/v2/scan" -H "Content-Type: application/json" -d "{\"url\":\"$url\"}")
  if echo "$result" | grep -q '"scanId"'; then
    id=$(echo "$result" | sed 's/.*"scanId":"\([^"]*\)".*/\1/')
    echo "✓ Queued ($id)"
  elif echo "$result" | grep -q '"existingScanId"'; then
    id=$(echo "$result" | sed 's/.*"existingScanId":"\([^"]*\)".*/\1/')
    echo "○ Exists ($id)"
  else
    echo "✗ Failed"
  fi
  sleep 2
}

scan "https://gameinformer.com"
scan "https://securityaffairs.co"
scan "https://genius.com"
scan "https://chicagotribune.com"
scan "https://trakt.tv"
scan "https://thesun.co.uk"
scan "https://complex.com"
scan "https://gap.com"
scan "https://yale.edu"
scan "https://deadspin.com"
scan "https://atptour.com"
scan "https://disneyplus.com"

echo ""
echo "Done!"
