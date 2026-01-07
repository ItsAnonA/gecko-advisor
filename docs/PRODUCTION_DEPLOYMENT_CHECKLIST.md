# Production Deployment Checklist - Phase 2

**Production Server**: `root@77.42.39.221`
**Service Prefix**: `ga-` (Gecko Advisor)

## Step 1: Connect and Verify

```bash
# Connect to production
ssh root@77.42.39.221

# Check service status
systemctl status ga-backend
systemctl status ga-worker
systemctl status ga-frontend

# Check running processes
ps aux | grep ga-
```

## Step 2: Deploy Latest Code

```bash
# Navigate to application directory
cd /path/to/privacy-advisor

# Check current branch and commits
git branch
git log --oneline -5

# Pull latest changes
git pull origin main

# Should show commits:
# - a31b0db docs(seo): Add production validation scripts and runbooks
# - da74cbe feat(seo): Add 301 redirects and monitoring endpoints
```

## Step 3: Build and Install

```bash
# Install dependencies (if any new ones)
pnpm install

# Build backend with new changes
pnpm build --filter @gecko-advisor/backend

# Or build all
pnpm build
```

## Step 4: Restart Services

```bash
# Restart backend service (has the new endpoints)
systemctl restart ga-backend

# Check status
systemctl status ga-backend

# Check logs for any errors
journalctl -u ga-backend -f
# Press Ctrl+C to stop following logs
```

## Step 5: Verify Deployment

### Test Health Endpoints

```bash
# Test basic health endpoint
curl -s https://api.geckoadvisor.com/health | jq .

# Test new cache monitoring endpoint
curl -s https://api.geckoadvisor.com/health/cache | jq .

# Test new redirects monitoring endpoint
curl -s https://api.geckoadvisor.com/health/redirects | jq .

# Expected output for /health/cache:
# {
#   "status": "healthy",
#   "cache": {
#     "hits": 1234,
#     "misses": 56,
#     "hitRate": "95.7%",
#     ...
#   },
#   "circuitBreaker": {
#     "state": "CLOSED",
#     "isOpen": false,
#     ...
#   }
# }
```

### Test 301 Redirects

```bash
# Test redirect from /privacy-policy/ to /privacy-report/
curl -I https://api.geckoadvisor.com/privacy-policy/example.com

# Expected output:
# HTTP/2 301
# location: /privacy-report/example.com
```

### Test SSR Report Page

```bash
# Test new canonical URL
curl -I https://api.geckoadvisor.com/privacy-report/example.com

# Should return 200 or 404 (not 301)
```

## Step 6: Run Bot Safety Validation

Once all endpoints are working:

```bash
# Navigate to app directory
cd /path/to/privacy-advisor

# Run validation script
./scripts/production-validation.sh 1000 https://api.geckoadvisor.com

# Or use pnpm directly
pnpm validate:bot-safety --sample 1000 --endpoint https://api.geckoadvisor.com
```

## Troubleshooting

### Issue: Services won't start

```bash
# Check logs for errors
journalctl -u ga-backend -n 50

# Check if port is already in use
lsof -i :5000

# Check environment variables
systemctl show ga-backend --property=Environment
```

### Issue: Health endpoints return 404

**Possible causes:**
1. Backend service not restarted
2. Reverse proxy routing incorrect
3. Code not deployed properly

**Solutions:**

```bash
# 1. Verify code is deployed
grep -A 5 "'/cache'" apps/backend/src/health.ts
grep -A 5 "'/redirects'" apps/backend/src/health.ts

# 2. Rebuild and restart
pnpm build --filter @gecko-advisor/backend
systemctl restart ga-backend

# 3. Check Nginx/reverse proxy config
cat /etc/nginx/sites-enabled/geckoadvisor
# Look for api.geckoadvisor.com routing rules

# 4. Test backend directly (bypass reverse proxy)
curl -s http://localhost:5000/health/cache | jq .
```

### Issue: Redirects not working

```bash
# Check if redirect routes are in code
grep -A 10 "301 Redirect" apps/backend/src/routes/ssr.domain.ts

# Check if route is registered
grep "ssrDomainRouter" apps/backend/src/index.ts

# Restart backend
systemctl restart ga-backend
```

## Service Management Commands

```bash
# Start services
systemctl start ga-backend
systemctl start ga-worker
systemctl start ga-frontend

# Stop services
systemctl stop ga-backend
systemctl stop ga-worker
systemctl stop ga-frontend

# Restart services
systemctl restart ga-backend
systemctl restart ga-worker
systemctl restart ga-frontend

# Check status
systemctl status ga-backend
systemctl status ga-worker
systemctl status ga-frontend

# View logs (live)
journalctl -u ga-backend -f
journalctl -u ga-worker -f
journalctl -u ga-frontend -f

# View recent logs
journalctl -u ga-backend -n 100
journalctl -u ga-worker -n 100
journalctl -u ga-frontend -n 100
```

## Environment Check

```bash
# Check Node.js version
node --version

# Check pnpm version
pnpm --version

# Check available memory
free -h

# Check disk space
df -h

# Check Redis connectivity
redis-cli ping

# Check PostgreSQL connectivity
psql $DATABASE_URL -c "SELECT 1;"
```

## Post-Deployment Checklist

- [ ] Code pulled from git (commits da74cbe and a31b0db)
- [ ] Dependencies installed (`pnpm install`)
- [ ] Backend built (`pnpm build --filter @gecko-advisor/backend`)
- [ ] Backend service restarted (`systemctl restart ga-backend`)
- [ ] Health endpoint working (`curl https://api.geckoadvisor.com/health`)
- [ ] Cache endpoint working (`curl https://api.geckoadvisor.com/health/cache`)
- [ ] Redirects endpoint working (`curl https://api.geckoadvisor.com/health/redirects`)
- [ ] 301 redirects working (`curl -I https://api.geckoadvisor.com/privacy-policy/example.com`)
- [ ] Bot safety validation passed (`./scripts/production-validation.sh 1000`)
- [ ] No errors in logs (`journalctl -u ga-backend -n 50`)

## Next Steps After Successful Deployment

1. **Run cache pre-warming**:
   ```bash
   pnpm prewarm:cache --endpoint https://api.geckoadvisor.com > prewarm.log 2>&1 &
   tail -f prewarm.log
   ```

2. **Submit sitemap to Google Search Console**:
   - URL: https://search.google.com/search-console
   - Submit: `https://api.geckoadvisor.com/sitemap.xml`

3. **Monitor for 24 hours**:
   ```bash
   # Check cache hit rate
   watch -n 60 'curl -s https://api.geckoadvisor.com/health/cache | jq ".cache.hitRate"'
   ```

4. **Set up alerts** (if not already configured):
   - Cache hit rate <90%
   - Placeholder rate >2%
   - Any 5xx errors to bots
