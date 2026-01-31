/**
 * Category Intelligence Service (Phase 3C)
 *
 * Calculates and tracks privacy trends at the category level.
 * Identifies which industries are improving or declining.
 */

import type { PrismaClient, TrendDirection, PeriodType } from '@prisma/client';

interface CategoryMetrics {
  avgScore: number;
  avgScorePrevPeriod: number;
  scoreChange: number;
  scoreTrend: TrendDirection;
  avgTrackerCount: number;
  avgTrackerCountPrev: number;
  trackerCountChange: number;
  trackerTrend: TrendDirection;
  fingerprintingRate: number;
  fingerprintingRatePrev: number;
  fingerprintingTrend: TrendDirection;
  domainsImproving: number;
  domainsDeclining: number;
  domainsStable: number;
  topImprovements: Array<{ domainId: string; domain: string; delta: number }>;
  topRegressions: Array<{ domainId: string; domain: string; delta: number }>;
}

/**
 * Determine trend direction from percentage change.
 */
function determineTrend(percentChange: number): TrendDirection {
  if (percentChange > 3) return 'UP';
  if (percentChange < -3) return 'DOWN';
  return 'FLAT';
}

/**
 * Calculate category trends for a period.
 */
export async function calculateCategoryTrend(
  prisma: PrismaClient,
  categoryId: string,
  periodType: PeriodType = 'WEEKLY'
): Promise<CategoryMetrics | null> {
  const now = new Date();

  // Define periods
  const periodDays = periodType === 'WEEKLY' ? 7 : 30;
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Get current period scans
  const currentScans = await prisma.scan.findMany({
    where: {
      domain: { categoryId },
      status: 'done',
      finishedAt: { gte: periodStart, lt: now },
      score: { not: null },
    },
    select: {
      score: true,
      evidence: {
        where: {
          kind: { in: ['tracker', 'third_party_tracker'] },
        },
      },
    },
  });

  // Get previous period scans
  const prevScans = await prisma.scan.findMany({
    where: {
      domain: { categoryId },
      status: 'done',
      finishedAt: { gte: prevPeriodStart, lt: periodStart },
      score: { not: null },
    },
    select: {
      score: true,
      evidence: {
        where: {
          kind: { in: ['tracker', 'third_party_tracker'] },
        },
      },
    },
  });

  if (currentScans.length === 0) return null;

  // Calculate current period metrics
  const currentScores = currentScans.map((s) => s.score!);
  const avgScore = currentScores.reduce((a, b) => a + b, 0) / currentScores.length;
  const avgTrackerCount =
    currentScans.reduce((sum, s) => sum + s.evidence.length, 0) / currentScans.length;

  // Calculate previous period metrics
  const prevScores = prevScans.map((s) => s.score!);
  const avgScorePrevPeriod =
    prevScores.length > 0 ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length : avgScore;
  const avgTrackerCountPrev =
    prevScans.length > 0
      ? prevScans.reduce((sum, s) => sum + s.evidence.length, 0) / prevScans.length
      : avgTrackerCount;

  // Calculate changes
  const scoreChange =
    avgScorePrevPeriod !== 0 ? ((avgScore - avgScorePrevPeriod) / avgScorePrevPeriod) * 100 : 0;
  const trackerCountChange =
    avgTrackerCountPrev !== 0
      ? ((avgTrackerCount - avgTrackerCountPrev) / avgTrackerCountPrev) * 100
      : 0;

  // Get fingerprinting rates (simplified - would need evidence check in production)
  const fingerprintingRate = 0;
  const fingerprintingRatePrev = 0;
  const fingerprintingChange = fingerprintingRate - fingerprintingRatePrev;

  // Get domain trend breakdown
  const domainTrends = await prisma.domainStability.groupBy({
    by: ['trend'],
    where: {
      domain: { categoryId },
    },
    _count: true,
  });

  const trendCounts = Object.fromEntries(domainTrends.map((t) => [t.trend, t._count]));

  // Get top movers
  const topImprovements = await prisma.domainChange.findMany({
    where: {
      domain: { categoryId },
      detectedAt: { gte: periodStart },
      scoreDelta: { gt: 0 },
    },
    orderBy: { scoreDelta: 'desc' },
    take: 5,
    select: {
      domainId: true,
      scoreDelta: true,
      domain: { select: { domain: true } },
    },
  });

  const topRegressions = await prisma.domainChange.findMany({
    where: {
      domain: { categoryId },
      detectedAt: { gte: periodStart },
      scoreDelta: { lt: 0 },
    },
    orderBy: { scoreDelta: 'asc' },
    take: 5,
    select: {
      domainId: true,
      scoreDelta: true,
      domain: { select: { domain: true } },
    },
  });

  return {
    avgScore,
    avgScorePrevPeriod,
    scoreChange,
    scoreTrend: determineTrend(scoreChange),
    avgTrackerCount,
    avgTrackerCountPrev,
    trackerCountChange,
    trackerTrend: determineTrend(-trackerCountChange), // Inverse: fewer trackers = UP
    fingerprintingRate,
    fingerprintingRatePrev,
    fingerprintingTrend: determineTrend(-fingerprintingChange * 100),
    domainsImproving: trendCounts['IMPROVING'] || 0,
    domainsDeclining: trendCounts['DECLINING'] || 0,
    domainsStable: trendCounts['STABLE'] || 0,
    topImprovements: topImprovements.map((t) => ({
      domainId: t.domainId,
      domain: t.domain.domain,
      delta: t.scoreDelta,
    })),
    topRegressions: topRegressions.map((t) => ({
      domainId: t.domainId,
      domain: t.domain.domain,
      delta: t.scoreDelta,
    })),
  };
}

