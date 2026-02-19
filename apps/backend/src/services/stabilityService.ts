/**
 * Domain Stability Scoring Service (Phase 3C)
 *
 * Calculates and tracks domain privacy stability over time.
 * Identifies volatile, improving, declining, and stable domains.
 *
 * Phase 3C Hardening: Tiered stability coverage for higher coverage.
 *
 * Performance: Batch functions use bulk queries to avoid N+1 patterns.
 * Single-domain functions (calculateDomainStability, calculateDomainStabilityTiered)
 * are retained for individual API calls.
 */

import type { PrismaClient, DomainTrend, ChangeType, IndexTier } from '@prisma/client';

// ============================================================
// TIERED STABILITY REQUIREMENTS (Gap 2 Fix)
// ============================================================

export const STABILITY_REQUIREMENTS = {
  // Full stability score (high confidence)
  full: {
    minScans: 3,
    minTimeSpanDays: 30,
    confidenceLevel: 'high' as const,
    confidenceMultiplier: 1.0,
  },

  // Partial stability score (medium confidence)
  partial: {
    minScans: 2,
    minTimeSpanDays: 14,
    confidenceLevel: 'medium' as const,
    confidenceMultiplier: 0.7,
  },

  // Provisional stability score (low confidence, but better than nothing)
  provisional: {
    minScans: 1,
    minTimeSpanDays: 0,
    confidenceLevel: 'provisional' as const,
    confidenceMultiplier: 0.4,
  },
} as const;

export type ConfidenceLevel = 'high' | 'medium' | 'provisional';

interface StabilityMetrics {
  volatilityIndex: number;
  stabilityScore: number;
  trend: DomainTrend;
  trendStrength: number;
  avgScoreLast30d: number;
  avgScoreLast90d: number;
  scoreStdDev30d: number;
  scoreStdDev90d: number;
  changesLast30d: number;
  changesLast90d: number;
  majorChangesLast90d: number;
  confidenceLevel?: ConfidenceLevel;
  confidenceScore?: number;
  scanCount?: number;
}

// Type for pre-fetched domain proxy data used in provisional stability calculations
type DomainProxyRow = { id: string; trancoRank: number | null; indexTier: string };

/**
 * Calculate standard deviation for an array of numbers.
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Compute error-weighted scan confidence using Laplace-smoothed beta mean.
 *
 * Returns 0.0–1.0 representing how reliable a domain's scan history is.
 * Domains with high failure rates get lower confidence, preventing
 * inflated stability labels.
 *
 * Formula: (successes + 1) / (successes + failures + 2)
 * - 0 successes, 0 failures → 0.5 (neutral prior)
 * - 5 successes, 0 failures → 0.857
 * - 1 success, 4 failures  → 0.286
 */
export function computeScanConfidence(successes: number, failures: number): number {
  return (successes + 1) / (successes + failures + 2);
}

/**
 * Compute percentiles from an array of numeric values.
 *
 * Uses nearest-rank method: p-th percentile is the smallest value
 * such that at least p% of the data is ≤ that value.
 *
 * @param values - Array of numeric values (unsorted is fine)
 * @param percentiles - Which percentiles to compute (default: [50, 90, 95])
 * @returns Record mapping percentile → value (empty if no data)
 */
export function computePercentiles(
  values: number[],
  percentiles: number[] = [50, 90, 95],
): Record<number, number> {
  if (values.length === 0) return {};
  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<number, number> = {};
  for (const p of percentiles) {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    result[p] = sorted[Math.max(0, idx)] ?? 0;
  }
  return result;
}

/**
 * Calculate trend from scan history.
 */
