# CLAUDE.md

This file provides guidance for working with the Gecko Advisor codebase.

---

# Part 1: Product Overview

## What is Gecko Advisor?

Gecko Advisor is a **free, open-source website privacy scanner** that analyzes any website and provides:
- **Privacy Score** (0-100) - Deterministic, explainable rating
- **Evidence-Based Findings** - Cookies, trackers, fingerprinting, security headers
- **Recommendations** - Actionable steps to improve privacy
- **Historical Tracking** - How privacy practices change over time
- **Domain Intelligence** - Stability scores, predictions, and trend analysis

**Live Site**: https://geckoadvisor.com

**Mission**: 100% free privacy assessment with no user tracking or authentication required.

---

# Part 2: Functional Overview

## Core Features

### 1. Privacy Scanning
Users enter a URL and receive a comprehensive privacy analysis including:
- **Privacy Score**: 0-100 grade (A-F letter grade)
- **Tracker Detection**: Third-party trackers identified
- **Cookie Analysis**: First-party vs third-party, purposes
- **Fingerprinting Detection**: Canvas, WebGL, audio fingerprinting
- **Security Headers**: HTTPS, CSP, HSTS validation

### 2. Privacy Reports
Each scanned domain gets a shareable report page (`/privacy-report/[domain]`) showing:
- Overall score with visual dial
- Issue breakdown by severity (critical, high, medium, low, info)
- Evidence list with explanations
- Category benchmark comparison
- Recommendations for improvement
- Change history (if rescanned)
- Stability score and trend indicator

### 3. Domain Comparison
Compare two domains side-by-side (`/compare/[domainA]/[domainB]`) to see:
- Score differences
- Tracker differences
- Which domain is more privacy-friendly

### 4. Industry Benchmarks
View privacy benchmarks by industry category (`/privacy-benchmarks/[category]`):
- Streaming, eCommerce, Social Media, News, Banking, etc.
- Average scores per category
- Best and worst performers
- Trend analysis

### 5. Change Feed
Track privacy changes across all scanned domains (`/changes`):
- Score improvements and regressions
- Tracker additions and removals
- Fingerprinting status changes

### 6. Domain Intelligence (Phase 3C)
Advanced analytics for each domain:
- **Stability Scoring**: Tiered confidence (full/partial/provisional) based on scan history
- **Trend Classification**: IMPROVING, STABLE, DECLINING, VOLATILE
- **Predictive Signals**: Momentum, acceleration, early warnings
- **Volatility Index**: How much a domain's score fluctuates

### 7. Automated Insights (Phase 3C)
Weekly intelligence reports with quality-gated publishing:
- **Breaking Insights**: Major privacy changes (magnitude ≥70, confidence ≥0.9)
- **Notable Insights**: Significant trends (magnitude ≥40, confidence ≥0.75)
- **Emerging Signals**: Early indicators tracked internally
- **Narrative Generation**: Auto-generated summaries with hedge language
- **Retraction Detection**: Daily validation of past predictions

### 8. Credibility Governance (Phase 3C)
Ensures published insights maintain integrity:
- **Hedge Language Enforcement**: Blocks forbidden causal language ("caused by", "proves that")
- **Retraction Tone Validation**: Ensures proper acknowledgment of incorrect predictions
- **Topic Diversity Analysis**: Monitors insight distribution to prevent over-representation
- **Methodology Transparency**: Tracks accuracy rates and confidence calibration

---

## User Journeys

### Journey 1: Scan a Website
```
Homepage → Enter URL → Click "Scan" → Progress Page → Report Page
```
- User lands on homepage with scan form
- Enters URL (e.g., "example.com")
- Sees real-time progress (0-100%)
- Redirected to report page when complete

### Journey 2: Compare Domains
```
Report Page → "Compare with..." → Select Domain → Comparison Page
```
- From any report, user can initiate comparison
- Select another domain to compare
- View side-by-side analysis

### Journey 3: Browse Benchmarks
```
Benchmarks Page → Select Category → Category Report → Domain Detail
```
- User browses industry categories
- Views category-wide statistics
- Drills into specific domain reports

