/**
 * Domain Stability Scoring Service (Phase 3C)
 *
 * Calculates and tracks domain privacy stability over time.
 * Identifies volatile, improving, declining, and stable domains.
 */

import type { PrismaClient, DomainTrend } from '@prisma/client';

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
  };
}

/**
 * Batch update stability scores for all domains.
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
