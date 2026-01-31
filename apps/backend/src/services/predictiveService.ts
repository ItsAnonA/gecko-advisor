/**
 * Predictive Intelligence Service (Phase 3C Hardening - Gap 3)
 *
 * Provides forward-looking analytics:
 * - Momentum & acceleration metrics
 * - Early warning signal detection
 * - Tracker saturation prediction
 */

import type { PrismaClient } from '@prisma/client';

// ============================================================
// MOMENTUM & ACCELERATION
// ============================================================

export interface MomentumMetrics {
  velocity: number; // Rate of change (points per scan)
  acceleration: number; // Change in rate of change
  direction: 'improving' | 'declining' | 'stable';
  momentum: 'accelerating' | 'decelerating' | 'steady';
  predictedScoreIn30d: number;
  currentScore: number;
  confidence: number;
  scanCount: number;
}

/**
 * Calculate momentum metrics for trend prediction.
 */
export async function calculateMomentum(
  prisma: PrismaClient,
  domainId: string
): Promise<MomentumMetrics | null> {
  const changes = await prisma.domainChange.findMany({
    where: { domainId },
    orderBy: { detectedAt: 'desc' },
    take: 10,
    select: {
      scoreDelta: true,
      detectedAt: true,
    },
  });

  if (changes.length < 3) return null;

  // Calculate velocity (recent rate of change)
  const recentChanges = changes.slice(0, 5);
  const olderChanges = changes.slice(5);

  const recentVelocity =
    recentChanges.reduce((sum, c) => sum + c.scoreDelta, 0) / recentChanges.length;
  const olderVelocity =
    olderChanges.length > 0
      ? olderChanges.reduce((sum, c) => sum + c.scoreDelta, 0) / olderChanges.length
      : 0;

  // Acceleration = change in velocity
  const acceleration = recentVelocity - olderVelocity;

  // Direction
  const direction: MomentumMetrics['direction'] =
    recentVelocity > 1 ? 'improving' : recentVelocity < -1 ? 'declining' : 'stable';

  // Momentum
  const momentum: MomentumMetrics['momentum'] =
    acceleration > 0.5 ? 'accelerating' : acceleration < -0.5 ? 'decelerating' : 'steady';

  // Predict score in 30 days
  const latestScan = await prisma.scan.findFirst({
    where: { domainId, status: 'done' },
    orderBy: { finishedAt: 'desc' },
    select: { score: true },
  });

  const currentScore = latestScan?.score ?? 50;
  const predictedChange = recentVelocity * 2; // ~2 scans in 30 days
  const predictedScore = Math.max(0, Math.min(100, currentScore + predictedChange));

  return {
    velocity: recentVelocity,
    acceleration,
    direction,
    momentum,
    predictedScoreIn30d: Math.round(predictedScore),
    currentScore,
    confidence: Math.min(0.9, changes.length * 0.1),
    scanCount: changes.length,
  };
}

// ============================================================
// EARLY WARNING SIGNALS
// ============================================================

export interface EarlyWarning {
  domainId: string;
  domain: string;
  indexTier: string | null;
  signal: 'ACCELERATING_DECLINE' | 'VOLATILITY_CLUSTER' | 'CATEGORY_CONTAGION';
  severity: 'low' | 'medium' | 'high';
  description: string;
  predictedOutcome: string;
  confidence: number;
}

/**
 * Detect early warning signals across domains.
 */
