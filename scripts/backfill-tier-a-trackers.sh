#!/bin/bash
# Tier-A tracker backfill with per-500-domain checkpoint validation.
#
# HARD-STOPS early if distribution hasn't shifted after first checkpoint —
# prevents wasting 6 hours against a still-broken detector.
#
# Prerequisites:
#   1. Detector fix deployed (scanner.ts tier-aware override)
#   2. validate-browser-scan.sh passed (>=3/5 brands meeting floor)
#
# Usage:
#   ADMIN_API_KEY=... ./scripts/backfill-tier-a-trackers.sh

set -e

API_BASE="${API_BASE:-https://geckoadvisor.com}"
PUBLIC_API="${PUBLIC_API:-https://api.geckoadvisor.com}"
ADMIN_API_KEY="${ADMIN_API_KEY:?ADMIN_API_KEY required}"
BATCH_SIZE="${BATCH_SIZE:-50}"
DELAY="${DELAY:-3}"
CHECKPOINT_EVERY="${CHECKPOINT_EVERY:-500}"
# Two-gate system:
#   First checkpoint (500 seed-prioritized domains) — STRICTER because seeds are
#   known heavy brands. If distribution isn't strong here, it never will be.
FIRST_MIN_MAX="${FIRST_MIN_MAX:-40}"
FIRST_MIN_P90="${FIRST_MIN_P90:-25}"
FIRST_MIN_MEDIAN="${FIRST_MIN_MEDIAN:-12}"
#   Subsequent checkpoints — LOOSER because tail domains are lower-volume.
CHECKPOINT_MIN_MAX_TRACKERS="${CHECKPOINT_MIN_MAX_TRACKERS:-20}"
CHECKPOINT_MIN_MEDIAN_TRACKERS="${CHECKPOINT_MIN_MEDIAN_TRACKERS:-10}"

# Seed list ordering: known heavy sites + high-traffic brands run first so
# distribution-shift signal lands in the first checkpoint window (500 domains),
# not 2000 in.
#   scripts/sites-tier-a-seed.txt   ~50 curated high-signal brands
#   scripts/sites-tier-a.txt        full Tier-A list (tierScore DESC)
# The script concatenates seed first, then dedups against the full list.
SEED_FILE="$(dirname "$0")/sites-tier-a-seed.txt"
FULL_FILE="$(dirname "$0")/sites-tier-a.txt"
SITES_FILE="$(dirname "$0")/.tier-a-ordered-$$.txt"
trap 'rm -f "$SITES_FILE"' EXIT
LOG_DIR="$(dirname "$0")/scan-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/backfill-tier-a-$(date +%Y%m%d-%H%M%S).log"

if [ ! -f "$FULL_FILE" ]; then
  echo "ERROR: $FULL_FILE missing. Export Tier-A domain list first:"
  echo "  psql -Atc \"SELECT domain FROM \\\"Domain\\\" WHERE \\\"indexTier\\\"='A' ORDER BY \\\"tierScore\\\" DESC\" > $FULL_FILE"
  exit 1
fi
if [ ! -f "$SEED_FILE" ]; then
  echo "NOTE: $SEED_FILE missing — running in tierScore order only."
  echo "For faster validation signal, create a ~50-domain curated seed list of known-heavy brands."
  cp "$FULL_FILE" "$SITES_FILE"
else
  # Seed first, then append the rest of Tier-A with dedup (preserves seed order).
  awk 'NF && !/^#/' "$SEED_FILE" > "$SITES_FILE"
  awk 'NF && !/^#/' "$FULL_FILE" | grep -vxFf "$SITES_FILE" >> "$SITES_FILE" || true
fi

TOTAL=$(grep -cv '^#\|^$' "$SITES_FILE")
echo "=== Tier-A Backfill ===" | tee "$LOG_FILE"
echo "Domains: $TOTAL (seed-prioritized: $([ -f "$SEED_FILE" ] && echo yes || echo no))" | tee -a "$LOG_FILE"
echo "Batch:   $BATCH_SIZE every ${DELAY}s" | tee -a "$LOG_FILE"
echo "Checkpoint every $CHECKPOINT_EVERY domains" | tee -a "$LOG_FILE"
echo "  abort if top-100 max < $CHECKPOINT_MIN_MAX_TRACKERS OR median < $CHECKPOINT_MIN_MEDIAN_TRACKERS" | tee -a "$LOG_FILE"
echo "Log:     $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

