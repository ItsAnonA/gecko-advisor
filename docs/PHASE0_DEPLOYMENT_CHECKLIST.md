# Phase 0: Bot-Safe Architecture - Deployment Checklist

**Purpose:** Ensure zero bot-triggered 5xx errors during URL migration from `/r/:slug` to `/privacy-policy/:domain`

**Target:** 39,417 indexed pages on Google

**Migration Date:** TBD

---

## PRE-DEPLOYMENT VALIDATION (CRITICAL)

### ✅ 1. Run Cache Pre-warming

**Command:**
```bash
# Pre-warm ALL indexed domains
pnpm prewarm:cache

# Or with custom concurrency
pnpm prewarm:cache --concurrency 30

# Skip already cached domains
pnpm prewarm:cache --skip-existing
```

**Success Criteria:**
- ✅ All 39,417 domains cached
- ✅ Cache hit rate >99% after completion
- ✅ <1% failed generations (acceptable)

**Expected Duration:** 40-50 minutes at concurrency 20

---

### ✅ 2. Run Bot Safety Validation

**Command:**
```bash
# Sample 2000 random indexed domains
pnpm validate:bot-safety --sample 2000

# Or test ALL domains (slow)
pnpm validate:bot-safety --all
```

**CRITICAL BLOCKERS (Must Pass):**
- ✅ **CHECK 1:** Zero 5xx errors for bot requests
- ✅ **CHECK 2:** All placeholders have noindex meta tag

**TARGETS (Warnings OK):**
- ✅ **CHECK 3:** Cache hit rate >95%
- ✅ **CHECK 4:** Placeholder rate <1%

**If Validation Fails:**
1. Review error logs for 5xx errors
2. Fix root cause (DB, Redis, circuit breaker config)
3. Re-run pre-warming if needed
4. Re-run validation until CHECK 1 and CHECK 2 pass
5. **DO NOT PROCEED** until validation passes

---

### ✅ 3. Review Monitoring Setup

**Check List:**
- [ ] Redis memory monitoring configured
- [ ] Cache metrics logging enabled (60s flush interval)
- [ ] Sentry error tracking active
- [ ] Google Search Console access confirmed
- [ ] Cloudflare analytics accessible

---

### ✅ 4. Backup Current State

**Database:**
```bash
# Export current scan data
pg_dump -h localhost -U postgres -d privacy > backup_$(date +%F).sql
```

**Redis:**
```bash
# Backup Redis cache
redis-cli --rdb backup_$(date +%F).rdb
```

**Configuration:**
- [ ] Environment variables documented
- [ ] Current robots.txt backed up
- [ ] Current sitemap URLs captured

---

## STAGING DEPLOYMENT

### 1. Deploy to Staging Environment

**URL:** https://stage.geckoadvisor.com

**Steps:**
```bash
# 1. Merge to stage branch
git checkout stage
git merge feature/phase0-bot-safe-architecture
git push origin stage

# 2. Deploy (auto-deploy via CI/CD or manual)
# Wait for deployment to complete

# 3. Verify deployment
curl -I https://api-stage.geckoadvisor.com/health
```

**Expected Response:** `200 OK`

---

### 2. Run Staging Validation

```bash
# Validate against staging endpoint
pnpm validate:bot-safety --endpoint https://api-stage.geckoadvisor.com --sample 1000
```

**Success Criteria:**
- ✅ Zero 5xx errors
- ✅ All placeholders have noindex
- ✅ Cache hit rate >95%

---

### 3. Manual Smoke Tests on Staging

**Test Cases:**

1. **Cache Hit (Existing Domain):**
   ```bash
   curl -I https://api-stage.geckoadvisor.com/privacy-policy/google.com
   ```
   - Expected: `200 OK`, `X-Cache: HIT`

2. **Cache Miss (New Domain):**
   ```bash
   curl -I https://api-stage.geckoadvisor.com/privacy-policy/example-new-domain.com
   ```
   - Expected: `200 OK`, `X-Cache: MISS` or `X-Placeholder: true`

