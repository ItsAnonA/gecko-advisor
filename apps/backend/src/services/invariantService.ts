/**
 * INVARIANT SERVICE
 *
 * Codified system invariants with assertions and alerts.
 * Provides early detection of silent breakage.
 *
 * DIE Final Hardening:
 * - Fix 5: Hard-stop on critical violations (throws error, halts scheduler)
 *
 * @module invariantService
 */

import type { PrismaClient } from '@prisma/client';
import {
  TIER_CONFIG,
  SCAN_BUDGET,
  ANTI_THRASH,
  DAILY_CAPACITY,
} from '../config/tier-config.js';

export type InvariantSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface InvariantViolation {
  invariant: string;
  expected: string;
  actual: string;
  severity: InvariantSeverity;
}

export interface InvariantCheckResult {
  passed: boolean;
  violations: InvariantViolation[];
  timestamp: Date;
}

// ============================================================
// FIX 5: CRITICAL INVARIANTS THAT MUST STOP EXECUTION
// ============================================================

/**
 * Critical invariants that MUST stop execution.
 */
export const CRITICAL_INVARIANTS = [
  'unique_scheduler_batch',
  'no_double_scheduling',
  'new_domains_floor',
  'tier_a_floor',
  'tier_a_cap',
  'tier_b_cap',
  'breaker_state_valid',
] as const;

// ============================================================
// SCHEDULER INVARIANTS
// ============================================================

