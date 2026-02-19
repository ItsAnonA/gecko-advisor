/**
 * Update February 2026 Transparency Report
 *
 * Adds stabilization sprint methodology changes to the existing report:
 * - Error-weighted scan confidence (Laplace-smoothed beta mean)
 * - P50/P90/P95 latency percentile tracking
 * - Circuit breaker threshold recalibration
 * - Scanner error classification
 *
 * Usage:
 *   npx tsx scripts/update-transparency-report-feb2026.ts
 *   npx tsx scripts/update-transparency-report-feb2026.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

const UPDATED_CONTENT = `This is the inaugural Gecko Advisor Transparency Report covering February 2026.

During this period, the insight engine generated 163 predictions across three prediction types: DOMAIN_IMPROVEMENT (80), DOMAIN_REGRESSION (80), and TRACKER_SURGE (3).

No predictions have been validated yet. The minimum observation window is 30 days from issuance, meaning the earliest validations cannot occur before late March 2026.

Until validated predictions reach a minimum of 50, no statistical accuracy metrics will be reported. We will not extrapolate from insufficient data.

No retractions were issued this period (no predictions have reached their validation window).

No methodology freezes are in effect. The freeze policy (overall <60% for 2 consecutive months, or subtype <50% with n>=20) will be evaluated once sufficient data exists. Freeze enforcement will become programmatic in Phase 1.

## Methodology Changes (v1.1 — February 19, 2026)

The following operational threshold changes were made during a stabilization sprint:

**Error-Weighted Scan Confidence**: Added Laplace-smoothed beta mean confidence scoring to gate stability labels. Domains with high scan failure rates are now downgraded to PROVISIONAL tier regardless of scan count. Formula: confidence = (successes + 1) / (successes + failures + 2).

**Latency Percentile Tracking**: Added P50/P90/P95 scan latency percentile tracking. A P95 soft alert fires at 45s (warning only, does not trigger circuit breaker). This addresses a blind spot where average duration masked tail latency issues.

**Circuit Breaker Recalibration**: Thresholds were expanded based on empirical analysis of web crawling error rates. Error rate threshold: 5% to 20%. Queue depth: 100 to 200. Average duration: 45s to 60s. A minimum sample size of 10 scans is now required before evaluating error rate, preventing false positives during low-volume periods.

**Scanner Error Classification**: HTTP errors are now classified into 8 error codes (TIMEOUT, DNS_FAILURE, CONNECTION_REFUSED, SSL_ERROR, BLOCKED, RATE_LIMITED, SERVER_ERROR, SITE_UNREACHABLE) with appropriate user-facing messages. Request timeout increased from 5s to 15s; job timeout from 60s to 90s.

These changes are documented in the Governance Log with a review trigger: when the 7-day rolling error rate drops below 10%, the error rate threshold will be tightened to 15%. Review date: March 5, 2026.

Scoring version: 1.0. Calibration version: 1.0. Methodology version: 1.1.`;

const UPDATED_METHODOLOGY_SNAPSHOT = {
  version: '1.1',
  freezePolicy: {
    overall: 'Frozen if <60% accuracy for 2 consecutive months',
    subtype: 'Frozen if <50% accuracy with n>=20',
  },
  scoringVersion: '1.0',
  calibrationVersion: '1.0',
  changes: [
    {
      date: '2026-02-19',
      version: '1.1',
      summary: 'Stabilization sprint: error-weighted confidence, latency percentiles, circuit breaker recalibration',
    },
  ],
};

async function main() {
  const slug = '2026-02';

  const existing = await prisma.transparencyReport.findUnique({
    where: { slug },
    select: { id: true, status: true, content: true },
  });

  if (!existing) {
    console.error(`Report ${slug} not found. Run seed-transparency-report.ts first.`);
    process.exit(1);
  }

  console.log(`Found report ${slug} (${existing.id}, status: ${existing.status})`);

  if (isDryRun) {
    console.log('\n[DRY RUN] Would update:');
    console.log(`  Content length: ${existing.content.length} -> ${UPDATED_CONTENT.length}`);
    console.log(`  Status: ${existing.status} -> UPDATED`);
    console.log(`  Revision note: Stabilization sprint methodology changes (v1.1)`);
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  await prisma.transparencyReport.update({
    where: { slug },
    data: {
      content: UPDATED_CONTENT,
      status: 'UPDATED',
      revisionNote: 'Updated with stabilization sprint methodology changes (v1.1): error-weighted confidence, latency percentiles, circuit breaker recalibration.',
      methodologySnapshot: UPDATED_METHODOLOGY_SNAPSHOT,
    },
  });

  console.log(`\nUpdated report ${slug} to UPDATED status with v1.1 methodology changes.`);
}

main()
  .catch((err) => {
    console.error('Update failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
