# Preprod Branch - Next Steps

## Status: Phase 2 COMPLETE ✅

**Branch Created**: `preprod` at commit `188865f`
**Remote Status**: Pushed to origin
**Base**: Latest main (commit c034796 with tini fix)

---

## What Was Completed

### 1. Configuration Inventory
- Analyzed all differences between `stage` and `main` branches
- Identified 5 critical configuration files to preserve
- Documented 18,000+ lines of non-critical documentation differences
- Created comprehensive execution plan in `BRANCH_REORGANIZATION_PLAN.md`

### 2. Preprod Branch Creation
- Created `preprod` branch from latest `main`
- Added `infra/docker/docker-compose.preprod.yml` with:
  - `APP_ENV=preprod` for all services
  - Preprod URLs configured
  - BACKEND_PROXY_URL preserved for Docker networking
  - Using `:main` image tags (transition to `:preprod` later)
- Included SEO improvements (react-helmet-async, robots.txt, sitemap.xml)
- Committed and pushed to remote repository

### 3. Key Configuration Details

**Docker Compose**: `infra/docker/docker-compose.preprod.yml`
- Service name: `gecko-advisor-preprod`
- Images: `ghcr.io/itsanona/gecko-advisor-{backend,frontend,worker}:main`
- Environment URLs:
  - Frontend: `https://preprod.geckoadvisor.com`
  - Backend: `https://preprodapi.geckoadvisor.com`
  - Worker: `https://pworker.geckoadvisor.com`

**Critical Environment Variables**:
- `NODE_ENV=production`
- `APP_ENV=preprod`
- `BACKEND_PROXY_URL=http://backend:5000` (avoids Cloudflare SSL issues)

---

## Phase 3: Update Coolify Deployment

### Coolify Configuration

**Deployment ID**: `ps884k084kg0wg0ocgwo4gs8` (current staging)
**SSH Access**: `potham@65.108.148.246`

### Steps to Execute in Coolify UI

#### 1. Update Git Source
- Navigate to deployment `ps884k084kg0wg0ocgwo4gs8`
- **Git Source** → **Branch**: Change from `stage` to `preprod`
- **Save**

#### 2. Update Docker Compose File Path
- **Docker Compose Settings** → **Compose File**
- Change from: `infra/docker/docker-compose.stage.yml`
- Change to: `infra/docker/docker-compose.preprod.yml`
- **Save**

#### 3. Verify Environment Variables (Optional)
- Check **Environment Variables** section
- If `APP_ENV=stage` is explicitly set, change to `APP_ENV=preprod`
- If not set, it will inherit from docker-compose (no action needed)
- Verify `ADMIN_API_KEY` is set
- Verify `DATABASE_URL` and `REDIS_URL` if using custom values

#### 4. Trigger Deployment
- Click **Deploy** or **Redeploy** button
- Monitor deployment logs for:
  - ✅ Git clone from `preprod` branch
  - ✅ Docker Compose file found
  - ✅ Images pulled successfully
  - ✅ Services starting (db, redis, backend, worker, frontend)
  - ✅ Health checks passing

### Expected Deployment Timeline
- Git clone: ~10 seconds
- Image pull: ~30-60 seconds (if not cached)
- Service startup: ~30-45 seconds
- Health checks: ~10-20 seconds
- **Total**: ~2-3 minutes

### Troubleshooting Commands (if needed)

```bash
# SSH into deployment server
ssh potham@65.108.148.246

# Check Coolify logs
sudo coolify logs ps884k084kg0wg0ocgwo4gs8 | tail -100

# Check Docker containers
sudo docker ps --filter "name=gecko-advisor"

# Check backend health
sudo docker exec <backend-container-id> curl -f http://localhost:5000/api/health

# Check worker health
sudo docker exec <worker-container-id> curl -f http://localhost:5050/health

# Check backend logs
sudo docker logs <backend-container-id> --tail 50

# Check worker logs
sudo docker logs <worker-container-id> --tail 50

# Check database connectivity
sudo docker exec <postgres-container-id> psql -U postgres -d privacy -c "SELECT COUNT(*) FROM \"Scan\";"

# Check Redis connectivity
sudo docker exec <redis-container-id> redis-cli ping
# Expected: PONG
```

---

## Phase 4: Testing & Verification

### Pre-Deployment Checklist
- [ ] Coolify branch changed to `preprod`
- [ ] Docker Compose file path updated
- [ ] Deployment triggered
- [ ] No errors in deployment logs
- [ ] All containers running

### Functional Testing

#### 1. URL Accessibility
```bash
# Frontend (should return 200 OK)
curl -I https://preprod.geckoadvisor.com

# Backend Health (should return JSON with status: healthy)
curl https://preprodapi.geckoadvisor.com/api/health

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2025-11-03T...",
#   "db": true,
#   "redis": true
# }

# Worker Health
curl https://pworker.geckoadvisor.com/health
```