/**
 * Update trends for all categories.
 * Run weekly.
 */
export async function updateAllCategoryTrends(
  prisma: PrismaClient,
  periodType: PeriodType = 'WEEKLY'
): Promise<{ processed: number; updated: number }> {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });

  let processed = 0;
  let updated = 0;

  const now = new Date();
  const periodDays = periodType === 'WEEKLY' ? 7 : 30;
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  for (const category of categories) {
    try {
      const metrics = await calculateCategoryTrend(prisma, category.id, periodType);

      if (metrics) {
        await prisma.categoryTrend.upsert({
          where: {
            categoryId_periodStart_periodType: {
              categoryId: category.id,
              periodStart,
              periodType,
            },
          },
          create: {
            categoryId: category.id,
            periodStart,
            periodEnd: now,
            periodType,
            avgScore: metrics.avgScore,
            avgScorePrevPeriod: metrics.avgScorePrevPeriod,
            scoreChange: metrics.scoreChange,
            scoreTrend: metrics.scoreTrend,
            avgTrackerCount: metrics.avgTrackerCount,
            avgTrackerCountPrev: metrics.avgTrackerCountPrev,
            trackerCountChange: metrics.trackerCountChange,
            trackerTrend: metrics.trackerTrend,
            fingerprintingRate: metrics.fingerprintingRate,
            fingerprintingRatePrev: metrics.fingerprintingRatePrev,
            fingerprintingTrend: metrics.fingerprintingTrend,
            domainsImproving: metrics.domainsImproving,
            domainsDeclining: metrics.domainsDeclining,
            domainsStable: metrics.domainsStable,
            topImprovements: metrics.topImprovements,
            topRegressions: metrics.topRegressions,
          },
          update: {
            periodEnd: now,
            avgScore: metrics.avgScore,
            avgScorePrevPeriod: metrics.avgScorePrevPeriod,
            scoreChange: metrics.scoreChange,
            scoreTrend: metrics.scoreTrend,
            avgTrackerCount: metrics.avgTrackerCount,
            avgTrackerCountPrev: metrics.avgTrackerCountPrev,
            trackerCountChange: metrics.trackerCountChange,
            trackerTrend: metrics.trackerTrend,
            fingerprintingRate: metrics.fingerprintingRate,
            fingerprintingRatePrev: metrics.fingerprintingRatePrev,
            fingerprintingTrend: metrics.fingerprintingTrend,
            domainsImproving: metrics.domainsImproving,
            domainsDeclining: metrics.domainsDeclining,
            domainsStable: metrics.domainsStable,
            topImprovements: metrics.topImprovements,
            topRegressions: metrics.topRegressions,
            calculatedAt: now,
          },
        });
        updated++;
      }
    } catch {
      // Log error but continue processing
    }
    processed++;
  }

  return { processed, updated };
}

/**
 * Get category rankings by trend.
 */
export async function getCategoryRankings(
  prisma: PrismaClient,
  periodType: PeriodType = 'WEEKLY'
): Promise<{
  improving: Array<{
    categoryId: string;
    scoreChange: number;
    scoreTrend: TrendDirection;
    category: { name: string; slug: string };
  }>;
  declining: Array<{
    categoryId: string;
    scoreChange: number;
    scoreTrend: TrendDirection;
    category: { name: string; slug: string };
  }>;
}> {
  const periodDays = periodType === 'WEEKLY' ? 7 : 30;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const trends = await prisma.categoryTrend.findMany({
    where: {
      periodType,
      periodStart: { gte: new Date(periodStart.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { scoreChange: 'desc' },
    include: {
      category: { select: { name: true, slug: true } },
    },
  });

  return {
    improving: trends.filter((t) => t.scoreTrend === 'UP').slice(0, 10),
    declining: trends.filter((t) => t.scoreTrend === 'DOWN').slice(0, 10),
  };
}
