# Branch Reorganization Execution Plan
## Stage → Preprod Migration

**Date**: 2025-11-03
**Repository**: ItsAnonA/gecko-advisor
**Status**: Ready for execution
**Risk Level**: Medium (production unaffected, stage downtime acceptable)

---

## Executive Summary

This plan reorganizes git branches to align with deployment environments by:
1. Creating `preprod` branch from latest `main` (commit c034796 with tini fix)
2. Migrating stage-specific configurations from `stage` to `preprod`
3. Updating Coolify deployment to use `preprod` branch
4. Testing and validating preprod environment
5. Safely deleting obsolete `stage` branch

---

## Phase 1: Configuration Inventory (COMPLETED)

### Critical Finding: Stage Branch Analysis

**Branch Status**:
- `stage` branch: 61 files changed, +18,586/-2,689 lines from `main`
- Most changes: Documentation files in `assets/docs/` (NOT deployment-critical)
- Critical configs: 5 files requiring preservation

### Stage-Specific Configurations to Preserve

#### 1. Docker Compose Configuration ✅ CRITICAL
**File**: `infra/docker/docker-compose.stage.yml` (NEW FILE in stage branch)

**Key Features**:
- Service name: `privacy-advisor-stage`
- Environment: `APP_ENV=stage`
- Image references: `ghcr.io/${GITHUB_REPOSITORY_OWNER:-itsanona}/gecko-advisor-*:main`
- URLs:
  - Frontend: `https://stage.geckoadvisor.com`
  - Backend: `https://stageapi.geckoadvisor.com`
  - Worker: `https://sworker.geckoadvisor.com`
- Critical feature: `BACKEND_PROXY_URL=http://backend:5000` (avoids Cloudflare SSL issues)

**Action**: Copy to preprod, update `APP_ENV=stage` → `APP_ENV=preprod`

#### 2. Frontend Dependencies ✅ IMPORTANT
**File**: `apps/frontend/package.json`

**Change**: Added `react-helmet-async: ^2.0.5` for SEO support

**Action**: Cherry-pick this addition to preprod

#### 3. Frontend Application Entry ✅ IMPORTANT
**File**: `apps/frontend/src/main.tsx`

**Change**: Wrapped app in `<HelmetProvider>` for SEO metadata

**Action**: Cherry-pick this change to preprod

#### 4. Docker Ignore Configuration ⚠️ MINOR
**File**: `.gitignore`

**Change**: Removed ignore rules for stage docker-compose files (now tracked in repo)

**Action**: Apply to preprod (allows tracking of preprod docker-compose)

#### 5. Backend Dockerfile ❌ REGRESSION (DO NOT PRESERVE)
**File**: `infra/docker/Dockerfile.backend`

**Issues Found**:
- Line 7: `@privacy-advisor/backend...` (OLD NAMING - WRONG!)
- Line 9: Missing `tini` package (REGRESSION from main)

**Action**: DO NOT copy from stage. Use main version (correct naming + tini fix)

### Non-Critical Differences

#### Documentation Files (18,000+ lines)
- `assets/docs/**/*.md` - Historical project docs, not deployment-critical
- `docs/GIT_HOOKS_*.md` - Removed in main, old in stage
- `scripts/install-git-hooks.sh` - Removed in main, old in stage

**Action**: IGNORE - These are outdated documentation, not configurations

#### Lockfile Drift
- `pnpm-lock.yaml` - Minor dependency version differences

**Action**: Regenerate after applying package.json changes

---

## Phase 2: Preprod Branch Creation

### Step 2.1: Create Feature Branch for Safety
```bash
# Create feature branch for preprod preparation (allows review before finalizing)
git checkout -b feature/create-preprod-branch

# Verify starting from latest main
git log --oneline -1
# Expected: c034796 (fix(docker): Add tini init system and fix package naming)
```

### Step 2.2: Create Preprod Branch from Main
```bash
# Create preprod branch from current main
git checkout -b preprod main

# Verify branch created
git branch --list preprod
git log --oneline -1
```

