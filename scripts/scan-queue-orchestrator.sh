#!/bin/bash
#
# Scan Queue Orchestrator for Gecko Advisor
# Manages bulk scanning of 100k websites from Tranco list
#
# Usage:
#   ./scan-queue-orchestrator.sh import      # Import Tranco list into queue
#   ./scan-queue-orchestrator.sh process     # Process next batch from queue
#   ./scan-queue-orchestrator.sh run         # Continuous processing loop
#   ./scan-queue-orchestrator.sh stats       # Show queue statistics
#   ./scan-queue-orchestrator.sh reset       # Reset failed/timeout items
#   ./scan-queue-orchestrator.sh export      # Export results to CSV
#
# Environment variables:
#   ADMIN_API_KEY     - Required for all operations
#   API_BASE          - API base URL (default: https://geckoadvisor.com)
#   BATCH_SIZE        - URLs per process request (default: 50)
#   IMPORT_COUNT      - Number of domains to import (default: 100000)
#   LOOP_DELAY        - Seconds between batches in run mode (default: 5)

set -e

# Configuration
API_BASE="${API_BASE:-https://geckoadvisor.com}"
ADMIN_KEY="${ADMIN_API_KEY:-}"
BATCH_SIZE="${BATCH_SIZE:-50}"
IMPORT_COUNT="${IMPORT_COUNT:-100000}"
LOOP_DELAY="${LOOP_DELAY:-5}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
TRANCO_FILE="${DATA_DIR}/tranco-top1m.csv"
LOG_DIR="${SCRIPT_DIR}/scan-logs"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Create directories
mkdir -p "$DATA_DIR" "$LOG_DIR"

# Check admin key
check_auth() {
    if [ -z "$ADMIN_KEY" ]; then
        echo -e "${RED}Error: ADMIN_API_KEY environment variable not set${NC}"
        echo "Usage: ADMIN_API_KEY=your-key $0 <command>"
        exit 1
    fi
}

# Download Tranco list
download_tranco() {
    echo -e "${BLUE}Downloading Tranco Top 1M list...${NC}"

    if [ -f "$TRANCO_FILE" ]; then
        local age=$(( ($(date +%s) - $(stat -f %m "$TRANCO_FILE" 2>/dev/null || stat -c %Y "$TRANCO_FILE")) / 86400 ))
        if [ "$age" -lt 7 ]; then
            echo -e "${YELLOW}Tranco file exists and is ${age} days old. Skipping download.${NC}"
            echo -e "  Delete ${TRANCO_FILE} to force re-download."
            return
        fi
    fi

    # Download from Tranco (zip file contains top 1M domains)
    local TRANCO_URL="https://tranco-list.eu/top-1m.csv.zip"
    echo "  Downloading from: $TRANCO_URL"

    local TMP_ZIP="${DATA_DIR}/tranco.zip"
    curl -sL "$TRANCO_URL" -o "$TMP_ZIP"

    if [ -s "$TMP_ZIP" ]; then
        cd "$DATA_DIR"
        unzip -o "$TMP_ZIP" > /dev/null
        mv top-1m.csv "$TRANCO_FILE"
        rm -f "$TMP_ZIP"
        local count=$(wc -l < "$TRANCO_FILE" | tr -d ' ')
        echo -e "${GREEN}Downloaded $count domains${NC}"
    else
        rm -f "$TMP_ZIP"
        echo -e "${RED}Download failed${NC}"
        exit 1
    fi
}