export function calculateTrend(scans: { score: number | null; finishedAt: Date | null }[]): {
  trend: DomainTrend;
  trendStrength: number;
} {
  if (scans.length < 3) {
    return { trend: 'STABLE', trendStrength: 0 };
  }

  // Split into halves (recent vs older)
  const midpoint = Math.floor(scans.length / 2);
  const recentScores = scans.slice(0, midpoint).map((s) => s.score!);
  const olderScores = scans.slice(midpoint).map((s) => s.score!);

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

  const delta = recentAvg - olderAvg;
  const percentChange = olderAvg !== 0 ? (delta / olderAvg) * 100 : 0;

  // Calculate variance
  const allScores = scans.map((s) => s.score!);
  const stdDev = calculateStdDev(allScores);
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const coefficientOfVariation = mean !== 0 ? stdDev / mean : 0;

  // Classify
  // CV > 0.15 = stddev is >15% of mean (e.g., stdDev > 10.5 for mean 70)
  // Previous threshold of 0.3 was unreachable for normal privacy scores,
  // requiring stdDev > 21 for a mean of 70 - only extreme oscillation qualified.
  if (coefficientOfVariation > 0.15) {
    return { trend: 'VOLATILE', trendStrength: Math.min(1, coefficientOfVariation / 0.3) };
  }

  if (percentChange > 5) {
    return { trend: 'IMPROVING', trendStrength: Math.min(1, percentChange / 20) };
  }

  if (percentChange < -5) {
    return { trend: 'DECLINING', trendStrength: Math.min(1, Math.abs(percentChange) / 20) };
  }

  return { trend: 'STABLE', trendStrength: 1 - Math.abs(percentChange) / 10 };
}

// ============================================================
// PURE COMPUTATION FUNCTIONS (no Prisma, operate on pre-fetched data)
// ============================================================

/**
 * Compute full/partial stability metrics from pre-fetched scan and change data.
 * This is the same logic as calculateDomainStability / calculateDomainStabilityTiered
 * but operates on already-fetched arrays instead of issuing queries.
 */
export function computeStabilityFromData(
  scans: { score: number | null; finishedAt: Date | null }[],
  changes: { detectedAt: Date; changeType: ChangeType }[],
  thirtyDaysAgo: Date,
  confidenceLevel: ConfidenceLevel,
  confidenceMultiplier: number
): StabilityMetrics {
  // Split by period
  const scans30d = scans.filter((s) => s.finishedAt! >= thirtyDaysAgo);
  const scores30d = scans30d.map((s) => s.score!);
  const scores90d = scans.map((s) => s.score!);

  // Calculate averages
  const avgScoreLast30d = scores30d.length > 0 ? scores30d.reduce((a, b) => a + b, 0) / scores30d.length : 0;
  const avgScoreLast90d = scores90d.reduce((a, b) => a + b, 0) / scores90d.length;

  // Calculate standard deviations
  const scoreStdDev30d = calculateStdDev(scores30d);
  const scoreStdDev90d = calculateStdDev(scores90d);

  // Change counts
  const changesLast30d = changes.filter((c) => c.detectedAt >= thirtyDaysAgo).length;
  const changesLast90d = changes.length;
  const majorChangesLast90d = changes.filter(
    (c) => c.changeType === 'MAJOR' || c.changeType === 'CRITICAL'
  ).length;

  // Calculate volatility index (0-100)
  const volatilityIndex = Math.min(
    100,
    scoreStdDev90d * 5 + changesLast90d * 2 + majorChangesLast90d * 10
  );

  // Calculate stability score (0-100)
  const stabilityScore = Math.max(0, 100 - volatilityIndex);

  // Determine trend from scan history
  const { trend: rawTrend, trendStrength: rawTrendStrength } = calculateTrend(scans);

  // Reconcile trend with volatilityIndex.
  // The volatilityIndex formula (change-frequency-sensitive) can disagree with the
  // CV-based trend classification. A domain with many small changes may have
  // volatilityIndex >= 40 but low CV. Override to VOLATILE in this case.
  let trend = rawTrend;
  let trendStrength = rawTrendStrength;
  if (volatilityIndex >= 40 && rawTrend === 'STABLE') {
    trend = 'VOLATILE' as DomainTrend;
    trendStrength = Math.min(1, volatilityIndex / 100);
  }

  return {
    volatilityIndex,
    stabilityScore,
    trend,
    trendStrength,
    avgScoreLast30d,
    avgScoreLast90d,
    scoreStdDev30d,
    scoreStdDev90d,
    changesLast30d,
    changesLast90d,
    majorChangesLast90d,
    confidenceLevel,
    confidenceScore: confidenceMultiplier,
    scanCount: scans.length,
  };
}

/**
 * Compute provisional stability from pre-fetched domain proxy data.
 * Same logic as calculateProvisionalStability but without Prisma calls.
 */