**Expected State**: Preprod now has:
- ✅ Latest tini fix (c034796)
- ✅ Correct package naming (`@gecko-advisor/*`)
- ✅ All production-ready code
- ❌ Missing stage configs (to be added next)

### Step 2.3: Cherry-Pick Stage Configurations

#### Option A: Manual File Creation (RECOMMENDED - More Control)

```bash
# Still on preprod branch

# 1. Create preprod docker-compose (from stage version with modifications)
cat > infra/docker/docker-compose.preprod.yml << 'EOF'
name: gecko-advisor-preprod
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: privacy
    volumes:
      - privacy-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7
    volumes:
      - privacy-redis:/data
    restart: unless-stopped

  backend:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:-itsanona}/gecko-advisor-backend:preprod
    pull_policy: always
    environment:
      NODE_ENV: production
      APP_ENV: preprod
      DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:postgres@db:5432/privacy}
      REDIS_URL: ${REDIS_URL:-redis://redis:6379}
      ADMIN_API_KEY: ${ADMIN_API_KEY:?Set preprod ADMIN_API_KEY}
      BASE_URL: ${BASE_URL:-https://preprod.geckoadvisor.com}
      BACKEND_PUBLIC_URL: ${BACKEND_PUBLIC_URL:-https://preprodapi.geckoadvisor.com}
      FRONTEND_PUBLIC_URL: ${FRONTEND_PUBLIC_URL:-https://preprod.geckoadvisor.com}
      BACKEND_PORT: ${BACKEND_PORT:-5000}
    expose:
      - "5000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:5000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))\" "]
      interval: 10s
      timeout: 5s
      retries: 5

  worker:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:-itsanona}/gecko-advisor-worker:preprod
    pull_policy: always
    environment:
      NODE_ENV: production
      APP_ENV: preprod
      DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:postgres@db:5432/privacy}
      REDIS_URL: ${REDIS_URL:-redis://redis:6379}
      WORKER_PUBLIC_URL: ${WORKER_PUBLIC_URL:-https://pworker.geckoadvisor.com}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "node -e \"require('http').get('http://localhost:5050/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))\" "]
      interval: 10s
      timeout: 5s
      retries: 5

  frontend:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:-itsanona}/gecko-advisor-frontend:preprod
    pull_policy: always
    environment:
      APP_ENV: preprod
      FRONTEND_PUBLIC_URL: ${FRONTEND_PUBLIC_URL:-https://preprod.geckoadvisor.com}
      BACKEND_PUBLIC_URL: ${BACKEND_PUBLIC_URL:-https://preprodapi.geckoadvisor.com}

      # Backend Proxy URL for internal Docker networking
      # Use http://backend:5000 for Coolify deployments where frontend and backend are on same network
      # This avoids Cloudflare SSL handshake issues when using external domains
      BACKEND_PROXY_URL: ${BACKEND_PROXY_URL:-http://backend:5000}

      CSP: ${CSP:-}
    depends_on:
      backend:
        condition: service_started
    expose:
      - "80"
    restart: unless-stopped

volumes:
  privacy-postgres:
  privacy-redis:
EOF

# 2. Add react-helmet-async to frontend package.json
# (Will be done via pnpm command to ensure proper lockfile update)
cd apps/frontend
pnpm add react-helmet-async@^2.0.5
cd ../..

# 3. Update gitignore to allow preprod docker-compose tracking
git diff .gitignore
# If .gitignore still has stage references, update it:
# Remove these lines if they exist:
#   infra/docker/docker-compose.stage.yml
#   infra/docker/docker-compose.stage.ghcr.yml
```

#### Option B: Cherry-Pick from Stage (Alternative)

```bash
# Find the commit that added stage configs
git log stage --oneline --all -- infra/docker/docker-compose.stage.yml | head -1

# Cherry-pick specific files (if you prefer this approach)
# Note: This is riskier due to potential conflicts
```

