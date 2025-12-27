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

### Future Improvements (Content Enrichment)

To improve the "crawled but not indexed" rate and overall SEO value:

1. **Market Analysis Section**
   - Compare domain's privacy score to industry average
   - Show percentile ranking (e.g., "Better than 78% of similar sites")
   - Include sector-specific benchmarks (e-commerce, news, social media)

2. **Competitive Insights**
   - Compare to top competitors in the same industry
   - Show privacy trends over time
   - Highlight unique privacy concerns for the sector

3. **Actionable Recommendations**
   - Provide specific improvement suggestions
   - Link to resources for fixing issues
   - Estimate impact of improvements

4. **Rich Content Elements**
   - Add structured data (Schema.org) for better SERP display
   - Include visual charts and graphs
   - Add FAQs section for common privacy questions

5. **User Engagement Features**
   - Allow users to track domain privacy changes
   - Email alerts for privacy score changes
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