export function computeProvisionalFromData(
  domainProxy: { trancoRank: number | null; indexTier: string } | null,
  latestScore: number | null
): StabilityMetrics {
  let stabilityEstimate = 50; // Base

  if (domainProxy?.trancoRank && domainProxy.trancoRank <= 10000) {
    stabilityEstimate += 20;
  } else if (domainProxy?.trancoRank && domainProxy.trancoRank <= 100000) {
    stabilityEstimate += 10;
  }

  if (domainProxy?.indexTier === 'A') {
    stabilityEstimate += 15;
  } else if (domainProxy?.indexTier === 'B') {
    stabilityEstimate += 5;
  }

  const score = latestScore ?? 50;

  return {
    volatilityIndex: 100 - stabilityEstimate,
    stabilityScore: stabilityEstimate,
    trend: 'STABLE' as DomainTrend,
    trendStrength: 0.3,
    avgScoreLast30d: score,
    avgScoreLast90d: score,
    scoreStdDev30d: 0,
    scoreStdDev90d: 0,
    changesLast30d: 0,
    changesLast90d: 0,
    majorChangesLast90d: 0,
    confidenceLevel: 'provisional',
    confidenceScore: STABILITY_REQUIREMENTS.provisional.confidenceMultiplier,
    scanCount: 1,
  };
}

/**
 * Group an array of rows by domainId into a Map.
 * Rows with null domainId are skipped (shouldn't occur when queried with { in: [...] }).
 */
function groupByDomainId<T extends { domainId: string | null }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    if (row.domainId == null) continue;
    let arr = map.get(row.domainId);
    if (!arr) {
      arr = [];
      map.set(row.domainId, arr);
    }
    arr.push(row);
  }
  return map;
}

/**
 * Calculate stability metrics for a domain.
 */
export async function calculateDomainStability(
  prisma: PrismaClient,
  domainId: string
): Promise<StabilityMetrics | null> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get recent scans
  const scans = await prisma.scan.findMany({
    where: {
      domainId,
      status: 'done',
      finishedAt: { gte: ninetyDaysAgo },
      score: { not: null },
    },
    orderBy: { finishedAt: 'desc' },
    select: {
      score: true,
      finishedAt: true,
    },
  });

  // Original function requires 3+ scans (high confidence only)
  if (scans.length < 3) return null;

  // Split by period
  const scans30d = scans.filter((s) => s.finishedAt! >= thirtyDaysAgo);
  const scores30d = scans30d.map((s) => s.score!);
  const scores90d = scans.map((s) => s.score!);

  // Calculate averages
  const avgScoreLast30d = scores30d.length > 0 ? scores30d.reduce((a, b) => a + b, 0) / scores30d.length : 0;
  const avgScoreLast90d = scores90d.reduce((a, b) => a + b, 0) / scores90d.length;

  // Calculate standard deviations
  const scoreStdDev30d = calculateStdDev(scores30d);
  const scoreStdDev90d = calculateStdDev(scores90d);

  // Get change counts
  const changes = await prisma.domainChange.findMany({
    where: {
      domainId,
      detectedAt: { gte: ninetyDaysAgo },
    },
    select: {
      detectedAt: true,
      changeType: true,
      scoreDelta: true,
    },
  });

  const changesLast30d = changes.filter((c) => c.detectedAt >= thirtyDaysAgo).length;
  const changesLast90d = changes.length;
  const majorChangesLast90d = changes.filter(
    (c) => c.changeType === 'MAJOR' || c.changeType === 'CRITICAL'
  ).length;

  // Calculate volatility index (0-100)
  // Higher = more volatile
  const volatilityIndex = Math.min(
    100,
    scoreStdDev90d * 5 + // Score variance
      changesLast90d * 2 + // Change frequency
      majorChangesLast90d * 10 // Major changes
  );

  // Calculate stability score (0-100)
  // Higher = more stable (inverse of volatility)
  const stabilityScore = Math.max(0, 100 - volatilityIndex);

  // Determine trend and reconcile with volatilityIndex
  const { trend: rawTrend, trendStrength: rawTrendStrength } = calculateTrend(scans);
  let trend = rawTrend;
  let trendStrength = rawTrendStrength;
  if (volatilityIndex >= 40 && rawTrend === 'STABLE') {
    trend = 'VOLATILE' as DomainTrend;
    trendStrength = Math.min(1, volatilityIndex / 100);
  }

  return {
    volatilityIndex,
    stabilityScore,
    trend,
    trendStrength,
    avgScoreLast30d,
    avgScoreLast90d,
    scoreStdDev30d,
    scoreStdDev90d,
    changesLast30d,
    changesLast90d,
    majorChangesLast90d,
    confidenceLevel: 'high' as ConfidenceLevel,
    confidenceScore: 1.0,
    scanCount: scans.length,
  };
}