export async function detectEarlyWarnings(prisma: PrismaClient): Promise<EarlyWarning[]> {
  const warnings: EarlyWarning[] = [];

  // 1. Accelerating decline
  const decliningDomains = await prisma.domainStability.findMany({
    where: { trend: 'DECLINING', trendStrength: { gte: 0.5 } },
    include: { domain: { select: { id: true, domain: true, indexTier: true } } },
    take: 100,
  });

  for (const ds of decliningDomains) {
    const momentum = await calculateMomentum(prisma, ds.domainId);

    if (momentum?.momentum === 'accelerating' && momentum.direction === 'declining') {
      warnings.push({
        domainId: ds.domainId,
        domain: ds.domain.domain,
        indexTier: ds.domain.indexTier,
        signal: 'ACCELERATING_DECLINE',
        severity: ds.domain.indexTier === 'A' ? 'high' : 'medium',
        description: `${ds.domain.domain} decline is accelerating`,
        predictedOutcome: `Score may drop to ${momentum.predictedScoreIn30d} in 30 days`,
        confidence: momentum.confidence,
      });
    }
  }

  // 2. Volatility clustering (multiple changes in short period)
  const recentChanges = await prisma.domainChange.groupBy({
    by: ['domainId'],
    where: {
      detectedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
    _count: true,
  });

  const volatileClusters = recentChanges.filter((c) => c._count >= 3);

  for (const cluster of volatileClusters) {
    const domain = await prisma.domain.findUnique({
      where: { id: cluster.domainId },
      select: { domain: true, indexTier: true },
    });

    if (domain) {
      warnings.push({
        domainId: cluster.domainId,
        domain: domain.domain,
        indexTier: domain.indexTier,
        signal: 'VOLATILITY_CLUSTER',
        severity: cluster._count >= 5 ? 'high' : 'medium',
        description: `${domain.domain} had ${cluster._count} changes in 14 days`,
        predictedOutcome: 'Likely to continue unstable behavior',
        confidence: 0.7,
      });
    }
  }

  // 3. Category contagion (multiple domains in same category changing similarly)
  const categoryChanges = await prisma.$queryRaw<
    {
      categoryId: string;
      direction: string;
      count: bigint;
    }[]
  >`
    SELECT d."categoryId",
           CASE WHEN dc."scoreDelta" > 0 THEN 'positive' ELSE 'negative' END as direction,
           COUNT(*)::bigint as count
    FROM "DomainChange" dc
    JOIN "Domain" d ON dc."domainId" = d.id
    WHERE dc."detectedAt" > NOW() - INTERVAL '7 days'
      AND d."categoryId" IS NOT NULL
    GROUP BY d."categoryId", CASE WHEN dc."scoreDelta" > 0 THEN 'positive' ELSE 'negative' END
    HAVING COUNT(*) >= 5
  `;

  for (const cc of categoryChanges) {
    if (cc.direction === 'negative') {
      const category = await prisma.category.findUnique({
        where: { id: cc.categoryId },
        select: { name: true },
      });

      if (category) {
        const count = Number(cc.count);
        warnings.push({
          domainId: cc.categoryId,
          domain: category.name,
          indexTier: null,
          signal: 'CATEGORY_CONTAGION',
          severity: count >= 10 ? 'high' : 'medium',
          description: `${count} domains in ${category.name} declining together`,
          predictedOutcome: 'Category-wide privacy degradation likely',
          confidence: 0.6,
        });
      }
    }
  }

  // Sort by severity
  return warnings.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================================
// TRACKER SATURATION PREDICTION
// ============================================================

export interface TrackerSaturation {
  tracker: string;
  currentAdoption: number;
  adoptionRate: number; // % growth per week
  predictedSaturation: number; // Weeks until growth slows
  status: 'emerging' | 'growing' | 'saturating' | 'declining';
}

/**
 * Predict tracker adoption saturation.
 */
export async function predictTrackerSaturation(
  prisma: PrismaClient
): Promise<TrackerSaturation[]> {
  const trackerTrends = await prisma.trackerTrend.findMany({
    where: {
      periodType: 'WEEKLY',
      periodStart: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { periodStart: 'desc' },
  });

  // Group by tracker
  const trackerHistory = new Map<string, typeof trackerTrends>();
  for (const trend of trackerTrends) {
    if (!trackerHistory.has(trend.trackerDomain)) {
      trackerHistory.set(trend.trackerDomain, []);
    }
    trackerHistory.get(trend.trackerDomain)!.push(trend);
  }

  const predictions: TrackerSaturation[] = [];

  for (const [tracker, history] of trackerHistory) {
    if (history.length < 2) continue;

    const latest = history[0];
    const previous = history[1];

    if (!latest || !previous) continue;

    const adoptionRate =
      previous.domainCount > 0
        ? ((latest.domainCount - previous.domainCount) / previous.domainCount) * 100
        : 0;

    // Determine status
    let status: TrackerSaturation['status'];
    if (adoptionRate > 20) status = 'emerging';
    else if (adoptionRate > 5) status = 'growing';
    else if (adoptionRate > -5) status = 'saturating';
    else status = 'declining';

    // Predict saturation (simple model)
    const predictedSaturation = adoptionRate > 0 ? Math.ceil(50 / adoptionRate) : 0;

    predictions.push({
      tracker,
      currentAdoption: latest.domainCount,
      adoptionRate: Math.round(adoptionRate * 10) / 10,
      predictedSaturation,
      status,
    });
  }

  return predictions.sort((a, b) => b.adoptionRate - a.adoptionRate);
}

/**
 * Get prediction summary statistics.
 */
export async function getPredictionSummary(prisma: PrismaClient): Promise<{
  warningCount: number;
  highSeverityCount: number;
  emergingTrackers: number;
  decliningDomains: number;
}> {
  const warnings = await detectEarlyWarnings(prisma);
  const trackerPredictions = await predictTrackerSaturation(prisma);

  const decliningDomains = await prisma.domainStability.count({
    where: {
      trend: 'DECLINING',
      trendStrength: { gte: 0.5 },
    },
  });

  return {
    warningCount: warnings.length,
    highSeverityCount: warnings.filter((w) => w.severity === 'high').length,
    emergingTrackers: trackerPredictions.filter((t) => t.status === 'emerging').length,
    decliningDomains,
  };
}
