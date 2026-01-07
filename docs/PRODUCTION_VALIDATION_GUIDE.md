# Production Validation Guide - Quick Reference

**Production Server**: `root@77.42.39.221`
**Date**: 2026-01-07

## Quick Start: Run Validation on Production

### Step 1: Connect to Production Server

```bash
# Connect via SSH
ssh root@77.42.39.221
```

### Step 2: Navigate to Application Directory

```bash
# Navigate to app directory (adjust path if needed)
cd /path/to/privacy-advisor

# Or find it:
find / -name "privacy-advisor" -type d 2>/dev/null
```

### Step 3: Verify Environment

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Check if pnpm is available
pnpm --version

# Check if application is running
ps aux | grep node
```

### Step 4: Run Bot Safety Validation

```bash
# Option A: Use the wrapper script (recommended)
./scripts/production-validation.sh 1000 https://api.geckoadvisor.com

# Option B: Use pnpm directly
pnpm validate:bot-safety --sample 1000 --endpoint https://api.geckoadvisor.com

# Option C: Test all indexed domains (comprehensive, slow)
pnpm validate:bot-safety --all --endpoint https://api.geckoadvisor.com
```

### Expected Output

```
🤖 Bot Safety Validation

Configuration:
  - Endpoint: https://api.geckoadvisor.com
  - User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
  - Sample size: 1000
  - Timeout: 10000ms

📋 Testing 1000 indexed domains...

📊 Progress: 100/1000 (10%) | 2xx: 95 | 4xx: 5 | 5xx: 0 | Cache hit: 94.2% | Avg time: 120ms
📊 Progress: 200/1000 (20%) | 2xx: 195 | 4xx: 5 | 5xx: 0 | Cache hit: 95.1% | Avg time: 115ms
...

════════════════════════════════════════════════════════════════
VALIDATION RESULTS
════════════════════════════════════════════════════════════════

Response Status:
  ✅ 2xx responses: 950 (95.0%)
  ⚠️  4xx responses: 50 (5.0%)
  ❌ 5xx responses: 0 (0.0%)
  🔌 Network errors: 0

Cache Performance:
  📦 Cache hits: 920 (96.8%)
  ⚡ Cache misses: 30

Placeholder Status:
  📄 Total placeholders: 5 (0.5%)
  ⚠️  Placeholders without noindex: 0

Performance:
  ⏱️  Total time: 180.5s
  📈 Average response time: 180ms
  🔄 Rate: 5.5 req/s

════════════════════════════════════════════════════════════════
VALIDATION CHECKS
════════════════════════════════════════════════════════════════

✅ CHECK 1 PASSED: Zero 5xx errors for bots
✅ CHECK 2 PASSED: All placeholders have noindex meta tag
✅ CHECK 3 PASSED: Cache hit rate 96.8% (target: >95%)
✅ CHECK 4 PASSED: Placeholder rate 0.5% (target: <1%)

════════════════════════════════════════════════════════════════
✅ VALIDATION PASSED - Bot safety confirmed!
════════════════════════════════════════════════════════════════
```

### Success Criteria

**MUST PASS (Critical)**:
- ✅ Zero 5xx errors
- ✅ All placeholders have noindex

**TARGET (Warning)**:
- ✅ Cache hit rate >95%
- ✅ Placeholder rate <1%

---

## If Validation Fails

### Scenario 1: 5xx Errors Detected (CRITICAL)

```bash
# Check backend logs for errors
tail -f /var/log/privacy-advisor/backend.log

# Check circuit breaker state
curl https://api.geckoadvisor.com/health/cache | jq '.circuitBreaker'

# Check database connectivity
curl https://api.geckoadvisor.com/health/readyz | jq '.checks.database'

# Restart services if needed
systemctl restart privacy-advisor-backend
systemctl restart privacy-advisor-worker
```

### Scenario 2: Placeholders Missing noindex (CRITICAL)

```bash
# Test specific domain that failed
curl -s https://api.geckoadvisor.com/privacy-report/failing-domain.com | grep noindex

# Check if placeholder template has noindex
grep -r "noindex" apps/backend/src/templates/

# Fix and redeploy if needed
git pull origin main
pnpm install
pnpm build
systemctl restart privacy-advisor-backend
```

### Scenario 3: Low Cache Hit Rate (<95%)

```bash
# Check Redis status
redis-cli ping
redis-cli INFO memory
redis-cli DBSIZE