/**
 * Get time span in days between first and last scan.
 */
function getTimeSpanDays(scans: { finishedAt: Date | null }[]): number {
  if (scans.length < 2) return 0;
  const first = scans[scans.length - 1]?.finishedAt;
  const last = scans[0]?.finishedAt;
  if (!first || !last) return 0;
  return Math.floor((last.getTime() - first.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Calculate provisional stability using proxy signals.
 * Used when only 1 scan is available.
 */
async function calculateProvisionalStability(
  prisma: PrismaClient,
  domainId: string,
  latestScan: { score: number | null; finishedAt: Date | null }
): Promise<StabilityMetrics> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      trancoRank: true,
      indexTier: true,
    },
  });

  // Proxy stability from tier and Tranco rank
  let stabilityEstimate = 50; // Base

  if (domain?.trancoRank && domain.trancoRank <= 10000) {
    stabilityEstimate += 20;
  } else if (domain?.trancoRank && domain.trancoRank <= 100000) {
    stabilityEstimate += 10;
  }

  if (domain?.indexTier === 'A') {
    stabilityEstimate += 15;
  } else if (domain?.indexTier === 'B') {
    stabilityEstimate += 5;
  }

  const score = latestScan.score ?? 50;

  return {
    volatilityIndex: 100 - stabilityEstimate,
    stabilityScore: stabilityEstimate,
    trend: 'STABLE', // Assume stable until proven otherwise
    trendStrength: 0.3,
    avgScoreLast30d: score,
    avgScoreLast90d: score,
    scoreStdDev30d: 0,
    scoreStdDev90d: 0,
    changesLast30d: 0,
    changesLast90d: 0,
    majorChangesLast90d: 0,
    confidenceLevel: 'provisional',
    confidenceScore: STABILITY_REQUIREMENTS.provisional.confidenceMultiplier,
    scanCount: 1,
  };
}

/**
 * Calculate stability with tiered confidence.
 * Provides coverage even for domains with limited history.
 */
export async function calculateDomainStabilityTiered(
  prisma: PrismaClient,
  domainId: string
): Promise<StabilityMetrics | null> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get recent scans
  const scans = await prisma.scan.findMany({
    where: {
      domainId,
      status: 'done',
      finishedAt: { gte: ninetyDaysAgo },
      score: { not: null },
    },
    orderBy: { finishedAt: 'desc' },
    select: {
      score: true,
      finishedAt: true,
    },
  });

  // Determine which tier we can calculate
  let tier: 'full' | 'partial' | 'provisional';
  let confidenceMultiplier: number;

  const timeSpan = getTimeSpanDays(scans);

  if (scans.length >= STABILITY_REQUIREMENTS.full.minScans && timeSpan >= STABILITY_REQUIREMENTS.full.minTimeSpanDays) {
    tier = 'full';
    confidenceMultiplier = STABILITY_REQUIREMENTS.full.confidenceMultiplier;
  } else if (scans.length >= STABILITY_REQUIREMENTS.partial.minScans && timeSpan >= STABILITY_REQUIREMENTS.partial.minTimeSpanDays) {
    tier = 'partial';
    confidenceMultiplier = STABILITY_REQUIREMENTS.partial.confidenceMultiplier;
  } else if (scans.length >= STABILITY_REQUIREMENTS.provisional.minScans) {
    tier = 'provisional';
    confidenceMultiplier = STABILITY_REQUIREMENTS.provisional.confidenceMultiplier;
  } else {
    return null;
  }

  // For provisional, use proxy signals
  if (tier === 'provisional') {
    const latestScan = scans[0];
    if (!latestScan) return null;
    return calculateProvisionalStability(prisma, domainId, latestScan);
  }

  // Split by period
  const scans30d = scans.filter((s) => s.finishedAt! >= thirtyDaysAgo);
  const scores30d = scans30d.map((s) => s.score!);
  const scores90d = scans.map((s) => s.score!);

  // Calculate averages
  const avgScoreLast30d = scores30d.length > 0 ? scores30d.reduce((a, b) => a + b, 0) / scores30d.length : 0;
  const avgScoreLast90d = scores90d.reduce((a, b) => a + b, 0) / scores90d.length;

  // Calculate standard deviations
  const scoreStdDev30d = calculateStdDev(scores30d);
  const scoreStdDev90d = calculateStdDev(scores90d);

  // Get change counts
  const changes = await prisma.domainChange.findMany({
    where: {
      domainId,
      detectedAt: { gte: ninetyDaysAgo },
    },
    select: {
      detectedAt: true,
      changeType: true,
      scoreDelta: true,
    },
  });

  const changesLast30d = changes.filter((c) => c.detectedAt >= thirtyDaysAgo).length;
  const changesLast90d = changes.length;
  const majorChangesLast90d = changes.filter(
    (c) => c.changeType === 'MAJOR' || c.changeType === 'CRITICAL'
  ).length;

  // Calculate volatility index (0-100)
  const volatilityIndex = Math.min(
    100,
    scoreStdDev90d * 5 + changesLast90d * 2 + majorChangesLast90d * 10
  );

  // Calculate stability score (0-100)
  const stabilityScore = Math.max(0, 100 - volatilityIndex);

  // Determine trend and reconcile with volatilityIndex
  const { trend: rawTrend, trendStrength: rawTrendStrength } = calculateTrend(scans);
  let trend = rawTrend;
  let trendStrength = rawTrendStrength;
  if (volatilityIndex >= 40 && rawTrend === 'STABLE') {
    trend = 'VOLATILE' as DomainTrend;
    trendStrength = Math.min(1, volatilityIndex / 100);
  }

  return {
    volatilityIndex,
    stabilityScore,
    trend,
    trendStrength,
    avgScoreLast30d,
    avgScoreLast90d,
    scoreStdDev30d,
    scoreStdDev90d,
    changesLast30d,
    changesLast90d,
    majorChangesLast90d,
    confidenceLevel: tier === 'full' ? 'high' : tier === 'partial' ? 'medium' : 'provisional',
    confidenceScore: confidenceMultiplier,
    scanCount: scans.length,
  };
}