### Step 2.4: Apply Frontend HelmetProvider Change

```bash
# Edit apps/frontend/src/main.tsx
# Add import at top:
#   import { HelmetProvider } from 'react-helmet-async';
# Wrap <React.StrictMode> content with <HelmetProvider>

# Use the Edit tool for this (see implementation section below)
```

### Step 2.5: Update GitHub Actions for Preprod

```bash
# Check if any workflows reference 'stage' branch explicitly
grep -r "stage" .github/workflows/ | grep -v "E2E_TARGET_ENV"

# If found, update to reference 'preprod' instead
# Note: Most references are to E2E_TARGET_ENV variable, not branch names
```

### Step 2.6: Commit and Push Preprod Branch

```bash
# Stage all changes
git add .

# Commit with clear message
git commit -m "feat: Create preprod branch with stage environment configs

- Add docker-compose.preprod.yml for preprod environment
- Update frontend to use react-helmet-async for SEO
- Wrap app in HelmetProvider
- Configure preprod URLs:
  - Frontend: https://preprod.geckoadvisor.com
  - Backend: https://preprodapi.geckoadvisor.com
  - Worker: https://pworker.geckoadvisor.com
- Set APP_ENV=preprod for all services
- Preserve BACKEND_PROXY_URL for Docker networking

Replaces deprecated 'stage' branch with properly named 'preprod'.

Related: Branch reorganization for deployment alignment"

# Push to remote
git push -u origin preprod
```

**Verification Checkpoint**:
```bash
# Verify preprod branch exists remotely
git ls-remote --heads origin preprod

# Expected output:
# <commit-hash>    refs/heads/preprod
```

---

## Phase 3: Coolify Deployment Update

### Step 3.1: Access Coolify Dashboard

**URL**: https://coolify.yourdomain.com (or Coolify installation URL)
**Deployment ID**: ps884k084kg0wg0ocgwo4gs8 (current staging)

### Step 3.2: Update Git Configuration

**In Coolify UI**:
1. Navigate to deployment `ps884k084kg0wg0ocgwo4gs8`
2. Go to **Git Source** or **Repository** section
3. Update **Branch** field:
   - FROM: `stage`
   - TO: `preprod`
4. Save changes

### Step 3.3: Update Environment Variables (if using APP_ENV)

**In Coolify UI → Environment Variables**:
1. Check if `APP_ENV` is explicitly set
2. If set to `stage`, update to `preprod`
3. If not set, it should inherit from docker-compose (no action needed)

### Step 3.4: Update Docker Compose File Path

**In Coolify UI → Docker Compose Settings**:
1. Update compose file path:
   - FROM: `infra/docker/docker-compose.stage.yml`
   - TO: `infra/docker/docker-compose.preprod.yml`
2. Save changes

### Step 3.5: Update GitHub Container Registry (GHCR) Image Tags

**Critical**: Coolify currently pulls images tagged `main` for stage environment.

**Two Options**:

#### Option A: Change Coolify to Pull Preprod Images (RECOMMENDED)
```bash
# In docker-compose.preprod.yml, images are already set to:
# ghcr.io/${GITHUB_REPOSITORY_OWNER}/gecko-advisor-backend:preprod
# ghcr.io/${GITHUB_REPOSITORY_OWNER}/gecko-advisor-frontend:preprod
# ghcr.io/${GITHUB_REPOSITORY_OWNER}/gecko-advisor-worker:preprod

# Ensure GitHub Actions builds and pushes images tagged 'preprod'
# Check .github/workflows/docker-publish.yml
```

#### Option B: Keep Using Main Images for Preprod (SIMPLER - INITIALLY)
```bash
# Edit docker-compose.preprod.yml to use :main tags:
# ghcr.io/${GITHUB_REPOSITORY_OWNER}/gecko-advisor-backend:main
# ghcr.io/${GITHUB_REPOSITORY_OWNER}/gecko-advisor-frontend:main
# ghcr.io/${GITHUB_REPOSITORY_OWNER}/gecko-advisor-worker:main

# This allows preprod to use same images as production initially
# Later, can set up separate preprod image builds
```