---

## Frontend Pages

### Main User Flow
| Page | Route | Purpose |
|------|-------|---------|
| Homepage | `/` | URL input form, start scanning |
| Scan Progress | `/scan/[id]` | Real-time progress display |
| Privacy Report | `/privacy-report/[domain]` | Full privacy analysis |
| Domain Comparison | `/compare/[a]/[b]` | Side-by-side comparison |

### Discovery & Content
| Page | Route | Purpose |
|------|-------|---------|
| Reports List | `/reports` | Browse all scanned domains |
| Industry Benchmarks | `/privacy-benchmarks` | Category overview |
| Category Detail | `/privacy-benchmarks/[category]` | Per-category analysis |
| Changes Feed | `/changes` | Recent privacy changes |
| Blog | `/blog` | Privacy articles |

### Information
| Page | Route | Purpose |
|------|-------|---------|
| About | `/about` | Project information |
| Methodology | `/methodology` | How scoring works |
| FAQ | `/faq` | Common questions |
| Roadmap | `/roadmap` | Feature plans |

---

## Business Logic

### Privacy Scoring Algorithm
The privacy score (0-100) is calculated by deducting points for privacy issues:

| Factor | Impact |
|--------|--------|
| Third-party trackers | -2 to -5 per tracker |
| Fingerprinting detected | -15 to -25 |
| Third-party cookies | -1 to -3 per cookie |
| Missing security headers | -5 to -10 per header |
| No HTTPS | -20 |

**Grade Mapping**:
- A: 90-100 (Excellent)
- B: 80-89 (Good)
- C: 70-79 (Fair)
- D: 60-69 (Poor)
- F: 0-59 (Failing)

### Change Classification
When a domain is rescanned, changes are classified:

| Type | Criteria |
|------|----------|
| NONE | Score change < 2 points |
| MINOR | Score change 2-5 points |
| MODERATE | Score change 6-15 points |
| MAJOR | Score change 16-25 points |
| CRITICAL | Score change > 25 OR fingerprinting toggled |

### Stability Scoring (Phase 3C)
Domains receive tiered stability confidence based on scan history:

| Tier | Requirements | Confidence Multiplier |
|------|--------------|----------------------|
| Full | 3+ scans, 30+ days span | 1.0 (100%) |
| Partial | 2 scans, 14+ days span | 0.7 (70%) |
| Provisional | 1 scan | 0.4 (40%) |

**Trend Classification**:
- IMPROVING: Score increased ≥5 points over period
- DECLINING: Score decreased ≥5 points over period
- STABLE: Score change < 5 points, low volatility
- VOLATILE: High score variance regardless of direction

### Insight Generation (Phase 3C)
Weekly automated insights with quality-only thresholds (NO volume caps):

| Tier | Requirements | Action |
|------|--------------|--------|
| Breaking | Magnitude ≥ 70, Confidence ≥ 0.9 | Publish ALL that qualify |
| Notable | Magnitude ≥ 40, Confidence ≥ 0.75 | Publish ALL that qualify |
| Emerging | Magnitude ≥ 25, Confidence ≥ 0.6 | Track internally only |

**Insight Types**:
- `DOMAIN_IMPROVEMENT` - Domain score increased significantly
- `DOMAIN_REGRESSION` - Domain score decreased significantly
- `CATEGORY_TREND` - Category-wide privacy shift
- `TRACKER_SURGE` - Tracker adoption spike
- `TRACKER_DECLINE` - Tracker removal trend
- `FINGERPRINTING_SHIFT` - Fingerprinting adoption changes
- `ANOMALY` - Unusual patterns detected

### Credibility Governance (Phase 3C)
Ensures epistemic honesty in published content:

**Forbidden Language** (automatically blocked):
- "caused by", "result of", "due to", "because of"
- "directly led to", "proves that", "confirms that"
- "definitely", "certainly", "without doubt"

**Required Hedge Words** (by confidence level):
- High (≥0.8): "indicates", "suggests strongly", "appears to show"
- Medium (0.6-0.8): "may indicate", "possibly suggests", "could be related to"
- Low (<0.6): "might suggest", "early signals indicate", "preliminary data shows"

