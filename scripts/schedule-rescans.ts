#!/usr/bin/env npx ts-node

/**
 * RESCAN SCHEDULER
 *
 * Intelligent domain rescan scheduler based on:
 * - Tier-based SLA targets (14/30/90 days)
 * - Volatility-triggered early rescans
 * - Dynamic budget allocation with floors
 * - Circuit breaker for system protection
 *
 * SAFETY FEATURES:
 * - Idempotency lock prevents concurrent runs
 * - Lock auto-expires after 30 minutes (stale protection)
 * - All operations are resumable
 *
 * Usage:
 *   npx ts-node scripts/schedule-rescans.ts
 *   npx ts-node scripts/schedule-rescans.ts --dry-run
 *   npx ts-node scripts/schedule-rescans.ts --force  # Override stale lock
 */

import { PrismaClient, Domain } from '@prisma/client';
import * as fs from 'fs';
import {
  TIER_CONFIG,
  VOLATILITY_RULES,
  VOLATILITY_ANALYSIS,
  TierName,
  DAILY_CAPACITY,
} from '../apps/backend/src/config/tier-config';
import {
  batchComputeVolatility,
  isHighVolatility,
  VolatilityData,
} from '../apps/backend/src/services/volatilityService';
import { calculateDynamicBudget } from '../apps/backend/src/services/budgetService';

const prisma = new PrismaClient();

// ============================================================
// DB-LEVEL IDEMPOTENCY (Primary) + FILE LOCK (Secondary)
// ============================================================

const LOCK_FILE = '/tmp/gecko-scheduler-lock.json';
const LOCK_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface LockState {
  pid: number;
  startedAt: string;
  hostname: string;
  batchId?: string;
}

/**
 * Create or find today's scheduler batch.
 * Uses unique constraint on (batchDate, batchType) for idempotency.
 */
async function acquireDbLock(batchType: string, force: boolean): Promise<{ batchId: string; isResume: boolean } | null> {
  const batchDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Check for existing batch today
    const existing = await prisma.schedulerBatch.findUnique({
      where: { batchDate_batchType: { batchDate, batchType } },
    });

    if (existing) {
      if (existing.status === 'completed') {
        console.log(`✅ Batch already completed today (${existing.id})`);
        console.log(`   Started: ${existing.startedAt.toISOString()}`);
        console.log(`   Completed: ${existing.completedAt?.toISOString()}`);
        console.log(`   Scheduled: ${existing.scheduled}, Skipped: ${existing.skipped}`);
        return null;
      }

      if (existing.status === 'running') {
        const ageMs = Date.now() - existing.startedAt.getTime();
        if (ageMs < LOCK_MAX_AGE_MS && !force) {
          console.error('❌ BATCH ALREADY RUNNING');
          console.error(`   ID: ${existing.id}`);
          console.error(`   Started: ${existing.startedAt.toISOString()}`);
          console.error(`   Age: ${Math.round(ageMs / 60000)} minutes`);
          console.error('');
          console.error('   Use --force to override (only if previous run crashed)');
          return null;
        }

        // Stale batch - take over
        console.warn('⚠️  Taking over stale batch (previous run may have crashed)');
        return { batchId: existing.id, isResume: true };
      }
    }

    // Create new batch
    const batch = await prisma.schedulerBatch.create({
      data: {
        batchDate,
        batchType,
        status: 'running',
      },
    });

    return { batchId: batch.id, isResume: false };
  } catch (e: unknown) {
    // Handle race condition (unique constraint violation)
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      console.log('⚠️  Race condition: another process created the batch. Retrying...');
      return acquireDbLock(batchType, force);
    }
    throw e;
  }
}

async function completeDbLock(
  batchId: string,
  stats: { scheduled: number; skipped: number; errors: number; budgetUsed: object; notes?: string }
): Promise<void> {
  await prisma.schedulerBatch.update({
    where: { id: batchId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      scheduled: stats.scheduled,
      skipped: stats.skipped,
      errors: stats.errors,
      budgetUsed: stats.budgetUsed,
      notes: stats.notes,
    },
  });
}

async function failDbLock(batchId: string, error: string): Promise<void> {
  await prisma.schedulerBatch.update({
    where: { id: batchId },
    data: {
      status: 'failed',
      completedAt: new Date(),
      notes: error,
    },
  });
}

