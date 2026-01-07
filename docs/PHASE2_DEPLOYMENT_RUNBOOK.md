# Phase 2 Deployment Runbook

**Status**: Ready for Production Deployment
**Last Updated**: 2026-01-07
**Owner**: SEO/Backend Team

## Overview

This runbook covers the deployment and validation steps for Phase 2 SEO URL migration from `/privacy-policy/:domain` to `/privacy-report/:domain`.

**Pre-requisites**:
- ✅ Phase 0 complete (Bot-safe architecture with cache-first + circuit breaker)
- ✅ Phase 1 complete (301 redirects implemented)
- ✅ Health monitoring endpoints deployed

---

## Task 1: Deploy Code Changes ✅

**Status**: COMPLETED (commit `da74cbe`)

**Changes deployed**:
- 301 permanent redirects from `/privacy-policy/` to `/privacy-report/`
- Health monitoring endpoints (`/health/cache`, `/health/redirects`)
- Circuit breaker metrics exposure

**Verification**:
```bash
# Test redirect
curl -I https://api.geckoadvisor.com/privacy-policy/example.com
# Expected: HTTP/1.1 301 Moved Permanently
# Location: /privacy-report/example.com

# Test monitoring endpoints
curl https://api.geckoadvisor.com/health/cache
curl https://api.geckoadvisor.com/health/redirects
```

---

## Task 2: Run Bot Safety Validation (1000+ domains)

**Purpose**: Validate bot safety before URL migration to ensure:
- ✅ ZERO 5xx responses to bots (CRITICAL)
- ✅ All placeholders have noindex meta tag (CRITICAL)
- ⚠️  Cache hit rate >95% (TARGET)
- ⚠️  Placeholder rate <1% (TARGET)

### Option A: Run on Production Server (Recommended)

```bash
# SSH into production server
ssh production-server

# Navigate to application directory
cd /path/to/privacy-advisor

# Ensure DATABASE_URL is set (should be in environment)
echo $DATABASE_URL

# Run validation with production endpoint
./scripts/production-validation.sh 1000 https://api.geckoadvisor.com

# Or use pnpm directly
pnpm validate:bot-safety --sample 1000 --endpoint https://api.geckoadvisor.com
```

### Option B: Run with SSH Tunnel (from local machine)

```bash
# Terminal 1: Create SSH tunnel to production database
ssh -L 5432:localhost:5432 production-server -N

# Terminal 2: Run validation
export DATABASE_URL="postgresql://user:pass@localhost:5432/geckoadvisor"
./scripts/production-validation.sh 1000 https://api.geckoadvisor.com
```

### Option C: Run from CI/CD Pipeline

Add to GitHub Actions workflow:

```yaml
- name: Validate Bot Safety
  run: |
    pnpm validate:bot-safety --sample 1000 --endpoint ${{ secrets.API_ENDPOINT }}
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Success Criteria

**CRITICAL (blocking)**:
- ✅ Zero 5xx errors for bots
- ✅ All placeholders have noindex meta tag

**TARGET (warning, not blocking)**:
- ⚠️  Cache hit rate >95%
- ⚠️  Placeholder rate <1%

**If validation fails**:
1. Review failure logs
2. Fix critical issues (5xx errors, missing noindex)
3. Consider running cache pre-warming (Task 3)
4. Re-run validation
5. **DO NOT proceed with URL migration until validation passes**

---

## Task 3: Run Cache Pre-warming

**Purpose**: Pre-populate Redis cache with SSR HTML for all indexed domains to achieve >95% cache hit rate for bot crawls.

### Execution

```bash
# Check if pre-warming script exists
ls -la scripts/ | grep prewarm

# Run in background (takes several hours for all domains)
pnpm prewarm:cache --endpoint https://api.geckoadvisor.com > prewarm.log 2>&1 &

# Monitor progress
tail -f prewarm.log

# Check process status
ps aux | grep prewarm
```

### Expected Behavior

- Fetches all indexed domains from database (typically 10,000+ domains)
- Requests SSR HTML for each domain sequentially
- Populates Redis cache with TTL of 24 hours
- Rate-limited to avoid overwhelming API (1-2 req/sec)
- Progress logged every 100 domains

### Monitoring

```bash
# Check cache metrics during pre-warming
watch -n 5 'curl -s https://api.geckoadvisor.com/health/cache | jq ".cache.hitRate"'