**Recommendation**: Use Option B initially for faster deployment, then add preprod-specific image builds later.

### Step 3.6: Trigger Deployment

**In Coolify UI**:
1. Click **Deploy** or **Redeploy** button
2. Monitor deployment logs
3. Watch for:
   - ✅ Git clone from `preprod` branch
   - ✅ Docker Compose file found
   - ✅ Images pulled successfully
   - ✅ Services starting
   - ✅ Health checks passing

**SSH Access** (if needed):
```bash
ssh potham@65.108.148.246

# Check Coolify deployment logs
sudo coolify logs ps884k084kg0wg0ocgwo4gs8

# Check Docker containers
sudo docker ps | grep gecko-advisor

# Check service health
sudo docker exec <backend-container-id> curl -f http://localhost:5000/api/health
```

---

## Phase 4: Testing & Verification

### Step 4.1: Verify Branch Configuration
```bash
# On your local machine
git fetch origin
git checkout preprod
git log --oneline -5

# Verify contains:
# 1. Latest main commit (c034796 - tini fix)
# 2. New commit with preprod configs
```

### Step 4.2: Verify Docker Compose File
```bash
# Check file exists
ls -la infra/docker/docker-compose.preprod.yml

# Verify critical configs
grep "APP_ENV: preprod" infra/docker/docker-compose.preprod.yml
grep "privacy-advisor-preprod" infra/docker/docker-compose.preprod.yml
grep "BACKEND_PROXY_URL" infra/docker/docker-compose.preprod.yml
```

### Step 4.3: Verify Deployment URLs

**Frontend**: https://preprod.geckoadvisor.com
```bash
curl -I https://preprod.geckoadvisor.com
# Expected: 200 OK, HTML content type
```

**Backend API**: https://preprodapi.geckoadvisor.com/api/health
```bash
curl https://preprodapi.geckoadvisor.com/api/health
# Expected: {"status":"healthy","timestamp":"...","db":true,"redis":true}
```

**Worker Health**: https://pworker.geckoadvisor.com/health
```bash
curl https://pworker.geckoadvisor.com/health
# Expected: {"status":"healthy","timestamp":"..."}
```

### Step 4.4: Functional Testing