#### 2. Full Scan Workflow Test
1. Visit: `https://preprod.geckoadvisor.com`
2. Enter test URL: `https://example.com`
3. Click **Scan Website**
4. Wait for scan completion (<60 seconds)
5. Verify redirected to report page (`/r/{slug}`)
6. Check scan score is displayed (0-100)
7. Verify evidence sections are present
8. Check recommendations are shown
9. Open browser DevTools (F12) - verify no console errors
10. Check Network tab - verify no failed API requests

#### 3. Performance Verification
```bash
# API response time (<100ms target)
curl -w "Time total: %{time_total}s\n" -o /dev/null -s \
  https://preprodapi.geckoadvisor.com/api/health

# Page load time (check browser DevTools Network tab)
# - LCP (Largest Contentful Paint) < 2.5s
# - FCP (First Contentful Paint) < 1.8s
# - Total Load Time < 3s
```

#### 4. Database Persistence Test
```bash
# SSH into server
ssh potham@65.108.148.246

# Connect to Postgres
sudo docker exec -it <postgres-container-id> psql -U postgres -d privacy

# Check recent scans (should see your test scan)
SELECT id, url, status, score, "createdAt"
FROM "Scan"
ORDER BY "createdAt" DESC
LIMIT 5;

# Verify data structure
\d "Scan"
```

#### 5. SEO Metadata Check
```bash
# Check robots.txt
curl https://preprod.geckoadvisor.com/robots.txt

# Check sitemap.xml
curl https://preprod.geckoadvisor.com/sitemap.xml

# Check homepage meta tags
curl https://preprod.geckoadvisor.com | grep -E '<meta|<title'

# Expected:
# <title>Gecko Advisor - Privacy Scanner</title>
# <meta name="description" content="...">
# <meta property="og:title" content="...">
```

### Success Criteria

**All Must Pass**:
- [ ] Frontend loads at https://preprod.geckoadvisor.com (200 OK)
- [ ] Backend health check passes
- [ ] Worker health check passes
- [ ] Full scan workflow completes successfully
- [ ] Report page displays correctly
- [ ] No console errors in browser DevTools
- [ ] API response time < 100ms
- [ ] Scan completion < 60 seconds
- [ ] Page load time < 3 seconds
- [ ] Database queries succeed
- [ ] Redis connectivity works
- [ ] SEO metadata present (title, description, meta tags)

### If Tests Fail

**Rollback Procedure**:
1. In Coolify UI, change branch back to `stage`
2. Change compose file back to `docker-compose.stage.yml`
3. Click **Redeploy**
4. This restores previous working state
5. Investigate errors before retrying

**Common Issues**:
- **502 Bad Gateway**: Backend not starting (check logs)
- **Database connection errors**: Check `DATABASE_URL` env var
- **Redis connection errors**: Check `REDIS_URL` env var
- **Image pull failures**: Check GHCR image exists (`:main` tag)
- **Health check failures**: Services starting too slowly (increase timeout)

---

## Phase 5: Cleanup (DO NOT EXECUTE UNTIL VERIFIED)

**CRITICAL**: Wait 24-48 hours after successful preprod deployment before deleting stage branch!

### Monitoring Period Checklist
Monitor for at least 24 hours:
- [ ] No deployment errors
- [ ] All health checks consistently passing
- [ ] Scan jobs processing successfully
- [ ] No user-reported issues
- [ ] Database and Redis stable
- [ ] No unexpected errors in logs

### When Ready to Delete Stage Branch

#### 1. Final Verification
```bash
# Ensure preprod is working
curl https://preprod.geckoadvisor.com
curl https://preprodapi.geckoadvisor.com/api/health

# Verify no active PRs targeting stage
gh pr list --base stage

# Document last stage commit (for emergency restore)
git log stage --oneline -1
# Save this commit hash: <last-stage-commit>
```

#### 2. Create Backup Branch (Optional but Recommended)
```bash
git checkout stage
git checkout -b stage-backup
git push origin stage-backup
```

#### 3. Delete Local Stage Branch
```bash
git checkout main
git branch -D stage

# Verify deletion
git branch --list stage
# Expected: (no output)
```

#### 4. Delete Remote Stage Branch
```bash
# Option A: Via git command
git push origin --delete stage

# Option B: Via GitHub UI (safer)
# 1. Go to: https://github.com/ItsAnonA/gecko-advisor/branches
# 2. Find 'stage' branch
# 3. Click trash icon
# 4. Confirm deletion

# Verify deletion
git ls-remote --heads origin stage
# Expected: (no output)

# Clean up stale references
git fetch --prune origin
```

#### 5. Update Documentation
```bash
# Search for stage references
grep -r "stage\.geckoadvisor" . --include="*.md" --exclude-dir=node_modules

# Update to preprod URLs:
# stage.geckoadvisor.com → preprod.geckoadvisor.com
# stageapi.geckoadvisor.com → preprodapi.geckoadvisor.com
# sworker.geckoadvisor.com → pworker.geckoadvisor.com

# Files to check:
# - README.md
# - CLAUDE.md
# - docs/*.md
# - .github/workflows/*.yml (comments)
```

#### 6. Update GitHub Branch Protection (if applicable)
- Go to: GitHub → Settings → Branches
- Remove branch protection rule for `stage` (if exists)
- Add branch protection rule for `preprod` (copy settings if needed)