/**
 * Batch update stability scores for all domains (original - high confidence only).
 * Run daily.
 *
 * Optimized: fetches scans and changes for the entire batch in 2 bulk queries
 * instead of 2 queries per domain (eliminates N+1 pattern).
 */
export async function updateAllDomainStability(prisma: PrismaClient): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  let processed = 0;
  let updated = 0;
  let errors = 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const BATCH_SIZE = 100;
  let cursor: string | undefined;

  while (true) {
    const domains = await prisma.domain.findMany({
      where: {
        eligibleForScan: true,
        indexTier: { in: ['A', 'B'] }, // Focus on important tiers
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true },
    });

    if (domains.length === 0) break;

    const domainIds = domains.map((d) => d.id);

    // Batch-fetch all scans and changes for this page of domains (2 queries total)
    const [allScans, allChanges] = await Promise.all([
      prisma.scan.findMany({
        where: {
          domainId: { in: domainIds },
          status: 'done',
          finishedAt: { gte: ninetyDaysAgo },
          score: { not: null },
        },
        orderBy: { finishedAt: 'desc' },
        select: { domainId: true, score: true, finishedAt: true },
      }),
      prisma.domainChange.findMany({
        where: {
          domainId: { in: domainIds },
          detectedAt: { gte: ninetyDaysAgo },
        },
        select: { domainId: true, detectedAt: true, changeType: true },
      }),
    ]);

    // Group by domainId for O(1) lookup
    const scansByDomain = groupByDomainId(allScans);
    const changesByDomain = groupByDomainId(allChanges);

    // Build upsert operations for domains that qualify
    const upsertOps: Array<ReturnType<typeof prisma.domainStability.upsert>> = [];

    for (const domain of domains) {
      try {
        const scans = scansByDomain.get(domain.id) ?? [];

        // Original function requires 3+ scans (high confidence only)
        if (scans.length < 3) {
          processed++;
          continue;
        }

        const changes = changesByDomain.get(domain.id) ?? [];
        const metrics = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

        upsertOps.push(
          prisma.domainStability.upsert({
            where: { domainId: domain.id },
            create: {
              domainId: domain.id,
              volatilityIndex: metrics.volatilityIndex,
              stabilityScore: metrics.stabilityScore,
              trend: metrics.trend,
              trendStrength: metrics.trendStrength,
              avgScoreLast30d: metrics.avgScoreLast30d,
              avgScoreLast90d: metrics.avgScoreLast90d,
              scoreStdDev30d: metrics.scoreStdDev30d,
              scoreStdDev90d: metrics.scoreStdDev90d,
              changesLast30d: metrics.changesLast30d,
              changesLast90d: metrics.changesLast90d,
              majorChangesLast90d: metrics.majorChangesLast90d,
            },
            update: {
              volatilityIndex: metrics.volatilityIndex,
              stabilityScore: metrics.stabilityScore,
              trend: metrics.trend,
              trendStrength: metrics.trendStrength,
              avgScoreLast30d: metrics.avgScoreLast30d,
              avgScoreLast90d: metrics.avgScoreLast90d,
              scoreStdDev30d: metrics.scoreStdDev30d,
              scoreStdDev90d: metrics.scoreStdDev90d,
              changesLast30d: metrics.changesLast30d,
              changesLast90d: metrics.changesLast90d,
              majorChangesLast90d: metrics.majorChangesLast90d,
              calculatedAt: new Date(),
            },
          })
        );
        updated++;
      } catch {
        errors++;
      }
      processed++;
    }

    // Execute all upserts for this batch in a single transaction
    if (upsertOps.length > 0) {
      try {
        await prisma.$transaction(upsertOps);
      } catch {
        // If batch transaction fails, fall back to individual upserts
        // so partial progress is not lost
        for (const op of upsertOps) {
          try {
            await op;
          } catch {
            errors++;
            updated--; // We pre-incremented above
          }
        }
      }
    }

    cursor = domains[domains.length - 1]?.id;
  }

  return { processed, updated, errors };
}

