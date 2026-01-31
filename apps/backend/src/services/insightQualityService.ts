/**
 * Insight Quality Scoring Service (Phase 3C Hardening - Gap 4)
 *
 * Scores insight quality before publishing to maintain
 * high signal-to-noise ratio.
 */

import type { PrismaClient, InsightType } from '@prisma/client';

export interface QualityMetrics {
  novelty: number; // 0-1, how unusual is this?
  impact: number; // 0-1, how many entities affected?
  historicalRarity: number; // 0-1, how rare historically?
  crossCategoryImpact: number; // 0-1, does it span categories?
  magnitudeVsBaseline: number; // 0-1, how much above normal?
  qualityScore: number; // Composite 0-100
  publishable: boolean;
  tier: 'breaking' | 'notable' | 'emerging' | 'watchlist';
}

interface InsightForScoring {
  id: string;
  insightType: InsightType;
  magnitude: number;
  confidence: number;
  domainId: string | null;
  categoryId: string | null;
  trackerDomain: string | null;
  periodStart: Date;
  details?: Record<string, unknown>;
}

/**
 * Get weekly baseline magnitude for an insight type.
 */
async function getWeeklyBaseline(
  prisma: PrismaClient,
  insightType: InsightType
): Promise<number> {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.insight.aggregate({
    where: {
      insightType,
      createdAt: { gte: oneMonthAgo },
    },
    _avg: { magnitude: true },
    _count: true,
  });

  // Return average magnitude or a sensible default
  return result._avg.magnitude ?? 40;
}

/**
 * Score insight quality before publishing.
 */
export async function scoreInsightQuality(
  prisma: PrismaClient,
  insight: InsightForScoring
): Promise<QualityMetrics> {
  // 1. Novelty: Has this pattern been reported recently?
  const recentSimilar = await prisma.insight.count({
    where: {
      insightType: insight.insightType,
      domainId: insight.domainId,
      categoryId: insight.categoryId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      id: { not: insight.id },
    },
  });

  const novelty = Math.max(0, 1 - recentSimilar * 0.3);

  // 2. Impact: How significant is the change?
  const impact = insight.magnitude / 100;

  // 3. Historical rarity: Compare to historical distribution
  const historicalAvg = await prisma.insight.aggregate({
    where: { insightType: insight.insightType },
    _avg: { magnitude: true },
  });

  const avgMagnitude = historicalAvg._avg.magnitude ?? 50;
  const historicalRarity = Math.min(1, insight.magnitude / (avgMagnitude * 2));

  // 4. Cross-category impact (for tracker insights)
  let crossCategoryImpact = 0;
  if (insight.insightType === 'TRACKER_SURGE' && insight.trackerDomain) {
    const trackerCategories = await prisma.domainChange.findMany({
      where: {
        trackersAdded: { has: insight.trackerDomain },
        detectedAt: { gte: insight.periodStart },
      },
      select: { domain: { select: { categoryId: true } } },
      distinct: ['domainId'],
    });

    const uniqueCategories = new Set(
      trackerCategories.map((t) => t.domain.categoryId).filter(Boolean)
    );
    crossCategoryImpact = Math.min(1, uniqueCategories.size / 5);
  }

  // 5. Magnitude vs baseline
  const weeklyBaseline = await getWeeklyBaseline(prisma, insight.insightType);
  const magnitudeVsBaseline =
    weeklyBaseline > 0 ? Math.min(1, insight.magnitude / (weeklyBaseline * 1.5)) : 0.5;

  // Composite score
  const qualityScore =
    novelty * 25 +
    impact * 25 +
    historicalRarity * 20 +
    crossCategoryImpact * 15 +
    magnitudeVsBaseline * 15;

  // Determine tier
  let tier: QualityMetrics['tier'];
  if (qualityScore >= 80 && novelty >= 0.7) {
    tier = 'breaking';
  } else if (qualityScore >= 60 && novelty >= 0.5) {
    tier = 'notable';
  } else if (qualityScore >= 40) {
    tier = 'emerging';
  } else {
    tier = 'watchlist';
  }

  return {
    novelty,
    impact,
    historicalRarity,
    crossCategoryImpact,
    magnitudeVsBaseline,
    qualityScore: Math.round(qualityScore),
    publishable: qualityScore >= 40 && novelty >= 0.4,
    tier,
  };
}

/**
 * Filter insights by quality before publishing.
 */
export async function filterPublishableInsights<T extends InsightForScoring>(
  prisma: PrismaClient,
  insights: T[]
): Promise<Array<T & { quality: QualityMetrics }>> {
  const scoredInsights = await Promise.all(
    insights.map(async (insight) => ({
      ...insight,
      quality: await scoreInsightQuality(prisma, insight),
    }))
  );

  return scoredInsights
    .filter((i) => i.quality.publishable)
    .sort((a, b) => b.quality.qualityScore - a.quality.qualityScore);
}

/**
 * Get quality distribution for recent insights.
 */
export async function getQualityDistribution(prisma: PrismaClient): Promise<{
  avgQuality: number;
  publishablePercent: number;
  byTier: Record<string, number>;
}> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentInsights = await prisma.insight.findMany({
    where: { createdAt: { gte: oneWeekAgo } },
    select: {
      id: true,
      insightType: true,
      magnitude: true,
      confidence: true,
      domainId: true,
      categoryId: true,
      trackerDomain: true,
      periodStart: true,
    },
  });

  if (recentInsights.length === 0) {
    return { avgQuality: 0, publishablePercent: 0, byTier: {} };
  }

  const byTier: Record<string, number> = {
    breaking: 0,
    notable: 0,
    emerging: 0,
    watchlist: 0,
  };

  let totalQuality = 0;
  let publishableCount = 0;

  for (const insight of recentInsights) {
    const quality = await scoreInsightQuality(prisma, insight);
    totalQuality += quality.qualityScore;
    const tierCount = byTier[quality.tier];
    if (tierCount !== undefined) {
      byTier[quality.tier] = tierCount + 1;
    }
    if (quality.publishable) publishableCount++;
  }

  return {
    avgQuality: Math.round(totalQuality / recentInsights.length),
    publishablePercent: Math.round((publishableCount / recentInsights.length) * 100),
    byTier,
  };
}

/**
 * Get top quality insights for publishing.
 */
export async function getTopQualityInsights(
  prisma: PrismaClient,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    insightType: InsightType;
    title: string;
    summary: string;
    qualityScore: number;
    tier: string;
    createdAt: Date;
  }>
> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentInsights = await prisma.insight.findMany({
    where: { createdAt: { gte: oneWeekAgo } },
    select: {
      id: true,
      insightType: true,
      title: true,
      summary: true,
      magnitude: true,
      confidence: true,
      domainId: true,
      categoryId: true,
      trackerDomain: true,
      periodStart: true,
      createdAt: true,
    },
    orderBy: { magnitude: 'desc' },
    take: limit * 2, // Get more to filter
  });

  const scoredInsights = await Promise.all(
    recentInsights.map(async (insight) => ({
      id: insight.id,
      insightType: insight.insightType,
      title: insight.title,
      summary: insight.summary,
      createdAt: insight.createdAt,
      quality: await scoreInsightQuality(prisma, insight),
    }))
  );

  return scoredInsights
    .filter((i) => i.quality.publishable)
    .sort((a, b) => b.quality.qualityScore - a.quality.qualityScore)
    .slice(0, limit)
    .map((i) => ({
      id: i.id,
      insightType: i.insightType,
      title: i.title,
      summary: i.summary,
      qualityScore: i.quality.qualityScore,
      tier: i.quality.tier,
      createdAt: i.createdAt,
    }));
}
