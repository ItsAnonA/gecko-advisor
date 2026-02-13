/**
 * Seed First Transparency Report (Phase 0)
 *
 * Seeds the February 2026 report — published March 1, 2026 at 09:00 UTC.
 * This is the inaugural transparency report.
 *
 * Usage:
 *   npx tsx scripts/seed-transparency-report.ts
 *   npx tsx scripts/seed-transparency-report.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

const FIRST_REPORT = {
  slug: '2026-02',
  title: 'February 2026 Transparency Report',
  status: 'PUBLISHED' as const,
  scheduledFor: new Date('2026-03-01T09:00:00Z'),
  publishedAt: new Date('2026-03-01T09:00:00Z'),
  autoPublished: false,
  keyFinding:
    '163 predictions issued. 0 validated. Predictive accuracy currently unknown.',
  quotables: [
    '163 predictions issued. 0 validated. Predictive accuracy currently unknown.',
    'Rolling accuracy excludes pending predictions; we will not count unvalidated claims as wins.',
    'The first validations will occur no earlier than 30 days after issuance; until then, subtype accuracy is not measurable.',
  ],
  content: `This is the inaugural Gecko Advisor Transparency Report covering February 2026.

During this period, the insight engine generated 163 predictions across three prediction types: DOMAIN_IMPROVEMENT (80), DOMAIN_REGRESSION (80), and TRACKER_SURGE (3).

No predictions have been validated yet. The minimum observation window is 30 days from issuance, meaning the earliest validations cannot occur before late March 2026.

Until validated predictions reach a minimum of 50, no statistical accuracy metrics will be reported. We will not extrapolate from insufficient data.

No retractions were issued this period (no predictions have reached their validation window).

No methodology freezes are in effect. The freeze policy (overall <60% for 2 consecutive months, or subtype <50% with n>=20) will be evaluated once sufficient data exists. Freeze enforcement will become programmatic in Phase 1.

Scoring version: 1.0. Calibration version: 1.0.`,
  metricsSnapshot: {
    schemaVersion: 'MetricsSnapshotV1',
    accuracy: null,
    predictions: 163,
    validated: 0,
    invalidated: 0,
    retractions: 0,
    byType: {
      DOMAIN_IMPROVEMENT: {
        predictions: 80,
        validated: 0,
        invalidated: 0,
        accuracy: null,
      },
      DOMAIN_REGRESSION: {
        predictions: 80,
        validated: 0,
        invalidated: 0,
        accuracy: null,
      },
      TRACKER_SURGE: {
        predictions: 3,
        validated: 0,
        invalidated: 0,
        accuracy: null,
      },
    },
    freeze: { overallFrozen: false, frozenTypes: [] },
    dataVintage: '2026-02-28T23:59:59Z',
    queryTimestamp: '2026-02-28T08:00:00Z',
    scoringVersion: '1.0',
    calibrationVersion: '1.0',
  },
  methodologySnapshot: {
    version: '1.0',
    freezePolicy: {
      overall: 'Frozen if <60% accuracy for 2 consecutive months',
      subtype: 'Frozen if <50% accuracy with n>=20',
    },
    scoringVersion: '1.0',
    calibrationVersion: '1.0',
  },
};

async function main() {
  console.log(
    isDryRun
      ? '[DRY RUN] Would seed transparency report:'
      : 'Seeding transparency report...',
  );
  console.log(`  Slug: ${FIRST_REPORT.slug}`);
  console.log(`  Title: ${FIRST_REPORT.title}`);
  console.log(`  Published: ${FIRST_REPORT.publishedAt?.toISOString()}`);
  console.log(`  Predictions: ${FIRST_REPORT.metricsSnapshot.predictions}`);
  console.log(`  Quotables: ${FIRST_REPORT.quotables.length}`);

  if (isDryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  const existing = await prisma.transparencyReport.findUnique({
    where: { slug: FIRST_REPORT.slug },
    select: { id: true },
  });

  if (existing) {
    console.log(`\nReport ${FIRST_REPORT.slug} already exists (${existing.id}). Skipping.`);
    return;
  }

  const report = await prisma.transparencyReport.create({
    data: FIRST_REPORT,
  });

  console.log(`\nCreated report: ${report.id}`);
  console.log(`  Slug: ${report.slug}`);
  console.log(`  Status: ${report.status}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
