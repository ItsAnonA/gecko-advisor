# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Gecko Advisor is a privacy-first website scanner built as a **TypeScript monorepo** using pnpm workspaces and Turbo. It provides deterministic privacy scores (0-100) with explainable evidence by analyzing cookies, trackers, security headers, and third-party resources.

**Mission**: 100% free, open-source privacy assessment tool with no user tracking or authentication.

**Live Site**: https://geckoadvisor.com

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GECKO ADVISOR                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Next.js    │────▶│   Express    │────▶│   BullMQ     │                │
│  │   Frontend   │◀────│   Backend    │◀────│   Worker     │                │
│  │  (apps/web)  │     │(apps/backend)│     │(apps/worker) │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    ▼                    ▼                         │
│         │             ┌──────────────┐     ┌──────────────┐                │
│         │             │  PostgreSQL  │     │    Redis     │                │
│         │             │   (Prisma)   │     │   (Queue)    │                │
│         │             └──────────────┘     └──────────────┘                │
│         │                    │                                              │
│         ▼                    ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐              │
│  │              Shared Package (@gecko-advisor/shared)       │              │
│  │         Zod Schemas • Types • Utils • Blocklist           │              │
│  └──────────────────────────────────────────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
/
├── apps/
│   ├── web/              # Next.js 15 frontend (@gecko-advisor/web)
│   ├── backend/          # Express API + Prisma (@gecko-advisor/backend)
│   └── worker/           # BullMQ job processor (@gecko-advisor/worker)
│
├── packages/
│   └── shared/           # Shared schemas, types, utilities (@gecko-advisor/shared)
│
├── infra/
│   ├── prisma/           # Database schema, migrations, seeds
│   ├── docker/           # Docker Compose configs + Nginx
│   └── openapi.yaml      # OpenAPI specification
│
├── scripts/              # 28+ operational and maintenance scripts
│
├── tests/
│   └── e2e/              # Playwright E2E tests (100+ test cases)
│
├── docs/                 # Project documentation
└── Project-Docs/         # Architecture and context documentation
```

---

## Core Data Flow

### Privacy Scan Flow

```
┌─────────┐    POST /api/v2/scan    ┌─────────┐    BullMQ Job    ┌─────────┐
│ Browser │ ───────────────────────▶│ Backend │ ─────────────────▶│ Worker  │
└─────────┘                         └─────────┘                   └─────────┘
     │                                   │                             │
     │  1. Submit URL                    │  2. Validate + Dedupe       │  3. Crawl Site
     │                                   │  3. Create Scan Record      │  4. Analyze Privacy
     │                                   │  4. Queue BullMQ Job        │  5. Calculate Score
     │                                   │                             │  6. Detect Changes
     │                                   │                             │
     │  ◀─────── Poll Status ───────────│◀──── Update Progress ───────│
     │           GET /api/v2/scan/:id   │                             │
     │                                   │                             │
     │  7. Redirect to Report           │  8. Return Results          │
     │     /privacy-report/:domain      │                             │
     ▼                                   ▼                             ▼
```

### Scan States

```
queued → running → done
                 ↘ error
