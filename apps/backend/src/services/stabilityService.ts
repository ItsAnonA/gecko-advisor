/**
 * Domain Stability Scoring Service (Phase 3C)
 *
 * Calculates and tracks domain privacy stability over time.
 * Identifies volatile, improving, declining, and stable domains.
 *
 * Phase 3C Hardening: Tiered stability coverage for higher coverage.
 */

import type { PrismaClient, DomainTrend } from '@prisma/client';

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

/**
 * Calculate standard deviation for an array of numbers.
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate trend from scan history.
 */
function calculateTrend(scans: { score: number | null; finishedAt: Date | null }[]): {
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
  if (coefficientOfVariation > 0.3) {
    return { trend: 'VOLATILE', trendStrength: Math.min(1, coefficientOfVariation) };
  }

  if (percentChange > 5) {
    return { trend: 'IMPROVING', trendStrength: Math.min(1, percentChange / 20) };
  }

  if (percentChange < -5) {
    return { trend: 'DECLINING', trendStrength: Math.min(1, Math.abs(percentChange) / 20) };
  }

  return { trend: 'STABLE', trendStrength: 1 - Math.abs(percentChange) / 10 };
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

  // Determine trend
  const { trend, trendStrength } = calculateTrend(scans);

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

  // Determine trend
  const { trend, trendStrength } = calculateTrend(scans);

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
 */
export async function updateAllDomainStability(prisma: PrismaClient): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  let processed = 0;
  let updated = 0;
  let errors = 0;

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

    for (const domain of domains) {
      try {
        const metrics = await calculateDomainStability(prisma, domain.id);

        if (metrics) {
          await prisma.domainStability.upsert({
            where: { domainId: domain.id },
            create: {
              domainId: domain.id,
              ...metrics,
            },
            update: {
              ...metrics,
              calculatedAt: new Date(),
            },
          });
          updated++;
        }
      } catch {
        errors++;
      }
      processed++;
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
    tier?: string;
    minVolatility?: number;
    limit?: number;
  } = {}
): Promise<
  Array<{
    id: string;
    domainId: string;
    volatilityIndex: number;
    trend: DomainTrend;
    domain: { domain: string; indexTier: string; category: { name: string } | null };
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
  options: { tier?: string; minStrength?: number; limit?: number } = {}
): Promise<
  Array<{
    id: string;
    domainId: string;
    trend: DomainTrend;
    trendStrength: number;
    domain: { domain: string; indexTier: string; category: { name: string } | null };
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

  // Process ALL domains with at least 1 scan
  while (true) {
    const domains = await prisma.domain.findMany({
      where: {
        eligibleForScan: true,
        scans: { some: { status: 'done', score: { not: null } } },
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, indexTier: true },
    });

    if (domains.length === 0) break;

    for (const domain of domains) {
      try {
        const metrics = await calculateDomainStabilityTiered(prisma, domain.id);

        if (!metrics) {
          counts.skipped++;
          continue;
        }

        await prisma.domainStability.upsert({
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
        });

        // Count by confidence level
        if (metrics.confidenceLevel === 'high') {
          counts.full++;
        } else if (metrics.confidenceLevel === 'medium') {
          counts.partial++;
        } else {
          counts.provisional++;
        }
      } catch {
        counts.errors++;
      }
    }

    cursor = domains[domains.length - 1]?.id;
  }

  counts.total = counts.full + counts.partial + counts.provisional;
  return counts;
}

/**
 * Get stability coverage statistics.
 */
export async function getStabilityCoverage(prisma: PrismaClient): Promise<{
  totalDomains: number;
  withStability: number;
  coveragePercent: number;
  byTier: Record<string, { total: number; covered: number; percent: number }>;
}> {
  const totalDomains = await prisma.domain.count({
    where: { eligibleForScan: true },
  });

  const withStability = await prisma.domainStability.count();

  // Get breakdown by tier
  const tiers = ['A', 'B', 'C'] as const;
  const byTier: Record<string, { total: number; covered: number; percent: number }> = {};

  for (const tier of tiers) {
    const total = await prisma.domain.count({
      where: { eligibleForScan: true, indexTier: tier },
    });

    const covered = await prisma.domainStability.count({
      where: { domain: { indexTier: tier } },
    });

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
