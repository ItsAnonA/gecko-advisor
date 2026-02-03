/**
 * Insight Generator Service (Phase 3C)
 *
 * Generates publishable insights from change intelligence data.
 * Creates narratives about domain improvements, regressions, tracker surges, etc.
 *
 * Phase 3C Hardening: Tiered insight classification for higher volume.
 */

import type { PrismaClient, InsightType, InsightSeverity } from '@prisma/client';

// ============================================================
// TIERED INSIGHT CLASSIFICATION (Gap 1 Fix)
// ============================================================
//
// CRITICAL: No volume targets. Volume goals are where integrity systems rot.
// Publish ONLY when quality threshold is met, not to hit a weekly number.
// Authority platforms optimize for signal, not cadence.
//

export const INSIGHT_TIERS = {
  // Tier 1: Breaking (immediate publish)
  // QUALITY THRESHOLD: Must meet ALL criteria, no volume pressure
  breaking: {
    minMagnitude: 70,
    minConfidence: 0.9,
    // NO maxPerWeek - publish all that meet threshold
    examples: ['Major site regression', 'Fingerprinting surge'],
    note: 'Publish ALL that meet threshold - quality over quantity',
  },

  // Tier 2: Notable (weekly digest)
  // QUALITY THRESHOLD: Must meet ALL criteria
  notable: {
    minMagnitude: 40,
    minConfidence: 0.75,
    // NO maxPerWeek - publish all that meet threshold
    examples: ['Category trend shift', 'Tracker adoption spike'],
    note: 'Publish ALL that meet threshold - quality over quantity',
  },

  // Tier 3: Emerging (watchlist - lower visibility, not digest)
  // QUALITY THRESHOLD: Must meet ALL criteria
  emerging: {
    minMagnitude: 25,
    minConfidence: 0.6,
    // NO maxPerWeek - track all that meet threshold
    examples: ['Early warning signals', 'Unusual patterns'],
    note: 'Track ALL that meet threshold for monitoring',
  },
} as const;

export type InsightTier = keyof typeof INSIGHT_TIERS;

interface GeneratedInsight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  magnitude: number;
  confidence: number;
  domainId?: string;
  categoryId?: string;
  trackerDomain?: string;
  tier?: InsightTier;
}

/**
 * Generate raw insights from recent data.
 * Used internally for tiered classification.
 */