```

**Progress Updates**: Worker updates `progress` (0-100) during scan for real-time UI feedback.

---

## Backend Services

### Service Directory (`apps/backend/src/services/`)

#### Core Infrastructure Services
| Service | Purpose |
|---------|---------|
| `slug.ts` | Unique slug generation for public URLs (`example-com-abc123`) |
| `dedupe.ts` | Scan deduplication (24-hour cache window) |
| `rateLimitService.ts` | Dual-layer rate limiting (burst + daily) |
| `turnstileService.ts` | Cloudflare Turnstile bot protection |
| `reportArchive.ts` | Report archival and retrieval |
| `ssrReportService.ts` | Server-side rendering for search engines |

#### Privacy Analysis Services
| Service | Purpose |
|---------|---------|
| `analyticsService.ts` | Analytics aggregation and insights |
| `domainService.ts` | Domain normalization, lookup (eTLD+1) |
| `contextService.ts` | Contextual privacy analysis |
| `comparisonService.ts` | Domain-to-domain privacy comparison |

#### Domain Intelligence Engine (Phase 3)
| Service | Purpose |
|---------|---------|
| `changeDetectionService.ts` | Detects score/tracker changes between scans |
| `volatilityService.ts` | Privacy score volatility analysis |
| `stabilityService.ts` | Stability scoring with tiered confidence |
| `predictiveService.ts` | Momentum, acceleration, early warnings |

#### SEO & Indexing (Phase 2)
| Service | Purpose |
|---------|---------|
| `budgetService.ts` | Dynamic scan budget with circuit breaker |
| `eligibilityService.ts` | Domain scan eligibility checking |
| `antiThrashService.ts` | Prevents rapid tier oscillation |
| `categoryIntelligenceService.ts` | Category classification intelligence |
| `journeyTrackingService.ts` | User journey and conversion tracking |

#### Insights & Credibility (Phase 3C)
| Service | Purpose |
|---------|---------|
| `insightGeneratorService.ts` | Tiered insight generation (breaking/notable/emerging) |
| `insightQualityService.ts` | Quality scoring and filtering |
| `narrativeService.ts` | Auto-generated narrative templates |
| `credibilityService.ts` | Hedge language enforcement, retraction validation |
| `trackerEvolutionService.ts` | Tracker adoption/decline tracking |
| `weeklyReportService.ts` | Automated weekly privacy reports |

---

## API Routes

### Route Directory (`apps/backend/src/routes/`)

#### Current API (v2)
| Route | Endpoints | Purpose |
|-------|-----------|---------|
| `v2.scan.ts` | `POST /api/v2/scan`, `POST /api/v2/url` | Initiate privacy scans |
| `v2.reports.ts` | `GET /api/v2/scan/:id`, `GET /api/v2/report/:slug` | Retrieve scan results |
| `v2.domain.ts` | `GET /api/v2/domain/:domain` | Domain lookup and stats |
| `v2.context.ts` | `GET /api/v2/context/:domain` | Contextual analysis |
| `v2.categories.ts` | `GET /api/v2/categories` | Industry category data |
| `v2.changes.ts` | `GET /api/v2/changes` | Privacy change feed |
| `v2.insights.ts` | `GET /api/v2/insights/*` | Generated privacy insights |
| `v2.blog.ts` | `GET /api/v2/blog`, `GET /api/v2/blog/:slug` | Blog content |

#### Insights API (v2.insights.ts)
| Endpoint | Purpose |
|----------|---------|
| `GET /api/v2/insights` | List publishable insights |
| `GET /api/v2/insights/tiered` | Tiered insights (breaking/notable/emerging) |
| `GET /api/v2/insights/predictions/:domain` | Predictive signals for domain |
| `GET /api/v2/insights/quality/distribution` | Quality metrics distribution |
| `GET /api/v2/insights/governance/methodology` | Credibility methodology metrics |
| `GET /api/v2/insights/narratives/templates` | Available narrative templates |

#### Infrastructure Routes
| Route | Purpose |
|-------|---------|
| `admin.ts` | Admin operations, bulk scanning, tier management |
| `auth.ts` | User authentication endpoints |
| `batch.ts` | Batch scan operations |
| `sitemap.ts` | Dynamic sitemap generation |
| `ssr.blog.ts` | Blog SSR for crawlers |
| `ssr.domain.ts` | Domain report SSR for crawlers |
| `docs.ts` | OpenAPI documentation |

---

## Worker Jobs

### Worker Directory (`apps/worker/src/`)

| File | Purpose |
|------|---------|
| `index.ts` | BullMQ queue setup and job processors |
| `scanner.ts` | Website crawling and data extraction |
| `scoring.ts` | Privacy score calculation algorithm |
| `changeDetection.ts` | Privacy change tracking |
| `lists.ts` | Tracker and blocklist management |
| `objectStorage.ts` | S3-compatible storage integration |
| `config.ts` | Configuration and environment |
| `logger.ts` | Logging configuration |
| `sentry.ts` | Error tracking integration |

### Job Types

| Job | Trigger | Purpose |
|-----|---------|---------|
| `scan-url` | POST /api/v2/scan | Main privacy scanning job |
| `report-generation` | SSR request | Generate SSR report for bots |
| `change-detection` | Scan completion | Analyze privacy changes |
| `domain-upsert` | Scan completion | Update Domain record |

---

## Frontend Architecture

### Frontend App (`apps/web/`)

**Framework**: Next.js 15 with App Router

### Page Routes

#### Main Layout (`(main)/`)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Homepage with scanner |
| `/scan/[id]` | `scan/[id]/page.tsx` | Real-time scan progress |

#### SEO Layout (`(seo)/`)
| Route | Page | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | SEO-optimized homepage |
| `/about` | `about/page.tsx` | About the project |
| `/faq` | `faq/page.tsx` | Frequently asked questions |
| `/methodology` | `methodology/page.tsx` | Privacy assessment methodology |
| `/security` | `security/page.tsx` | Security features |
| `/roadmap` | `roadmap/page.tsx` | Product roadmap |
| `/legal` | `legal/page.tsx` | Legal information |
| `/privacy-scanner` | `privacy-scanner/page.tsx` | Scanner features |
| `/privacy-report/[domain]` | `privacy-report/[domain]/page.tsx` | Dynamic privacy reports |
| `/privacy-benchmarks` | `privacy-benchmarks/page.tsx` | Industry benchmarks |
| `/privacy-benchmarks/[category]` | `privacy-benchmarks/[category]/page.tsx` | Category benchmarks |
| `/blog` | `blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `blog/[slug]/page.tsx` | Individual blog posts |
| `/compare/[domainA]/[domainB]` | `compare/[domainA]/[domainB]/page.tsx` | Domain comparison |
| `/reports` | `reports/page.tsx` | Public reports listing |
| `/changes` | `changes/page.tsx` | Privacy changes feed |
| `/benchmarks` | `benchmarks/page.tsx` | Benchmark data explorer |

### Key Components (`apps/web/components/`)

#### Scan Components
| Component | Purpose |
|-----------|---------|
| `scan/ScanForm.tsx` | URL input and submission |
| `scan/ScanProgress.tsx` | Real-time progress display |
| `scan/ProgressDial.tsx` | Animated progress indicator |
| `scan/RateLimitIndicator.tsx` | Rate limit status display |
| `scan/TurnstileWidget.tsx` | CAPTCHA widget |

#### Report Components
| Component | Purpose |
|-----------|---------|
| `report/InteractiveReport.tsx` | Main report view container |
| `report/EnhancedScoreDial.tsx` | Privacy score visualization |
| `report/EvidenceList.tsx` | Evidence/finding list |
| `report/ChangeHistory.tsx` | Historical change visualization |
| `report/BenchmarkSection.tsx` | Category benchmark context |
| `report/RecommendationsSection.tsx` | Privacy recommendations |
| `report/ShareBar.tsx` | Social sharing options |
| `report/ComparisonPrompt.tsx` | Domain comparison prompt |
| `report/WhatThisMeansSection.tsx` | Plain English explanation |

#### Conditional Report Components
| Component | Purpose |
|-----------|---------|
| `report/conditionals/CookieBreakdownSummary.tsx` | Cookie analysis |
| `report/conditionals/FingerprintingExplainer.tsx` | Fingerprinting guide |
| `report/conditionals/HighTrackerExplainer.tsx` | Tracker analysis |
| `report/conditionals/CriticalPrivacyConcerns.tsx` | Critical findings |
| `report/conditionals/BigTechTrackerContext.tsx` | Major tech tracker info |

#### UI Components
| Component | Purpose |
|-----------|---------|
| `ui/Card.tsx` | Reusable card container |
| `ui/ScoreDial.tsx` | Score visualization |
| `ui/GradeBadge.tsx` | Grade letter badge (A-F) |
| `ui/SeverityBadge.tsx` | Issue severity indicator |
| `ui/CategoryBadge.tsx` | Category label |
| `ui/Skeleton.tsx` | Loading skeleton |

---

## Database Schema

### Core Models (`infra/prisma/schema.prisma`)

#### User & Authentication
| Model | Purpose |
|-------|---------|
| `User` | User accounts with email, wallet, subscriptions |
| `PasswordResetToken` | Password reset flow |
| `WalletLink` | Web3 wallet linking |

#### Scanning
| Model | Purpose |
|-------|---------|
| `Scan` | Privacy scan records (status, score, progress, results) |
| `Evidence` | Scan findings (cookies, trackers, headers) |
| `Issue` | Categorized security/privacy issues |
| `ScanQueue` | Bulk scanning queue |

#### Domain Management
| Model | Purpose |
|-------|---------|
| `Domain` | Domain index with tier system (A/B/C) |
| `TierPromotion` | Audit log of tier changes |
| `DomainChange` | Privacy score changes between scans |
| `DomainStability` | Stability metrics and volatility index |

#### SEO & Indexing
| Model | Purpose |
|-------|---------|
| `IndexingSnapshot` | Daily indexing metrics |
| `Category` | Industry categories (Streaming, eCommerce, etc.) |
| `CategoryTrend` | Weekly/monthly category trends |
| `SampleComparison` | Curated domain pair comparisons |

#### Intelligence & Insights (Phase 3C)
| Model | Purpose |
|-------|---------|
| `Insight` | Generated privacy insights |
| `WeeklyReport` | Automated weekly privacy reports |
| `TrackerTrend` | Tracker adoption trends |
| `WatchedUrl` | Pro user domain monitoring |

#### System State
| Model | Purpose |
|-------|---------|
| `RateLimit` | Daily rate limit tracking |
| `CachedList` | Cached tracker/blocklist data |
| `SystemState` | Persistent K/V store |
| `SchedulerBatch` | Scheduler idempotency |
| `DailyReport` | Operational metrics |

### Key Enums

```prisma
enum IssueSeverity    { info, low, medium, high, critical }
enum ChangeType       { NONE, MINOR, MODERATE, MAJOR, CRITICAL }
enum DomainTrend      { IMPROVING, STABLE, DECLINING, VOLATILE }
enum InsightType      { DOMAIN_IMPROVEMENT, DOMAIN_REGRESSION, CATEGORY_TREND,
                        TRACKER_SURGE, TRACKER_DECLINE, FINGERPRINTING_SHIFT,
                        ANOMALY, WEEKLY_SUMMARY }
enum InsightSeverity  { LOW, MEDIUM, HIGH, CRITICAL }
```

---

## Operational Scripts

### Script Directory (`scripts/`)

#### Daily Operations
| Script | Schedule | Purpose |
|--------|----------|---------|
| `daily-ops-report.ts` | 6 AM UTC | Daily operational metrics |
| `golden-run-test.ts` | 7 AM UTC | Quality assurance test run |
| `drift-check.ts` | 1 AM UTC | System consistency validation |
| `insight-lifecycle.ts` | 5 AM UTC | Insight aging and validation |
| `detect-retractions.ts` | 6 AM UTC | Retraction candidate detection |
| `update-stability.ts` | 3 AM UTC | Domain stability recalculation |

#### Weekly Operations
| Script | Schedule | Purpose |
|--------|----------|---------|
| `generate-insights.ts` | Mon 5 AM | Generate tiered insights |
| `generate-weekly-report.ts` | Mon 6 AM | Weekly privacy report |
| `update-category-trends.ts` | Mon 4 AM | Category trend metrics |
| `update-tracker-trends.ts` | Mon 4:30 AM | Tracker adoption trends |
| `eligibility-decay.ts` | Sun 2 AM | Eligibility status decay |

#### Scheduling & Maintenance
| Script | Purpose |
|--------|---------|
| `schedule-rescans.ts` | Queue domain rescans intelligently |
| `classify-domains.ts` | Assign domain categories |
| `classify-tiers-batched.ts` | Tier assignment (A/B/C) |
| `seed-tranco.ts` | Seed Tranco top 10K domains |
| `backfill-changes.ts` | Populate change records |
| `prewarm-cache.ts` | Pre-warm hot data cache |

---

## Key Architectural Patterns

### Rate Limiting (Two-Layer)

```
┌─────────────────────────────────────────────────────────────┐
│                     Rate Limit System                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Layer 1: Burst Protection (Redis)                         │
│   ├── 1 scan per minute per IP                              │
│   └── Immediate rejection with retryAfterSeconds            │
│                                                              │
│   Layer 2: Daily Quota (Database)                           │
│   ├── 10 scans per day per IP/user                          │
│   ├── Tracks in RateLimit model                             │
│   └── Resets at midnight UTC                                │
│                                                              │
│   Pro Users: Bypass all limits                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Domain Tier System (SEO)

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Tier System                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Tier A: MUST Index (~5-7K domains)                        │
│   ├── High-authority domains                                 │
│   ├── GSC clicks > threshold                                │
│   └── Priority in sitemap                                   │
│                                                              │
│   Tier B: Eligible (~20-30K domains)                        │
│   ├── Mid-authority domains                                 │
│   ├── Some GSC signals                                      │
│   └── Included in sitemap                                   │
│                                                              │
│   Tier C: Discovery Only (long tail)                        │
│   ├── Low or no GSC signals                                 │
│   └── Not in sitemap, accessible via direct URL             │
│                                                              │
│   Promotion: Based on sustained GSC signals                 │
│   Demotion: Anti-thrash protection (30-day cooldown)        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Change Detection System

```
┌─────────────────────────────────────────────────────────────┐
│                  Change Detection Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Scan completes → changeDetectionService.detect()       │
│                                                              │
│   2. Compare with previous scan:                            │
│      ├── Score delta                                        │
│      ├── Tracker additions/removals                         │
│      └── Fingerprinting toggle                              │
│                                                              │
│   3. Classify change:                                       │
│      ├── NONE:     |delta| < 2                              │
│      ├── MINOR:    |delta| 2-5                              │
│      ├── MODERATE: |delta| 6-15                             │
│      ├── MAJOR:    |delta| 16-25                            │
│      └── CRITICAL: |delta| > 25 OR fingerprinting changed   │
│                                                              │
│   4. Record in DomainChange model                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Insight Generation (Phase 3C)

```
┌─────────────────────────────────────────────────────────────┐
│              Tiered Insight Generation                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Quality-Only Thresholds (NO volume caps):                 │
│                                                              │
│   Breaking Tier:                                            │
│   ├── Magnitude >= 70                                       │
│   ├── Confidence >= 0.9                                     │
│   └── Publish ALL that qualify                              │
│                                                              │
│   Notable Tier:                                             │
│   ├── Magnitude >= 40                                       │
│   ├── Confidence >= 0.75                                    │
│   └── Publish ALL that qualify                              │
│                                                              │
│   Emerging Tier:                                            │
│   ├── Magnitude >= 25                                       │
│   ├── Confidence >= 0.6                                     │
│   └── Internal tracking only                                │
│                                                              │
│   Credibility Governance:                                   │
│   ├── Mandatory hedge language validation                   │
│   ├── Forbidden causal language blocking                    │
│   └── Daily retraction detection                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Circuit Breaker Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                   Circuit Breaker                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Monitors:                                                  │
│   ├── Queue depth                                           │
│   ├── Error rates                                           │
│   └── Response times                                        │
│                                                              │
│   States:                                                   │
│   ├── CLOSED:  Normal operation                             │
│   ├── OPEN:    50% budget reduction                         │
│   └── HALF:    Gradual recovery                             │
│                                                              │
│   Stored in: SystemState model                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Commands

### Development

```bash
# Start all services with Docker (recommended)
make dev              # Starts containers + runs migrations + seeds database

# Or start services individually
pnpm dev              # All services in parallel (requires Postgres + Redis)
pnpm --filter @gecko-advisor/backend dev
pnpm --filter @gecko-advisor/web dev
pnpm --filter @gecko-advisor/worker dev
```

**Access points**:
- Frontend: http://localhost:8080 (Nginx proxy)
- API: http://localhost:5000
- API Docs: http://localhost:5000/docs

### Build & Quality Checks

```bash
pnpm build            # Build all packages (uses Turbo cache)
pnpm typecheck        # TypeScript strict mode checking (all packages)
pnpm lint             # ESLint (all packages)
pnpm test             # Unit tests (Vitest)
```

### Database

```bash
pnpm prisma:generate      # Generate Prisma client (required after schema changes)
pnpm prisma:migrate       # Deploy migrations to database
pnpm seed                 # Seed database with demo scans

# Development workflow
npx prisma migrate dev --name description   # Create migration
npx prisma studio                           # GUI database browser
```

### E2E Testing

```bash
pnpm test:e2e             # Run all E2E tests
pnpm test:e2e:core        # Core scanning journey
pnpm test:e2e:performance # Performance validation
pnpm test:e2e:ui          # UI mode (visual debugging)
```

### Docker Workflows

```bash
make dev              # Full dev setup: up + migrate + seed
make up               # Start containers
make down             # Stop and remove containers (with volumes)
make logs             # Follow container logs
make migrate          # Run migrations in container
```

---

## Key Patterns & Conventions

### Zod Schemas as Source of Truth

All API contracts defined in `packages/shared/src/schemas.ts`:

```typescript
// Schema definition
export const ScanRequestSchema = z.object({
  url: z.string().url(),
  force: z.boolean().optional()
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

// Backend validation
const parsed = ScanRequestSchema.safeParse(req.body);
if (!parsed.success) {
  return problem(res, 400, 'Invalid Request', parsed.error.flatten());
}
```

### RFC 7807 Problem Details

All API errors use RFC 7807 format:

```typescript
problem(res, 404, 'Scan not found');
problem(res, 429, 'Rate limit exceeded', { retryAfterSeconds: 60 });

// Response format
{
  "type": "about:blank",
  "title": "Scan not found",
  "status": 404,
  "instance": "/api/v2/scan/abc123"
}
```

### Frontend State Management

Uses TanStack Query for server state with polling:

```typescript
const { data } = useQuery({
  queryKey: ['scan', scanId, 'status'],
  queryFn: () => fetchScanStatus(scanId),
  refetchInterval: (data) =>
    data?.status === 'done' ? false : 2000,
});
```

---

## Environment Variables

### Required

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/geckoadvisor
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5000
```

### Optional

```bash
TURNSTILE_SECRET_KEY=...     # Cloudflare bot protection
ADMIN_API_KEY=...            # Admin API access
SENTRY_DSN=...               # Error tracking
OBJECT_STORAGE_ENABLED=true  # S3-compatible storage
```

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| Scan completion | < 60 seconds (p90) |
| API response | < 100ms |
| Report page load | < 3 seconds |
| Homepage LCP | < 2.5 seconds |

---

## Production Cron Jobs

| Schedule | Script | Purpose |
|----------|--------|---------|
| `0 1 * * *` | `drift-check.ts` | Drift monitoring |
| `0 2 * * *` | `schedule-rescans.ts` | Domain rescanning |
| `0 3 * * *` | `update-stability.ts --tiered` | Stability scores |
| `0 4 * * 1` | `update-category-trends.ts` | Category trends |
| `30 4 * * 1` | `update-tracker-trends.ts` | Tracker trends |
| `0 5 * * *` | `insight-lifecycle.ts` | Insight aging |
| `0 5 * * 1` | `generate-insights.ts --tiered` | Weekly insights |
| `0 6 * * *` | `detect-retractions.ts` | Retraction detection |
| `0 6 * * *` | `daily-ops-report.ts` | Ops metrics |
| `0 6 * * 1` | `generate-weekly-report.ts` | Weekly report |
| `0 7 * * *` | `golden-run-test.ts` | QA tests |

---

## Common Pitfalls

### Prisma Client Not Generated

```bash
# Fix: Run after every schema change
pnpm prisma:generate
```

### Vite Build Fails with Shared Package

Ensure `apps/web/vite.config.ts` has alias:
```typescript
resolve: {
  alias: {
    '@gecko-advisor/shared': resolve(__dirname, '../../packages/shared/src/index.ts')
  }
}
```

### E2E Tests Timeout

Check that all services are running:
```bash
make logs | grep -E "(backend|worker)"
docker exec privacy-advisor-redis-1 redis-cli ping
```

---

## Additional Resources

- **API Documentation**: http://localhost:5000/docs
- **Database Schema**: `infra/prisma/schema.prisma`
- **Test Documentation**: `docs/TESTING_INFRASTRUCTURE.md`
- **Architecture Context**: `Project-Docs/Context.md`