**Retraction Rules**:
- Daily detection of predictions that didn't materialize
- Forbidden: "we weren't wrong", "reality changed", "circumstances evolved"
- Required: "Our analysis predicted...", "This proved [incorrect]..."

### Rate Limiting
Free users are limited to prevent abuse:
- **Burst**: 1 scan per minute (Redis-enforced)
- **Daily**: 10 scans per day (Database-enforced)
- **Pro Users**: No limits

---

# Part 3: Technical Architecture

## System Design

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
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────┐              │
│  │              Shared Package (@gecko-advisor/shared)       │              │
│  │         Zod Schemas • Types • Utils • Blocklist           │              │
│  └──────────────────────────────────────────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, TailwindCSS, TanStack Query |
| Backend | Express.js, Zod validation, Prisma ORM |
| Worker | BullMQ job queue, Puppeteer for crawling |
| Database | PostgreSQL |
| Cache/Queue | Redis |
| Infrastructure | Docker, Nginx, Coolify |

## Monorepo Structure

```
/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   ├── backend/          # Express API server
│   └── worker/           # BullMQ job processor
│
├── packages/
│   └── shared/           # Shared schemas, types, utilities
│
├── infra/
│   ├── prisma/           # Database schema and migrations
│   └── docker/           # Docker Compose configs
│
├── scripts/              # 28+ operational scripts
└── tests/e2e/            # Playwright E2E tests
```

---

## Data Flow

### Scan Request Flow
```
1. User submits URL
   ↓
2. Backend validates URL (Zod schema)
   ↓
3. Check for recent scan (deduplication - 24hr cache)
   ↓
4. Create Scan record (status: queued)
   ↓
5. Queue BullMQ job
   ↓
6. Worker picks up job
   ↓
7. Crawl website (Puppeteer)
   ↓
8. Analyze: cookies, trackers, headers, fingerprinting
   ↓
9. Calculate privacy score
   ↓
10. Update Scan record (status: done)
    ↓
11. Detect changes (if rescan)
    ↓
12. Update domain stability metrics
    ↓
13. Frontend polls → redirects to report
```

### Scan States
```
queued → running → done
                 ↘ error
```

---

## Backend Services

### Core Services (`apps/backend/src/services/`)

| Service | Purpose |
|---------|---------|
| `slug.ts` | Generate unique slugs for report URLs |
| `dedupe.ts` | Check for recent scans (24hr deduplication) |
| `rateLimitService.ts` | Enforce scan limits (burst + daily) |
| `domainService.ts` | Domain normalization and lookup |
| `comparisonService.ts` | Compare two domains |

### Domain Intelligence Services (Phase 3)

| Service | Purpose |
|---------|---------|
| `changeDetectionService.ts` | Detect privacy changes between scans |
| `stabilityService.ts` | Calculate tiered stability scores (full/partial/provisional) |
| `volatilityService.ts` | Analyze score volatility and variance |
| `predictiveService.ts` | Momentum, acceleration, early warnings, saturation predictions |

### Insight & Credibility Services (Phase 3C)

| Service | Purpose |
|---------|---------|
| `insightGeneratorService.ts` | Generate tiered insights (breaking/notable/emerging) |
| `insightQualityService.ts` | Quality scoring (novelty, impact, historical rarity) |
| `narrativeService.ts` | Auto-generate narratives with mandatory hedge validation |
| `credibilityService.ts` | Hedge language enforcement, retraction tone validation |
| `trackerEvolutionService.ts` | Track tracker adoption and decline trends |
| `weeklyReportService.ts` | Generate automated weekly privacy reports |

### SEO Services

| Service | Purpose |
|---------|---------|
| `budgetService.ts` | Dynamic scan budget allocation with circuit breaker |
| `eligibilityService.ts` | Domain scan eligibility checking |
| `antiThrashService.ts` | Prevent rapid tier promotion/demotion |
| `categoryIntelligenceService.ts` | Category classification and trends |
| `ssrReportService.ts` | Server-side rendering for crawlers |