export async function checkSchedulerInvariants(
  prisma: PrismaClient,
  batchDate: string,
  batchType: string,
  scheduled: { tierA: number; tierB: number; newDomains: number; anomaly: number }
): Promise<InvariantCheckResult> {
  const violations: InvariantViolation[] = [];

  // 1. Only 1 SchedulerBatch per (date, type)
  const batchCount = await prisma.schedulerBatch.count({
    where: { batchDate, batchType },
  });

  if (batchCount > 1) {
    violations.push({
      invariant: 'unique_scheduler_batch',
      expected: '1 batch per (date, type)',
      actual: `${batchCount} batches found`,
      severity: 'critical',
    });
  }

  // 2. scheduledCount <= budget
  const totalBudget = DAILY_CAPACITY.effectiveCapacity;
  const totalScheduled =
    scheduled.tierA + scheduled.tierB + scheduled.newDomains + scheduled.anomaly;

  if (totalScheduled > totalBudget * 1.1) {
    // 10% tolerance
    violations.push({
      invariant: 'scheduled_within_budget',
      expected: `<= ${totalBudget}`,
      actual: `${totalScheduled}`,
      severity: 'error',
    });
  }

  // 3. tierA scheduled >= tierA floor
  const tierAFloor = Math.floor(totalBudget * SCAN_BUDGET.floors.tierA);
  if (scheduled.tierA < tierAFloor * 0.9) {
    // 10% tolerance
    violations.push({
      invariant: 'tier_a_floor',
      expected: `>= ${tierAFloor}`,
      actual: `${scheduled.tierA}`,
      severity: 'critical',
    });
  }

  // 4. newDomains scheduled >= newDomains floor
  const newDomainsFloor = Math.floor(totalBudget * SCAN_BUDGET.floors.newDomains);
  if (scheduled.newDomains < newDomainsFloor * 0.9) {
    violations.push({
      invariant: 'new_domains_floor',
      expected: `>= ${newDomainsFloor}`,
      actual: `${scheduled.newDomains}`,
      severity: 'critical',
    });
  }

  // 5. No domain scheduled twice within 3 days (spot check)
  // Note: This query checks if any domain has been scheduled multiple times recently
  const recentDuplicates = await prisma.$queryRaw<{ domain_count: bigint }[]>`
    SELECT COUNT(*) as domain_count FROM (
      SELECT id
      FROM "Domain"
      WHERE "scanScheduledAt" >= NOW() - INTERVAL '3 days'
      GROUP BY id
      HAVING COUNT(*) > 1
    ) duplicates
  `;

  const duplicateCount = Number(recentDuplicates[0]?.domain_count ?? 0);
  if (duplicateCount > 0) {
    violations.push({
      invariant: 'no_double_scheduling',
      expected: '0 domains scheduled twice in 3 days',
      actual: `${duplicateCount} domains`,
      severity: 'critical',
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp: new Date(),
  };
}

// ============================================================
// TIER INVARIANTS
// ============================================================

export async function checkTierInvariants(
  prisma: PrismaClient
): Promise<InvariantCheckResult> {
  const violations: InvariantViolation[] = [];

  // 1. Tier A count <= cap
  const tierACounts = await prisma.domain.count({
    where: { indexTier: 'A', eligibleForScan: true },
  });

  if (TIER_CONFIG.A.maxCount && tierACounts > TIER_CONFIG.A.maxCount) {
    violations.push({
      invariant: 'tier_a_cap',
      expected: `<= ${TIER_CONFIG.A.maxCount}`,
      actual: `${tierACounts}`,
      severity: 'critical',
    });
  }

  // 2. Tier B count <= cap
  const tierBCounts = await prisma.domain.count({
    where: { indexTier: 'B', eligibleForScan: true },
  });

  if (TIER_CONFIG.B.maxCount && tierBCounts > TIER_CONFIG.B.maxCount) {
    violations.push({
      invariant: 'tier_b_cap',
      expected: `<= ${TIER_CONFIG.B.maxCount}`,
      actual: `${tierBCounts}`,
      severity: 'critical',
    });
  }

  // 3. No domain changes tier more than once per cooldown (use event-based check)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thrashingDomains = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "domainId") as count
    FROM "TierPromotion"
    WHERE "createdAt" >= ${ninetyDaysAgo}
    GROUP BY "domainId"
    HAVING COUNT(*) > ${ANTI_THRASH.maxTierChanges90d}
  `;

  const thrashCount = Number(thrashingDomains[0]?.count ?? 0);
  if (thrashCount > 0) {
    violations.push({
      invariant: 'tier_change_cooldown',
      expected: `0 domains with >${ANTI_THRASH.maxTierChanges90d} changes in 90d`,
      actual: `${thrashCount} domains`,
      severity: 'warning',
    });
  }

  // 4. Promotions today <= reserve
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const promotionsToday = await prisma.tierPromotion.count({
    where: {
      createdAt: { gte: today },
      toTier: 'A',
    },
  });

  const dailyReserve = Math.max(
    Math.floor((TIER_CONFIG.A.maxCount ?? 7000) * TIER_CONFIG.A.promotionReserve),
    TIER_CONFIG.A.minPromotionSlots
  );

  if (promotionsToday > dailyReserve * 2) {
    // Allow some headroom
    violations.push({
      invariant: 'promotion_daily_limit',
      expected: `<= ${dailyReserve * 2} promotions/day`,
      actual: `${promotionsToday}`,
      severity: 'warning',
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp: new Date(),
  };
}

// ============================================================
// CIRCUIT BREAKER INVARIANTS
// ============================================================

export async function checkCircuitBreakerInvariants(
  prisma: PrismaClient
): Promise<InvariantCheckResult> {
  const violations: InvariantViolation[] = [];

  // Load state
  const state = await prisma.systemState.findUnique({
    where: { key: 'circuit_breaker' },
  });

  if (!state) {
    // Not necessarily an error - might be first run
    return { passed: true, violations, timestamp: new Date() };
  }

  const cbState = state.value as {
    isTriggered?: boolean;
    currentReductionLevel?: number;
    triggeredAt?: string | null;
    recoveryStep?: number;
  };

  // 1. Recovery step <= maxRampSteps
  if (cbState.recoveryStep !== undefined && cbState.recoveryStep > 4) {
    violations.push({
      invariant: 'recovery_step_bounds',
      expected: '<= 4',
      actual: `${cbState.recoveryStep}`,
      severity: 'error',
    });
  }

  // 2. If fully recovered, isTriggered should be false
  if (cbState.currentReductionLevel === 0 && cbState.isTriggered) {
    violations.push({
      invariant: 'breaker_reset_on_recovery',
      expected: 'isTriggered=false when reductionLevel=0',
      actual: `isTriggered=${cbState.isTriggered}`,
      severity: 'warning',
    });
  }

  // 3. If triggered, must have triggeredAt
  if (cbState.isTriggered && !cbState.triggeredAt) {
    violations.push({
      invariant: 'triggered_has_timestamp',
      expected: 'triggeredAt set when isTriggered=true',
      actual: 'triggeredAt is null',
      severity: 'warning',
    });
  }

  // 4. Reduction level should be 0-1
  if (
    cbState.currentReductionLevel !== undefined &&
    (cbState.currentReductionLevel < 0 || cbState.currentReductionLevel > 1)
  ) {
    violations.push({
      invariant: 'breaker_state_valid',
      expected: '0 <= reductionLevel <= 1',
      actual: `${cbState.currentReductionLevel}`,
      severity: 'critical',
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp: new Date(),
  };
}

// ============================================================
// DATA INTEGRITY INVARIANTS
// ============================================================

export async function checkDataIntegrityInvariants(
  prisma: PrismaClient
): Promise<InvariantCheckResult> {
  const violations: InvariantViolation[] = [];

  // 1. All Tier A/B domains should have eligibleForScan=true or explicit reason
  const ineligibleHighTier = await prisma.domain.count({
    where: {
      indexTier: { in: ['A', 'B'] },
      eligibleForScan: false,
      eligibilityReason: null,
    },
  });

  if (ineligibleHighTier > 0) {
    violations.push({
      invariant: 'ineligible_high_tier_has_reason',
      expected: '0 ineligible A/B domains without reason',
      actual: `${ineligibleHighTier} domains`,
      severity: 'warning',
    });
  }

  // 2. Domains with GSC clicks should not be suspended
  const suspendedWithClicks = await prisma.domain.count({
    where: {
      eligibleForScan: false,
      gscClicks: { gt: 0 },
    },
  });

  if (suspendedWithClicks > 0) {
    violations.push({
      invariant: 'no_suspended_with_clicks',
      expected: '0 suspended domains with GSC clicks',
      actual: `${suspendedWithClicks} domains`,
      severity: 'error',
    });
  }

  // 3. Tranco top 10K should all be Tier A or B
  const trancoNotHighTier = await prisma.domain.count({
    where: {
      trancoRank: { lte: 10000 },
      indexTier: 'C',
      eligibleForScan: true,
    },
  });

  if (trancoNotHighTier > 100) {
    // Allow some buffer
    violations.push({
      invariant: 'tranco_top_10k_high_tier',
      expected: '<= 100 Tranco top 10K in Tier C',
      actual: `${trancoNotHighTier} domains`,
      severity: 'warning',
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp: new Date(),
  };
}

// ============================================================
// RUN ALL INVARIANTS
// ============================================================

export async function runAllInvariantChecks(prisma: PrismaClient): Promise<{
  tier: InvariantCheckResult;
  circuitBreaker: InvariantCheckResult;
  dataIntegrity: InvariantCheckResult;
  allPassed: boolean;
  criticalViolations: InvariantViolation[];
  allViolations: InvariantViolation[];
}> {
  const tier = await checkTierInvariants(prisma);
  const circuitBreaker = await checkCircuitBreakerInvariants(prisma);
  const dataIntegrity = await checkDataIntegrityInvariants(prisma);

  const allViolations = [
    ...tier.violations,
    ...circuitBreaker.violations,
    ...dataIntegrity.violations,
  ];
  const criticalViolations = allViolations.filter(
    (v) => v.severity === 'critical' || CRITICAL_INVARIANTS.includes(v.invariant as typeof CRITICAL_INVARIANTS[number])
  );

  // Log violations
  if (allViolations.length > 0) {
    console.log('\n--- INVARIANT CHECK RESULTS ---');
    for (const v of allViolations) {
      const icon =
        v.severity === 'critical' ? '🚨' : v.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} ${v.invariant}: expected ${v.expected}, got ${v.actual}`);
    }
  }

  // Persist critical violations to DB for alerting
  if (criticalViolations.length > 0) {
    const violationData = {
      violations: criticalViolations.map((v) => ({
        invariant: v.invariant,
        expected: v.expected,
        actual: v.actual,
        severity: v.severity,
      })),
      timestamp: new Date().toISOString(),
    };
    await prisma.systemState.upsert({
      where: { key: 'invariant_violations' },
      create: {
        key: 'invariant_violations',
        value: violationData,
      },
      update: {
        value: violationData,
      },
    });
  } else {
    // Clear old violations if all passed
    await prisma.systemState
      .delete({ where: { key: 'invariant_violations' } })
      .catch(() => {
        // Ignore if doesn't exist
      });
  }

  return {
    tier,
    circuitBreaker,
    dataIntegrity,
    allPassed: tier.passed && circuitBreaker.passed && dataIntegrity.passed,
    criticalViolations,
    allViolations,
  };
}