function acquireFileLock(batchId: string): boolean {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8')) as LockState;
      const lockAge = Date.now() - new Date(lock.startedAt).getTime();

      // If file lock is stale, take over
      if (lockAge >= LOCK_MAX_AGE_MS) {
        console.warn(`⚠️  Stale file lock (${Math.round(lockAge / 60000)} min old), taking over`);
      } else {
        // File lock exists but DB lock was acquired - this is a bug or race condition
        console.warn('⚠️  File lock exists but DB lock acquired - clearing stale file lock');
      }
    }

    // Acquire lock
    const lock: LockState = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      hostname: require('os').hostname(),
      batchId,
    };
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2));
    return true;
  } catch (e) {
    console.warn('Failed to acquire file lock:', e);
    return true; // File lock is secondary, continue anyway
  }
}

function releaseFileLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8')) as LockState;
      // Only release if we own the lock
      if (lock.pid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch (e) {
    console.warn('Failed to release file lock:', e);
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================
// RESCAN DECISION LOGIC
// ============================================================

interface RescanDecision {
  shouldRescan: boolean;
  reason: string;
  priority: number;
}

function makeRescanDecision(
  domain: Domain,
  volatilityData: VolatilityData | undefined,
  now: Date
): RescanDecision {
  const tier = domain.indexTier as TierName;
  const config = TIER_CONFIG[tier];

  const daysSinceLastScan = domain.lastScannedAt
    ? daysBetween(domain.lastScannedAt, now)
    : Infinity;

  // Priority 1: Never scanned
  if (daysSinceLastScan === Infinity) {
    return { shouldRescan: true, reason: 'never_scanned', priority: 100 };
  }

  // Priority 2: Hard max exceeded - ALWAYS rescan
  if (daysSinceLastScan >= config.hardMax) {
    return { shouldRescan: true, reason: 'hard_max_exceeded', priority: 95 };
  }

  // Priority 3: High volatility early rescan
  if (isHighVolatility(volatilityData) && daysSinceLastScan >= VOLATILITY_RULES.earlyRescanDays) {
    return { shouldRescan: true, reason: 'high_volatility', priority: 85 };
  }

  // Priority 4: Standard SLA target
  if (daysSinceLastScan >= config.target) {
    const basePriority = tier === 'A' ? 80 : tier === 'B' ? 50 : 20;
    return { shouldRescan: true, reason: 'sla_due', priority: basePriority };
  }

  return { shouldRescan: false, reason: 'not_due', priority: 0 };
}

// ============================================================
// SCHEDULING FUNCTIONS
// ============================================================

async function scheduleNewDomains(budget: number, dryRun: boolean): Promise<number> {
  const now = new Date();

  const newDomains = await prisma.domain.findMany({
    where: {
      eligibleForScan: true,
      lastScannedAt: null,
      OR: [
        { scanScheduledAt: null },
        { scanScheduledAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      ],
    },
    orderBy: [{ trancoRank: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: budget,
    select: { id: true },
  });

  if (newDomains.length > 0 && !dryRun) {
    await prisma.domain.updateMany({
      where: { id: { in: newDomains.map((d) => d.id) } },
      data: { scanScheduledAt: now, rescanPriority: 90 },
    });
  }

  return newDomains.length;
}

interface TierScheduleResult {
  tier: string;
  evaluated: number;
  scheduled: number;
  reasons: Record<string, number>;
}

async function scheduleTierRescans(
  tier: TierName,
  budget: number,
  dryRun: boolean
): Promise<TierScheduleResult> {
  const now = new Date();

  // Get candidates (exclude never-scanned, those are handled separately)
  const candidates = await prisma.domain.findMany({
    where: {
      indexTier: tier,
      eligibleForScan: true,
      lastScannedAt: { not: null },
      OR: [
        { scanScheduledAt: null },
        { scanScheduledAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      ],
    },
    orderBy: { tierScore: 'desc' },
    take: budget * 3, // Fetch extra for filtering
  });

  if (candidates.length === 0) {
    return { tier, evaluated: 0, scheduled: 0, reasons: {} };
  }

  // Batch compute volatility (single query!)
  const volatilityMap = await batchComputeVolatility(
    prisma,
    candidates.map((c) => c.id)
  );

  // Make decisions
  const toSchedule: { id: string; priority: number; reason: string }[] = [];
  const reasonCounts: Record<string, number> = {};

  for (const domain of candidates) {
    const volatility = volatilityMap.get(domain.id);
    const decision = makeRescanDecision(domain, volatility, now);

    if (decision.shouldRescan) {
      toSchedule.push({ id: domain.id, priority: decision.priority, reason: decision.reason });
      reasonCounts[decision.reason] = (reasonCounts[decision.reason] || 0) + 1;
    }
  }

  // Sort by priority and take budget
  const batch = toSchedule.sort((a, b) => b.priority - a.priority).slice(0, budget);

  if (batch.length > 0 && !dryRun) {
    await prisma.domain.updateMany({
      where: { id: { in: batch.map((b) => b.id) } },
      data: { scanScheduledAt: now, rescanPriority: batch[0]?.priority ?? 50 },
    });
  }

  return { tier, evaluated: candidates.length, scheduled: batch.length, reasons: reasonCounts };
}

// ============================================================
// SLA REPORT
// ============================================================

async function generateSLAReport(): Promise<void> {
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                         SLA REPORT                          │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  for (const tier of ['A', 'B', 'C'] as const) {
    const config = TIER_CONFIG[tier];
    const cutoff = new Date(Date.now() - config.target * 24 * 60 * 60 * 1000);

    const [total, withinSLA, neverScanned] = await Promise.all([
      prisma.domain.count({ where: { indexTier: tier, eligibleForScan: true } }),
      prisma.domain.count({
        where: { indexTier: tier, eligibleForScan: true, lastScannedAt: { gte: cutoff } },
      }),
      prisma.domain.count({
        where: { indexTier: tier, eligibleForScan: true, lastScannedAt: null },
      }),
    ]);

    // Average staleness
    const avgStaleness = await prisma.$queryRaw<{ avg_days: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400) as avg_days
      FROM "Domain"
      WHERE "indexTier" = ${tier}::"IndexTier" AND "eligibleForScan" = true AND "lastScannedAt" IS NOT NULL
    `;

    // P90 staleness
    const p90Staleness = await prisma.$queryRaw<{ p90_days: number | null }[]>`
      SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400
      ) as p90_days
      FROM "Domain"
      WHERE "indexTier" = ${tier}::"IndexTier" AND "eligibleForScan" = true AND "lastScannedAt" IS NOT NULL
    `;

    const scannedTotal = total - neverScanned;
    const percentage = scannedTotal > 0 ? ((withinSLA / scannedTotal) * 100).toFixed(1) : '0.0';
    const avgDays = avgStaleness[0]?.avg_days?.toFixed(1) ?? 'N/A';
    const p90Days = p90Staleness[0]?.p90_days?.toFixed(1) ?? 'N/A';

    const targetMet = parseFloat(percentage) >= (tier === 'A' ? 90 : tier === 'B' ? 85 : 70);
    const status = targetMet ? '✅' : '⚠️';

    console.log(`\n  Tier ${tier}: ${status}`);
    console.log(`    SLA: ${percentage}% within ${config.target}d target`);
    console.log(`    Avg staleness: ${avgDays} days`);
    console.log(`    p90 staleness: ${p90Days} days`);
    console.log(`    Coverage: ${withinSLA}/${scannedTotal} scanned, ${neverScanned} never scanned`);
  }
}

// ============================================================
// MAIN SCHEDULER
// ============================================================

async function scheduleRescans(dryRun: boolean): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         DOMAIN INTELLIGENCE ENGINE - RESCAN SCHEDULER        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Check if volatility reanalysis is due
  if (VOLATILITY_ANALYSIS.isDue) {
    console.log('⚠️  WARNING: Volatility reanalysis is DUE');
    console.log(`   Last analysis: ${VOLATILITY_ANALYSIS.lastRun.toISOString()}`);
    console.log(`   Was due: ${VOLATILITY_ANALYSIS.nextDue.toISOString()}`);
    console.log('   Run volatility analysis before continuing to use data-driven cadence.');
    console.log('');
  }

  // Configuration summary
  console.log('Configuration:');
  console.log(`  Tier A: ${TIER_CONFIG.A.target}d target, ${TIER_CONFIG.A.hardMax}d hard max`);
  console.log(`  Tier B: ${TIER_CONFIG.B.target}d target, ${TIER_CONFIG.B.hardMax}d hard max`);
  console.log(`  Tier C: ${TIER_CONFIG.C.target}d target, ${TIER_CONFIG.C.hardMax}d hard max`);
  console.log(
    `  Volatility threshold: stddev > ${VOLATILITY_RULES.threshold}, range > ${VOLATILITY_RULES.minScoreRange}, span > ${VOLATILITY_RULES.minTimeSpanDays}d`
  );
  console.log('');

  // Calculate dynamic budget
  const budget = await calculateDynamicBudget(prisma, DAILY_CAPACITY.effectiveCapacity);

  console.log('Budget Allocation:');
  console.log(`  Total capacity: ${budget.total}`);
  console.log(
    `  New domains: ${budget.newDomains} (${((budget.newDomains / budget.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Tier A: ${budget.tierA} (${((budget.tierA / budget.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Tier B: ${budget.tierB} (${((budget.tierB / budget.total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Anomaly: ${budget.anomaly} (${((budget.anomaly / budget.total) * 100).toFixed(1)}%)`
  );

  if (budget.adjusted) {
    console.log(`  ⚡ Adjustments: ${budget.adjustmentReasons.join(', ')}`);
  }
  console.log('');

  // Schedule new domains
  console.log('─'.repeat(60));
  console.log('NEW DOMAIN SCHEDULING');
  const newScheduled = await scheduleNewDomains(budget.newDomains, dryRun);
  console.log(`  ${dryRun ? 'Would schedule' : 'Scheduled'}: ${newScheduled} new domains`);

  // Schedule tier rescans
  console.log('');
  console.log('─'.repeat(60));
  console.log('TIER RESCAN SCHEDULING');

  const results: TierScheduleResult[] = [];

  const tierBudgets: [TierName, number][] = [
    ['A', budget.tierA],
    ['B', budget.tierB],
    ['C', budget.anomaly], // C gets anomaly budget only
  ];

  for (const [tier, tierBudget] of tierBudgets) {
    const result = await scheduleTierRescans(tier, tierBudget, dryRun);
    results.push(result);

    console.log(`\n  Tier ${tier}:`);
    console.log(`    Evaluated: ${result.evaluated}`);
    console.log(`    ${dryRun ? 'Would schedule' : 'Scheduled'}: ${result.scheduled}`);
    if (Object.keys(result.reasons).length > 0) {
      Object.entries(result.reasons).forEach(([reason, count]) => {
        console.log(`      - ${reason}: ${count}`);
      });
    }
  }

  // Summary
  console.log('');
  console.log('─'.repeat(60));
  console.log('SUMMARY');
  const totalScheduled = newScheduled + results.reduce((sum, r) => sum + r.scheduled, 0);
  console.log(`  Total ${dryRun ? 'would be ' : ''}scheduled: ${totalScheduled}`);
  console.log(`  Budget utilization: ${((totalScheduled / budget.total) * 100).toFixed(1)}%`);

  // SLA Report
  await generateSLAReport();

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
}

// Run
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

async function main(): Promise<void> {
  let batchId: string | null = null;
  let stats = { scheduled: 0, skipped: 0, errors: 0, budgetUsed: {} as object };

  try {
    // Acquire DB lock (primary idempotency) - skip for dry-run
    if (!dryRun) {
      const lockResult = await acquireDbLock('rescan', force);
      if (!lockResult) {
        process.exit(0); // Already completed or running
      }
      batchId = lockResult.batchId;

      // Acquire file lock (secondary safeguard)
      acquireFileLock(batchId);
    }

    // Ensure file lock is released on exit
    process.on('SIGINT', () => {
      releaseFileLock();
      if (batchId) {
        failDbLock(batchId, 'Interrupted by SIGINT').catch(console.error);
      }
      process.exit(130);
    });
    process.on('SIGTERM', () => {
      releaseFileLock();
      if (batchId) {
        failDbLock(batchId, 'Interrupted by SIGTERM').catch(console.error);
      }
      process.exit(143);
    });

    // Run scheduler and capture stats
    const result = await scheduleRescansWithStats(dryRun);
    stats = result;

    // Complete DB lock with stats
    if (batchId) {
      await completeDbLock(batchId, stats);
    }

    releaseFileLock();
    await prisma.$disconnect();
  } catch (e) {
    console.error(e);
    releaseFileLock();
    if (batchId) {
      await failDbLock(batchId, String(e)).catch(console.error);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function scheduleRescansWithStats(dryRun: boolean): Promise<{
  scheduled: number;
  skipped: number;
  errors: number;
  budgetUsed: object;
}> {
  // Call the existing scheduler and capture results
  await scheduleRescans(dryRun);

  // Return stats (in a real implementation, scheduleRescans would return these)
  // For now, return placeholder - the actual stats are logged during execution
  return {
    scheduled: 0, // Will be populated by scheduleRescans in future refactor
    skipped: 0,
    errors: 0,
    budgetUsed: {},
  };
}

main();