---

## API Endpoints

### Scanning API
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v2/scan` | Start a privacy scan |
| GET | `/api/v2/scan/:id` | Get scan status/results |
| GET | `/api/v2/report/:slug` | Get report by slug |

### Domain API
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v2/domain/:domain` | Domain info and stats |
| GET | `/api/v2/context/:domain` | Contextual analysis |
| GET | `/api/v2/changes` | Recent privacy changes |

### Insights API (Phase 3C - 12 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v2/insights` | List publishable insights |
| GET | `/api/v2/insights/tiered` | Tiered insights (breaking/notable/emerging) |
| GET | `/api/v2/insights/domain/:domain` | Insights for specific domain |
| GET | `/api/v2/insights/category/:category` | Insights for category |
| GET | `/api/v2/insights/predictions/:domain` | Predictive signals for domain |
| GET | `/api/v2/insights/stability/:domain` | Stability metrics for domain |
| GET | `/api/v2/insights/quality/distribution` | Quality score distribution |
| GET | `/api/v2/insights/quality/top` | Top quality insights |
| GET | `/api/v2/insights/governance/methodology` | Credibility methodology metrics |
| GET | `/api/v2/insights/governance/topic-diversity` | Topic distribution analysis |
| GET | `/api/v2/insights/narratives/templates` | Available narrative templates |
| GET | `/api/v2/insights/narratives/generate` | Generate narrative from template |

### Content API
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v2/categories` | Industry categories |
| GET | `/api/v2/blog` | Blog posts |

---

## Database Schema

### Core Models

| Model | Purpose |
|-------|---------|
| `Scan` | Privacy scan records (URL, status, score, results) |
| `Evidence` | Individual findings (cookies, trackers, headers) |
| `Issue` | Categorized privacy issues with severity |
| `Domain` | Domain index with tier, category, and stability relation |

### Intelligence Models (Phase 3)

| Model | Purpose |
|-------|---------|
| `DomainChange` | Score/tracker changes between scans |
| `DomainStability` | Volatility index, trend, confidence tier, scan count |
| `TrackerTrend` | Tracker adoption/decline by period |
| `CategoryTrend` | Category-wide trend metrics |

### Insight Models (Phase 3C)

| Model | Purpose |
|-------|---------|
| `Insight` | Generated insights with type, severity, magnitude, confidence |
| `WeeklyReport` | Automated weekly privacy summaries |

### System Models

| Model | Purpose |
|-------|---------|
| `RateLimit` | Per-user/IP daily limits |
| `SystemState` | K/V store for circuit breaker, drift metrics |
| `SchedulerBatch` | Scheduler idempotency tracking |
| `DailyReport` | Operational metrics and health data |

---

## Worker Jobs

| Job | Trigger | Purpose |
|-----|---------|---------|
| `scan-url` | POST /api/v2/scan | Main privacy scanning |
| `change-detection` | Scan completion | Analyze changes, update stability |
| `domain-upsert` | Scan completion | Update domain record |
| `report-generation` | SSR request | Generate bot-friendly reports |

---

## Frontend Components

### Scan Flow
| Component | Purpose |
|-----------|---------|
| `ScanForm.tsx` | URL input and submission |
| `ScanProgress.tsx` | Real-time progress with polling |
| `ProgressDial.tsx` | Animated circular progress |

### Report Display
| Component | Purpose |
|-----------|---------|
| `InteractiveReport.tsx` | Main report container |
| `EnhancedScoreDial.tsx` | Score visualization |
| `EvidenceList.tsx` | Findings with explanations |
| `ChangeHistory.tsx` | Historical changes |
| `RecommendationsSection.tsx` | Improvement suggestions |
| `BenchmarkSection.tsx` | Category comparison |

### Conditional Content
| Component | Purpose |
|-----------|---------|
| `CookieBreakdownSummary.tsx` | Cookie details |
| `FingerprintingExplainer.tsx` | Fingerprinting explanation |
| `HighTrackerExplainer.tsx` | Tracker context |
| `CriticalPrivacyConcerns.tsx` | Critical issues highlight |

---

# Part 4: Development Guide

## Quick Start

```bash
# Start all services with Docker
make dev

