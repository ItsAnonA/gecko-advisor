# Market Analysis Feature - Technical Documentation

**Last Updated:** 2025-12-27
**Status:** Implemented
**Version:** 1.0
**Author:** Privacy Gecko Team

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Technical Architecture](#technical-architecture)
4. [Data Flow](#data-flow)
5. [Component Design](#component-design)
6. [API Reference](#api-reference)
7. [Algorithm Reference](#algorithm-reference)
8. [Caching Strategy](#caching-strategy)
9. [SEO Integration](#seo-integration)
10. [Performance Considerations](#performance-considerations)
11. [Future Improvements](#future-improvements)

---

## Overview

### Purpose

The Market Analysis feature enriches privacy reports with comparative data, showing users how a scanned website's privacy practices compare to global benchmarks. This addresses the "Crawled but not indexed" issue identified in Google Search Console by providing unique, valuable content for each report page.

### Key Features

- **Percentile Ranking**: Shows what percentage of analyzed sites the current site outperforms
- **Score Comparison**: Visual comparison against the global average privacy score
- **Tracker/Cookie Analysis**: Compares tracker and cookie counts to averages
- **Common Tracker Detection**: Identifies well-known trackers found on the site
- **SEO-Optimized Content**: Crawlable text that enhances search engine visibility

### Business Value

- Improves SEO indexing rate for report pages
- Provides unique, differentiated content per report
- Increases user engagement and time on page
- Builds trust through transparent benchmarking

---

## User Flow

### Primary User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User visits privacy report page                              │
│     /privacy-policy/{domain}                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Page fetches report data with benchmark enrichment           │
│     - Scan results (score, trackers, cookies, TLS grade)        │
│     - Benchmark comparison (percentile, averages)               │
│     - Tracker insights (common trackers, rarity score)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. User sees the Overview tab with:                             │
│     ┌──────────────────────────────────────────────────────┐    │
│     │  Privacy Score Ring (existing)                        │    │
│     ├──────────────────────────────────────────────────────┤    │
│     │  📊 Market Comparison Section (NEW)                   │    │
│     │  - Animated percentile ring (e.g., "87%")            │    │
│     │  - "Better than 87% of websites"                     │    │
│     │  - Score bar showing position vs. average            │    │
│     │  - Tracker/Cookie comparison cards                   │    │
│     │  - Common trackers detected                          │    │
│     ├──────────────────────────────────────────────────────┤    │
│     │  SEO Content Summary (enhanced)                       │    │
│     └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. User can explore other tabs:                                 │
│     - Trackers tab (detailed tracker list)                      │
│     - Security tab (TLS and header analysis)                    │
│     - Evidence tab (raw data)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction States

| State | UI Behavior |
|-------|-------------|
| Loading | Benchmark section shows skeleton/shimmer |
| No benchmarks | Section hidden gracefully |
| Excellent (75%+) | Green theme, "Excellent" badge |
| Average (50-74%) | Amber theme, "Average" badge |
| Below Average (<50%) | Red theme, "Below Average" badge |

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌────────────────────┐  ┌────────────────────┐                     │
│  │ InteractiveReport  │  │  SEOSummary       │                      │
│  │ (Client Component) │  │  (Server Component)│                     │
│  │                    │  │                    │                      │
│  │ - BenchmarkSection │  │ - Market comparison│                     │
│  │ - Animated ring    │  │ - Crawlable text  │                      │
│  │ - Comparison cards │  │                    │                      │
│  └────────┬───────────┘  └────────┬───────────┘                     │
│           │                       │                                  │
└───────────┼───────────────────────┼──────────────────────────────────┘
            │                       │
            │                       │ SSR (Server-Side Rendering)
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            BACKEND API                               │
│                                                                      │
│  GET /api/v2/report/:domain                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ enrichReportWithBenchmarks()                                 │    │
│  │ - Fetches scan data from database                           │    │
│  │ - Calls AnalyticsService for benchmark comparison           │    │
│  │ - Returns enriched payload with meta.benchmarks             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  GET /api/v2/analytics/benchmarks (Admin/Debug)                     │
│  GET /api/v2/analytics/refresh (Admin Only)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ANALYTICS SERVICE                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ AnalyticsService                                             │    │
│  │                                                              │    │
│  │ - getGlobalBenchmarks()     → Cached global statistics      │    │
│  │ - calculatePercentile()     → Score ranking calculation     │    │
│  │ - compareToBenchmarks()     → Full comparison result        │    │
│  │ - getTrackerInsights()      → Tracker rarity analysis       │    │
│  │ - refreshCache()            → Manual cache invalidation     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│                                                                      │
│  ┌─────────────────┐      ┌─────────────────┐                       │
│  │   PostgreSQL    │      │     Redis       │                       │
│  │                 │      │                 │                       │
│  │ - Scan table    │      │ - Global        │                       │
│  │ - Evidence table│      │   benchmarks    │                       │
│  │   (trackers)    │      │ - Score         │                       │
│  │                 │      │   distribution  │                       │
│  │                 │      │ - Tracker       │                       │
│  │                 │      │   frequency     │                       │
│  └─────────────────┘      └─────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
apps/
├── backend/
│   └── src/
│       ├── services/
│       │   └── analyticsService.ts    # Core analytics logic
│       └── routes/
│           └── v2.reports.ts          # API endpoints (modified)
│
├── web/
│   ├── app/
│   │   └── (seo)/privacy-policy/[domain]/
│   │       └── page.tsx               # Report page (modified)
│   ├── components/
│   │   ├── report/
│   │   │   ├── InteractiveReport.tsx  # Main report component (modified)
│   │   │   └── BenchmarkSection.tsx   # NEW: Market comparison UI
│   │   └── seo/
│   │       └── SEOSummary.tsx         # SEO content (modified)
│   └── lib/
│       └── api.ts                     # Frontend types (modified)
│
packages/
└── shared/
    └── src/
        └── reportPayload.ts           # Shared types (modified)
```

---

## Data Flow

### Report Request Flow

```
1. Page Request
   /privacy-policy/example.com
           │
           ▼
2. SSR Component (page.tsx)
   ├─ getReportForDomain('example.com')
   │   │
   │   ▼
   ├─ Backend API: GET /api/v2/report/by-domain/example.com
   │   │
   │   ├─ Fetch Scan from Database
   │   │   └─ SELECT * FROM Scan WHERE normalized_input = 'example.com'
   │   │
   │   ├─ enrichReportWithBenchmarks(payload)
   │   │   │
   │   │   ├─ analyticsService.compareToBenchmarks(score, trackers, cookies)
   │   │   │   │
   │   │   │   └─ analyticsService.getGlobalBenchmarks()
   │   │   │       ├─ Redis HIT → Return cached data
   │   │   │       └─ Redis MISS → Calculate from DB, cache result
   │   │   │
   │   │   ├─ analyticsService.getTrackerInsights(trackerDomains)
   │   │   │
   │   │   └─ Return enriched payload with meta.benchmarks
   │   │
   │   └─ Return JSON response
   │
   ├─ Render SEOSummary (Server Component)
   │   └─ Include benchmark data in crawlable HTML
   │
   └─ Render InteractiveReport (Client Component)
       └─ Display BenchmarkSection with animations
```

### Benchmark Calculation Flow

```
getGlobalBenchmarks()
       │
       ├── Check Redis cache: analytics:global:benchmarks
       │   ├─ HIT → Return cached GlobalBenchmarks
       │   └─ MISS → Continue to calculation
       │
       └── calculateGlobalBenchmarks()
           │
           ├── Get score statistics
           │   └─ SELECT AVG(score), COUNT(*) FROM Scan WHERE status='done'
           │
           ├── Get score distribution
           │   └─ SELECT score, COUNT(*) FROM Scan GROUP BY score ORDER BY score
           │
           ├── Calculate median from distribution
           │
           ├── Get top trackers (raw SQL)
           │   └─ SELECT details->>'domain', COUNT(DISTINCT scanId)
           │      FROM Evidence WHERE kind='tracker'
           │      GROUP BY details->>'domain'
           │      ORDER BY count DESC LIMIT 20
           │
           ├── Get average tracker/cookie counts
           │   └─ SELECT COUNT(*) FROM Evidence WHERE kind IN ('tracker', 'cookie')
           │
           └── Cache result with 6-hour TTL
```

---

## Component Design

### BenchmarkSection Component

**File:** `apps/web/components/report/BenchmarkSection.tsx`

#### Visual Hierarchy

```
┌────────────────────────────────────────────────────────────────────┐
│ Market Comparison                                                   │
│ Based on 54,694 analyzed sites                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐    ┌──────────────────────────────────────────┐   │
│  │            │    │ example.com scores better than 87%       │   │
│  │    87%     │    │ of websites. That's 15 points above avg. │   │
│  │            │    │                                          │   │
│  │ Percentile │    │ Privacy Score                            │   │
│  │            │    │ [====================|===] 72            │   │
│  │ Excellent  │    │                     Avg 57              │   │
│  └────────────┘    │                                          │   │
│                     │ ┌───────────┐ ┌───────────┐            │   │
│                     │ │↓ 3 Track. │ │↓ 5 Cookies│            │   │
│                     │ │2.1 fewer  │ │3.2 fewer  │            │   │
│                     │ │than avg   │ │than avg   │            │   │
│                     │ └───────────┘ └───────────┘            │   │
│                     │                                          │   │
│                     │ Known Trackers: google.com, fb.com      │   │
│                     └──────────────────────────────────────────┘   │
│                                                                     │
│ SEO text: example.com has a privacy score of 72/100, ranking in   │
│ the top 13% of 54,694 websites analyzed...                         │
└────────────────────────────────────────────────────────────────────┘
```

#### Theme Configuration

| Percentile Range | Ring Color | Background | Badge |
|-----------------|------------|------------|-------|
| 75-100% | Emerald (#10b981) | emerald-50/80 | "Excellent" |
| 50-74% | Amber (#f59e0b) | amber-50/80 | "Average" |
| 0-49% | Red (#ef4444) | red-50/60 | "Below Average" |

#### Animation Sequence

1. **Mount (0ms)**: Component fades in (opacity 0 → 1)
2. **Ring animation (200ms delay)**: SVG circle fills from 0 to percentile
3. **Number counter (200ms delay)**: Counts from 0 to percentile value
4. **Score bar (400ms delay)**: Fills to score width
5. **Tracker badges (staggered)**: Fade in with 100ms intervals

---

## API Reference

### Report Endpoints (Enhanced)

All report endpoints now return benchmark data in `meta`:

#### GET /api/v2/report/by-domain/:domain

**Response (meta field):**
```json
{
  "meta": {
    "trackerCount": 3,
    "cookieCount": 8,
    "thirdPartyCount": 12,
    "benchmarks": {
      "percentile": 87,
      "comparedToAverage": 15,
      "trackerComparison": "below",
      "cookieComparison": "below"
    },
    "trackerInsights": {
      "uniqueTrackers": 3,
      "commonTrackers": ["google-analytics.com", "doubleclick.net"],
      "rarityScore": 25
    },
    "globalBenchmarks": {
      "totalDomains": 54694,
      "averageScore": 57,
      "averageTrackerCount": 5.2,
      "averageCookieCount": 11.3
    }
  }
}
```

### Analytics Endpoints (New)

#### GET /api/v2/analytics/benchmarks

Returns global benchmark statistics. Useful for debugging and monitoring.

**Response:**
```json
{
  "totalDomains": 54694,
  "averageScore": 57,
  "medianScore": 62,
  "scoreDistribution": [
    { "score": 0, "count": 150, "cumulative": 150 },
    { "score": 1, "count": 45, "cumulative": 195 }
  ],
  "topTrackers": [
    { "domain": "google-analytics.com", "count": 28450, "percentage": 52 },
    { "domain": "doubleclick.net", "count": 21500, "percentage": 39 }
  ],
  "averageTrackerCount": 5.2,
  "averageCookieCount": 11.3,
  "lastUpdated": "2025-12-27T10:30:00Z"
}
```

#### POST /api/v2/analytics/refresh

**Authentication:** Requires `x-admin-key` header

Force refreshes all cached analytics data. Use after bulk data imports or corrections.

**Response:**
```json
{
  "success": true,
  "message": "Analytics cache refreshed"
}
```

---

## Algorithm Reference

### Rarity Score Calculation

The rarity score measures how unusual a site's tracker set is compared to common trackers:

```
rarityScore = (uncommonTrackerCount / totalTrackerCount) × 100
```

Where:
- **uncommonTrackerCount** = trackers NOT in the top 20 most common trackers globally
- **totalTrackerCount** = total trackers detected on the site

| Rarity Score | Interpretation |
|--------------|----------------|
| 100 | No trackers at all (rare/good) |
| 75-99 | Mostly uncommon/niche trackers |
| 25-74 | Mix of common and uncommon trackers |
| 0-24 | Primarily well-known trackers (Google, Facebook, etc.) |

**Example:** Site has 4 trackers: `[google-analytics.com, doubleclick.net, niche-tracker.io, another-niche.com]`
- Top 20 includes: google-analytics.com, doubleclick.net
- uncommonCount = 2 (niche-tracker.io, another-niche.com)
- rarityScore = (2 / 4) × 100 = **50**

### Tracker/Cookie Comparison Values

The `trackerComparison` and `cookieComparison` fields use threshold-based categorization:

| Value | Meaning | Threshold | UX Interpretation |
|-------|---------|-----------|-------------------|
| `below` | Count is 20%+ below average | `count < avg × 0.8` | Good (fewer trackers) |
| `average` | Count is within ±20% of average | `avg × 0.8 ≤ count ≤ avg × 1.2` | Neutral |
| `above` | Count is 20%+ above average | `count > avg × 1.2` | Warning (more trackers) |

**Note:** For privacy metrics, "below" is desirable (fewer trackers/cookies = better privacy).

**Example:** Average tracker count = 5.0
- Site with 3 trackers → `below` (3 < 4.0)
- Site with 5 trackers → `average` (4.0 ≤ 5 ≤ 6.0)
- Site with 8 trackers → `above` (8 > 6.0)

### Percentile Calculation

Percentile represents "better than X% of sites" based on score distribution:

```
percentile = (countOfSitesWithLowerScore / totalSites) × 100
```

Clamped to range [1, 99] to avoid "better than 0%" or "better than 100%" edge cases.

---

## Caching Strategy

### Cache Keys

| Key | TTL | Content |
|-----|-----|---------|
| `analytics:global:benchmarks` | 6 hours | Complete GlobalBenchmarks object |
| `analytics:score:distribution` | 6 hours | Score distribution array |
| `analytics:tracker:frequency` | 6 hours | Top 20 trackers with counts |

### Cache Invalidation

**Automatic:**
- Cache expires after 6 hours
- Next request triggers recalculation

**Manual:**
- Call `POST /api/v2/analytics/refresh` with admin key
- Used after significant data changes

### Cache Warming

Benchmarks are calculated lazily on first request. For production:
- First page load after cache expiry takes ~500-1000ms
- Subsequent loads use cache (<10ms)

Consider adding a cron job to pre-warm cache every 6 hours:
```bash
curl -X POST https://api.geckoadvisor.com/api/v2/analytics/refresh \
  -H "x-admin-key: $ADMIN_API_KEY"
```

### Cache Stampede Warning

**Known Issue:** If multiple requests arrive simultaneously after cache expiry, each will trigger a recalculation (stampede). This can cause:
- Temporary database load spike
- Slower response times for concurrent users

**Future Mitigation Options:**
1. **Mutex/Lock Pattern**: Use Redis `SETNX` to ensure only one recalculation runs
2. **Stale-While-Revalidate**: Serve stale data while refreshing in background
3. **Proactive Refresh**: Cron job refreshes before expiry (recommended)

---

## SEO Integration

### Server-Side Content

The `SEOSummary` component renders crawlable text:

```html
<section>
  <h3>How does example.com compare to other websites?</h3>
  <p>
    Based on Gecko Advisor's analysis of <strong>54,694</strong> websites,
    <strong>example.com</strong> scores better than <strong>87%</strong>
    of all sites we've analyzed. This is 15 points above the average
    score of 57.
  </p>
  <p>
    This site uses 3 trackers, which is 2.1 fewer than the average of
    5.2 trackers per website. Market comparison data helps you understand
    how a website's privacy practices compare to industry norms.
  </p>
</section>
```

### Client-Side Enhancement

The `BenchmarkSection` component provides visual enhancement:
- Animated percentile ring
- Interactive comparison cards
- Contextual color theming

Both render the same core data, ensuring SEO content matches user-visible content.

### Structured Data

Report pages include JSON-LD with benchmark data:

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "mainEntity": {
    "@type": "Review",
    "itemReviewed": {
      "@type": "WebSite",
      "name": "example.com"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "72",
      "bestRating": "100"
    }
  }
}
```

---

## Performance Considerations

### Database Queries

| Query | Complexity | Optimization |
|-------|------------|--------------|
| Score aggregation | O(n) | Uses covering index |
| Score distribution | O(n) | GROUP BY with index |
| Tracker frequency | O(n) | Raw SQL with JSON extraction |
| Evidence counts | O(1) | Simple count queries |

### Recommended Index

For optimal tracker frequency query performance on large datasets, add:

```sql
CREATE INDEX idx_evidence_tracker_domain
ON "Evidence" ((details->>'domain'))
WHERE kind = 'tracker';
```

This partial index covers the exact query pattern used in `getTopTrackers()` and avoids indexing non-tracker evidence rows.

### Expected Performance

| Operation | Cold (no cache) | Warm (cached) |
|-----------|-----------------|---------------|
| getGlobalBenchmarks() | 300-800ms | <10ms |
| calculatePercentile() | <5ms | <5ms |
| compareToBenchmarks() | <20ms | <20ms |
| getTrackerInsights() | <15ms | <15ms |

### Memory Considerations

- GlobalBenchmarks object: ~50KB (includes score distribution)
- Cache memory: ~200KB total for all analytics keys
- No significant memory impact on application

---

## Future Improvements

### Phase 2 Features

1. **Industry Benchmarks**
   - Categorize domains by industry (news, e-commerce, social)
   - Show industry-specific comparisons
   - "Better than 95% of news sites"

2. **Similar Sites Section**
   - Internal linking between similar score ranges
   - "Sites with similar privacy profiles"
   - Improves SEO through internal linking

3. **Historical Trends**
   - Track benchmark changes over time
   - "Average score improved 3% this month"
   - Visualize trends in dashboard

4. **API Analytics**
   - Public endpoint for benchmarks
   - Allow developers to fetch comparative data
   - Rate-limited for abuse prevention

### Technical Debt

- [ ] Add unit tests for AnalyticsService
- [ ] Add E2E tests for benchmark display
- [ ] Consider separate cache for each score bucket
- [ ] Add monitoring for cache hit rates
- [ ] Add index on Evidence.details->>'domain' for tracker frequency query
- [ ] Implement cache stampede protection (mutex/lock or stale-while-revalidate)

---

## Related Documentation

- [SEO Strategy](./SEO_STRATEGY.md) - Overall SEO approach
- [SEO Investigation](./SEO_INVESTIGATION_2025-12-27.md) - Issue investigation
- [Context.md](../Project-Docs/Context.md) - Architecture overview

---

*Document created: December 27, 2025*
*Implementation complete: December 27, 2025*
