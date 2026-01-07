# Deploy Phase 2 Changes - Quick Guide

**Current Status**: Backend containers are running old code without Phase 2 changes

**What's Missing**:
- `/health/cache` endpoint (SSR cache metrics)
- `/health/redirects` endpoint (redirect status)
- 301 redirects from `/privacy-policy/` to `/privacy-report/`

## Deploy Steps

### 1. SSH into Production Server

```bash
ssh root@77.42.39.221
```

### 2. Find Application Directory

```bash
# Find where the application is deployed
docker inspect $(docker ps --filter 'name=ga-backend' -q) | grep WorkingDir

# Or check Docker Compose file location
docker ps --format '{{.Label "com.docker.compose.project.working_dir"}}'
```

### 3. Pull Latest Code

```bash
# Navigate to application directory (adjust path as needed)
cd /path/to/app

# Pull latest changes from main branch
git fetch origin
git checkout main
git pull origin main

# Verify commits are present
git log --oneline -5

# Should show:
# a31b0db docs(seo): Add production validation scripts and runbooks
# da74cbe feat(seo): Add 301 redirects and monitoring endpoints
```

### 4. Rebuild and Restart Containers

```bash
# Option A: Using Docker Compose
docker-compose down
docker-compose build --no-cache ga-backend
docker-compose up -d

# Option B: Using custom scripts (if they exist)
./deploy.sh
# or
./scripts/deploy-production.sh
```

### 5. Verify Deployment

```bash
# Test basic health endpoint
curl -s https://api.geckoadvisor.com/api/health | jq .

# Test NEW cache monitoring endpoint
curl -s https://api.geckoadvisor.com/api/health/cache | jq .

# Test NEW redirects monitoring endpoint
curl -s https://api.geckoadvisor.com/api/health/redirects | jq .

# Test 301 redirect
curl -I https://api.geckoadvisor.com/privacy-policy/example.com
# Expected: HTTP/2 301
# Location: /privacy-report/example.com
```

### 6. Check Container Logs

```bash
# Follow backend logs
docker logs -f $(docker ps --filter 'name=ga-backend' -q)

# Should see no errors on startup
```

## Expected Results

### `/api/health/cache` Response:

```json
{
  "status": "healthy",
  "cache": {
    "hits": 1234,
    "misses": 56,
    "placeholders": 2,
    "errors": 0,
    "totalRequests": 1292,
    "hitRate": "95.5%",
    "placeholderRate": "0.2%",
    "errorRate": "0.0%",
    "botRequests": 450,
    "humanRequests": 842
  },
  "circuitBreaker": {
    "state": "CLOSED",
    "isOpen": false,
    "failures": 0,
    "threshold": 5
  },
  "thresholds": {
    "hitRateTarget": ">95%",
    "placeholderRateTarget": "<1%",
    "errorRateTarget": "<0.1%"
  },
  "recommendations": {
    "cacheHitRate": "Cache performance is good",
    "placeholderRate": "Placeholder rate is acceptable",
    "errorRate": "Error rate is acceptable"
  },
  "timestamp": "2026-01-07T16:15:00.000Z"
}
```

### `/api/health/redirects` Response:

```json
{
  "status": "active",
  "message": "301 redirects from /privacy-policy/ to /privacy-report/ are active",
  "recommendation": "Keep redirects active for at least 1 year after migration (until Jan 2027)",
  "timestamp": "2026-01-07T16:15:00.000Z",
  "note": "Detailed redirect tracking can be implemented via Redis counters if needed"
}
```

### 301 Redirect Test:

```bash
$ curl -I https://api.geckoadvisor.com/privacy-policy/example.com

HTTP/2 301
location: /privacy-report/example.com
date: Tue, 07 Jan 2026 16:15:00 GMT
```

## Troubleshooting

### Issue: Endpoints still return 404

**Cause**: Backend wasn't rebuilt with new code

**Solution**:
```bash
# Force rebuild without cache
docker-compose build --no-cache ga-backend
docker-compose up -d ga-backend

# Or stop and remove containers first
docker-compose down
docker-compose up -d --build
```

### Issue: Redirect returns wrong status code

**Check**: Verify route ordering in `ssr.domain.ts`
- Redirect routes MUST come BEFORE the main `/privacy-report/:domain` route
- Otherwise the main route will match first

### Issue: Container won't start after rebuild

**Check logs**:
```bash
docker logs $(docker ps -a --filter 'name=ga-backend' -q) --tail 100
```

**Common causes**:
- TypeScript compilation errors
- Missing environment variables
- Database connection issues

## After Successful Deployment

Once all endpoints are working, proceed with validation:

1. **Run bot safety validation**:
   ```bash
   cd /path/to/app
   ./scripts/production-validation.sh 1000
   ```

2. **Run cache pre-warming**:
   ```bash
   pnpm prewarm:cache > prewarm.log 2>&1 &
   ```

3. **Submit sitemap to Google Search Console**:
   - URL: https://search.google.com/search-console
   - Submit: `https://api.geckoadvisor.com/sitemap.xml`

4. **Monitor for 24 hours**:
   ```bash
   watch -n 60 'curl -s https://api.geckoadvisor.com/api/health/cache | jq ".cache | {hitRate, placeholderRate, errorRate}"'
   ```

---

## Need Help?

If you encounter issues during deployment, check:
- `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Full deployment checklist
- `docs/PHASE2_DEPLOYMENT_RUNBOOK.md` - Complete Phase 2 runbook
- `docs/PRODUCTION_VALIDATION_GUIDE.md` - Validation procedures