/**
 * Check if there are any unresolved critical violations.
 */
export async function hasCriticalViolations(prisma: PrismaClient): Promise<boolean> {
  const state = await prisma.systemState.findUnique({
    where: { key: 'invariant_violations' },
  });

  if (!state) return false;

  const value = state.value as { violations?: InvariantViolation[] };
  return (value.violations?.length ?? 0) > 0;
}

// ============================================================
// FIX 5: HARD-STOP ON CRITICAL VIOLATIONS
// ============================================================

/**
 * Check invariants and optionally halt on critical violations.
 *
 * @param haltOnCritical - If true, throws error on critical violations
 * @returns Check result with violations
 * @throws Error if haltOnCritical and critical violations found
 */
export async function checkInvariantsWithHalt(
  prisma: PrismaClient,
  context: {
    schedulerBatch?: { date: string; type: string; scheduled: Record<string, number> };
  },
  haltOnCritical: boolean = true
): Promise<InvariantCheckResult> {
  const violations: InvariantViolation[] = [];

  // Run all checks
  if (context.schedulerBatch) {
    const schedulerResult = await checkSchedulerInvariants(
      prisma,
      context.schedulerBatch.date,
      context.schedulerBatch.type,
      context.schedulerBatch.scheduled as { tierA: number; tierB: number; newDomains: number; anomaly: number }
    );
    violations.push(...schedulerResult.violations);
  }

  const tierResult = await checkTierInvariants(prisma);
  violations.push(...tierResult.violations);

  const cbResult = await checkCircuitBreakerInvariants(prisma);
  violations.push(...cbResult.violations);

  const dataResult = await checkDataIntegrityInvariants(prisma);
  violations.push(...dataResult.violations);

  // Separate critical from non-critical
  const criticalViolations = violations.filter(
    (v) =>
      v.severity === 'critical' ||
      CRITICAL_INVARIANTS.includes(v.invariant as typeof CRITICAL_INVARIANTS[number])
  );

  const result: InvariantCheckResult = {
    passed: violations.length === 0,
    violations,
    timestamp: new Date(),
  };

  // HARD STOP on critical violations
  if (haltOnCritical && criticalViolations.length > 0) {
    // Log to DB before halting
    const haltData = {
      violations: criticalViolations.map((v) => ({
        invariant: v.invariant,
        expected: v.expected,
        actual: v.actual,
        severity: v.severity,
      })),
      haltedAt: new Date().toISOString(),
      context: context
        ? {
            schedulerBatch: context.schedulerBatch
              ? {
                  date: context.schedulerBatch.date,
                  type: context.schedulerBatch.type,
                  scheduled: context.schedulerBatch.scheduled,
                }
              : undefined,
          }
        : {},
    };
    await prisma.systemState.upsert({
      where: { key: 'invariant_halt' },
      create: {
        key: 'invariant_halt',
        value: haltData,
      },
      update: {
        value: haltData,
      },
    });

    // Format error message
    const errorMsg = criticalViolations
      .map((v) => `${v.invariant}: expected ${v.expected}, got ${v.actual}`)
      .join('; ');

    throw new Error(`INVARIANT HALT: ${errorMsg}`);
  }

  return result;
}

/**
 * Wrapper for scheduler to use with halt.
 */
export async function runSchedulerWithInvariants(
  prisma: PrismaClient,
  scheduleFn: () => Promise<{ date: string; type: string; scheduled: Record<string, number> }>
): Promise<void> {
  // Pre-check: tier caps, breaker state
  await checkInvariantsWithHalt(prisma, {}, true);

  // Run scheduler
  const result = await scheduleFn();

  // Post-check: scheduling results
  await checkInvariantsWithHalt(prisma, { schedulerBatch: result }, true);
}