/**
 * Get unstable domains that need attention.
 */
export async function getUnstableDomains(
  prisma: PrismaClient,
  options: {
    tier?: IndexTier;
    minVolatility?: number;
    limit?: number;
  } = {}
): Promise<
  Array<{
    id: string;
    domainId: string;
    volatilityIndex: number;
    trend: DomainTrend;
    domain: { domain: string; indexTier: IndexTier; category: { name: string } | null };
  }>
> {
  const { tier, minVolatility = 50, limit = 20 } = options;

  return prisma.domainStability.findMany({
    where: {
      volatilityIndex: { gte: minVolatility },
      ...(tier ? { domain: { indexTier: tier } } : {}),
    },
    orderBy: { volatilityIndex: 'desc' },
    take: limit,
    include: {
      domain: {
        select: {
          domain: true,
          indexTier: true,
          category: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * Get improving/declining domains.
 */
export async function getDomainsByTrend(
  prisma: PrismaClient,
  trend: DomainTrend,
  options: { tier?: IndexTier; minStrength?: number; limit?: number } = {}
): Promise<
  Array<{
    id: string;
    domainId: string;
    trend: DomainTrend;
    trendStrength: number;
    domain: { domain: string; indexTier: IndexTier; category: { name: string } | null };
  }>
> {
  const { tier, minStrength = 0.3, limit = 20 } = options;

  return prisma.domainStability.findMany({
    where: {
      trend,
      trendStrength: { gte: minStrength },
      ...(tier ? { domain: { indexTier: tier } } : {}),
    },
    orderBy: { trendStrength: 'desc' },
    take: limit,
    include: {
      domain: {
        select: {
          domain: true,
          indexTier: true,
          category: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * Batch update stability scores for ALL eligible domains with tiered coverage.
 * Includes domains with 1+ scans (provisional), 2+ scans (partial), 3+ scans (full).
 *
 * Optimized: fetches scans, changes, and domain proxy data for the entire batch
 * in bulk queries instead of 2-3 queries per domain (eliminates N+1 pattern).
 * For a batch of 100 domains, this reduces from ~300 queries to ~4 queries.
 */
export async function updateAllDomainStabilityV2(prisma: PrismaClient): Promise<{
  full: number;
  partial: number;
  provisional: number;
  skipped: number;
  errors: number;
  total: number;
}> {
  const counts = { full: 0, partial: 0, provisional: 0, skipped: 0, errors: 0, total: 0 };
  const BATCH_SIZE = 100;
  let cursor: string | undefined;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Process ALL domains with at least 1 scan
  while (true) {
    // Query 1: page of domains (includes trancoRank/indexTier for provisional proxy)
    const domains = await prisma.domain.findMany({
      where: {
        eligibleForScan: true,
        scans: { some: { status: 'done', score: { not: null } } },
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, indexTier: true, trancoRank: true, scanSuccessCount: true, scanFailureCount: true, scanConfidence: true },
    });

    if (domains.length === 0) break;

    const domainIds = domains.map((d) => d.id);

    // Query 2 + 3: bulk-fetch all scans and changes for this batch
    const [allScans, allChanges] = await Promise.all([
      prisma.scan.findMany({
        where: {
          domainId: { in: domainIds },
          status: 'done',
          finishedAt: { gte: ninetyDaysAgo },
          score: { not: null },
        },
        orderBy: { finishedAt: 'desc' },
        select: { domainId: true, score: true, finishedAt: true },
      }),
      prisma.domainChange.findMany({
        where: {
          domainId: { in: domainIds },
          detectedAt: { gte: ninetyDaysAgo },
        },
        select: { domainId: true, detectedAt: true, changeType: true },
      }),
    ]);

    // Group by domainId for O(1) lookup
    const scansByDomain = groupByDomainId(allScans);
    const changesByDomain = groupByDomainId(allChanges);

    // Build a lookup for domain proxy data (for provisional calculations)
    const domainProxyMap = new Map<string, DomainProxyRow>();
    for (const d of domains) {
      domainProxyMap.set(d.id, d);
    }

    // Compute metrics and build upsert operations
    const upsertOps: Array<ReturnType<typeof prisma.domainStability.upsert>> = [];
    const upsertConfidenceLevels: ConfidenceLevel[] = [];

    for (const domain of domains) {
      try {
        const scans = scansByDomain.get(domain.id) ?? [];

        if (scans.length === 0) {
          counts.skipped++;
          continue;
        }

        // Determine tier
        const timeSpan = getTimeSpanDays(scans);
        let tier: 'full' | 'partial' | 'provisional';
        let confidenceMultiplier: number;

        if (scans.length >= STABILITY_REQUIREMENTS.full.minScans && timeSpan >= STABILITY_REQUIREMENTS.full.minTimeSpanDays) {
          tier = 'full';
          confidenceMultiplier = STABILITY_REQUIREMENTS.full.confidenceMultiplier;
        } else if (scans.length >= STABILITY_REQUIREMENTS.partial.minScans && timeSpan >= STABILITY_REQUIREMENTS.partial.minTimeSpanDays) {
          tier = 'partial';
          confidenceMultiplier = STABILITY_REQUIREMENTS.partial.confidenceMultiplier;
        } else if (scans.length >= STABILITY_REQUIREMENTS.provisional.minScans) {
          tier = 'provisional';
          confidenceMultiplier = STABILITY_REQUIREMENTS.provisional.confidenceMultiplier;
        } else {
          counts.skipped++;
          continue;
        }

        let metrics: StabilityMetrics;

        if (tier === 'provisional') {
          // Use proxy signals from already-fetched domain data (no extra query)
          const latestScan = scans[0];
          if (!latestScan) {
            counts.skipped++;
            continue;
          }
          const domainProxy = domainProxyMap.get(domain.id) ?? null;
          metrics = computeProvisionalFromData(domainProxy, latestScan.score);
        } else {
          // Full or partial: compute from scan + change data
          const changes = changesByDomain.get(domain.id) ?? [];
          const confidenceLevel: ConfidenceLevel = tier === 'full' ? 'high' : 'medium';
          metrics = computeStabilityFromData(scans, changes, thirtyDaysAgo, confidenceLevel, confidenceMultiplier);
        }

        // Error-weighted confidence gates:
        // Downgrade stability tier if scan confidence is too low
        const domainConfidence = domain.scanConfidence ?? computeScanConfidence(domain.scanSuccessCount, domain.scanFailureCount);

        // Gate 1: suppress high/medium confidence if error-weighted confidence too low
        if (metrics.confidenceLevel !== 'provisional' && domainConfidence < 0.6) {
          metrics = { ...metrics, confidenceLevel: 'provisional', confidenceScore: domainConfidence };
          tier = 'provisional';
          confidenceMultiplier = STABILITY_REQUIREMENTS.provisional.confidenceMultiplier;
        }

        // Gate 2: force provisional if fewer than 3 successful scans
        if (domain.scanSuccessCount < 3 && tier !== 'provisional') {
          metrics = { ...metrics, confidenceLevel: 'provisional', confidenceScore: domainConfidence };
          tier = 'provisional';
          confidenceMultiplier = STABILITY_REQUIREMENTS.provisional.confidenceMultiplier;
        }

        upsertOps.push(
          prisma.domainStability.upsert({
            where: { domainId: domain.id },
            create: {
              domainId: domain.id,
              volatilityIndex: metrics.volatilityIndex,
              stabilityScore: metrics.stabilityScore,
              trend: metrics.trend,
              trendStrength: metrics.trendStrength,
              avgScoreLast30d: metrics.avgScoreLast30d,
              avgScoreLast90d: metrics.avgScoreLast90d,
              scoreStdDev30d: metrics.scoreStdDev30d,
              scoreStdDev90d: metrics.scoreStdDev90d,
              changesLast30d: metrics.changesLast30d,
              changesLast90d: metrics.changesLast90d,
              majorChangesLast90d: metrics.majorChangesLast90d,
            },
            update: {
              volatilityIndex: metrics.volatilityIndex,
              stabilityScore: metrics.stabilityScore,
              trend: metrics.trend,
              trendStrength: metrics.trendStrength,
              avgScoreLast30d: metrics.avgScoreLast30d,
              avgScoreLast90d: metrics.avgScoreLast90d,
              scoreStdDev30d: metrics.scoreStdDev30d,
              scoreStdDev90d: metrics.scoreStdDev90d,
              changesLast30d: metrics.changesLast30d,
              changesLast90d: metrics.changesLast90d,
              majorChangesLast90d: metrics.majorChangesLast90d,
              calculatedAt: new Date(),
            },
          })
        );

        // Track confidence level for counting after transaction succeeds
        const cl: ConfidenceLevel = metrics.confidenceLevel ?? 'provisional';
        upsertConfidenceLevels.push(cl);
      } catch {
        counts.errors++;
      }
    }

    // Execute all upserts for this batch in a single transaction
    if (upsertOps.length > 0) {
      try {
        await prisma.$transaction(upsertOps);
        // Count by confidence level only after successful commit
        for (const cl of upsertConfidenceLevels) {
          if (cl === 'high') counts.full++;
          else if (cl === 'medium') counts.partial++;
          else counts.provisional++;
        }
      } catch {
        // If batch transaction fails, fall back to individual upserts
        for (let i = 0; i < upsertOps.length; i++) {
          try {
            await upsertOps[i];
            const cl = upsertConfidenceLevels[i]!;
            if (cl === 'high') counts.full++;
            else if (cl === 'medium') counts.partial++;
            else counts.provisional++;
          } catch {
            counts.errors++;
          }
        }
      }
    }

    cursor = domains[domains.length - 1]?.id;
  }

  counts.total = counts.full + counts.partial + counts.provisional;
  return counts;
}

/**
 * Get stability coverage statistics.
 *
 * Optimized: uses groupBy to get per-tier counts in 2 queries total
 * instead of 2 queries per tier in a loop (was 8 queries, now 4).
 */
export async function getStabilityCoverage(prisma: PrismaClient): Promise<{
  totalDomains: number;
  withStability: number;
  coveragePercent: number;
  byTier: Record<string, { total: number; covered: number; percent: number }>;
}> {
  // 4 parallel queries instead of 8 sequential ones
  const [totalDomains, withStability, domainsByTier, coveredByTier] = await Promise.all([
    prisma.domain.count({
      where: { eligibleForScan: true },
    }),
    prisma.domainStability.count(),
    prisma.domain.groupBy({
      by: ['indexTier'],
      where: { eligibleForScan: true, indexTier: { in: ['A', 'B', 'C'] } },
      _count: { id: true },
    }),
    prisma.domain.groupBy({
      by: ['indexTier'],
      where: {
        indexTier: { in: ['A', 'B', 'C'] },
        stability: { isNot: null },
      },
      _count: { id: true },
    }),
  ]);

  // Build lookup maps from groupBy results
  const totalByTier = new Map<string, number>();
  for (const row of domainsByTier) {
    totalByTier.set(row.indexTier, row._count.id);
  }

  const coveredByTierMap = new Map<string, number>();
  for (const row of coveredByTier) {
    coveredByTierMap.set(row.indexTier, row._count.id);
  }

  // Assemble per-tier stats
  const tiers = ['A', 'B', 'C'] as const;
  const byTier: Record<string, { total: number; covered: number; percent: number }> = {};

  for (const tier of tiers) {
    const total = totalByTier.get(tier) ?? 0;
    const covered = coveredByTierMap.get(tier) ?? 0;
    byTier[tier] = {
      total,
      covered,
      percent: total > 0 ? Math.round((covered / total) * 100) : 0,
    };
  }

  return {
    totalDomains,
    withStability,
    coveragePercent: totalDomains > 0 ? Math.round((withStability / totalDomains) * 100) : 0,
    byTier,
  };
}
