#!/usr/bin/env npx ts-node

/**
 * DAILY OPERATIONAL REPORT
 *
 * Comprehensive visibility into Domain Intelligence Engine health.
 * Generates and persists daily metrics for monitoring and alerting.
 *
 * DIE Final Hardening:
 * - Fix 7: Red flags at top (5 critical checks in first 10 lines)
 *
 * Usage:
 *   npx ts-node scripts/daily-ops-report.ts
 *   npx ts-node scripts/daily-ops-report.ts --json  # Output as JSON
 */

import { PrismaClient } from '@prisma/client';
import { TIER_CONFIG, P90_TARGETS } from '../apps/backend/src/config/tier-config';
import { runAllInvariantChecks } from '../apps/backend/src/services/invariantService';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');

interface DailyReport {
  date: string;

  // Budget
  budget: {
    newDomains: number;
    tierA: number;
    tierB: number;
    anomaly: number;
    total: number;
    adjustmentReasons: string[];
  };

  // Circuit breaker
  circuitBreaker: {
    isTriggered: boolean;
    reductionLevel: number;
    recoveryStep: number;
  };

  // SLA & staleness
  staleness: {
    tierA: { avg: number; p50: number; p90: number; p99: number };
    tierB: { avg: number; p50: number; p90: number; p99: number };
    tierC: { avg: number; p50: number; p90: number; p99: number };
  };

  // Tier distribution
  tierDistribution: {
    tierA: number;
    tierB: number;
    tierC: number;
    total: number;
  };

  // Scheduled today
  scheduled: {
    newDomains: number;
    tierA: number;
    tierB: number;
    anomaly: number;
    total: number;
  };

  // Tier changes
  tierChanges: {
    promotionsToA: number;
    promotionsToB: number;
    demotionsFromA: number;
    demotionsFromB: number;
  };

  // Waitlist (domains eligible but not scheduled)
  waitlist: {
    tierA: number;
    tierB: number;
    newDomains: number;
    blockedByCapCount?: number;
  };

  // Eligibility
  eligibility: {
    total: number;
    eligible: number;
    suspended: number;
    deprioritized: number;
    reactivated?: number;
  };

  // Invariants
  invariantViolations: number;
  criticalViolations: string[];

  // Scan latency percentiles (from durationMs)
  scanLatency: {
    p50Ms: number | null;
    p90Ms: number | null;
    p95Ms: number | null;
    sampleCount: number;
  };

  // Errors
  scanErrors: {
    total: number;
    byType: Record<string, number>;
  };
}

// ============================================================
// FIX 7: RED FLAGS
// ============================================================

interface RedFlag {
  flag: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  value: string;
  threshold: string;
}

function calculateRedFlags(report: DailyReport): RedFlag[] {
  const flags: RedFlag[] = [];

  // 1. Tier A p90 staleness
  const tierAP90Max = P90_TARGETS.A; // days
  flags.push({
    flag: 'Tier A p90 staleness',
    status: report.staleness.tierA.p90 <= tierAP90Max ? 'PASS' : 'FAIL',
    value: `${report.staleness.tierA.p90.toFixed(1)}d`,
    threshold: `≤${tierAP90Max}d`,
  });

  // 2. Circuit breaker state
  const breakerStatus = report.circuitBreaker.isTriggered
    ? report.circuitBreaker.recoveryStep > 0
      ? 'WARN'
      : 'FAIL'
    : 'PASS';
  flags.push({
    flag: 'Circuit breaker',
    status: breakerStatus,
    value: report.circuitBreaker.isTriggered
      ? `Triggered (step ${report.circuitBreaker.recoveryStep}/4)`
      : 'Normal',
    threshold: 'Normal',
  });

  // 3. Promotions blocked due to cap
  const blockedPromotions = report.waitlist?.blockedByCapCount || 0;
  flags.push({
    flag: 'Promotions blocked (cap)',
    status: blockedPromotions === 0 ? 'PASS' : blockedPromotions < 10 ? 'WARN' : 'FAIL',
    value: `${blockedPromotions}`,
    threshold: '0',
  });

  // 4. Suspensions
  const suspensions = report.eligibility?.suspended || 0;
  const reactivations = report.eligibility?.reactivated || 0;
  flags.push({
    flag: 'Eligibility changes',
    status: suspensions > 100 ? 'WARN' : 'PASS',
    value: `${suspensions} suspended, ${reactivations} reactivated`,
    threshold: '<100 suspensions',
  });

  // 5. P95 scan latency
  const p95ThresholdMs = 45_000; // matches CIRCUIT_BREAKER.p95SoftAlertMs
  const p95Ms = report.scanLatency.p95Ms;
  if (p95Ms !== null && report.scanLatency.sampleCount >= 10) {
    flags.push({
      flag: 'P95 scan latency',
      status: p95Ms <= p95ThresholdMs ? 'PASS' : 'WARN',
      value: `${(p95Ms / 1000).toFixed(1)}s (n=${report.scanLatency.sampleCount})`,
      threshold: `≤${(p95ThresholdMs / 1000).toFixed(0)}s`,
    });
  }

  // 6. Invariant violations
  flags.push({
    flag: 'Invariant violations',
    status: report.invariantViolations === 0 ? 'PASS' : 'FAIL',
    value: `${report.invariantViolations} critical`,
    threshold: '0',
  });

  return flags;
}