# Expected progression:
# Start: ~0% hit rate (cold cache)
# After 1000 domains: ~10% hit rate
# After 5000 domains: ~50% hit rate
# After 10000 domains: ~95%+ hit rate
```

### Troubleshooting

**Issue**: Pre-warming process crashes or times out

**Solution**:
1. Check Redis memory limits: `redis-cli INFO memory`
2. Increase Redis max memory if needed
3. Run pre-warming in batches:
   ```bash
   pnpm prewarm:cache --offset 0 --limit 2000
   pnpm prewarm:cache --offset 2000 --limit 2000
   pnpm prewarm:cache --offset 4000 --limit 2000
   ```

**Issue**: Cache hit rate not improving

**Solution**:
1. Verify Redis is persistent (not evicting keys)
2. Check circuit breaker state: `curl https://api.geckoadvisor.com/health/cache | jq ".circuitBreaker"`
3. Review error logs for generation failures

---

## Task 4: Submit Updated Sitemap to Google Search Console

**Purpose**: Inform Google of new canonical URLs at `/privacy-report/:domain` to accelerate crawl/index of new paths.

### Pre-requisites

- ✅ Bot safety validation passed (Task 2)
- ✅ Cache pre-warming complete (Task 3)
- ✅ Sitemap includes new `/privacy-report/` URLs

### Steps

1. **Verify sitemap content**:
   ```bash
   curl https://api.geckoadvisor.com/sitemap.xml | head -50

   # Verify format:
   # <url>
   #   <loc>https://geckoadvisor.com/privacy-report/example.com</loc>
   #   <lastmod>2026-01-07</lastmod>
   #   <priority>0.8</priority>
   # </url>
   ```

2. **Access Google Search Console**:
   - Go to: https://search.google.com/search-console
   - Select property: `geckoadvisor.com`

3. **Submit sitemap**:
   - Navigate to: **Sitemaps** → **Add new sitemap**
   - Enter: `https://api.geckoadvisor.com/sitemap.xml`
   - Click: **Submit**

4. **Verify submission**:
   - Status should show: "Success" (may take 24-48 hours to process)
   - Check "Discovered URLs" count increases

5. **Monitor indexing progress**:
   - **Coverage report**: Check for `/privacy-report/` indexed pages
   - **Performance report**: Monitor clicks/impressions for new URLs
   - **301 redirects**: Verify in "Page indexing" report

### Expected Timeline

| Time | Expected Status |
|------|----------------|
| Day 0 | Sitemap submitted |
| Day 1-2 | Google processes sitemap, starts crawling new URLs |
| Day 3-7 | New `/privacy-report/` pages start appearing in index |
| Day 7-14 | Old `/privacy-policy/` pages de-indexed (301 signals) |
| Day 14-30 | Index fully migrated to new URLs |

### Verification Queries

```bash
# Check indexed pages (Google search operator)
site:geckoadvisor.com/privacy-report/

# Check old pages still indexed (should decrease over time)
site:geckoadvisor.com/privacy-policy/

# Check specific domain report indexed
site:geckoadvisor.com/privacy-report/example.com
```

### Troubleshooting

**Issue**: Sitemap submission fails

**Solutions**:
- Verify sitemap is accessible publicly: `curl https://api.geckoadvisor.com/sitemap.xml`
- Check XML format is valid: Use https://www.xml-sitemaps.com/validate-xml-sitemap.html
- Ensure robots.txt allows sitemap access

**Issue**: New URLs not getting indexed

**Solutions**:
- Check GSC "Page indexing" report for errors
- Verify 301 redirects are working: `curl -I https://api.geckoadvisor.com/privacy-policy/example.com`
- Request indexing for sample URLs via GSC "URL Inspection" tool
- Check for noindex tags on SSR HTML (should only be on placeholders)

---

## Post-Deployment Monitoring

### Daily Checks (First 7 Days)