# Access points
# Frontend: http://localhost:8080
# API: http://localhost:5000
# API Docs: http://localhost:5000/docs
```

## Common Commands

### Development
```bash
pnpm dev                              # Start all services
pnpm --filter @gecko-advisor/web dev  # Start frontend only
pnpm --filter @gecko-advisor/backend dev  # Start backend only
```

### Build & Test
```bash
pnpm build        # Build all packages
pnpm typecheck    # TypeScript checking
pnpm lint         # ESLint
pnpm test:e2e     # E2E tests
```

### Database
```bash
pnpm prisma:generate   # Generate client (REQUIRED after schema changes)
pnpm prisma:migrate    # Run migrations
npx prisma studio      # Database GUI
```

---

## Key Patterns

### Zod Schema Validation
All API contracts use Zod schemas from `packages/shared/src/schemas.ts`:

```typescript
// Schema definition
export const ScanRequestSchema = z.object({
  url: z.string().url(),
  force: z.boolean().optional()
});

// Backend validation
const parsed = ScanRequestSchema.safeParse(req.body);
if (!parsed.success) {
  return problem(res, 400, 'Invalid Request');
}
```

### RFC 7807 Error Responses
```typescript
problem(res, 404, 'Scan not found');
// Returns: { type, title, status, instance }
```

### TanStack Query Polling
```typescript
const { data } = useQuery({
  queryKey: ['scan', scanId],
  queryFn: () => fetchScanStatus(scanId),
  refetchInterval: (data) => data?.status === 'done' ? false : 2000,
});
```

### Hedge Language Validation (Phase 3C)
```typescript
import { validateHedgeLanguage } from './credibilityService';

const validation = validateHedgeLanguage(narrative);
if (!validation.valid) {
  throw new Error(`Blocked: ${validation.violations.join(', ')}`);
}
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
TURNSTILE_SECRET_KEY=...     # Bot protection
ADMIN_API_KEY=...            # Admin access
SENTRY_DSN=...               # Error tracking
```

---

## Production Operations

### Cron Jobs (12 Active)

| Schedule | Script | Purpose |
|----------|--------|---------|
| `0 1 * * *` | `drift-check.ts` | Statistical drift monitoring |
| `0 2 * * *` | `schedule-rescans.ts` | Queue domain rescans |
| `0 2 * * 0` | `eligibility-decay.ts` | Eligibility status decay |
| `0 3 * * *` | `update-stability.ts --tiered` | Tiered stability scores |
| `0 4 * * 1` | `update-category-trends.ts` | Category trend metrics |
| `30 4 * * 1` | `update-tracker-trends.ts` | Tracker adoption trends |
| `0 5 * * *` | `insight-lifecycle.ts` | Insight aging and validation |
| `0 5 * * 1` | `generate-insights.ts --tiered` | Weekly insight generation |
| `0 6 * * *` | `detect-retractions.ts` | Retraction candidate detection |
| `0 6 * * *` | `daily-ops-report.ts` | Daily metrics report |
| `0 6 * * 1` | `generate-weekly-report.ts` | Weekly privacy report |
| `0 7 * * *` | `golden-run-test.ts` | QA test run |

### Performance Targets
| Metric | Target |
|--------|--------|
| Scan completion | < 60 seconds (p90) |
| API response | < 100ms |
| Report page load | < 3 seconds |

---

## Troubleshooting

### Prisma Client Error
```bash
# Run after any schema change
pnpm prisma:generate
```

### E2E Tests Timeout
```bash
# Verify all services running
make logs | grep -E "(backend|worker)"
```

### Shared Package Import Error
Ensure `apps/web/vite.config.ts` has the alias configured for `@gecko-advisor/shared`.

---

## Resources

- **API Docs**: http://localhost:5000/docs
- **Database Schema**: `infra/prisma/schema.prisma`
- **Architecture**: `Project-Docs/Context.md`