check_distribution() {
  # Pull top-100 "most-tracked" and report full distribution: max/p90/median/avg
  python3 -c "
import json, urllib.request, sys
try:
  with urllib.request.urlopen('$PUBLIC_API/api/v2/rankings/most-tracked?limit=100', timeout=15) as r:
    d = json.load(r)
  ts = sorted([i['trackers'] for i in d.get('rankings', [])])
  if not ts:
    print('0 0 0 0'); sys.exit()
  n = len(ts)
  p90 = ts[int(0.9 * (n-1))]
  med = ts[n//2]
  avg = sum(ts)/n
  print(f'{max(ts)} {p90} {med} {avg:.1f}')
except Exception as e:
  print(f'ERROR {e}', flush=True); sys.exit(2)
"
}

PROCESSED=0
BATCH_URLS=()
BATCH_NUM=0

while IFS= read -r domain; do
  [[ "$domain" =~ ^#.*$ ]] && continue
  [[ -z "$domain" ]] && continue

  BATCH_URLS+=("https://$domain")

  if [[ ${#BATCH_URLS[@]} -ge $BATCH_SIZE ]]; then
    BATCH_NUM=$((BATCH_NUM + 1))
    URLS_JSON=$(printf '%s\n' "${BATCH_URLS[@]}" | jq -R . | jq -s .)

    echo "[$(date +%H:%M:%S)] Batch $BATCH_NUM: ${#BATCH_URLS[@]} urls (total: $PROCESSED)" | tee -a "$LOG_FILE"
    curl -s -X POST "$API_BASE/admin/bulk-scan" \
      -H "X-Admin-Key: $ADMIN_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"urls\": $URLS_JSON, \"skipExisting\": false}" > /dev/null || \
      echo "  batch error" | tee -a "$LOG_FILE"

    PROCESSED=$((PROCESSED + ${#BATCH_URLS[@]}))
    BATCH_URLS=()

    # Checkpoint
    if (( PROCESSED % CHECKPOINT_EVERY == 0 )); then
      echo "[checkpoint] waiting 120s for scans to finish…" | tee -a "$LOG_FILE"
      sleep 120
      read -r MAX_T P90_T MED_T AVG_T < <(check_distribution)
      echo "[checkpoint] processed=$PROCESSED  top-100: max=$MAX_T  p90=$P90_T  median=$MED_T  avg=$AVG_T" | tee -a "$LOG_FILE"

      ABORT=0
      if [ "$PROCESSED" -eq "$CHECKPOINT_EVERY" ]; then
        # FIRST checkpoint — strict gate (seeds are known-heavy)
        echo "  gate: FIRST (strict) — requires max>=$FIRST_MIN_MAX AND p90>=$FIRST_MIN_P90 AND median>=$FIRST_MIN_MEDIAN" | tee -a "$LOG_FILE"
        [ "$MAX_T" -lt "$FIRST_MIN_MAX" ]    2>/dev/null && { echo "  trigger: max ($MAX_T) < $FIRST_MIN_MAX"       | tee -a "$LOG_FILE"; ABORT=1; }
        [ "$P90_T" -lt "$FIRST_MIN_P90" ]    2>/dev/null && { echo "  trigger: p90 ($P90_T) < $FIRST_MIN_P90"       | tee -a "$LOG_FILE"; ABORT=1; }
        [ "$MED_T" -lt "$FIRST_MIN_MEDIAN" ] 2>/dev/null && { echo "  trigger: median ($MED_T) < $FIRST_MIN_MEDIAN" | tee -a "$LOG_FILE"; ABORT=1; }
      else
        # Subsequent checkpoints — loose gate (tail domains)
        [ "$MAX_T" -lt "$CHECKPOINT_MIN_MAX_TRACKERS" ] 2>/dev/null && { echo "  trigger: max ($MAX_T) < $CHECKPOINT_MIN_MAX_TRACKERS"       | tee -a "$LOG_FILE"; ABORT=1; }
        [ "$MED_T" -lt "$CHECKPOINT_MIN_MEDIAN_TRACKERS" ] 2>/dev/null && { echo "  trigger: median ($MED_T) < $CHECKPOINT_MIN_MEDIAN_TRACKERS — partial failure" | tee -a "$LOG_FILE"; ABORT=1; }
      fi

      if [ "$ABORT" -eq 1 ]; then
        echo "HARD STOP after $PROCESSED domains. Detector likely still broken (or partially broken)." | tee -a "$LOG_FILE"
        echo "Investigate before resuming. Tier-A completed so far is $PROCESSED of $TOTAL." | tee -a "$LOG_FILE"
        exit 2
      fi
    fi

    sleep "$DELAY"
  fi
done < "$SITES_FILE"

# Flush tail batch
if [[ ${#BATCH_URLS[@]} -gt 0 ]]; then
  URLS_JSON=$(printf '%s\n' "${BATCH_URLS[@]}" | jq -R . | jq -s .)
  curl -s -X POST "$API_BASE/admin/bulk-scan" \
    -H "X-Admin-Key: $ADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"urls\": $URLS_JSON, \"skipExisting\": false}" > /dev/null
  PROCESSED=$((PROCESSED + ${#BATCH_URLS[@]}))
fi

echo "" | tee -a "$LOG_FILE"
echo "=== Backfill complete: $PROCESSED/$TOTAL ===" | tee -a "$LOG_FILE"