async function generateRawInsights(
  prisma: PrismaClient,
  periodDays: number = 7
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // 1. Domain improvements (lowered threshold from 15 to 5)
  const improvements = await prisma.domainChange.findMany({
    where: {
      detectedAt: { gte: periodStart },
      scoreDelta: { gt: 5 }, // Lowered from 15
    },
    orderBy: { scoreDelta: 'desc' },
    take: 10,
    include: {
      domain: { select: { domain: true, indexTier: true } },
    },
  });

  for (const imp of improvements) {
    const magnitude = Math.min(100, imp.scoreDelta * 3);
    insights.push({
      type: 'DOMAIN_IMPROVEMENT',
      severity: imp.scoreDelta > 25 ? 'HIGH' : imp.scoreDelta > 15 ? 'MEDIUM' : 'LOW',
      title: `${imp.domain.domain} improved privacy score by ${imp.scoreDelta} points`,
      summary: `Tier ${imp.domain.indexTier} domain made ${imp.scoreDelta > 15 ? 'significant' : 'notable'} privacy improvements`,
      details: {
        scoreBefore: imp.scoreBefore,
        scoreAfter: imp.scoreAfter,
        reasons: imp.changeReasons,
        trackersRemoved: imp.trackersRemoved,
        fingerprintingStopped: imp.fingerprintingBefore && !imp.fingerprintingAfter,
      },
      magnitude,
      confidence: imp.scoreDelta > 15 ? 0.95 : 0.75,
      domainId: imp.domainId,
    });
  }

  // 2. Domain regressions (lowered threshold from -15 to -5)
  const regressions = await prisma.domainChange.findMany({
    where: {
      detectedAt: { gte: periodStart },
      scoreDelta: { lt: -5 }, // Lowered from -15
    },
    orderBy: { scoreDelta: 'asc' },
    take: 10,
    include: {
      domain: { select: { domain: true, indexTier: true } },
    },
  });

  for (const reg of regressions) {
    const absDelta = Math.abs(reg.scoreDelta);
    const magnitude = Math.min(100, absDelta * 3);
    insights.push({
      type: 'DOMAIN_REGRESSION',
      severity: absDelta > 25 ? 'CRITICAL' : absDelta > 15 ? 'HIGH' : 'MEDIUM',
      title: `${reg.domain.domain} privacy score dropped by ${absDelta} points`,
      summary: `Tier ${reg.domain.indexTier} domain experienced ${absDelta > 15 ? 'significant' : 'notable'} privacy degradation`,
      details: {
        scoreBefore: reg.scoreBefore,
        scoreAfter: reg.scoreAfter,
        reasons: reg.changeReasons,
        trackersAdded: reg.trackersAdded,
        fingerprintingStarted: !reg.fingerprintingBefore && reg.fingerprintingAfter,
      },
      magnitude,
      confidence: absDelta > 15 ? 0.95 : 0.75,
      domainId: reg.domainId,
    });
  }

  // 3. Category trends
  const categoryTrends = await prisma.categoryTrend.findMany({
    where: {
      periodType: 'WEEKLY',
      periodStart: { gte: new Date(periodStart.getTime() - 24 * 60 * 60 * 1000) },
      scoreChange: { not: 0 },
    },
    include: {
      category: { select: { name: true } },
    },
  });

  for (const trend of categoryTrends) {
    // Lowered threshold from 5 to 2 to capture more trends
    if (Math.abs(trend.scoreChange) > 2) {
      const improving = trend.scoreChange > 0;
      const absChange = Math.abs(trend.scoreChange);
      const magnitude = Math.min(100, absChange * 5);
      insights.push({
        type: 'CATEGORY_TREND',
        severity: absChange > 10 ? 'HIGH' : absChange > 5 ? 'MEDIUM' : 'LOW',
        title: `${trend.category.name} privacy ${improving ? 'improved' : 'declined'} by ${absChange.toFixed(1)}%`,
        summary: `${trend.domainsImproving} domains improving, ${trend.domainsDeclining} declining`,
        details: {
          avgScore: trend.avgScore,
          scoreChange: trend.scoreChange,
          topImprovements: trend.topImprovements,
          topRegressions: trend.topRegressions,
          domainsImproving: trend.domainsImproving,
          domainsDeclining: trend.domainsDeclining,
        },
        magnitude,
        confidence: absChange > 5 ? 0.85 : 0.65,
        categoryId: trend.categoryId,
      });
    }
  }

  // 4. Tracker surges (lowered threshold from 5 to 2)
  const trackerTrends = await prisma.trackerTrend.findMany({
    where: {
      periodType: 'WEEKLY',
      netChange: { gt: 2 }, // Lowered from 5
    },
    orderBy: { netChange: 'desc' },
    take: 15, // Increased from 10
  });

  for (const tracker of trackerTrends) {
    const magnitude = Math.min(100, tracker.netChange * 5);
    insights.push({
      type: 'TRACKER_SURGE',
      severity: tracker.netChange > 20 ? 'HIGH' : tracker.netChange > 10 ? 'MEDIUM' : 'LOW',
      title: `${tracker.trackerDomain} adoption increased by ${tracker.netChange} sites`,
      summary: `${tracker.newAdoptions} new adoptions, ${tracker.removals} removals this week`,
      details: {
        newAdoptions: tracker.newAdoptions,
        removals: tracker.removals,
        netChange: tracker.netChange,
        domainCount: tracker.domainCount,
      },
      magnitude,
      confidence: tracker.netChange > 10 ? 0.9 : 0.7,
      trackerDomain: tracker.trackerDomain,
    });
  }

  // 5. Tracker declines (lowered threshold from -5 to -2)
  const decliningTrackers = await prisma.trackerTrend.findMany({
    where: {
      periodType: 'WEEKLY',
      netChange: { lt: -2 }, // Lowered from -5
    },
    orderBy: { netChange: 'asc' },
    take: 15, // Increased from 10
  });

  for (const tracker of decliningTrackers) {
    const absChange = Math.abs(tracker.netChange);
    const magnitude = Math.min(100, absChange * 5);
    insights.push({
      type: 'TRACKER_DECLINE',
      severity: absChange > 20 ? 'HIGH' : absChange > 10 ? 'MEDIUM' : 'LOW',
      title: `${tracker.trackerDomain} adoption decreased by ${absChange} sites`,
      summary: `${tracker.removals} removals, ${tracker.newAdoptions} new adoptions this week`,
      details: {
        newAdoptions: tracker.newAdoptions,
        removals: tracker.removals,
        netChange: tracker.netChange,
        domainCount: tracker.domainCount,
      },
      magnitude,
      confidence: absChange > 10 ? 0.9 : 0.7,
      trackerDomain: tracker.trackerDomain,
    });
  }

  // 6. Fingerprinting shifts (lowered threshold from 10 to 3)
  const fingerprintingChanges = await prisma.domainChange.count({
    where: {
      detectedAt: { gte: periodStart },
      fingerprintingChanged: true,
    },
  });

  if (fingerprintingChanges >= 3) {
    const started = await prisma.domainChange.count({
      where: {
        detectedAt: { gte: periodStart },
        fingerprintingChanged: true,
        fingerprintingAfter: true,
      },
    });

    const stopped = fingerprintingChanges - started;
    const magnitude = Math.min(100, fingerprintingChanges * 2);

    insights.push({
      type: 'FINGERPRINTING_SHIFT',
      severity: fingerprintingChanges > 50 ? 'HIGH' : fingerprintingChanges > 20 ? 'MEDIUM' : 'LOW',
      title: `${fingerprintingChanges} sites changed fingerprinting behavior`,
      summary: `${started} started fingerprinting, ${stopped} stopped`,
      details: {
        totalChanges: fingerprintingChanges,
        started,
        stopped,
        netChange: started - stopped,
      },
      magnitude,
      confidence: fingerprintingChanges > 20 ? 0.95 : 0.75,
    });
  }

  return insights;
}