3. **Bot Request:**
   ```bash
   curl -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1)" \
     https://api-stage.geckoadvisor.com/privacy-policy/google.com
   ```
   - Expected: `200 OK`, never 5xx

4. **Blocked Domain:**
   ```bash
   curl -I https://api-stage.geckoadvisor.com/privacy-policy/example.xxx
   ```
   - Expected: `410 Gone`, `X-Robots-Tag: noindex`

5. **Non-Existent Domain:**
   ```bash
   curl -I https://api-stage.geckoadvisor.com/privacy-policy/nonexistent-scan-12345.com
   ```
   - Expected: `404 Not Found` with HTML page

---

### 4. Monitor Staging for 24-48 Hours

**Metrics to Watch:**

1. **Cache Performance:**
   - Hit rate: Should maintain >95%
   - Placeholder rate: Should be <1%
   - Error rate: Should be <0.1%

2. **Response Times:**
   - Cache hits: <50ms
   - Cache misses: <500ms
   - Placeholders: <100ms

3. **Error Rates:**
   - 5xx errors: **ZERO** for bots
   - 4xx errors: Acceptable (404s expected)

4. **Redis Memory:**
   - Monitor memory usage
   - Verify TTL eviction working (24hr)
   - Check for memory leaks

**Monitoring Commands:**
```bash
# Check cache metrics in logs
docker logs gecko-backend-stage | grep "SSR Cache Metrics"

# Check Redis memory usage
redis-cli info memory

# Check circuit breaker state
docker logs gecko-backend-stage | grep "Circuit breaker"
```

---

## PRODUCTION DEPLOYMENT

### ⚠️ PRODUCTION CHECKLIST (MANDATORY)

Before deploying to production, ALL must be ✅:

- [ ] Staging validation passed (zero 5xx for bots)
- [ ] Staging monitored for 24-48 hours with no issues
- [ ] Cache pre-warming script tested and working
- [ ] Bot safety validation script tested and working
- [ ] Rollback plan documented and tested
- [ ] Team notified of deployment window
- [ ] Google Search Console access confirmed
- [ ] Cloudflare cache purge capability confirmed

---

### 1. Pre-Deployment Cache Pre-warming

**Run BEFORE deploying code:**
```bash
# Pre-warm production cache (use production credentials)
DATABASE_URL="postgresql://..." \
REDIS_HOST="..." \
pnpm prewarm:cache --concurrency 20
```

**Why:** Ensures cache is warm BEFORE traffic hits new code

**Duration:** 40-50 minutes

---

### 2. Deploy to Production

**Steps:**
```bash
# 1. Merge to main branch
git checkout main
git merge stage
git push origin main

# 2. Deploy (auto-deploy via CI/CD or manual)
# Wait for deployment to complete (~5 minutes)

# 3. Verify deployment
curl -I https://api.geckoadvisor.com/health
```

**Expected Response:** `200 OK`

---

### 3. Immediate Post-Deployment Validation

**Run within 5 minutes of deployment:**

```bash
# Quick validation (100 samples)
pnpm validate:bot-safety --sample 100
```

**If validation fails:**
→ **IMMEDIATELY ROLLBACK** (see Rollback section below)

**If validation passes:**
→ Proceed to extended monitoring

---

### 4. Extended Production Monitoring

**Monitor for 48-72 hours:**

**Critical Metrics:**

1. **Google Search Console → Coverage:**
   - Zero new 5xx errors
   - Zero new 404s from indexed pages
   - Monitor "Crawl Stats" → Server Errors

2. **Cache Performance:**
   ```bash
   # Check metrics every hour
   docker logs gecko-backend-prod | grep "SSR Cache Metrics"
   ```
   - Hit rate: >95%
   - Placeholder rate: <1%
   - Error rate: <0.1%

3. **Sentry Errors:**
   - Monitor for new error types
   - Check bot vs human error breakdown

4. **Redis Health:**
   ```bash
   redis-cli info memory
   redis-cli info stats
   ```
   - Memory usage stable
   - Evicted keys within expected range

**Alert Thresholds:**
- 🚨 **Any 5xx for bots** → Investigate immediately
- ⚠️ **Cache hit rate <90%** → Consider re-warming
- ⚠️ **Placeholder rate >5%** → Check queue processing
- ⚠️ **Redis memory >80%** → Check TTL, consider increasing capacity