# Import domains into queue
import_domains() {
    check_auth

    if [ ! -f "$TRANCO_FILE" ]; then
        download_tranco
    fi

    local START=${1:-1}
    local COUNT=${2:-$IMPORT_COUNT}
    local CHUNK_SIZE=5000  # API accepts max 10k per request

    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Gecko Advisor - Scan Queue Import                   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Source:       Tranco Top 1M"
    echo -e "  Start rank:   ${START}"
    echo -e "  Count:        ${COUNT}"
    echo -e "  Chunk size:   ${CHUNK_SIZE}"
    echo ""

    local TOTAL_IMPORTED=0
    local TOTAL_SKIPPED=0
    local CURRENT_START=$START
    local END=$((START + COUNT - 1))

    while [ $CURRENT_START -le $END ]; do
        local CHUNK_END=$((CURRENT_START + CHUNK_SIZE - 1))
        if [ $CHUNK_END -gt $END ]; then
            CHUNK_END=$END
        fi

        echo -ne "\r${CYAN}Importing ranks ${CURRENT_START} to ${CHUNK_END}...${NC}                    "

        # Extract domains (Tranco format: rank,domain)
        local DOMAINS=$(sed -n "${CURRENT_START},${CHUNK_END}p" "$TRANCO_FILE" | cut -d',' -f2 | jq -R . | jq -s .)

        # Import batch
        local RESPONSE=$(curl -s -X POST "${API_BASE}/api/admin/scan-queue/import" \
            -H "Content-Type: application/json" \
            -H "X-Admin-Key: $ADMIN_KEY" \
            -d "{\"domains\": $DOMAINS, \"source\": \"tranco\", \"startRank\": $CURRENT_START}" \
            --max-time 120)

        if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
            local IMPORTED=$(echo "$RESPONSE" | jq -r '.imported // 0')
            local SKIPPED_DUP=$(echo "$RESPONSE" | jq -r '.skippedDuplicate // 0')
            local SKIPPED_SCAN=$(echo "$RESPONSE" | jq -r '.skippedScanned // 0')

            TOTAL_IMPORTED=$((TOTAL_IMPORTED + IMPORTED))
            TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED_DUP + SKIPPED_SCAN))
        else
            local ERROR=$(echo "$RESPONSE" | jq -r '.title // .message // "Unknown error"' 2>/dev/null || echo "$RESPONSE")
            echo -e "\n${RED}Error at rank ${CURRENT_START}: ${ERROR}${NC}"
        fi

        CURRENT_START=$((CHUNK_END + 1))
        sleep 1
    done

    echo ""
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Import complete!${NC}"
    echo -e "  Imported:    ${GREEN}${TOTAL_IMPORTED}${NC}"
    echo -e "  Skipped:     ${YELLOW}${TOTAL_SKIPPED}${NC}"
    echo ""
}

# Get queue statistics
show_stats() {
    check_auth

    local RESPONSE=$(curl -s "${API_BASE}/api/admin/scan-queue/stats" \
        -H "X-Admin-Key: $ADMIN_KEY")

    if ! echo "$RESPONSE" | jq -e '.queue' > /dev/null 2>&1; then
        echo -e "${RED}Failed to get stats${NC}"
        echo "$RESPONSE"
        return 1
    fi

    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Gecko Advisor - Scan Queue Statistics               ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    local TOTAL=$(echo "$RESPONSE" | jq -r '.queue.total')
    local PENDING=$(echo "$RESPONSE" | jq -r '.queue.pending')
    local QUEUED=$(echo "$RESPONSE" | jq -r '.queue.queued')
    local SUCCESS=$(echo "$RESPONSE" | jq -r '.queue.success')
    local FAILED=$(echo "$RESPONSE" | jq -r '.queue.failed')
    local BLOCKED=$(echo "$RESPONSE" | jq -r '.queue.blocked')
    local TIMEOUT=$(echo "$RESPONSE" | jq -r '.queue.timeout')
    local INVALID=$(echo "$RESPONSE" | jq -r '.queue.invalid')
    local PROGRESS=$(echo "$RESPONSE" | jq -r '.queue.progress')

    echo -e "  ${CYAN}Queue Status${NC}"
    echo -e "  ────────────────────────"
    echo -e "  Total:       $TOTAL"
    echo -e "  Pending:     ${YELLOW}$PENDING${NC}"
    echo -e "  Queued:      ${BLUE}$QUEUED${NC}"
    echo -e "  Success:     ${GREEN}$SUCCESS${NC}"
    echo -e "  Failed:      ${RED}$FAILED${NC}"
    echo -e "  Blocked:     ${RED}$BLOCKED${NC}"
    echo -e "  Timeout:     ${YELLOW}$TIMEOUT${NC}"
    echo -e "  Invalid:     ${RED}$INVALID${NC}"
    echo ""
    echo -e "  Progress:    ${GREEN}$PROGRESS${NC}"
    echo ""

    local DB_TOTAL=$(echo "$RESPONSE" | jq -r '.database.totalScannedDomains')
    echo -e "  ${CYAN}Database${NC}"
    echo -e "  ────────────────────────"
    echo -e "  Scanned domains: $DB_TOTAL"
    echo ""
}