async function generateDailyReport(): Promise<DailyReport> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // Get latest scheduler batch
  const latestBatch = await prisma.schedulerBatch.findFirst({
    where: { batchDate: today.toISOString().split('T')[0] },
    orderBy: { startedAt: 'desc' },
  });

  // Get circuit breaker state
  const cbState = await prisma.systemState.findUnique({
    where: { key: 'circuit_breaker' },
  });
  const cb = (cbState?.value as Record<string, unknown>) || {};

  // Calculate staleness for each tier
  const stalenessQueries = (['A', 'B', 'C'] as const).map(async (tier) => {
    const result = await prisma.$queryRaw<
      {
        avg_days: number;
        p50_days: number;
        p90_days: number;
        p99_days: number;
      }[]
    >`
      SELECT
        AVG(EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400) as avg_days,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400) as p50_days,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400) as p90_days,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400) as p99_days
      FROM "Domain"
      WHERE "indexTier" = ${tier}::"IndexTier"
        AND "eligibleForScan" = true
        AND "lastScannedAt" IS NOT NULL
    `;

    return {
      tier,
      avg: result[0]?.avg_days ?? 0,
      p50: result[0]?.p50_days ?? 0,
      p90: result[0]?.p90_days ?? 0,
      p99: result[0]?.p99_days ?? 0,
    };
  });

  const stalenessResults = await Promise.all(stalenessQueries);

  // Get tier distribution
  const tierCounts = await prisma.domain.groupBy({
    by: ['indexTier'],
    where: { eligibleForScan: true },
    _count: true,
  });

  const tierDistribution = {
    tierA: tierCounts.find((t) => t.indexTier === 'A')?._count ?? 0,
    tierB: tierCounts.find((t) => t.indexTier === 'B')?._count ?? 0,
    tierC: tierCounts.find((t) => t.indexTier === 'C')?._count ?? 0,
    total: tierCounts.reduce((sum, t) => sum + t._count, 0),
  };

  // Get tier changes today (event-based counting)
  const [promotionsToA, promotionsToB, demotionsFromA, demotionsFromB] = await Promise.all([
    prisma.tierPromotion.count({ where: { createdAt: { gte: yesterday }, toTier: 'A' } }),
    prisma.tierPromotion.count({ where: { createdAt: { gte: yesterday }, toTier: 'B' } }),
    prisma.tierPromotion.count({
      where: { createdAt: { gte: yesterday }, fromTier: 'A', toTier: { not: 'A' } },
    }),
    prisma.tierPromotion.count({
      where: { createdAt: { gte: yesterday }, fromTier: 'B', toTier: 'C' },
    }),
  ]);

  // Get waitlist (eligible but not scheduled recently)
  const waitlistCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const [waitlistA, waitlistB, waitlistNew] = await Promise.all([
    prisma.domain.count({
      where: {
        indexTier: 'A',
        eligibleForScan: true,
        lastScannedAt: { not: null },
        OR: [{ scanScheduledAt: null }, { scanScheduledAt: { lt: waitlistCutoff } }],
      },
    }),
    prisma.domain.count({
      where: {
        indexTier: 'B',
        eligibleForScan: true,
        lastScannedAt: { not: null },
        OR: [{ scanScheduledAt: null }, { scanScheduledAt: { lt: waitlistCutoff } }],
      },
    }),
    prisma.domain.count({
      where: {
        lastScannedAt: null,
        eligibleForScan: true,
      },
    }),
  ]);

  // Count blocked promotions (domains at Tier B that would qualify for A but cap is full)
  const blockedByCapCount = tierDistribution.tierA >= (TIER_CONFIG.A.maxCount ?? 7000)
    ? await prisma.domain.count({
        where: {
          indexTier: 'B',
          eligibleForScan: true,
          gscClicks: { gt: 0 },
          promotionConfidence: { gte: 0.7 },
        },
      })
    : 0;

  // Get eligibility stats
  const [totalDomains, eligibleDomains, suspendedDomains, deprioritizedDomains] =
    await Promise.all([
      prisma.domain.count(),
      prisma.domain.count({ where: { eligibleForScan: true } }),
      prisma.domain.count({ where: { eligibleForScan: false } }),
      prisma.domain.count({
        where: { eligibilityReason: { startsWith: 'deprioritized' } },
      }),
    ]);

  // Get scan errors
  const errorCounts = await prisma.scan.groupBy({
    by: ['status'],
    where: {
      createdAt: { gte: yesterday },
      status: 'error',
    },
    _count: true,
  });

  // Scan latency percentiles (last 24h, from durationMs)
  const latencyResult = await prisma.$queryRaw<
    { p50_ms: number | null; p90_ms: number | null; p95_ms: number | null; sample_count: number }[]
  >`
    SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "durationMs") as p50_ms,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY "durationMs") as p90_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs") as p95_ms,
      COUNT(*)::int as sample_count
    FROM "Scan"
    WHERE "finishedAt" >= ${yesterday}
      AND status = 'done'
      AND "durationMs" IS NOT NULL
  `;

  // Run invariant checks
  const invariants = await runAllInvariantChecks(prisma);

  // Parse budget from batch if available
  const budgetUsed = (latestBatch?.budgetUsed as Record<string, unknown>) || {};

  const report: DailyReport = {
    date: today.toISOString().split('T')[0],

    budget: {
      newDomains: (budgetUsed.newDomains as number) ?? 0,
      tierA: (budgetUsed.tierA as number) ?? 0,
      tierB: (budgetUsed.tierB as number) ?? 0,
      anomaly: (budgetUsed.anomaly as number) ?? 0,
      total: (budgetUsed.total as number) ?? 0,
      adjustmentReasons: (budgetUsed.adjustmentReasons as string[]) ?? [],
    },

    circuitBreaker: {
      isTriggered: (cb.isTriggered as boolean) ?? false,
      reductionLevel: (cb.currentReductionLevel as number) ?? 0,
      recoveryStep: (cb.recoveryStep as number) ?? 0,
    },

    staleness: {
      tierA: stalenessResults.find((s) => s.tier === 'A')!,
      tierB: stalenessResults.find((s) => s.tier === 'B')!,
      tierC: stalenessResults.find((s) => s.tier === 'C')!,
    },

    tierDistribution,

    scheduled: {
      newDomains: latestBatch?.scheduled ?? 0,
      tierA: 0, // Would need per-tier tracking in batch
      tierB: 0,
      anomaly: 0,
      total: latestBatch?.scheduled ?? 0,
    },

    tierChanges: {
      promotionsToA,
      promotionsToB,
      demotionsFromA,
      demotionsFromB,
    },

    waitlist: {
      tierA: waitlistA,
      tierB: waitlistB,
      newDomains: waitlistNew,
      blockedByCapCount,
    },

    eligibility: {
      total: totalDomains,
      eligible: eligibleDomains,
      suspended: suspendedDomains,
      deprioritized: deprioritizedDomains,
    },

    invariantViolations: invariants.criticalViolations.length,
    criticalViolations: invariants.criticalViolations.map((v) => v.invariant),

    scanLatency: {
      p50Ms: latencyResult[0]?.p50_ms ?? null,
      p90Ms: latencyResult[0]?.p90_ms ?? null,
      p95Ms: latencyResult[0]?.p95_ms ?? null,
      sampleCount: latencyResult[0]?.sample_count ?? 0,
    },

    scanErrors: {
      total: errorCounts.reduce((sum, e) => sum + e._count, 0),
      byType: Object.fromEntries(errorCounts.map((e) => [e.status, e._count])),
    },
  };

  return report;
}

