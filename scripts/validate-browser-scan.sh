#!/bin/bash
# Validate the browser-scan detector fix.
#
# Two-layer validation:
#  1. Per-domain floors on 5 known brands (FB/NYT/CNN/YT/AMZN)
#  2. Distribution shape (avg / median / p90 / max trackers, 3p-to-tracker ratio)
#
# Third-party vs tracker sanity:
#  Before fix: trackers=0 while 3p=3+ is a red flag (3p seen, classifier blind).
#  After fix: trackers should be non-zero *and* 3p should still be >= trackers
#  (you can't have a tracker that isn't also a third party).
#
# HARD-STOP exits non-zero BEFORE any Tier-A backfill is triggered.
#
# Usage:
#   ADMIN_API_KEY=... ./scripts/validate-browser-scan.sh

set -e

API_BASE="${API_BASE:-https://geckoadvisor.com}"
PUBLIC_API="${PUBLIC_API:-https://api.geckoadvisor.com}"
ADMIN_API_KEY="${ADMIN_API_KEY:?ADMIN_API_KEY required}"
WAIT_SECONDS="${WAIT_SECONDS:-90}"

# Per-domain tracker floors.
declare -a EXPECTS=(
  "facebook.com:30"
  "nytimes.com:20"
  "cnn.com:20"
  "youtube.com:10"
  "amazon.com:10"
)

UA="Mozilla/5.0 (compatible; gecko-validate)"

echo "=== Browser-scan validation ==="
echo "API:       $API_BASE"
echo "Public:    $PUBLIC_API"
echo "Wait time: ${WAIT_SECONDS}s after queue"
echo ""

URLS_JSON='['
for pair in "${EXPECTS[@]}"; do
  d="${pair%%:*}"
  URLS_JSON+="\"https://$d\","
done
URLS_JSON="${URLS_JSON%,}]"

echo "--- Forcing fresh scans ---"
curl -s -X POST "$API_BASE/admin/bulk-scan" \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"urls\": $URLS_JSON, \"skipExisting\": false}" | head -c 500
echo ""
echo ""

echo "--- Waiting ${WAIT_SECONDS}s for completion ---"
sleep "$WAIT_SECONDS"

echo ""
echo "--- Per-domain validation ---"
PASS=0
FAIL=0
# Collect arrays for distribution analysis
TRACKER_LIST=()
TP_LIST=()
RATIO_WARNINGS=()

for pair in "${EXPECTS[@]}"; do
  d="${pair%%:*}"
  min="${pair##*:}"
  data=$(curl -s -A "$UA" "$PUBLIC_API/api/v2/domain/$d")
  parsed=$(echo "$data" | python3 -c "
import json, sys
try:
  r = json.load(sys.stdin)
  s = r.get('scan', {}) or {}
  m = s.get('meta', {}) or {}
  trackers = len(m.get('trackerDomains', []) or [])
  tp       = len(m.get('thirdPartyDomains', []) or [])
  score    = s.get('score', '?')
  fin      = (s.get('finishedAt') or '')[:19]
  print(f'{trackers}|{tp}|{score}|{fin}')
except Exception as e:
  print(f'-1|-1|?|?')
")
  IFS='|' read -r trackers tp score finished <<< "$parsed"
  TRACKER_LIST+=("$trackers")
  TP_LIST+=("$tp")

  # Per-domain pass/fail
  if [ "$trackers" -ge "$min" ] 2>/dev/null; then
    status="PASS"
    PASS=$((PASS+1))
  else
    status="FAIL"
    FAIL=$((FAIL+1))
  fi

  # Classifier sanity: trackers cannot exceed third-party count
  ratio_note=""
  if [ "$trackers" -gt "$tp" ] 2>/dev/null; then
    ratio_note=" [RATIO-WARN trackers>3p]"
    RATIO_WARNINGS+=("$d")
  fi

  printf "  %s  %-16s trackers=%-4s 3p=%-4s score=%-4s finished=%s%s\n" \
    "$status" "$d" "$trackers" "$tp" "$score" "$finished" "$ratio_note"
done

echo ""
echo "--- Distribution (across validation set) ---"
TRACKER_CSV=$(IFS=,; echo "${TRACKER_LIST[*]}")
TP_CSV=$(IFS=,; echo "${TP_LIST[*]}")
python3 - "$TRACKER_CSV" "$TP_CSV" << 'PY'
import sys, statistics
tr = [int(x) for x in sys.argv[1].split(',') if x and int(x) >= 0]
tp = [int(x) for x in sys.argv[2].split(',') if x and int(x) >= 0]
if not tr:
  print("  no data"); sys.exit()
tr_sorted = sorted(tr)
n = len(tr_sorted)
p90 = tr_sorted[int(0.9 * (n-1))]
print(f"  trackers  n={n}  avg={sum(tr_sorted)/n:.1f}  median={statistics.median(tr_sorted)}  p90={p90}  max={max(tr_sorted)}")
if tp and len(tp) == len(tr):
  # Per-domain ratio = trackers / 3p (skip when 3p=0)
  ratios = [t/p for t,p in zip(tr,tp) if p > 0]
  if ratios:
    ratios.sort()
    print(f"  tracker/3p ratio  n={len(ratios)}  avg={sum(ratios)/len(ratios):.2f}  median={statistics.median(ratios):.2f}  min={min(ratios):.2f}")
    if sum(ratios)/len(ratios) < 0.15:
      print(f"  WARN: avg tracker/3p ratio below 0.15 — classifier may be missing patterns")
PY

echo ""
echo "=== Summary: $PASS pass / $FAIL fail  (ratio warns: ${#RATIO_WARNINGS[@]}) ==="
if [ "$FAIL" -gt 2 ]; then
  echo "HARD STOP: Detector still broken (>2 per-domain failures). Do NOT run Tier-A backfill."
  exit 1
fi
if [ "${#RATIO_WARNINGS[@]}" -gt 0 ]; then
  echo "NOTE: trackers > third-party on: ${RATIO_WARNINGS[*]}"
  echo "      classifier/3p pipeline is suspect — investigate before backfill."
fi
echo "OK to proceed with Tier-A backfill."
