/**
 * Insight Generator Service (Phase 3C)
 *
 * Generates publishable insights from change intelligence data.
 * Creates narratives about domain improvements, regressions, tracker surges, etc.
 */

import type { PrismaClient, InsightType, InsightSeverity } from '@prisma/client';

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
}

/**
 * Generate insights from recent data.
 * Run daily or weekly.
 */
export async function generateInsights(
  prisma: PrismaClient,
  periodDays: number = 7
): Promise<GeneratedInsight[]> {
  const insights: GeneratedInsight[] = [];
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // 1. Major domain improvements
  const improvements = await prisma.domainChange.findMany({
    where: {
      detectedAt: { gte: periodStart },
      changeType: { in: ['MAJOR', 'CRITICAL'] },
      scoreDelta: { gt: 15 },
    },
    orderBy: { scoreDelta: 'desc' },
    take: 10,
    include: {
      domain: { select: { domain: true, indexTier: true } },
    },
  });

  for (const imp of improvements) {
    insights.push({
      type: 'DOMAIN_IMPROVEMENT',
      severity: imp.scoreDelta > 25 ? 'HIGH' : 'MEDIUM',
      title: `${imp.domain.domain} improved privacy score by ${imp.scoreDelta} points`,
      summary: `Tier ${imp.domain.indexTier} domain made significant privacy improvements`,
      details: {
        scoreBefore: imp.scoreBefore,
        scoreAfter: imp.scoreAfter,
        reasons: imp.changeReasons,
      },
      magnitude: Math.min(100, imp.scoreDelta * 3),
      confidence: 0.95,
      domainId: imp.domainId,
    });
  }

  // 2. Major regressions
  const regressions = await prisma.domainChange.findMany({
    where: {
      detectedAt: { gte: periodStart },
      changeType: { in: ['MAJOR', 'CRITICAL'] },
      scoreDelta: { lt: -15 },
    },
    orderBy: { scoreDelta: 'asc' },
    take: 10,
    include: {
      domain: { select: { domain: true, indexTier: true } },
    },
  });

  for (const reg of regressions) {
    insights.push({
      type: 'DOMAIN_REGRESSION',
      severity: reg.scoreDelta < -25 ? 'CRITICAL' : 'HIGH',
      title: `${reg.domain.domain} privacy score dropped by ${Math.abs(reg.scoreDelta)} points`,
      summary: `Tier ${reg.domain.indexTier} domain experienced significant privacy degradation`,
      details: {
        scoreBefore: reg.scoreBefore,
        scoreAfter: reg.scoreAfter,
        reasons: reg.changeReasons,
      },
      magnitude: Math.min(100, Math.abs(reg.scoreDelta) * 3),
      confidence: 0.95,
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
    if (Math.abs(trend.scoreChange) > 5) {
      const improving = trend.scoreChange > 0;
      insights.push({
        type: 'CATEGORY_TREND',
        severity: Math.abs(trend.scoreChange) > 10 ? 'HIGH' : 'MEDIUM',
        title: `${trend.category.name} privacy ${improving ? 'improved' : 'declined'} by ${Math.abs(trend.scoreChange).toFixed(1)}%`,
        summary: `${trend.domainsImproving} domains improving, ${trend.domainsDeclining} declining`,
        details: {
          avgScore: trend.avgScore,
          scoreChange: trend.scoreChange,
          topImprovements: trend.topImprovements,
          topRegressions: trend.topRegressions,
        },
        magnitude: Math.min(100, Math.abs(trend.scoreChange) * 5),
        confidence: 0.85,
        categoryId: trend.categoryId,
      });
    }
  }

  // 4. Tracker surges
  const trackerTrends = await prisma.trackerTrend.findMany({
    where: {
      periodType: 'WEEKLY',
      netChange: { gt: 5 },
    },
    orderBy: { netChange: 'desc' },
    take: 10,
  });

  for (const tracker of trackerTrends) {
    insights.push({
      type: 'TRACKER_SURGE',
      severity: tracker.netChange > 20 ? 'HIGH' : 'MEDIUM',
      title: `${tracker.trackerDomain} adoption increased by ${tracker.netChange} sites`,
      summary: `${tracker.newAdoptions} new adoptions, ${tracker.removals} removals this week`,
      details: {
        newAdoptions: tracker.newAdoptions,
        removals: tracker.removals,
        netChange: tracker.netChange,
      },
      magnitude: Math.min(100, tracker.netChange * 5),
      confidence: 0.9,
      trackerDomain: tracker.trackerDomain,
    });
  }

  // 5. Tracker declines
  const decliningTrackers = await prisma.trackerTrend.findMany({
    where: {
      periodType: 'WEEKLY',
      netChange: { lt: -5 },
    },
    orderBy: { netChange: 'asc' },
    take: 10,
  });

  for (const tracker of decliningTrackers) {
    insights.push({
      type: 'TRACKER_DECLINE',
      severity: tracker.netChange < -20 ? 'HIGH' : 'MEDIUM',
      title: `${tracker.trackerDomain} adoption decreased by ${Math.abs(tracker.netChange)} sites`,
      summary: `${tracker.removals} removals, ${tracker.newAdoptions} new adoptions this week`,
      details: {
        newAdoptions: tracker.newAdoptions,
        removals: tracker.removals,
        netChange: tracker.netChange,
      },
      magnitude: Math.min(100, Math.abs(tracker.netChange) * 5),
      confidence: 0.9,
      trackerDomain: tracker.trackerDomain,
    });
  }

  // 6. Fingerprinting shifts
  const fingerprintingChanges = await prisma.domainChange.count({
    where: {
      detectedAt: { gte: periodStart },
      fingerprintingChanged: true,
    },
  });

  if (fingerprintingChanges > 10) {
    const started = await prisma.domainChange.count({
      where: {
        detectedAt: { gte: periodStart },
        fingerprintingChanged: true,
        fingerprintingAfter: true,
      },
    });

    const stopped = fingerprintingChanges - started;

    insights.push({
      type: 'FINGERPRINTING_SHIFT',
      severity: fingerprintingChanges > 50 ? 'HIGH' : 'MEDIUM',
      title: `${fingerprintingChanges} sites changed fingerprinting behavior`,
      summary: `${started} started fingerprinting, ${stopped} stopped`,
      details: {
        totalChanges: fingerprintingChanges,
        started,
        stopped,
        netChange: started - stopped,
      },
      magnitude: Math.min(100, fingerprintingChanges * 2),
      confidence: 0.95,
    });
  }

  return insights;
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
    await prisma.insight.create({
      data: {
        insightType: insight.type,
        severity: insight.severity,
        title: insight.title,
        summary: insight.summary,
        details: insight.details as object,
        domainId: insight.domainId,
        categoryId: insight.categoryId,
        trackerDomain: insight.trackerDomain,
        periodStart,
        periodEnd,
        magnitude: insight.magnitude,
        confidence: insight.confidence,
        isPublishable: insight.magnitude > 50 && insight.confidence > 0.8,
      },
    });
    persisted++;
  }

  return persisted;
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