# Check cache metrics
curl https://api.geckoadvisor.com/health/cache | jq '.cache'

# Run cache pre-warming
pnpm prewarm:cache --endpoint https://api.geckoadvisor.com > prewarm.log 2>&1 &

# Monitor pre-warming progress
tail -f prewarm.log
```

### Scenario 4: High Placeholder Rate (>1%)

```bash
# Check worker queue processing
curl https://api.geckoadvisor.com/health/status | jq '.metrics.queue'

# Check worker logs
tail -f /var/log/privacy-advisor/worker.log

# Check if worker is running
systemctl status privacy-advisor-worker

# Restart worker if needed
systemctl restart privacy-advisor-worker
```

---

## Alternative: Run from Local Machine with SSH Tunnel

If you prefer to run validation from your local machine:

### Terminal 1: Create SSH Tunnel

```bash
# Forward production database port
ssh -L 5432:localhost:5432 root@77.42.39.221 -N

# Keep this terminal open
```

### Terminal 2: Run Validation

```bash
# Set DATABASE_URL to use tunnel
export DATABASE_URL="postgresql://user:pass@localhost:5432/geckoadvisor"

# Run validation pointing to production API
./scripts/production-validation.sh 1000 https://api.geckoadvisor.com
```

---

## After Successful Validation

Once validation passes:

1. **Run cache pre-warming**:
   ```bash
   # On production server
   pnpm prewarm:cache --endpoint https://api.geckoadvisor.com > prewarm.log 2>&1 &

   # Monitor progress
   tail -f prewarm.log
   ```

2. **Submit sitemap to Google Search Console**:
   - Go to: https://search.google.com/search-console
   - Select: `geckoadvisor.com`
   - Submit: `https://api.geckoadvisor.com/sitemap.xml`

3. **Monitor health endpoints**:
   ```bash
   # Cache performance
   watch -n 60 'curl -s https://api.geckoadvisor.com/health/cache | jq ".cache | {hitRate, placeholderRate, errorRate}"'

   # Redirect status
   curl https://api.geckoadvisor.com/health/redirects | jq .
   ```

4. **Set up monitoring alerts** (if not already configured):
   - Cache hit rate <90%
   - Placeholder rate >2%
   - Error rate >0.5%
   - Any 5xx errors to bots

---

## Troubleshooting Connection Issues

### Cannot SSH to Production

```bash
# Check if SSH key is configured
ssh-add -l

# Try with verbose output
ssh -v root@77.42.39.221

# Try with password authentication
ssh -o PreferredAuthentications=password root@77.42.39.221
```

### Application Not Running

```bash
# Check service status
systemctl status privacy-advisor-backend
systemctl status privacy-advisor-worker

# Start services
systemctl start privacy-advisor-backend
systemctl start privacy-advisor-worker

# Check logs
journalctl -u privacy-advisor-backend -f
journalctl -u privacy-advisor-worker -f
```

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM domains WHERE \"isIndexed\" = true;"

# If psql not available, use node
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.domain.count({where:{isIndexed:true}}).then(console.log).finally(()=>p.$disconnect())"
```

---

## Quick Command Reference

```bash
# Connect to production
ssh root@77.42.39.221

# Run validation (recommended sample size)
./scripts/production-validation.sh 1000

# Run validation (comprehensive, all domains)
./scripts/production-validation.sh --all

# Check cache performance
curl https://api.geckoadvisor.com/health/cache | jq .

# Check redirect status
curl https://api.geckoadvisor.com/health/redirects | jq .

# Test specific redirect
curl -I https://api.geckoadvisor.com/privacy-policy/example.com

# Monitor cache hit rate
watch -n 10 'curl -s https://api.geckoadvisor.com/health/cache | jq -r ".cache.hitRate"'

# Run cache pre-warming
pnpm prewarm:cache > prewarm.log 2>&1 &

# Monitor pre-warming
tail -f prewarm.log
```

---

## Support

If you encounter issues:

1. Check logs on production server
2. Review full runbook: `docs/PHASE2_DEPLOYMENT_RUNBOOK.md`
3. Check health endpoints for system status
4. Review validation script source: `scripts/validate-bot-safety.ts`

For emergency issues, roll back changes per runbook rollback plan.