```bash
# 1. Cache performance
curl -s https://api.geckoadvisor.com/health/cache | jq '{
  hitRate: .cache.hitRate,
  placeholderRate: .cache.placeholderRate,
  errorRate: .cache.errorRate,
  circuitState: .circuitBreaker.state
}'

# Expected:
# - hitRate: >95%
# - placeholderRate: <1%
# - errorRate: <0.1%
# - circuitState: CLOSED

# 2. Redirect traffic
curl -s https://api.geckoadvisor.com/health/redirects | jq .

# 3. Bot errors (should be ZERO)
curl -s https://api.geckoadvisor.com/metrics | grep "backend_5xx_total"
```

### Weekly Checks (First 4 Weeks)

1. **Google Search Console**:
   - Check Coverage report for new `/privacy-report/` pages
   - Monitor clicks/impressions trending upward
   - Verify old `/privacy-policy/` pages decreasing

2. **Cache Hit Rate**:
   - Should remain >95% after pre-warming
   - If dropping, investigate:
     - Redis memory eviction
     - Circuit breaker triggering
     - Error rate increase

3. **301 Redirect Signals**:
   - Check GSC "Page indexing" report
   - Look for "301 redirect" status on old URLs
   - Should see Google consolidating signals to new URLs

### Alert Thresholds

Set up alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Cache hit rate | <90% | Run cache pre-warming |
| Placeholder rate | >2% | Investigate queue processing |
| Error rate | >0.5% | Check logs, circuit breaker |
| 5xx errors to bots | >0 | CRITICAL: Investigate immediately |
| Circuit breaker | OPEN | Check downstream issues |

---

## Rollback Plan

**If critical issues detected**:

1. **Disable 301 redirects** (emergency):
   ```bash
   # Comment out redirect routes in ssr.domain.ts
   # Deploy immediately
   git revert <redirect-commit>
   git push origin main
   ```

2. **Revert sitemap submission**:
   - GSC → Sitemaps → Delete sitemap
   - Submit old sitemap with `/privacy-policy/` URLs

3. **Notify team**:
   - Update status page
   - Post-mortem analysis
   - Fix issues before retry

---

## Success Checklist

Before declaring Phase 2 complete:

- [ ] Bot safety validation passed (zero 5xx errors)
- [ ] Cache pre-warming complete (>95% hit rate)
- [ ] Sitemap submitted to Google Search Console
- [ ] Health monitoring showing green metrics
- [ ] No critical alerts for 7 days
- [ ] Google indexing new `/privacy-report/` URLs
- [ ] Old `/privacy-policy/` URLs showing 301 redirects in GSC
- [ ] Traffic/clicks trending stable or upward

**Only proceed to Phase 3 (Index Quality Optimization) after all checkboxes completed.**

---

## Support Contacts

- **SEO Issues**: SEO Team
- **Backend Issues**: Backend Team
- **Production Access**: DevOps Team
- **GSC Access**: Marketing Team

---

## Appendix: Script Reference

### Validation Script

Location: `scripts/validate-bot-safety.ts`

Usage:
```bash
pnpm validate:bot-safety [--sample N] [--endpoint URL] [--all]
```

Parameters:
- `--sample N`: Test N random domains (default: 1000)
- `--endpoint URL`: API endpoint to test (default: https://api.geckoadvisor.com)
- `--all`: Test ALL indexed domains (slow, for comprehensive validation)

### Production Validation Wrapper

Location: `scripts/production-validation.sh`

Usage:
```bash
./scripts/production-validation.sh [sample_size] [endpoint]
```

Features:
- Environment validation
- Confirmation prompt
- Colored output
- Exit codes (0=pass, 1=fail)

### Cache Pre-warming Script

Location: `scripts/prewarm-cache.ts` (TODO: Create this script)

Usage:
```bash
pnpm prewarm:cache [--endpoint URL] [--offset N] [--limit N]
```

Parameters:
- `--endpoint URL`: API endpoint (default: production)
- `--offset N`: Start from domain N (for batching)
- `--limit N`: Pre-warm N domains (default: all)

---

## Changelog

- **2026-01-07**: Initial version (Phase 2 immediate tasks)
  - Added bot safety validation steps
  - Added cache pre-warming process
  - Added GSC sitemap submission guide
  - Created production validation script
