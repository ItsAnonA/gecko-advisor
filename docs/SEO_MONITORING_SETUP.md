# SEO Monitoring Setup Guide

This guide explains how to set up and use the SEO monitoring tools for Gecko Advisor.

## Overview

The monitoring system provides two main capabilities:

1. **Google Search Console (GSC) Integration** - Track organic search performance
2. **SEO Health Endpoint** - Monitor technical SEO health automatically

---

## 1. Google Search Console Integration

### Prerequisites

1. **Install googleapis package**:
   ```bash
   pnpm add googleapis
   ```

2. **Create a Google Cloud Service Account**:

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)

   b. Create a new project (or select existing)

   c. Enable the **Google Search Console API**:
      - Navigate to "APIs & Services" > "Library"
      - Search for "Google Search Console API"
      - Click "Enable"

   d. Create a service account:
      - Navigate to "APIs & Services" > "Credentials"
      - Click "Create Credentials" > "Service Account"
      - Name: `gecko-advisor-gsc-readonly`
      - Role: No role needed (API access only)
      - Click "Done"

   e. Create a JSON key:
      - Click on the created service account
      - Go to "Keys" tab
      - Click "Add Key" > "Create new key"
      - Choose "JSON"
      - Download the key file

3. **Add service account to Google Search Console**:

   a. Go to [Google Search Console](https://search.google.com/search-console)

   b. Select your property (`https://geckoadvisor.com`)

   c. Go to "Settings" > "Users and permissions"

   d. Click "Add user"

   e. Enter the service account email (found in the JSON key file, looks like: `gecko-advisor-gsc-readonly@your-project.iam.gserviceaccount.com`)

   f. Permission level: **Owner** or **Full** (required for Search Analytics API)

   g. Click "Add"

4. **Save the service account key**:
   ```bash
   # Save to this exact location (it's gitignored):
   cp ~/Downloads/your-service-account-key.json scripts/gsc-service-account.json
   ```

### Usage

Once set up, you can pull GSC metrics:

```bash
# Last 28 days overview
pnpm gsc:metrics

# Custom time period
pnpm gsc:metrics --days 7

# Top 100 queries driving traffic
pnpm gsc:queries

# Top 100 pages by impressions
pnpm gsc:pages
```

### Example Output

```
🔍 Fetching Google Search Console metrics...

📊 Summary (Last 28 days):
  Total Clicks:      1,234
  Total Impressions: 45,678
  Average CTR:       2.70%
  Average Position:  12.3

✅ Metrics fetched successfully!
```

---

## 2. SEO Health Endpoint

The `/api/seo` endpoint provides real-time SEO health monitoring.

### Access

```bash
# Production
curl https://geckoadvisor.com/api/seo

# Local development
curl http://localhost:5000/api/seo
```

### What It Monitors

1. **Cache Coverage** (Target: >95%)
   - Checks how many indexed domains are cached
   - Validates cache pre-warming effectiveness
   - **Pass**: ≥95% coverage
   - **Warn**: 80-95% coverage
   - **Fail**: <80% coverage

2. **Bot Request Success** (Target: 100%)
   - Samples 10 random indexed domains
   - Verifies cached HTML exists
   - Simulates Googlebot requests
   - **Pass**: 100% success
   - **Warn**: 80-99% success
   - **Fail**: <80% success

3. **Index Quality** (Target: 0 violations)
   - Checks for domains with score < 40 in sitemap
   - Validates Phase 2 quality gating
   - **Pass**: 0 low-score domains indexed
   - **Fail**: Found indexed domains with score < 40

4. **301 Redirects** (Status: Active)
   - Confirms `/privacy-policy/` → `/privacy-report/` redirects are active
   - Should remain active until Jan 2027 (1 year after migration)

### Example Response

```json
{
  "status": "healthy",
  "timestamp": "2025-12-27T12:00:00.000Z",
  "responseTime": 234,
  "checks": {
    "cacheCoverage": {
      "status": "pass",
      "value": "97.8%",
      "details": {
        "cached": 52507,
        "indexed": 53682,
        "missing": 1175
      },
      "threshold": ">95%",
      "recommendation": "Cache coverage is healthy"
    },
    "botRequests": {
      "status": "pass",
      "value": "100%",
      "details": {
        "passed": 10,
        "failed": 0,
        "sample": 10,
        "failures": []
      },
      "threshold": "100%",
      "recommendation": "All sampled bot requests successful"
    },
    "indexQuality": {
      "status": "pass",
      "value": "Clean",
      "details": {
        "lowScoreDomains": 0,
        "minScoreThreshold": 40
      },
      "threshold": "0 low-score domains",
      "recommendation": "No low-quality pages in index"
    },
    "redirects": {
      "status": "active",
      "value": "301 redirects enabled",
      "details": {
        "from": "/privacy-policy/:domain",
        "to": "/privacy-report/:domain",
        "active": true
      },
      "recommendation": "Keep active for at least 1 year (until Jan 2027)"
    }
  },
  "summary": {
    "healthy": true,
    "needsAttention": false,
    "critical": false,
    "totalChecks": 4,
    "passed": 4,
    "warnings": 0,
    "failures": 0
  }
}
```

### Status Levels

- **healthy**: All checks passing (status: 200)
- **degraded**: Some warnings (status: 200)
- **critical**: Some failures (status: 200)
- **error**: Service unavailable (status: 503)

---

## 3. Monitoring Workflow

### Daily Checks (Manual)

```bash
# Check SEO health
curl https://geckoadvisor.com/api/seo | jq .

# If cache coverage is low (<95%):
pnpm prewarm:cache --force
```

### Weekly Reviews (Manual)

```bash
# Pull GSC metrics for the week
pnpm gsc:metrics --days 7 --queries --pages

# Review:
# - Are impressions/clicks increasing?
# - Which queries drive most traffic?
# - Are high-quality pages ranking well?
```

### Monthly Analysis

1. **Review Google Search Console** (web interface):
   - Index coverage changes
   - Core Web Vitals
   - Rich results performance
   - Mobile usability

2. **Check Phase 2 impact**:
   - Compare metrics pre/post deployment
   - Verify low-score pages de-indexed
   - Check if priority/changefreq improved crawling

3. **Validate structured data**:
   - Use [Google Rich Results Test](https://search.google.com/test/rich-results)
   - Check for Review schema stars in SERPs
   - Verify breadcrumb navigation

---

## 4. Alerting (Future Enhancement)

For automated alerting, you can:

1. **Set up cron job** to check `/api/seo`:
   ```bash
   # Add to crontab
   0 */6 * * * curl https://geckoadvisor.com/api/seo | jq -r 'if .status != "healthy" then "SEO Alert: " + .status else empty end' | mail -s "SEO Health Alert" admin@example.com
   ```

2. **Use uptime monitoring** (Pingdom, UptimeRobot):
   - Monitor `/api/seo` endpoint
   - Alert on 503 responses
   - Alert on status != "healthy"

3. **Integrate with Slack/Discord**:
   - Use webhook to send daily SEO health summary
   - Alert on degraded/critical status

---

## 5. Troubleshooting

### GSC Metrics Script Fails

**Error**: `Service account key not found`
```bash
# Check if file exists
ls -la scripts/gsc-service-account.json

# Verify it's valid JSON
cat scripts/gsc-service-account.json | jq .
```

**Error**: `Permission denied`
```bash
# Verify service account email is added to GSC
# Go to GSC > Settings > Users and permissions
# Check if service account email is listed
```

### SEO Health Endpoint Issues

**Cache coverage is low (<80%)**:
```bash
# Run cache pre-warming
pnpm prewarm:cache --force

# Monitor progress
watch -n 5 'curl -s https://geckoadvisor.com/api/seo | jq .checks.cacheCoverage'
```

**Bot requests failing**:
```bash
# Check failed domains
curl -s https://geckoadvisor.com/api/seo | jq .checks.botRequests.details.failures

# Manually test one
curl -H "User-Agent: Googlebot/2.1" https://geckoadvisor.com/privacy-report/example.com
```

**Index quality violations**:
```bash
# Find low-score indexed domains
psql $DATABASE_URL -c "
  SELECT d.domain, s.score, d.isIndexed
  FROM \"Domain\" d
  JOIN \"Scan\" s ON d.latestScanId = s.id
  WHERE d.isIndexed = true AND s.score < 40;
"

# Option 1: Re-scan domains (score may have changed)
# Option 2: Manually de-index: UPDATE "Domain" SET isIndexed = false WHERE domain = 'example.com';
```

---

## 6. Integration with Umami

While Umami provides excellent user analytics, it doesn't track:
- Google search performance (impressions, clicks, CTR)
- Bot/crawler behavior
- Index coverage issues
- Structured data validation

**Recommended setup**:
- **Umami**: User behavior, traffic sources, page views
- **GSC Metrics**: Search performance, organic growth
- **SEO Health Endpoint**: Technical SEO monitoring, cache health

Together, they provide complete visibility into SEO performance.

---

## Next Steps

1. **Set up GSC integration** (follow Prerequisites above)
2. **Test GSC metrics script**: `pnpm gsc:metrics`
3. **Verify SEO health endpoint**: `curl https://geckoadvisor.com/api/seo`
4. **Schedule weekly GSC reviews** (manual or automated)
5. **Monitor Phase 2 deployment impact** (compare metrics pre/post)