# Process next batch from queue
process_batch() {
    check_auth

    local SIZE=${1:-$BATCH_SIZE}

    echo -ne "${CYAN}Processing batch of ${SIZE} domains...${NC} "

    local RESPONSE=$(curl -s -X POST "${API_BASE}/api/admin/scan-queue/process" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Key: $ADMIN_KEY" \
        -d "{\"batchSize\": $SIZE}" \
        --max-time 120)

    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        local QUEUED=$(echo "$RESPONSE" | jq -r '.queued // 0')
        local ERRORS=$(echo "$RESPONSE" | jq -r '.errors // 0')
        local MSG=$(echo "$RESPONSE" | jq -r '.message // ""')

        if [ "$QUEUED" -eq 0 ] && [ -n "$MSG" ]; then
            echo -e "${YELLOW}$MSG${NC}"
            return 1
        else
            echo -e "${GREEN}Queued: ${QUEUED}${NC} | ${RED}Errors: ${ERRORS}${NC}"
            return 0
        fi
    else
        local ERROR=$(echo "$RESPONSE" | jq -r '.title // .message // "Unknown error"' 2>/dev/null || echo "$RESPONSE")
        echo -e "${RED}Error: ${ERROR}${NC}"
        return 1
    fi
}

# Continuous processing loop
run_continuous() {
    check_auth

    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Gecko Advisor - Continuous Scan Queue Processing       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Batch size:    ${BATCH_SIZE}"
    echo -e "  Loop delay:    ${LOOP_DELAY}s"
    echo -e "  Press Ctrl+C to stop"
    echo ""

    local LOG_FILE="${LOG_DIR}/scan-queue-$(date +%Y%m%d).log"
    local BATCHES_PROCESSED=0
    local TOTAL_QUEUED=0
    local START_TIME=$(date +%s)

    trap 'echo ""; echo -e "${YELLOW}Stopping...${NC}"; show_summary; exit 0' INT

    show_summary() {
        local END_TIME=$(date +%s)
        local DURATION=$((END_TIME - START_TIME))
        echo ""
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}Session Summary${NC}"
        echo -e "  Batches processed: ${BATCHES_PROCESSED}"
        echo -e "  Total queued:      ${TOTAL_QUEUED}"
        echo -e "  Duration:          ${DURATION}s ($((DURATION / 60))m $((DURATION % 60))s)"
        echo -e "  Log file:          ${LOG_FILE}"
    }

    while true; do
        # Check pending count first
        local STATS=$(curl -s "${API_BASE}/api/admin/scan-queue/stats" \
            -H "X-Admin-Key: $ADMIN_KEY" 2>/dev/null)

        local PENDING=$(echo "$STATS" | jq -r '.queue.pending // 0' 2>/dev/null)
        local QUEUED=$(echo "$STATS" | jq -r '.queue.queued // 0' 2>/dev/null)
        local SUCCESS=$(echo "$STATS" | jq -r '.queue.success // 0' 2>/dev/null)
        local TOTAL=$(echo "$STATS" | jq -r '.queue.total // 0' 2>/dev/null)

        # Calculate progress
        if [ "$TOTAL" -gt 0 ]; then
            local PCT=$(( (SUCCESS * 100) / TOTAL ))
            echo -ne "\r[${PCT}%] Pending: ${PENDING} | Queued: ${QUEUED} | Success: ${SUCCESS} | "
        fi

        # Skip if too many queued (backpressure)
        if [ "$QUEUED" -gt 200 ]; then
            echo -ne "${YELLOW}Waiting (${QUEUED} queued)...${NC}    "
            sleep $LOOP_DELAY
            continue
        fi

        # Skip if no pending
        if [ "$PENDING" -eq 0 ]; then
            echo -e "\n${GREEN}All domains processed!${NC}"
            break
        fi

        # Process batch
        local RESPONSE=$(curl -s -X POST "${API_BASE}/api/admin/scan-queue/process" \
            -H "Content-Type: application/json" \
            -H "X-Admin-Key: $ADMIN_KEY" \
            -d "{\"batchSize\": $BATCH_SIZE}" \
            --max-time 120 2>/dev/null)

        local BATCH_QUEUED=$(echo "$RESPONSE" | jq -r '.queued // 0' 2>/dev/null)

        if [ "$BATCH_QUEUED" -gt 0 ]; then
            BATCHES_PROCESSED=$((BATCHES_PROCESSED + 1))
            TOTAL_QUEUED=$((TOTAL_QUEUED + BATCH_QUEUED))
            echo "$(date '+%H:%M:%S') | Batch $BATCHES_PROCESSED | Queued: $BATCH_QUEUED" >> "$LOG_FILE"
        fi

        sleep $LOOP_DELAY
    done

    show_summary
}