/**
 * Generate insights from recent data.
 * Wrapper for backward compatibility.
 */
export async function generateInsights(
  prisma: PrismaClient,
  periodDays: number = 7
): Promise<GeneratedInsight[]> {
  return generateRawInsights(prisma, periodDays);
}

/**
 * Multi-tier insight generation.
 * Quality-only stratification - NO volume targets.
 *
 * CRITICAL: Publish ALL insights that meet quality threshold.
 * Never cap based on arbitrary weekly targets.
 * Authority platforms optimize for signal, not cadence.
 */
export async function generateTieredInsights(
  prisma: PrismaClient,
  periodDays: number = 7
): Promise<{
  breaking: GeneratedInsight[];
  notable: GeneratedInsight[];
  emerging: GeneratedInsight[];
  total: number;
}> {
  const allInsights = await generateRawInsights(prisma, periodDays);

  // Helper to generate consistent dedup IDs (normalize undefined/null to empty string)
  const getInsightId = (i: GeneratedInsight): string =>
    `${i.type}-${i.domainId ?? ''}-${i.categoryId ?? ''}-${i.trackerDomain ?? ''}`;

  // Classify by tier - NO volume caps, quality threshold only
  const breaking = allInsights
    .filter(
      (i) =>
        i.magnitude >= INSIGHT_TIERS.breaking.minMagnitude &&
        i.confidence >= INSIGHT_TIERS.breaking.minConfidence
    )
    .map((i) => ({ ...i, tier: 'breaking' as const }));
  // NO .slice() - publish ALL that meet threshold

  const breakingIds = new Set(breaking.map(getInsightId));

  const notable = allInsights
    .filter((i) => {
      const id = getInsightId(i);
      return (
        i.magnitude >= INSIGHT_TIERS.notable.minMagnitude &&
        i.confidence >= INSIGHT_TIERS.notable.minConfidence &&
        !breakingIds.has(id)
      );
    })
    .map((i) => ({ ...i, tier: 'notable' as const }));
  // NO .slice() - publish ALL that meet threshold

  const notableIds = new Set(notable.map(getInsightId));

  const emerging = allInsights
    .filter((i) => {
      const id = getInsightId(i);
      return (
        i.magnitude >= INSIGHT_TIERS.emerging.minMagnitude &&
        i.confidence >= INSIGHT_TIERS.emerging.minConfidence &&
        !breakingIds.has(id) &&
        !notableIds.has(id)
      );
    })
    .map((i) => ({ ...i, tier: 'emerging' as const }));
  // NO .slice() - track ALL that meet threshold

  return {
    breaking,
    notable,
    emerging,
    total: breaking.length + notable.length + emerging.length,
  };
}

/**
 * Persist generated insights to database.
 */
