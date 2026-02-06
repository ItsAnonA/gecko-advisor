# Data File Audit Report

## Overview

Gecko Advisor uses three demo JSON files as fallback data sources and a `CachedList` database table for production data. This audit documents the current state of data coverage and identifies gaps.

## Data Architecture

```
Production Path:
  CachedList table (populated via POST /admin/refresh-lists)
    ├── easyprivacy → ~20K+ tracker domains
    └── whotracks  → ~10K+ fingerprinting + tracker entries

Fallback Path (when CachedList is empty):
  packages/shared/data/
    ├── easyprivacy-demo.json → 4 tracker domains
    ├── whotracks-demo.json   → 2 fingerprinting + 2 tracker entries
    └── psl-demo.json         → 6 TLD entries
```

## Demo Files

| File | Entries | Production Equivalent |
|------|---------|----------------------|
| `easyprivacy-demo.json` | 4 domains (doubleclick.net, facebook.net, google-analytics.com, quantserve.com) | ~20K+ domains in EasyPrivacy list |
| `whotracks-demo.json` | 2 fingerprinting + 2 trackers | ~10K+ entries in WhoTracks.me |
| `psl-demo.json` | 6 TLD entries (com, net, org, test, co.uk, io) | ~9K+ entries in Public Suffix List |

## Key Findings

1. **Demo files are intentionally minimal** - They exist as fallback for development/testing when the database is empty.

2. **Production data lives in CachedList table** - The `getLists()` function in `apps/worker/src/lists.ts` checks `CachedList` first, only falling back to demo files when the table has no data.

3. **CachedList is populated via admin endpoint** - `POST /admin/refresh-lists` loads demo lists into the database. In production, this should be called with full data sources.

4. **No DDG Tracker Radar integration yet** - P0 #2 will add shadow mode comparison with DuckDuckGo's Tracker Radar dataset for coverage gap analysis.

## Coverage Gaps

- Demo fallback provides <0.02% coverage compared to production lists
- If CachedList is empty and only demo files are available, most trackers will go undetected
- PSL demo covers only 6 TLDs; domain parsing may be inaccurate for uncommon TLDs in fallback mode

## Recommendations

1. Ensure `CachedList` table is populated with full production data in all environments
2. Add monitoring/alerting when `CachedList` is empty or stale (>30 days)
3. Complete P0 #2 (DDG Tracker Radar shadow mode) for coverage comparison
4. Consider automating list refresh via cron job

## Running the Audit

```bash
npx tsx scripts/audit-data-files.ts
```

Output is saved to `docs/data-audit-report.json`.