#### 7. Create Completion Document
```bash
cat > BRANCH_MIGRATION_COMPLETE.md << 'EOF'
# Branch Migration Complete: Stage → Preprod

**Completion Date**: [DATE]
**Status**: ✅ COMPLETE

## Summary
Successfully migrated from `stage` branch to `preprod` branch.

## Changes Made
1. Created preprod branch from main (commit c034796)
2. Added docker-compose.preprod.yml configuration
3. Updated Coolify deployment ps884k084kg0wg0ocgwo4gs8
4. Tested and verified all functionality
5. Deleted stage branch after 48-hour monitoring

## New URLs
- Frontend: https://preprod.geckoadvisor.com
- Backend: https://preprodapi.geckoadvisor.com
- Worker: https://pworker.geckoadvisor.com

## Backup Information
Last stage commit: <commit-hash>
Backup branch: stage-backup (if created)

## Rollback Procedure (Emergency)
If preprod completely fails:
1. git checkout -b stage <last-stage-commit>
2. git push origin stage
3. Update Coolify: branch → stage, compose → docker-compose.stage.yml
4. Redeploy

## Next Steps
- Monitor preprod stability weekly
- Consider adding preprod to CI/CD matrix
- Set up preprod-specific image builds (optional)
EOF

git add BRANCH_MIGRATION_COMPLETE.md
git commit -m "docs: Document stage to preprod branch migration completion"
git push origin main
```

---

## Emergency Rollback (If Needed)

### Scenario: Preprod Deployment Completely Fails

**Immediate Action**:
```bash
# In Coolify UI:
# 1. Change branch: preprod → stage
# 2. Change compose file: docker-compose.preprod.yml → docker-compose.stage.yml
# 3. Click Redeploy
```

### Scenario: Stage Branch Deleted Too Early

**Restore Procedure**:
```bash
# Find last stage commit (from BRANCH_REORGANIZATION_PLAN.md)
# Last stage commit: d696888

# Recreate stage branch
git checkout -b stage d696888
git push origin stage

# Update Coolify to use stage branch
# Redeploy
```

---

## Reference Information

### Repository Details
- **Fork**: ItsAnonA/gecko-advisor
- **Upstream**: PrivacyGecko/gecko-advisor
- **Main Branch**: main
- **Preprod Branch**: preprod (NEW)
- **Stage Branch**: stage (TO BE DELETED)

### Coolify Details
- **Deployment ID**: ps884k084kg0wg0ocgwo4gs8
- **SSH Access**: potham@65.108.148.246
- **Current Domain**: preprod.geckoshare.com (or preprod.geckoadvisor.com)

### Key Commits
- **Main Latest**: c034796 (tini fix + correct package naming)
- **Preprod Created**: 188865f (added preprod configs)
- **Stage Last**: d696888 (merge from main)

### Important Files
- Configuration: `infra/docker/docker-compose.preprod.yml`
- Documentation: `BRANCH_REORGANIZATION_PLAN.md`
- This Guide: `PREPROD_NEXT_STEPS.md`

---

## Questions & Support

### Common Questions

**Q: Why not just rename stage to preprod?**
A: Git doesn't support atomic remote branch renames. Creating preprod from main ensures we start with the latest production code (including recent fixes like tini) and selectively apply only deployment-specific configs.

**Q: Why use :main image tags instead of :preprod?**
A: Simpler initial deployment. Same images as production means fewer moving parts. Can transition to preprod-specific images later when CI/CD is set up.

**Q: What if production needs urgent fixes during this migration?**
A: Production is unaffected. It uses the `main` branch and separate Coolify deployment (u8gk4kc4gw4w088kowc84ogw). Continue deploying to production normally.

**Q: Should preprod and production have identical code?**
A: Yes, except for environment-specific configurations (URLs, APP_ENV). Preprod should be a staging ground for testing production deployments.

### Getting Help

**Deployment Issues**:
- Check Coolify logs: `sudo coolify logs ps884k084kg0wg0ocgwo4gs8`
- Check Docker logs: `sudo docker logs <container-id>`
- Review: `BRANCH_REORGANIZATION_PLAN.md` troubleshooting section

**Git Issues**:
- Review: `BRANCH_REORGANIZATION_PLAN.md` rollback procedures
- Backup branch available: `stage-backup` (if created)

**Configuration Issues**:
- Compare: `docker-compose.preprod.yml` vs `docker-compose.stage.yml`
- Verify: Environment variables in Coolify UI match compose file

---

## Current Status

✅ **Phase 1**: Configuration inventory - COMPLETE
✅ **Phase 2**: Preprod branch creation - COMPLETE
⏳ **Phase 3**: Update Coolify deployment - READY TO EXECUTE
⏳ **Phase 4**: Testing & verification - PENDING
⏳ **Phase 5**: Cleanup & finalization - PENDING (wait 24-48 hours)

**Next Action**: Update Coolify deployment configuration (see Phase 3 above)

---

*Generated: 2025-11-03*
*Last Updated: 2025-11-03*