# Reset failed/timeout items
reset_items() {
    check_auth

    local STATUSES=${1:-"TIMEOUT"}
    local HOURS=${2:-24}

    echo -e "${CYAN}Resetting ${STATUSES} items older than ${HOURS} hours...${NC}"

    # Build statuses array
    local STATUSES_JSON=$(echo "$STATUSES" | tr ',' '\n' | jq -R . | jq -s .)

    local RESPONSE=$(curl -s -X POST "${API_BASE}/api/admin/scan-queue/reset" \
        -H "Content-Type: application/json" \
        -H "X-Admin-Key: $ADMIN_KEY" \
        -d "{\"statuses\": $STATUSES_JSON, \"olderThanHours\": $HOURS}")

    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        local RESET=$(echo "$RESPONSE" | jq -r '.reset // 0')
        echo -e "${GREEN}Reset ${RESET} items${NC}"
    else
        local ERROR=$(echo "$RESPONSE" | jq -r '.title // .message // "Unknown error"' 2>/dev/null || echo "$RESPONSE")
        echo -e "${RED}Error: ${ERROR}${NC}"
    fi
}

# Export results to CSV
export_results() {
    check_auth

    local OUTPUT="${DATA_DIR}/scan-queue-export-$(date +%Y%m%d-%H%M%S).csv"

    echo -e "${CYAN}Exporting scan queue results...${NC}"

    echo "domain,status,score,attemptCount,lastError,sourceRank" > "$OUTPUT"

    local OFFSET=0
    local LIMIT=1000

    while true; do
        local RESPONSE=$(curl -s "${API_BASE}/api/admin/scan-queue/items?limit=${LIMIT}&offset=${OFFSET}" \
            -H "X-Admin-Key: $ADMIN_KEY")

        local ITEMS=$(echo "$RESPONSE" | jq -r '.items // []')
        local COUNT=$(echo "$ITEMS" | jq 'length')

        if [ "$COUNT" -eq 0 ]; then
            break
        fi

        echo "$ITEMS" | jq -r '.[] | [.domain, .status, (.score // ""), .attemptCount, (.lastError // ""), (.sourceRank // "")] | @csv' >> "$OUTPUT"

        OFFSET=$((OFFSET + LIMIT))
        echo -ne "\r  Exported ${OFFSET} records..."

        local HAS_MORE=$(echo "$RESPONSE" | jq -r '.hasMore')
        if [ "$HAS_MORE" != "true" ]; then
            break
        fi
    done

    echo ""
    echo -e "${GREEN}Exported to: ${OUTPUT}${NC}"

    # Show summary
    echo ""
    echo "Summary:"
    cut -d',' -f2 "$OUTPUT" | tail -n +2 | sort | uniq -c | sort -rn
}

# Main command handler
case "${1:-help}" in
    download)
        download_tranco
        ;;
    import)
        import_domains "${2:-1}" "${3:-$IMPORT_COUNT}"
        ;;
    stats)
        show_stats
        ;;
    process)
        process_batch "${2:-$BATCH_SIZE}"
        ;;
    run)
        run_continuous
        ;;
    reset)
        reset_items "${2:-TIMEOUT}" "${3:-24}"
        ;;
    export)
        export_results
        ;;
    help|--help|-h|*)
        echo "Scan Queue Orchestrator for Gecko Advisor"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  download          Download Tranco Top 1M list"
        echo "  import [start] [count]"
        echo "                    Import domains into queue (default: 1, 100000)"
        echo "  stats             Show queue statistics"
        echo "  process [size]    Process one batch (default: 50)"
        echo "  run               Continuous processing loop"
        echo "  reset [statuses] [hours]"
        echo "                    Reset failed items (default: TIMEOUT, 24h)"
        echo "  export            Export results to CSV"
        echo ""
        echo "Environment:"
        echo "  ADMIN_API_KEY     Required for all operations"
        echo "  API_BASE          API URL (default: https://geckoadvisor.com)"
        echo "  BATCH_SIZE        URLs per batch (default: 50)"
        echo "  LOOP_DELAY        Seconds between batches (default: 5)"
        echo ""
        echo "Examples:"
        echo "  $0 download                    # Download Tranco list"
        echo "  $0 import 1 10000              # Import top 10k"
        echo "  $0 import 10001 10000          # Import 10k-20k"
        echo "  $0 run                         # Start continuous processing"
        echo "  $0 reset TIMEOUT,FAILED 12     # Reset failures older than 12h"
        ;;
esac