export async function persistInsights(
  prisma: PrismaClient,
  insights: GeneratedInsight[],
  periodStart: Date
): Promise<number> {
  const periodEnd = new Date();
  let persisted = 0;

  for (const insight of insights) {
    // Determine if publishable based on tiered thresholds (lowered from magnitude>50, confidence>0.8)
    const isPublishable =
      insight.magnitude >= INSIGHT_TIERS.emerging.minMagnitude &&
      insight.confidence >= INSIGHT_TIERS.emerging.minConfidence;

    await prisma.insight.create({
      data: {
        insightType: insight.type,
        severity: insight.severity,
        title: insight.title,
        summary: insight.summary,
        details: {
          ...insight.details,
          tier: insight.tier,
        } as object,
        domainId: insight.domainId,
        categoryId: insight.categoryId,
        trackerDomain: insight.trackerDomain,
        periodStart,
        periodEnd,
        magnitude: insight.magnitude,
        confidence: insight.confidence,
        isPublishable,
      },
    });
    persisted++;
  }

  return persisted;
}

/**
 * Persist tiered insights to database.
 */
export async function persistTieredInsights(
  prisma: PrismaClient,
  tieredInsights: {
    breaking: GeneratedInsight[];
    notable: GeneratedInsight[];
    emerging: GeneratedInsight[];
  },
  periodStart: Date
): Promise<{ breaking: number; notable: number; emerging: number; total: number }> {
  const counts = { breaking: 0, notable: 0, emerging: 0, total: 0 };
  const periodEnd = new Date();

  for (const insight of tieredInsights.breaking) {
    await prisma.insight.create({
      data: {
        insightType: insight.type,
        severity: insight.severity,
        title: insight.title,
        summary: insight.summary,
        details: { ...insight.details, tier: 'breaking' } as object,
        domainId: insight.domainId,
        categoryId: insight.categoryId,
        trackerDomain: insight.trackerDomain,
        periodStart,
        periodEnd,
        magnitude: insight.magnitude,
        confidence: insight.confidence,
        isPublishable: true,
      },
    });
    counts.breaking++;
  }

  for (const insight of tieredInsights.notable) {
    await prisma.insight.create({
      data: {
        insightType: insight.type,
        severity: insight.severity,
        title: insight.title,
        summary: insight.summary,
        details: { ...insight.details, tier: 'notable' } as object,
        domainId: insight.domainId,
        categoryId: insight.categoryId,
        trackerDomain: insight.trackerDomain,
        periodStart,
        periodEnd,
        magnitude: insight.magnitude,
        confidence: insight.confidence,
        isPublishable: true,
      },
    });
    counts.notable++;
  }

  for (const insight of tieredInsights.emerging) {
    await prisma.insight.create({
      data: {
        insightType: insight.type,
        severity: insight.severity,
        title: insight.title,
        summary: insight.summary,
        details: { ...insight.details, tier: 'emerging' } as object,
        domainId: insight.domainId,
        categoryId: insight.categoryId,
        trackerDomain: insight.trackerDomain,
        periodStart,
        periodEnd,
        magnitude: insight.magnitude,
        confidence: insight.confidence,
        isPublishable: insight.magnitude >= 30, // Emerging are watchlist, publish some
      },
    });
    counts.emerging++;
  }

  counts.total = counts.breaking + counts.notable + counts.emerging;
  return counts;
}

/**
 * Get publishable insights.
 */
export async function getPublishableInsights(
  prisma: PrismaClient,
  limit: number = 20
): Promise<
  Array<{
    id: string;
    insightType: InsightType;
    severity: InsightSeverity;
    title: string;
    summary: string;
    magnitude: number;
    createdAt: Date;
  }>
> {
  return prisma.insight.findMany({
    where: { isPublishable: true },
    orderBy: [{ severity: 'desc' }, { magnitude: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      insightType: true,
      severity: true,
      title: true,
      summary: true,
      magnitude: true,
      createdAt: true,
    },
  });
}

/**
 * Get recent insights by type.
 */
export async function getInsightsByType(
  prisma: PrismaClient,
  type: InsightType,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    title: string;
    summary: string;
    severity: InsightSeverity;
    createdAt: Date;
  }>
> {
  return prisma.insight.findMany({
    where: { insightType: type },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      severity: true,
      createdAt: true,
    },
  });
}
