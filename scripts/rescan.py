#!/usr/bin/env python3
"""
Re-scan domains to update evidence with new mixed content detection.
Uses admin bulk-scan endpoint with skipExisting=false.

Usage:
    python3 rescan.py                    # Scan all domains
    python3 rescan.py 1 1000             # Scan lines 1-1000
    python3 rescan.py --batch-size 100   # Custom batch size
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from pathlib import Path

# Configuration
API_BASE = os.environ.get("API_BASE", "https://geckoadvisor.com/api")
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY")
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "50"))
DELAY_SECONDS = int(os.environ.get("DELAY", "3"))

if not ADMIN_API_KEY:
    print("Error: ADMIN_API_KEY environment variable required")
    sys.exit(1)

# Paths
SCRIPT_DIR = Path(__file__).parent
SITES_FILE = SCRIPT_DIR / "sites-5000.txt"
LOG_DIR = SCRIPT_DIR / "scan-logs"
LOG_DIR.mkdir(exist_ok=True)

def load_domains(start_line=1, end_line=99999):
    """Load domains from sites file, skipping comments and empty lines."""
    domains = []
    with open(SITES_FILE) as f:
        for i, line in enumerate(f, 1):
            if i < start_line:
                continue
            if i > end_line:
                break
            line = line.strip()
            if line and not line.startswith("#"):
                domains.append(f"https://{line}")
    return domains

def send_batch(urls, log_file):
    """Send a batch of URLs to the admin bulk-scan endpoint."""
    try:
        response = requests.post(
            f"{API_BASE}/admin/bulk-scan",
            headers={
                "X-Admin-Key": ADMIN_API_KEY,
                "Content-Type": "application/json"
            },
            json={"urls": urls, "skipExisting": False},
            timeout=60
        )
        data = response.json()
        return {
            "queued": data.get("queued", 0),
            "skipped": data.get("skipped", 0),
            "errors": data.get("errors", 0),
            "batchId": data.get("batchId", "unknown")
        }
    except Exception as e:
        return {"queued": 0, "skipped": 0, "errors": len(urls), "batchId": f"error: {e}"}

def main():
    # Parse arguments
    start_line = 1
    end_line = 99999

    args = sys.argv[1:]
    if len(args) >= 2:
        start_line = int(args[0])
        end_line = int(args[1])
    elif len(args) == 1:
        end_line = int(args[0])

    # Setup logging
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    log_file = LOG_DIR / f"rescan-{timestamp}.log"

    def log(msg):
        print(msg)
        with open(log_file, "a") as f:
            f.write(msg + "\n")

    log("=== Re-Scan Starting ===")
    log(f"API: {API_BASE}")
    log(f"Batch size: {BATCH_SIZE}")
    log(f"Lines: {start_line} to {end_line}")
    log(f"Log: {log_file}")
    log("")

    # Load domains
    domains = load_domains(start_line, end_line)
    total = len(domains)
    log(f"Total domains to process: {total}")
    log("")

    # Process in batches
    total_queued = 0
    total_skipped = 0
    total_errors = 0
    batch_num = 0

    for i in range(0, total, BATCH_SIZE):
        batch = domains[i:i + BATCH_SIZE]
        batch_num += 1

        log(f"Batch {batch_num}: Sending {len(batch)} URLs...")

        result = send_batch(batch, log_file)

        total_queued += result["queued"]
        total_skipped += result["skipped"]
        total_errors += result["errors"]

        log(f"  -> Batch {result['batchId']}: queued={result['queued']}, skipped={result['skipped']}, errors={result['errors']}")

        # Progress
        progress = min(i + BATCH_SIZE, total)
        pct = (progress / total) * 100
        log(f"  Progress: {progress}/{total} ({pct:.1f}%)")

        # Delay between batches
        if i + BATCH_SIZE < total:
            time.sleep(DELAY_SECONDS)

    log("")
    log("=== Re-Scan Complete ===")
    log(f"Total queued: {total_queued}")
    log(f"Total skipped: {total_skipped}")
    log(f"Total errors: {total_errors}")
    log(f"Finished at {datetime.now()}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