function printReport(report: DailyReport): void {
  // ============================================================
  // FIX 7: RED FLAGS (FIRST 10 LINES)
  // ============================================================
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║     DAILY OPS REPORT - ${report.date}     RED FLAGS            ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const redFlags = calculateRedFlags(report);

  let hasFailure = false;
  for (const flag of redFlags) {
    const icon = flag.status === 'PASS' ? '✅' : flag.status === 'WARN' ? '⚠️' : '❌';
    const statusColor = flag.status === 'FAIL' ? ' ← ACTION REQUIRED' : '';
    console.log(
      `  ${icon} ${flag.flag.padEnd(25)} ${flag.value.padEnd(30)} (${flag.threshold})${statusColor}`
    );

    if (flag.status === 'FAIL') hasFailure = true;
  }

  console.log('');

  if (hasFailure) {
    console.log('🚨 ONE OR MORE RED FLAGS REQUIRE ATTENTION 🚨');
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log('');

  // Circuit breaker
  const cbIcon = report.circuitBreaker.isTriggered ? '🔴' : '🟢';
  console.log(
    `CIRCUIT BREAKER: ${cbIcon} ${report.circuitBreaker.isTriggered ? 'TRIGGERED' : 'HEALTHY'}`
  );
  if (report.circuitBreaker.isTriggered) {
    console.log(`  Reduction: ${(report.circuitBreaker.reductionLevel * 100).toFixed(0)}%`);
    console.log(`  Recovery step: ${report.circuitBreaker.recoveryStep}/4`);
  }
  console.log('');

  // Tier distribution
  console.log('TIER DISTRIBUTION:');
  console.log(
    `  A: ${report.tierDistribution.tierA.toLocaleString()} (cap: ${TIER_CONFIG.A.maxCount?.toLocaleString() ?? 'N/A'})`
  );
  console.log(
    `  B: ${report.tierDistribution.tierB.toLocaleString()} (cap: ${TIER_CONFIG.B.maxCount?.toLocaleString() ?? 'N/A'})`
  );
  console.log(`  C: ${report.tierDistribution.tierC.toLocaleString()} (unlimited)`);
  console.log(`  Total: ${report.tierDistribution.total.toLocaleString()}`);
  console.log('');

  // Staleness
  console.log('STALENESS (days):');
  console.log('  Tier    avg    p50    p90    p99    status');
  for (const tier of ['A', 'B', 'C'] as const) {
    const key = `tier${tier}` as keyof typeof report.staleness;
    const s = report.staleness[key];
    const p90Target = P90_TARGETS[tier];
    const status = s.p90 <= p90Target ? '✅' : '⚠️';
    console.log(
      `    ${tier}    ${s.avg.toFixed(1).padStart(5)}  ${s.p50.toFixed(1).padStart(5)}  ${s.p90.toFixed(1).padStart(5)}  ${s.p99.toFixed(1).padStart(5)}    ${status} (target: ${p90Target})`
    );
  }
  console.log('');

  // Budget (if available)
  if (report.budget.total > 0) {
    console.log('BUDGET ALLOCATION:');
    console.log(
      `  New domains: ${report.budget.newDomains} (${((report.budget.newDomains / report.budget.total) * 100).toFixed(1)}%)`
    );
    console.log(
      `  Tier A: ${report.budget.tierA} (${((report.budget.tierA / report.budget.total) * 100).toFixed(1)}%)`
    );
    console.log(
      `  Tier B: ${report.budget.tierB} (${((report.budget.tierB / report.budget.total) * 100).toFixed(1)}%)`
    );
    console.log(
      `  Anomaly: ${report.budget.anomaly} (${((report.budget.anomaly / report.budget.total) * 100).toFixed(1)}%)`
    );
    if (report.budget.adjustmentReasons.length > 0) {
      console.log(`  Adjustments: ${report.budget.adjustmentReasons.join(', ')}`);
    }
    console.log('');
  }

  // Scheduled
  console.log('SCHEDULED TODAY:');
  console.log(`  Total: ${report.scheduled.total}`);
  console.log('');

  // Tier changes
  console.log('TIER CHANGES (24h):');
  console.log(
    `  Promotions: ${report.tierChanges.promotionsToA} → A, ${report.tierChanges.promotionsToB} → B`
  );
  console.log(
    `  Demotions: ${report.tierChanges.demotionsFromA} ← A, ${report.tierChanges.demotionsFromB} ← B`
  );
  console.log('');

  // Waitlist
  console.log('WAITLIST (not scheduled in 3d):');
  console.log(`  Tier A: ${report.waitlist.tierA}`);
  console.log(`  Tier B: ${report.waitlist.tierB}`);
  console.log(`  New domains: ${report.waitlist.newDomains}`);
  if (report.waitlist.blockedByCapCount && report.waitlist.blockedByCapCount > 0) {
    console.log(`  ⚠️ Blocked by cap: ${report.waitlist.blockedByCapCount}`);
  }
  console.log('');

  // Eligibility
  console.log('ELIGIBILITY:');
  console.log(`  Total domains: ${report.eligibility.total.toLocaleString()}`);
  console.log(`  Eligible: ${report.eligibility.eligible.toLocaleString()}`);
  console.log(`  Suspended: ${report.eligibility.suspended.toLocaleString()}`);
  console.log(`  Deprioritized: ${report.eligibility.deprioritized.toLocaleString()}`);
  console.log('');

  // Scan latency
  console.log('SCAN LATENCY (24h):');
  if (report.scanLatency.sampleCount > 0) {
    const fmt = (ms: number | null) => ms !== null ? `${(ms / 1000).toFixed(1)}s` : 'N/A';
    console.log(`  P50: ${fmt(report.scanLatency.p50Ms)}  P90: ${fmt(report.scanLatency.p90Ms)}  P95: ${fmt(report.scanLatency.p95Ms)}`);
    console.log(`  Sample count: ${report.scanLatency.sampleCount}`);
    if (report.scanLatency.p95Ms !== null && report.scanLatency.p95Ms > 45_000) {
      console.log('  ⚠️ P95 exceeds 45s soft alert threshold');
    }
  } else {
    console.log('  No latency data (durationMs not yet populated)');
  }
  console.log('');

  // Errors
  console.log('SCAN ERRORS (24h):');
  console.log(`  Total: ${report.scanErrors.total}`);
  if (Object.keys(report.scanErrors.byType).length > 0) {
    for (const [type, count] of Object.entries(report.scanErrors.byType)) {
      console.log(`    ${type}: ${count}`);
    }
  }
  console.log('');

  // Invariants
  const invIcon = report.invariantViolations === 0 ? '✅' : '⚠️';
  console.log(`INVARIANTS: ${invIcon} ${report.invariantViolations} violations`);
  if (report.criticalViolations.length > 0) {
    console.log(`  🚨 CRITICAL: ${report.criticalViolations.join(', ')}`);
  }
}

async function main(): Promise<void> {
  const report = await generateDailyReport();

  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  // Persist to DB
  await prisma.dailyReport.upsert({
    where: { date: report.date },
    create: {
      date: report.date,
      report: report as unknown as Record<string, unknown>,
    },
    update: {
      report: report as unknown as Record<string, unknown>,
    },
  });

  if (!outputJson) {
    console.log('\n✅ Report saved to database');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
