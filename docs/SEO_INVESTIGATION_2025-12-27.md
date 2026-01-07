# SEO Investigation Report - December 27, 2025

## Overview

Investigation of Google Search Console indexing issues for geckoadvisor.com.

### Current Stats
- **Total Discovered**: 51,661 URLs
- **Indexed**: 34,819 pages (67%)
- **Not Indexed**: 13,803 pages (10 reasons)

## Issues Investigated

### 1. Server Errors (5xx) - 438 pages

**Status**: Resolved

**Findings**:
- Zero 5xx errors in current production logs (containers up 35 hours)
- Found one cache warning: `items over 2MB can not be cached` for large reports
- The 438 errors were from past incidents, now resolved

**Root Cause**: Historical issues that have been fixed. Google hasn't re-validated yet.

**Action**: No fix needed. Will auto-clear on next Google crawl.

---

### 2. Not Found (404) - 3,032 pages

**Status**: Expected behavior

**Findings**:
- Database is healthy: 54,694 domains, 0 orphaned records, 0 stale domains
- All sitemap URLs return 200 when tested
- Actual 404s in nginx logs are:
  - `/healthz` probes (48)
  - `/.well-known/traffic-advice` (33)
  - `/favicon.ico` (22)
  - WordPress attack attempts (wp-*.php)
  - Malformed URLs from crawlers appending `/_next/static/...`

**Root Cause**: Old URLs from before sitemap cleanup, crawler-generated malformed URLs.

**Action**: No fix needed. These will age out of GSC over time.

---

### 3. Blocked by robots.txt - 9,475 pages

**Status**: Working as designed

**Findings**:
- robots.txt correctly blocks: `/api/`, `/scan/`, `/admin/`, `/dashboard`, `/_next/`, `/ssr`
- robots.txt correctly allows: `/privacy-policy/`, `/r/`, `/blog/`, `/reports`
- No recent Googlebot requests to blocked paths in logs

**Root Cause**: These are internal/API pages that should not be indexed.

**Action**: No changes needed.

---

### 4. Excluded by 'noindex' tag - 465 pages

**Status**: Working as designed

**Findings**:
- Index gating logic in `packages/shared/src/seo/index-gating.ts` is correct
- Pages get noindex when:
  - Domain is blocked (adult content) → returns 410 + noindex
  - Scan status !== 'done'
  - Score is null/NaN/out of range
  - Missing tracker/thirdParty/tlsGrade data (limited tier)

**Root Cause**: Intentionally noindexed due to blocked content or incomplete scans.

**Action**: No changes needed.

---

### 5. Crawled - Currently Not Indexed - 358 pages

**Status**: Google quality decision

**Findings**:
- This is Google's algorithm assessment, not a technical issue
- Score distribution shows 7,775 domains with perfect score (100)
- High-scoring reports may be seen as "thin content" (less to report)

**Root Cause**: Google's algorithm decided these pages don't provide enough unique value.

**Action**: Consider enriching report content with more unique insights.

---

## Summary Table

| Issue | Pages | Status | Action Required |
|-------|-------|--------|-----------------|
| Server errors (5xx) | 438 | Resolved | None - will auto-clear |
| Not found (404) | 3,032 | Expected | None - will age out |
| Blocked by robots.txt | 9,475 | Intentional | None |
| Excluded by noindex | 465 | Intentional | None |
| Crawled not indexed | 358 | Google decision | Content enrichment |

## Database Health Check

```
Total Domains: 54,694
Indexed Domains: 54,304
Orphaned Records: 0
Stale Domains (>90 days): 0
Recent Scans: 76,185
```

## Recommendations

### Immediate (No Action Needed)
1. All technical issues are working as designed
2. GSC errors will clear naturally as Google re-crawls

### Content Enrichment - IMPLEMENTED (December 27, 2025)

The following features have been implemented to improve the "crawled but not indexed" rate:

#### 1. Market Analysis Section - DONE
- [x] Compare domain's privacy score to global average
- [x] Show percentile ranking (e.g., "Better than 78% of websites")
- [x] Visual animated percentile ring with color themes
- [x] Score comparison bar showing position vs average
- [x] Tracker/cookie comparison cards with directional indicators

**Implementation:**
- Backend: `apps/backend/src/services/analyticsService.ts`
- Frontend: `apps/web/components/report/BenchmarkSection.tsx`
- SEO Content: `apps/web/components/seo/SEOSummary.tsx`

#### 2. Benchmark Data - DONE
- [x] Global statistics cached with 6-hour TTL
- [x] Score distribution for percentile calculation
- [x] Top 20 trackers with occurrence counts
- [x] Average tracker/cookie counts

**API Endpoints:**
- `GET /api/v2/analytics/benchmarks` - View global stats
- `POST /api/v2/analytics/refresh` - Force cache refresh (admin)

#### 3. SEO-Optimized Content - DONE
- [x] Crawlable market comparison text in SEOSummary component
- [x] Unique content per report based on actual benchmark data
- [x] "How does {domain} compare to other websites?" section

**Example Content Generated:**
> Based on Gecko Advisor's analysis of 54,694 websites, example.com scores
> better than 87% of all sites we've analyzed. This is 15 points above the
> average score of 57.

### Future Improvements (Phase 2)

The following features are planned for future implementation:

1. **Industry-Specific Benchmarks**
   - Categorize by sector (news, e-commerce, social media)
   - "Better than 95% of news sites"

2. **Similar Sites Section**
   - Internal linking between similar score ranges
   - Improves SEO through cross-linking

3. **Competitive Insights**
   - Compare to top competitors
   - Show privacy trends over time

4. **User Engagement Features**
   - Track domain privacy changes over time
   - Comparison tool for multiple domains

---

## Technical Details

### Files Reviewed
- `apps/web/app/robots.ts` - robots.txt configuration
- `packages/shared/src/seo/index-gating.ts` - Index tier logic
- `apps/backend/src/services/domainService.ts` - Domain indexing
- `apps/web/app/sitemap-reports/[chunk]/route.ts` - Sitemap generation
- `apps/web/middleware.ts` - Domain blocking

### Production Server
- All containers healthy (35+ hours uptime)
- No 5xx errors in nginx/backend logs
- Database: 76,185 completed scans

---

*Investigation completed: December 27, 2025*