---

## ROLLBACK PROCEDURE

### When to Rollback

**IMMEDIATE ROLLBACK if:**
- Any bot-triggered 5xx errors detected
- Cache hit rate drops below 80%
- Redis becomes unavailable
- Circuit breaker stuck in OPEN state

**CONSIDER ROLLBACK if:**
- Error rate >1% for 10+ minutes
- Placeholder rate >10%
- Response times >5 seconds

---

### Rollback Steps (5-10 Minutes)

```bash
# 1. Revert to previous deployment
git checkout main
git revert HEAD
git push origin main

# 2. Or use CI/CD rollback (faster)
# GitHub Actions: Re-run previous successful deployment

# 3. Verify rollback successful
curl -I https://api.geckoadvisor.com/health

# 4. Clear Cloudflare cache (optional)
# Cloudflare Dashboard → Caching → Purge Everything

# 5. Notify team
# Post in Slack/Discord about rollback
```

**Post-Rollback:**
1. Investigate root cause in logs
2. Fix issues in staging
3. Re-run staging validation
4. Retry production deployment when ready

---

## POST-DEPLOYMENT TASKS

### Week 1: Daily Monitoring

- [ ] Day 1: Check GSC for 5xx errors (should be zero)
- [ ] Day 2: Verify cache hit rate >95%
- [ ] Day 3: Review Sentry errors (should be minimal)
- [ ] Day 7: Full validation run (`pnpm validate:bot-safety --sample 2000`)

---

### Week 2-4: Weekly Monitoring

- [ ] Week 2: Review GSC crawl stats
- [ ] Week 3: Analyze cache performance trends
- [ ] Week 4: Final sign-off on Phase 0 completion

---

### Sign-Off Criteria (4 Weeks Post-Deployment)

Before proceeding to Phase 1 (URL migration), confirm:

- ✅ Zero bot-triggered 5xx errors in GSC (4 weeks)
- ✅ Cache hit rate stable >95%
- ✅ No increase in 404 errors
- ✅ No Redis stability issues
- ✅ Circuit breaker working as expected
- ✅ Placeholder rate <1%

**Sign-Off:** Phase 0 Complete → Ready for Phase 1 (URL Migration)

---

## EMERGENCY CONTACTS

**Technical Contacts:**
- Backend Lead: [Name/Email/Slack]
- DevOps: [Name/Email/Slack]
- On-Call Engineer: [PagerDuty/Phone]

**External Services:**
- Google Search Console: [Account access]
- Cloudflare: [Account access]
- Sentry: [Account access]

---

## APPENDIX: Common Issues & Solutions

### Issue 1: Cache Hit Rate <95%

**Cause:** Cache warming incomplete or cache evicted

**Solution:**
```bash
# Re-run cache pre-warming
pnpm prewarm:cache --skip-existing
```

---

### Issue 2: Placeholder Rate >5%

**Cause:** Queue backed up or worker not processing

**Solution:**
```bash
# Check worker status
docker logs gecko-worker-prod

# Check BullMQ queue
redis-cli llen bull:scan:waiting
redis-cli llen bull:scan:active

# Restart worker if stuck
docker restart gecko-worker-prod
```

---

### Issue 3: Redis Memory at 100%

**Cause:** TTL not evicting or too many keys

**Solution:**
```bash
# Check eviction policy
redis-cli config get maxmemory-policy

# Should be: allkeys-lru or volatile-lru

# Manually clear old cache if needed
redis-cli --scan --pattern "ssr_report:*" | xargs redis-cli del
```

---

### Issue 4: Circuit Breaker Stuck OPEN

**Cause:** Repeated failures, threshold too sensitive

**Solution:**
```bash
# Check circuit breaker state in logs
docker logs gecko-backend-prod | grep "Circuit breaker state"

# If stuck, investigate root cause (DB/Redis)
# Fix root cause, then restart backend
docker restart gecko-backend-prod
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-07
**Owner:** Gecko Advisor Team
