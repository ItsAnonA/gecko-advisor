/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * BUDGET SERVICE
 *
 * Calculates dynamic scan budget allocation based on system state.
 * Implements circuit breaker pattern with recovery logic.
 *
 * Budget allocation priorities:
 * 1. New domains (50% base, 25% floor) - SEO moat expansion
 * 2. Tier A rescans (30% base, 20% floor) - Core freshness
 * 3. Tier B rescans (15% base) - Secondary freshness
 * 4. Anomaly rescans (5% base) - Volatility-triggered
 *
 * Dynamic adjustments:
 * - Circuit breaker reduces all by 50% when system stressed
 * - Tier A SLA violations steal from Tier B (not new domains)
 * - Queue backup throttles new domains
 */

import type { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import {
  SCAN_BUDGET,
  CIRCUIT_BREAKER,
  TIER_CONFIG,
  DAILY_CAPACITY,
  SLA_TARGETS,
} from '../config/tier-config.js';

// ============================================================
// TYPES
// ============================================================

export interface BudgetAllocation {
  newDomains: number;
  tierA: number;
  tierB: number;
  anomaly: number;
  total: number;
  adjusted: boolean;
  adjustmentReasons: string[];
}

interface CircuitBreakerState {
  isTriggered: boolean;
  triggeredAt: string | null;
  currentReductionLevel: number; // 0 = no reduction, 1 = full reduction
  lastStableAt: string | null;
  recoveryStep: number;

  // Recovery tracking (deterministic)
  stableWindowsRequired: number; // How many stable windows needed for next step
  stableWindowsAchieved: number; // How many we've seen
  recoveryHistory: Array<{
    step: number;
    timestamp: string;
    reductionLevel: number;
    reason: string;
  }>;

  // Metrics snapshot at trigger
  triggerMetrics?: {
    errorRate: number;
    totalScans: number;
    queueDepth: number;
    avgDuration: number;
  };
}

interface SystemMetrics {
  errorRate: number;
  totalScans: number; // Scans in the evaluation window (needed for minSampleSize check)
  queueDepth: number;
  avgDuration: number;
  p95DurationMs: number | null; // P95 scan latency from durationMs (null if no data)
}

// ============================================================
// CIRCUIT BREAKER STATE MANAGEMENT
// Uses database persistence with file fallback
// ============================================================

const CIRCUIT_BREAKER_KEY = 'circuit_breaker';

async function loadCircuitBreakerStateFromDb(
  prisma: PrismaClient
): Promise<CircuitBreakerState | null> {
  try {
    const record = await prisma.systemState.findUnique({
      where: { key: CIRCUIT_BREAKER_KEY },
    });
    if (record?.value) {
      return record.value as unknown as CircuitBreakerState;
    }
  } catch {
    // Table might not exist yet, fall through to file
  }
  return null;
}

async function saveCircuitBreakerStateToDb(
  prisma: PrismaClient,
  state: CircuitBreakerState
): Promise<void> {
  try {
    // Serialize to plain JSON-compatible object for Prisma
    const jsonValue = JSON.parse(JSON.stringify(state));
    await prisma.systemState.upsert({
      where: { key: CIRCUIT_BREAKER_KEY },
      create: { key: CIRCUIT_BREAKER_KEY, value: jsonValue },
      update: { value: jsonValue },
    });
  } catch {
    // Fall back to file if DB fails
    saveCircuitBreakerStateToFile(state);
  }
}

function getDefaultCircuitBreakerState(): CircuitBreakerState {
  return {
    isTriggered: false,
    triggeredAt: null,
    currentReductionLevel: 0,
    lastStableAt: null,
    recoveryStep: 0,
    stableWindowsRequired: 1,
    stableWindowsAchieved: 0,
    recoveryHistory: [],
  };
}

function loadCircuitBreakerStateFromFile(): CircuitBreakerState {
  try {
    if (fs.existsSync(CIRCUIT_BREAKER.stateFile)) {
      const content = fs.readFileSync(CIRCUIT_BREAKER.stateFile, 'utf-8');
      const saved = JSON.parse(content) as Partial<CircuitBreakerState>;
      // Merge with defaults to handle schema evolution
      return { ...getDefaultCircuitBreakerState(), ...saved };
    }
  } catch {
    // Ignore, return defaults
  }

  return getDefaultCircuitBreakerState();
}

function saveCircuitBreakerStateToFile(state: CircuitBreakerState): void {
  try {
    fs.writeFileSync(CIRCUIT_BREAKER.stateFile, JSON.stringify(state, null, 2));
  } catch {
    console.warn('Could not save circuit breaker state to file');
  }
}

async function loadCircuitBreakerState(prisma: PrismaClient): Promise<CircuitBreakerState> {
  // Try DB first, then file
  const dbState = await loadCircuitBreakerStateFromDb(prisma);
  if (dbState) return dbState;
  return loadCircuitBreakerStateFromFile();
}

async function saveCircuitBreakerState(
  prisma: PrismaClient,
  state: CircuitBreakerState
): Promise<void> {
  // Save to both DB and file for redundancy
  await saveCircuitBreakerStateToDb(prisma, state);
  saveCircuitBreakerStateToFile(state);
}

// ============================================================
// METRICS COLLECTION
// ============================================================

async function getSystemMetrics(prisma: PrismaClient): Promise<SystemMetrics> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Error rate (last hour)
  const [totalScans, failedScans] = await Promise.all([
    prisma.scan.count({
      where: { finishedAt: { gte: hourAgo } },
    }),
    prisma.scan.count({
      where: { finishedAt: { gte: hourAgo }, status: 'error' },
    }),
  ]);
  const errorRate = totalScans > 0 ? failedScans / totalScans : 0;

  // Queue depth (pending scans)
  const queueDepth = await prisma.scan.count({
    where: { status: { in: ['queued', 'running'] } },
  });

  // Average duration (last hour, completed scans only)
  const avgDurationResult = await prisma.$queryRaw<{ avg_seconds: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("finishedAt" - "createdAt"))) as avg_seconds
    FROM "Scan"
    WHERE "finishedAt" >= ${hourAgo}
      AND status = 'done'
  `;
  const avgDuration = avgDurationResult[0]?.avg_seconds ?? 0;

  // P95 scan latency from durationMs (last hour, completed scans with recorded duration)
  const p95Result = await prisma.$queryRaw<{ p95_ms: number | null }[]>`
    SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs") as p95_ms
    FROM "Scan"
    WHERE "finishedAt" >= ${hourAgo}
      AND status = 'done'
      AND "durationMs" IS NOT NULL
  `;
  const p95DurationMs = p95Result[0]?.p95_ms ?? null;

  return { errorRate, totalScans, queueDepth, avgDuration, p95DurationMs };
}

interface TierSLAMetrics {
  slaPercent: number;
  p90Staleness: number;
  p90ExceedsMax: boolean;
}

interface P90Status {
  tierA: { current: number; max: number; breached: boolean };
  tierB: { current: number; max: number; breached: boolean };
  tierC: { current: number; max: number; breached: boolean };
}

async function getP90Status(prisma: PrismaClient): Promise<P90Status> {
  const results = await Promise.all(
    (['A', 'B', 'C'] as const).map(async (tier) => {
      const p90 = await prisma.$queryRaw<{ p90_days: number | null }[]>`
        SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400
        ) as p90_days
        FROM "Domain"
        WHERE "indexTier" = ${tier}::"IndexTier"
          AND "eligibleForScan" = true
          AND "lastScannedAt" IS NOT NULL
      `;

      const current = p90[0]?.p90_days ?? 0;
      const slaTarget = (SLA_TARGETS as Record<string, { p90MaxDays: number }>)[tier];
      const max = slaTarget?.p90MaxDays ?? 0;

      return { tier, current, max, breached: current > max };
    })
  );

  return {
    tierA: results.find((r) => r.tier === 'A')!,
    tierB: results.find((r) => r.tier === 'B')!,
    tierC: results.find((r) => r.tier === 'C')!,
  };
}

async function getTierASLA(prisma: PrismaClient): Promise<TierSLAMetrics> {
  const cutoff = new Date(Date.now() - TIER_CONFIG.A.target * 24 * 60 * 60 * 1000);

  const [total, withinSLA, p90Result] = await Promise.all([
    prisma.domain.count({
      where: { indexTier: 'A', eligibleForScan: true, lastScannedAt: { not: null } },
    }),
    prisma.domain.count({
      where: { indexTier: 'A', eligibleForScan: true, lastScannedAt: { gte: cutoff } },
    }),
    prisma.$queryRaw<{ p90_days: number | null }[]>`
      SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastScannedAt")) / 86400
      ) as p90_days
      FROM "Domain"
      WHERE "indexTier" = 'A' AND "eligibleForScan" = true AND "lastScannedAt" IS NOT NULL
    `,
  ]);

  const slaPercent = total > 0 ? (withinSLA / total) * 100 : 100;
  const p90Staleness = p90Result[0]?.p90_days ?? 0;
  const slaTargetA = (SLA_TARGETS as Record<string, { p90MaxDays: number }>).A;
  const p90MaxDays = slaTargetA?.p90MaxDays ?? 7;

  return {
    slaPercent,
    p90Staleness,
    p90ExceedsMax: p90Staleness > p90MaxDays,
  };
}

/**
 * Multi-target p90 adjustment.
 *
 * Priority order for stealing budget when Tier A p90 is breached:
 * 1. Anomaly (5% → 2%)
 * 2. Tier B (15% → 10%, only if Tier B p90 is healthy)
 * 3. New domains (respect 25% floor)
 *
 * Returns when p90 is healthy (allows reset).
 */
function applyMultiTargetP90Adjustment(
  budget: { newDomains: number; tierA: number; tierB: number; anomaly: number },
  p90Status: P90Status
): { budget: typeof budget; reasons: string[] } {
  const reasons: string[] = [];

  // Only adjust if Tier A p90 is breached
  if (!p90Status.tierA.breached) {
    return { budget, reasons };
  }

  let needed = 0.1; // 10% extra for Tier A
  let stolen = 0;

  // 1. First, steal from anomaly (5% → 2%)
  const anomalyFloor = 0.02;
  const anomalySteal = Math.min(budget.anomaly - anomalyFloor, needed);
  if (anomalySteal > 0) {
    budget.anomaly -= anomalySteal;
    budget.tierA += anomalySteal;
    stolen += anomalySteal;
    reasons.push(`p90_steal_anomaly_${(anomalySteal * 100).toFixed(0)}%`);
  }
  needed -= stolen;

  // 2. Then, steal from Tier B (only if Tier B p90 is healthy)
  if (needed > 0 && !p90Status.tierB.breached) {
    const tierBFloor = 0.1; // Floor Tier B at 10%
    const tierBSteal = Math.min(budget.tierB - tierBFloor, needed);
    if (tierBSteal > 0) {
      budget.tierB -= tierBSteal;
      budget.tierA += tierBSteal;
      stolen += tierBSteal;
      reasons.push(`p90_steal_tierB_${(tierBSteal * 100).toFixed(0)}%`);
    }
    needed -= tierBSteal;
  } else if (p90Status.tierB.breached) {
    reasons.push('p90_tierB_also_breached_no_steal');
  }

  // 3. Last resort: steal from new domains (respect floor)
  if (needed > 0) {
    const newDomainsFloor = SCAN_BUDGET.floors.newDomains;
    const newDomainsSteal = Math.min(budget.newDomains - newDomainsFloor, needed);
    if (newDomainsSteal > 0) {
      budget.newDomains -= newDomainsSteal;
      budget.tierA += newDomainsSteal;
      stolen += newDomainsSteal;
      reasons.push(`p90_steal_newDomains_${(newDomainsSteal * 100).toFixed(0)}%`);
    }
  }

  if (stolen > 0) {
    reasons.push(
      `p90_total_adjustment_${(stolen * 100).toFixed(0)}%_tierA_p90=${p90Status.tierA.current.toFixed(1)}d`
    );
  }

  return { budget, reasons };
}

// ============================================================
// CIRCUIT BREAKER LOGIC
// ============================================================

function evaluateCircuitBreaker(
  metrics: SystemMetrics,
  state: CircuitBreakerState
): CircuitBreakerState {
  const now = new Date();
  const thresholds = CIRCUIT_BREAKER.thresholds;
  const recovery = CIRCUIT_BREAKER.recovery;

  // Check if any threshold is exceeded
  // Error rate check requires minimum sample size to avoid false positives
  // during low-volume periods (e.g., startup, night hours)
  const minSampleSize = (thresholds as { minSampleSize?: number }).minSampleSize ?? 10;
  const errorRateBreached =
    metrics.totalScans >= minSampleSize &&
    metrics.errorRate >= thresholds.errorRate;
  const isUnhealthy =
    errorRateBreached ||
    metrics.queueDepth >= thresholds.queueDepth ||
    metrics.avgDuration >= thresholds.avgDuration;

  if (isUnhealthy) {
    // Trigger or maintain circuit breaker
    const newState: CircuitBreakerState = {
      ...getDefaultCircuitBreakerState(),
      isTriggered: true,
      triggeredAt: state.triggeredAt || now.toISOString(),
      currentReductionLevel: 1,
      lastStableAt: null,
      recoveryStep: 0,
      stableWindowsRequired: 1,
      stableWindowsAchieved: 0,
      triggerMetrics: metrics,
      recoveryHistory: state.recoveryHistory || [],
    };

    // Log trigger event if new
    if (!state.isTriggered) {
      newState.recoveryHistory.push({
        step: 0,
        timestamp: now.toISOString(),
        reductionLevel: 1,
        reason: `triggered: errorRate=${(metrics.errorRate * 100).toFixed(1)}% (${metrics.totalScans} scans), queue=${metrics.queueDepth}, duration=${metrics.avgDuration.toFixed(1)}s`,
      });
    }

    return newState;
  }

  // System is healthy
  if (!state.isTriggered) {
    // Was already healthy, stay healthy
    return {
      ...state,
      lastStableAt: now.toISOString(),
      stableWindowsAchieved: 0,
    };
  }

  // Was triggered, check if we can start/continue recovery
  const lastStable = state.lastStableAt ? new Date(state.lastStableAt) : null;
  const stableFor = lastStable ? (now.getTime() - lastStable.getTime()) / (60 * 1000) : 0;

  if (!lastStable) {
    // Just became stable, start counting
    return {
      ...state,
      lastStableAt: now.toISOString(),
      stableWindowsAchieved: 1,
    };
  }

  // Count stable windows (each check interval = 1 window)
  const windowsAchieved = Math.floor(stableFor / recovery.checkIntervalMinutes);
  const windowsRequired = Math.max(1, Math.ceil(recovery.stableMinutes / recovery.checkIntervalMinutes));

  if (windowsAchieved >= windowsRequired) {
    // Stable long enough, can recover one step
    const newStep = state.recoveryStep + 1;

    // Cap recovery per run (max 1 step per scheduler cycle)
    if (newStep > state.recoveryStep + 1) {
      return { ...state, stableWindowsAchieved: windowsAchieved };
    }

    const newReductionLevel = Math.max(0, 1 - newStep * recovery.rampUpFactor);
    const history = [...(state.recoveryHistory || [])];

    if (newReductionLevel <= 0) {
      // Fully recovered
      history.push({
        step: newStep,
        timestamp: now.toISOString(),
        reductionLevel: 0,
        reason: 'fully_recovered',
      });

      // Keep only last 10 history entries
      const trimmedHistory = history.slice(-10);

      return {
        ...getDefaultCircuitBreakerState(),
        lastStableAt: now.toISOString(),
        recoveryHistory: trimmedHistory,
      };
    }

    // Partial recovery - log the step
    history.push({
      step: newStep,
      timestamp: now.toISOString(),
      reductionLevel: newReductionLevel,
      reason: `recovery_step_${newStep}_of_${recovery.maxRampSteps}`,
    });

    return {
      ...state,
      currentReductionLevel: newReductionLevel,
      lastStableAt: now.toISOString(),
      recoveryStep: newStep,
      stableWindowsRequired: windowsRequired,
      stableWindowsAchieved: 0, // Reset for next step
      recoveryHistory: history.slice(-10),
    };
  }

  // Still waiting for stable period
  return {
    ...state,
    stableWindowsAchieved: windowsAchieved,
  };
}

// ============================================================
// MAIN BUDGET CALCULATOR
// ============================================================

/**
 * Calculate dynamic budget allocation based on system state.
 *
 * Factors considered:
 * - Circuit breaker state (error rate, queue depth, duration)
 * - Tier A SLA compliance
 * - Exploration floor (never below 25% new domains)
 *
 * @param prisma - Prisma client instance
 * @param baseDailyBudget - Optional override for daily budget (defaults to DAILY_CAPACITY.effectiveCapacity)
 */
export async function calculateDynamicBudget(
  prisma: PrismaClient,
  baseDailyBudget?: number
): Promise<BudgetAllocation> {
  const dailyBudget = baseDailyBudget ?? DAILY_CAPACITY.effectiveCapacity;
  const adjustmentReasons: string[] = [];

  // Load circuit breaker state (DB with file fallback)
  let cbState = await loadCircuitBreakerState(prisma);

  // Get current metrics
  const metrics = await getSystemMetrics(prisma);
  const tierASLA = await getTierASLA(prisma);
  const p90Status = await getP90Status(prisma);

  // Evaluate circuit breaker
  cbState = evaluateCircuitBreaker(metrics, cbState);
  await saveCircuitBreakerState(prisma, cbState);

  // P95 soft alert: warn when scan latency is high (does NOT trigger breaker)
  if (metrics.p95DurationMs !== null && metrics.p95DurationMs > CIRCUIT_BREAKER.p95SoftAlertMs) {
    adjustmentReasons.push(
      `p95_latency_warn_${(metrics.p95DurationMs / 1000).toFixed(1)}s_exceeds_${(CIRCUIT_BREAKER.p95SoftAlertMs / 1000).toFixed(0)}s`
    );
  }

  // Start with base budget percentages (explicitly typed as number for arithmetic)
  let budget: { newDomains: number; tierA: number; tierB: number; anomaly: number } = {
    newDomains: SCAN_BUDGET.base.newDomains,
    tierA: SCAN_BUDGET.base.tierA,
    tierB: SCAN_BUDGET.base.tierB,
    anomaly: SCAN_BUDGET.base.anomaly,
  };

  // Apply circuit breaker reduction
  if (cbState.isTriggered) {
    const factor = 1 - cbState.currentReductionLevel * (1 - CIRCUIT_BREAKER.reductionFactor);
    budget = {
      newDomains: budget.newDomains * factor,
      tierA: budget.tierA * factor,
      tierB: budget.tierB * factor,
      anomaly: budget.anomaly * factor,
    };
    adjustmentReasons.push(
      `circuit_breaker_${(cbState.currentReductionLevel * 100).toFixed(0)}%` +
        (cbState.recoveryStep > 0 ? `_recovering_step_${cbState.recoveryStep}` : '')
    );
  }

  // Apply Tier A SLA adjustment using multi-target p90 approach
  // This uses smarter stealing: anomaly first, then Tier B (if healthy), then new domains
  if (!cbState.isTriggered && (tierASLA.slaPercent < SCAN_BUDGET.adjustments.tierASLAThreshold || p90Status.tierA.breached)) {
    // Use multi-target p90 adjustment for more sophisticated budget reallocation
    const { budget: adjustedBudget, reasons } = applyMultiTargetP90Adjustment(budget, p90Status);
    budget = adjustedBudget;
    adjustmentReasons.push(...reasons);

    // Also add SLA% reason if that's what triggered it
    if (tierASLA.slaPercent < SCAN_BUDGET.adjustments.tierASLAThreshold) {
      adjustmentReasons.push(`tier_a_sla_${tierASLA.slaPercent.toFixed(1)}%`);
    }
  }

  // Apply queue depth throttle (reduce new domains only)
  if (
    metrics.queueDepth >= SCAN_BUDGET.adjustments.queueDepthThreshold * 0.7 &&
    !cbState.isTriggered
  ) {
    const throttle = SCAN_BUDGET.adjustments.queueThrottlePercent;
    budget.newDomains *= 1 - throttle;
    adjustmentReasons.push(`queue_depth_${metrics.queueDepth}_throttle`);
  }

  // CRITICAL: Apply floors (never go below these)
  budget.newDomains = Math.max(budget.newDomains, SCAN_BUDGET.floors.newDomains);
  budget.tierA = Math.max(budget.tierA, SCAN_BUDGET.floors.tierA);

  // Normalize to ensure total = 1.0
  const total = budget.newDomains + budget.tierA + budget.tierB + budget.anomaly;
  if (total !== 1.0 && total > 0) {
    const scale = 1.0 / total;
    budget.newDomains *= scale;
    budget.tierA *= scale;
    budget.tierB *= scale;
    budget.anomaly *= scale;
  }

  // Convert to actual numbers
  return {
    newDomains: Math.floor(dailyBudget * budget.newDomains),
    tierA: Math.floor(dailyBudget * budget.tierA),
    tierB: Math.floor(dailyBudget * budget.tierB),
    anomaly: Math.floor(dailyBudget * budget.anomaly),
    total: dailyBudget,
    adjusted: adjustmentReasons.length > 0,
    adjustmentReasons,
  };
}

/**
 * Get current circuit breaker status for monitoring.
 */
export async function getCircuitBreakerStatus(prisma: PrismaClient): Promise<CircuitBreakerState> {
  return loadCircuitBreakerState(prisma);
}

/**
 * Reset circuit breaker (for manual intervention).
 */
export async function resetCircuitBreaker(prisma: PrismaClient): Promise<void> {
  await saveCircuitBreakerState(prisma, {
    isTriggered: false,
    triggeredAt: null,
    currentReductionLevel: 0,
    lastStableAt: new Date().toISOString(),
    recoveryStep: 0,
    stableWindowsRequired: 0,
    stableWindowsAchieved: 0,
    recoveryHistory: [],
  });
}

/**
 * Get system metrics for monitoring dashboard.
 */
export async function getSystemHealthMetrics(
  prisma: PrismaClient
): Promise<{
  metrics: SystemMetrics;
  circuitBreaker: CircuitBreakerState;
  tierASLA: TierSLAMetrics;
  p90Status: P90Status;
}> {
  const metrics = await getSystemMetrics(prisma);
  const circuitBreaker = await loadCircuitBreakerState(prisma);
  const tierASLA = await getTierASLA(prisma);
  const p90Status = await getP90Status(prisma);

  return { metrics, circuitBreaker, tierASLA, p90Status };
}