**Test Scan Workflow**:
1. Visit https://preprod.geckoadvisor.com
2. Enter test URL (e.g., https://example.com)
3. Click "Scan Website"
4. Wait for scan completion (<60 seconds)
5. Verify report page loads
6. Check scan score displayed correctly
7. Verify evidence and recommendations shown

**Check Console Errors**:
- Open browser DevTools (F12)
- Look for JavaScript errors (should be none)
- Check Network tab for failed requests (should be none)

**Test Database Persistence**:
```bash
# SSH into server
ssh potham@65.108.148.246

# Connect to preprod database
sudo docker exec -it <postgres-container-id> psql -U postgres -d privacy

# Query recent scans
SELECT id, url, status, score, "createdAt" FROM "Scan" ORDER BY "createdAt" DESC LIMIT 5;

# Verify data is persisting
```

### Step 4.5: Performance Validation

**API Response Time**:
```bash
curl -w "@-" -o /dev/null -s https://preprodapi.geckoadvisor.com/api/health <<< "
  time_namelookup:  %{time_namelookup}s\n
  time_connect:     %{time_connect}s\n
  time_appconnect:  %{time_appconnect}s\n
  time_total:       %{time_total}s\n"

# Expected: time_total < 0.1s (100ms)
```

**Page Load Time**:
- Use browser DevTools Network tab
- Hard refresh homepage (Cmd+Shift+R)
- Check LCP (Largest Contentful Paint) < 2.5s

### Step 4.6: Environment Variable Verification

**Check APP_ENV is set correctly**:
```bash
# SSH into server
ssh potham@65.108.148.246

# Check backend container
sudo docker exec <backend-container-id> env | grep APP_ENV
# Expected: APP_ENV=preprod

# Check worker container
sudo docker exec <worker-container-id> env | grep APP_ENV
# Expected: APP_ENV=preprod

# Check frontend container
sudo docker exec <frontend-container-id> env | grep APP_ENV
# Expected: APP_ENV=preprod
```

### Step 4.7: SEO Metadata Verification

**Check react-helmet-async working**:
```bash
# Fetch homepage and check meta tags
curl https://preprod.geckoadvisor.com | grep -E '<meta|<title'

# Expected tags:
# <title>Gecko Advisor - Privacy Scanner</title>
# <meta name="description" content="...">
# <meta property="og:title" content="...">
```

---

## Phase 5: Cleanup & Finalization

### Step 5.1: Verify Preprod Stability (Wait 24-48 Hours)

**Monitoring Checklist**:
- [ ] No deployment errors in Coolify logs
- [ ] All health checks passing
- [ ] No database connection errors
- [ ] No Redis connection errors
- [ ] Scan jobs processing successfully
- [ ] No user-reported issues

**How to Monitor**:
```bash
# Check Coolify logs daily
ssh potham@65.108.148.246
sudo coolify logs ps884k084kg0wg0ocgwo4gs8 | tail -100

# Check Docker container status
sudo docker ps --filter "name=gecko-advisor"
# All containers should show "Up X hours" with "(healthy)" status

# Check application logs
sudo docker logs <backend-container-id> --tail 50
sudo docker logs <worker-container-id> --tail 50
```

### Step 5.2: Update Documentation References

**Files to Update** (search for "stage" references):
```bash
# Search for stage references in docs
grep -r "stage\.geckoadvisor" . --include="*.md" --exclude-dir=node_modules

# Update to preprod URLs:
# stage.geckoadvisor.com → preprod.geckoadvisor.com
# stageapi.geckoadvisor.com → preprodapi.geckoadvisor.com
# sworker.geckoadvisor.com → pworker.geckoadvisor.com
```

**Key Documentation Files**:
- `README.md` (if it mentions stage environment)
- `CLAUDE.md` (update deployment section)
- `docs/DEPLOYMENT.md` (if exists)
- `.github/workflows/*.yml` (update comments)

### Step 5.3: Delete Stage Branch Locally

```bash
# Ensure you're on main or preprod branch
git checkout main

# Delete local stage branch
git branch -D stage

# Verify deletion
git branch --list stage
# Expected: (no output)
```

### Step 5.4: Delete Stage Branch from Remote

**Option A: Via Git Command (Immediate)**
```bash
# Delete from origin (your fork)
git push origin --delete stage

# Verify deletion
git ls-remote --heads origin stage
# Expected: (no output)

# Clean up stale remote references locally
git fetch --prune origin
```

**Option B: Via GitHub UI (Safer)**
1. Go to https://github.com/ItsAnonA/gecko-advisor/branches
2. Find `stage` branch
3. Click trash icon to delete
4. Confirm deletion

**Warning**: DO NOT delete from upstream (PrivacyGecko/gecko-advisor) unless you have permission!

### Step 5.5: Update GitHub Branch Protection Rules

**If branch protection rules exist for `stage`**:
1. Go to GitHub → Settings → Branches
2. Remove branch protection rule for `stage`
3. Add branch protection rule for `preprod` (copy settings from `stage` if needed)

### Step 5.6: Update PRs Targeting Stage Branch

```bash
# Check if any open PRs target stage branch
gh pr list --base stage

# If found, update base branch to preprod or main:
gh pr edit <PR-number> --base preprod
```

### Step 5.7: Create Migration Summary Document

```bash
# Document what was done
cat > BRANCH_MIGRATION_COMPLETE.md << 'EOF'
# Branch Migration Complete: Stage → Preprod

**Date**: 2025-11-03
**Status**: ✅ COMPLETE

## Changes Made

1. **Created preprod branch** from main (commit c034796)
2. **Migrated configurations**:
   - docker-compose.preprod.yml (APP_ENV=preprod)
   - react-helmet-async for SEO
   - HelmetProvider in main.tsx
3. **Updated Coolify deployment** ps884k084kg0wg0ocgwo4gs8
   - Branch: stage → preprod
   - Compose file: docker-compose.stage.yml → docker-compose.preprod.yml
4. **Tested and verified**:
   - Frontend: https://preprod.geckoadvisor.com ✅
   - Backend: https://preprodapi.geckoadvisor.com ✅
   - Worker: https://pworker.geckoadvisor.com ✅
5. **Deleted stage branch**:
   - Local: ✅
   - Remote (origin): ✅

## URLs Updated

- Frontend: stage.geckoadvisor.com → preprod.geckoadvisor.com
- Backend: stageapi.geckoadvisor.com → preprodapi.geckoadvisor.com
- Worker: sworker.geckoadvisor.com → pworker.geckoadvisor.com

## Rollback Procedure

If preprod fails and stage needs to be restored:

1. Recreate stage branch from backup:
   ```bash
   git checkout -b stage <last-stage-commit-hash>
   git push origin stage
   ```

2. Revert Coolify configuration:
   - Branch: preprod → stage
   - Compose file: docker-compose.preprod.yml → docker-compose.stage.yml

3. Redeploy in Coolify

## Next Steps

- Monitor preprod stability for 7 days
- Update all documentation references
- Set up preprod-specific CI/CD builds (optional)
- Consider adding preprod to E2E test matrix
EOF

git add BRANCH_MIGRATION_COMPLETE.md
git commit -m "docs: Document stage to preprod branch migration"
git push origin main
```

---

## Rollback Procedures

### Scenario 1: Preprod Branch Creation Failed

**Symptoms**: Git errors during branch creation or push

**Rollback**:
```bash
# Delete local preprod branch
git checkout main
git branch -D preprod

# If pushed to remote, delete there too
git push origin --delete preprod

# Re-execute Phase 2 after investigating error
```

**Prevention**: Create feature branch first for testing

### Scenario 2: Coolify Deployment Failed

**Symptoms**: Services not starting, health checks failing

**Immediate Action**:
```bash
# Revert Coolify to stage branch
# In Coolify UI: Change branch back to 'stage'
# In Coolify UI: Change compose file to 'docker-compose.stage.yml'
# Click Redeploy

# This restores previous working state
```

**Investigation**:
```bash
# SSH into server
ssh potham@65.108.148.246

# Check Docker logs
sudo docker logs <container-id>

# Common issues:
# 1. Missing environment variables
# 2. Database connection errors
# 3. Image pull failures
# 4. Port conflicts
```

**Resolution**:
- Fix issues in preprod branch
- Push fixes
- Retry Coolify deployment

### Scenario 3: Preprod Functional Issues

**Symptoms**: Site loads but features broken (scans failing, reports not loading)

**Immediate Action**:
```bash
# Revert Coolify to stage branch (same as Scenario 2)
```

**Investigation**:
```bash
# Check backend logs for errors
sudo docker logs <backend-container-id> --tail 100 | grep ERROR

# Check worker logs for job processing errors
sudo docker logs <worker-container-id> --tail 100 | grep ERROR

# Check database for data integrity
sudo docker exec -it <postgres-container-id> psql -U postgres -d privacy
SELECT * FROM "Scan" ORDER BY "createdAt" DESC LIMIT 1;
```

**Common Issues**:
- `APP_ENV` not set correctly (breaks environment-specific logic)
- Missing environment variables (ADMIN_API_KEY, etc.)
- Database migration issues (unlikely if using same schema)

### Scenario 4: Need to Restore Deleted Stage Branch

**When**: After deleting stage, need to restore it

**Procedure**:
```bash
# Find last commit of stage branch
git reflog | grep "checkout: moving from stage"
# Or check GitHub before deletion

# Recreate stage branch
git checkout -b stage <commit-hash>
git push origin stage

# Verify recreation
git log stage --oneline -5
```

**Prevention**: Take note of stage branch commit hash BEFORE deletion

---

## Success Criteria

### Technical Success
- [ ] Preprod branch exists in remote repository
- [ ] docker-compose.preprod.yml contains correct configs
- [ ] Coolify deployment using preprod branch
- [ ] All services running and healthy
- [ ] Health checks passing (backend, worker)
- [ ] Database and Redis connected
- [ ] Environment variables set correctly (APP_ENV=preprod)

### Functional Success
- [ ] Frontend loads at https://preprod.geckoadvisor.com
- [ ] Backend API responds at https://preprodapi.geckoadvisor.com/api/health
- [ ] Worker health check passes
- [ ] Full scan workflow completes successfully
- [ ] Report pages load correctly
- [ ] SEO metadata present (react-helmet-async working)
- [ ] No console errors in browser

### Performance Success
- [ ] API response time < 100ms
- [ ] Page load time < 3 seconds
- [ ] Scan completion < 60 seconds
- [ ] No degradation from previous stage performance

### Cleanup Success
- [ ] Stage branch deleted locally
- [ ] Stage branch deleted from remote (origin)
- [ ] Documentation updated (stage → preprod references)
- [ ] No open PRs targeting stage branch
- [ ] Migration documented in BRANCH_MIGRATION_COMPLETE.md

---

## Risk Assessment

### High Risk Items
1. **Database Credentials**: Incorrect DATABASE_URL breaks entire stack
   - **Mitigation**: Keep stage configs as reference, copy exact values

2. **Image Tag Mismatch**: Pulling non-existent preprod images
   - **Mitigation**: Initially use :main tags, transition to :preprod later

### Medium Risk Items
3. **Coolify Configuration Error**: Wrong branch or compose file
   - **Mitigation**: Document exact Coolify steps, screenshot before changes

4. **Environment Variable Typos**: APP_ENV=prepod instead of preprod
   - **Mitigation**: Double-check all env vars before deployment

### Low Risk Items
5. **Documentation Staleness**: Old docs still reference stage
   - **Mitigation**: Comprehensive grep search before completion

6. **Developer Confusion**: Team members pulling stage branch
   - **Mitigation**: Announce migration in team channels

---

## Timeline Estimate

- **Phase 1** (Analysis): ✅ COMPLETED (1 hour)
- **Phase 2** (Branch Creation): 30-45 minutes
- **Phase 3** (Coolify Update): 15-20 minutes
- **Phase 4** (Testing): 30-45 minutes
- **Phase 5** (Cleanup): 15-20 minutes
- **Total**: ~2-2.5 hours (excluding monitoring period)

**Note**: Add 24-48 hours monitoring period before final stage branch deletion.

---

## Communication Plan

### Before Execution
- [ ] Notify team of upcoming migration
- [ ] Schedule maintenance window (preprod downtime acceptable)
- [ ] Backup current Coolify configuration

### During Execution
- [ ] Update team when preprod branch created
- [ ] Notify when Coolify deployment starts
- [ ] Share preprod URL for testing

### After Execution
- [ ] Announce completion and new preprod URL
- [ ] Request team test preprod environment
- [ ] Document any issues encountered

---

## Implementation Commands Summary

```bash
# Phase 2: Create Preprod Branch
git checkout -b preprod main
# (Create docker-compose.preprod.yml manually)
cd apps/frontend && pnpm add react-helmet-async@^2.0.5 && cd ../..
# (Edit apps/frontend/src/main.tsx - add HelmetProvider)
git add .
git commit -m "feat: Create preprod branch with stage environment configs"
git push -u origin preprod

# Phase 3: Update Coolify
# (UI-based - see detailed steps above)

# Phase 4: Verify Deployment
curl -I https://preprod.geckoadvisor.com
curl https://preprodapi.geckoadvisor.com/api/health
ssh potham@65.108.148.246 "sudo docker ps | grep gecko-advisor"

# Phase 5: Cleanup
git checkout main
git branch -D stage
git push origin --delete stage
git fetch --prune origin
```

---

## Appendix A: Stage Branch Commit Hash

**Last Stage Commit**: d696888 (Merge changes from main to stage)
**Stage Branch Parent**: b0039b4 (Merge PR #18)

**Backup Command** (if needed later):
```bash
git checkout -b stage-backup d696888
git push origin stage-backup
```

---

## Appendix B: Environment Variable Reference

### Preprod Environment Variables (docker-compose.preprod.yml)

**Backend**:
- `NODE_ENV=production`
- `APP_ENV=preprod`
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/privacy` (default)
- `REDIS_URL=redis://redis:6379` (default)
- `ADMIN_API_KEY=<set in Coolify>`
- `BASE_URL=https://preprod.geckoadvisor.com`
- `BACKEND_PUBLIC_URL=https://preprodapi.geckoadvisor.com`
- `FRONTEND_PUBLIC_URL=https://preprod.geckoadvisor.com`
- `BACKEND_PORT=5000`

**Worker**:
- `NODE_ENV=production`
- `APP_ENV=preprod`
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/privacy` (default)
- `REDIS_URL=redis://redis:6379` (default)
- `WORKER_PUBLIC_URL=https://pworker.geckoadvisor.com`

**Frontend**:
- `APP_ENV=preprod`
- `FRONTEND_PUBLIC_URL=https://preprod.geckoadvisor.com`
- `BACKEND_PUBLIC_URL=https://preprodapi.geckoadvisor.com`
- `BACKEND_PROXY_URL=http://backend:5000` (critical for Docker networking)
- `CSP=<optional>`

---

## Appendix C: Critical File Diffs

### docker-compose.preprod.yml vs docker-compose.stage.yml

**Key Differences**:
1. `name: privacy-advisor-stage` → `name: gecko-advisor-preprod`
2. `APP_ENV: stage` → `APP_ENV: preprod`
3. Image tags: `:main` → `:preprod` (or keep :main initially)
4. URLs updated:
   - `stage.geckoadvisor.com` → `preprod.geckoadvisor.com`
   - `stageapi.geckoadvisor.com` → `preprodapi.geckoadvisor.com`
   - `sworker.geckoadvisor.com` → `pworker.geckoadvisor.com`

**Identical Elements** (preserved):
- Database configuration (Postgres 16)
- Redis configuration
- Health checks
- Restart policies
- Volume mappings
- `BACKEND_PROXY_URL` (critical for Coolify)

---

## Questions & Answers

### Q1: Why not just rename stage to preprod?
**A**: Git doesn't support atomic branch renames on remote. Creating new preprod branch from main ensures we start with latest production code (including recent tini fix) and selectively apply only stage-specific configs.

### Q2: What if preprod and stage need to coexist temporarily?
**A**: Keep stage branch until preprod is fully verified (24-48 hours). Only delete stage after confirming preprod stability.

### Q3: Do we need separate preprod Docker images?
**A**: Not initially. Using `:main` images for preprod is fine. Later, can add GitHub Actions to build `:preprod` images on push to preprod branch.

### Q4: Will production be affected?
**A**: No. Production uses `main` branch and separate Coolify deployment (u8gk4kc4gw4w088kowc84ogw). This migration only affects staging/preprod environment.

### Q5: What about the documentation files difference?
**A**: The 18,000+ lines of docs in stage branch are mostly outdated. Main branch has correct, up-to-date docs. We're NOT migrating old docs from stage.

---

## Conclusion

This plan provides a safe, methodical approach to reorganizing git branches with minimal risk to production. The preprod environment will have:

- ✅ Latest production code from main
- ✅ Stage-specific deployment configurations
- ✅ Correct naming conventions (preprod, not stage)
- ✅ Clear rollback procedures
- ✅ Comprehensive testing checklist

**Next Action**: Begin Phase 2 - Create preprod branch and apply configurations.
