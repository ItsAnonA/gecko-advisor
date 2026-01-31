/**
 * Truth Metrics Service (Phase 3C Observation)
 *
 * Measures whether the system produces claims that survive contact with reality.
 * This is the epistemic validation layer - not just engineering stability.
 *
 * Key Metrics:
 * 1. Truth Half-Life: How long insights remain valid before needing correction
 * 2. Stability Tier Failure Rate: % of full-confidence domains that proved unstable
 * 3. Insight Outcome Validation: Confirmed/Partial/Reversed/Inconclusive rates
 * 4. Retraction Latency: Time between incorrect detection and retraction
 * 5. Governance Enforcement Frequency: % of narratives blocked, retraction tone fails
 *
 * Critical Thresholds:
 * - Truth half-life < 14 days → overfitting noise
 * - Truth half-life > 60 days → missing change signals
 * - Full-confidence failure > 15% → model is lying
 * - Retraction latency > 72 hours → credibility damage
 */

import type { PrismaClient, InsightOutcome } from '@prisma/client';

// ============================================================
// TRUTH HALF-LIFE
// ============================================================

interface TruthHalfLifeMetrics {
  avgDaysToConfirmed: number | null;
  avgDaysToReversed: number | null;
  avgDaysToSuperseded: number | null;
  avgHalfLife: number | null;
  status: 'healthy' | 'overfitting_noise' | 'missing_signals' | 'insufficient_data';
  insightsAnalyzed: number;
  breakdown: {
    confirmed: number;
    reversed: number;
    superseded: number;
    pending: number;
    inconclusive: number;
    partial: number;
  };
}

/**
 * Calculate truth half-life metrics.
 * Half-life = average time until insight outcome is determined.
 *
 * Healthy range: 14-60 days
 * < 14 days: Overfitting noise (predictions too short-term)
 * > 60 days: Missing change signals (not detecting real changes)
 */
export async function calculateTruthHalfLife(
  prisma: PrismaClient,
  options: { since?: Date } = {}
): Promise<TruthHalfLifeMetrics> {
  const since = options.since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const insights = await prisma.insight.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      id: true,
      outcome: true,
      createdAt: true,
      confirmedAt: true,
      reversedAt: true,
      supersededAt: true,
      outcomeValidatedAt: true,
    },
  });

  const breakdown = {
    confirmed: 0,
    reversed: 0,
    superseded: 0,
    pending: 0,
    inconclusive: 0,
    partial: 0,
  };

  const daysToConfirmed: number[] = [];
  const daysToReversed: number[] = [];
  const daysToSuperseded: number[] = [];

  for (const insight of insights) {
    breakdown[insight.outcome.toLowerCase() as keyof typeof breakdown]++;

    if (insight.confirmedAt) {
      const days = (insight.confirmedAt.getTime() - insight.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      daysToConfirmed.push(days);
    }
    if (insight.reversedAt) {
      const days = (insight.reversedAt.getTime() - insight.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      daysToReversed.push(days);
    }
    if (insight.supersededAt) {
      const days = (insight.supersededAt.getTime() - insight.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      daysToSuperseded.push(days);
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const avgDaysToConfirmed = avg(daysToConfirmed);
  const avgDaysToReversed = avg(daysToReversed);
  const avgDaysToSuperseded = avg(daysToSuperseded);

  // Calculate overall half-life (average across all outcome types)
  const allDays = [...daysToConfirmed, ...daysToReversed, ...daysToSuperseded];
  const avgHalfLife = avg(allDays);

  // Determine status
  let status: TruthHalfLifeMetrics['status'] = 'insufficient_data';
  if (allDays.length >= 10) {
    if (avgHalfLife !== null && avgHalfLife < 14) {
      status = 'overfitting_noise';
    } else if (avgHalfLife !== null && avgHalfLife > 60) {
      status = 'missing_signals';
    } else {
      status = 'healthy';
    }
  }

  return {
    avgDaysToConfirmed,
    avgDaysToReversed,
    avgDaysToSuperseded,
    avgHalfLife,
    status,
    insightsAnalyzed: insights.length,
    breakdown,
  };
}

// ============================================================
// STABILITY TIER VALIDATION
// ============================================================

interface StabilityTierValidation {
  fullConfidence: {
    total: number;
    stayedStable: number;
    provedUnstable: number;
    failureRate: number;
    status: 'healthy' | 'model_lying' | 'insufficient_data';
  };
  partialConfidence: {
    total: number;
    stayedStable: number;
    provedUnstable: number;
    failureRate: number;
  };
  provisional: {
    total: number;
    provedVolatile: number;
    provedStable: number;
    volatileRate: number;
  };
  falseStabilityRate: number;
  overallAccuracy: number;
}

/**
 * Validate stability tier predictions.
 *
 * Critical threshold: Full-confidence failure > 15% → model is lying
 */
export async function validateStabilityTiers(
  prisma: PrismaClient,
  options: { since?: Date } = {}
): Promise<StabilityTierValidation> {
  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stabilities = await prisma.domainStability.findMany({
    where: {
      tierAssignedAt: { gte: since },
      tierValidatedAt: { not: null },
    },
    select: {
      confidenceTier: true,
      tierAccurate: true,
      actualVolatility: true,
      volatilityIndex: true,
    },
  });

  const full = stabilities.filter((s) => s.confidenceTier === 'FULL');
  const partial = stabilities.filter((s) => s.confidenceTier === 'PARTIAL');
  const provisional = stabilities.filter((s) => s.confidenceTier === 'PROVISIONAL');

  const fullStable = full.filter((s) => s.tierAccurate === true).length;
  const fullUnstable = full.filter((s) => s.tierAccurate === false).length;
  const fullFailureRate = full.length > 0 ? fullUnstable / full.length : 0;

  const partialStable = partial.filter((s) => s.tierAccurate === true).length;
  const partialUnstable = partial.filter((s) => s.tierAccurate === false).length;
  const partialFailureRate = partial.length > 0 ? partialUnstable / partial.length : 0;

  const provisionalVolatile = provisional.filter((s) => (s.actualVolatility || 0) > 30).length;
  const provisionalStable = provisional.filter((s) => (s.actualVolatility || 0) <= 30).length;
  const volatileRate = provisional.length > 0 ? provisionalVolatile / provisional.length : 0;

  // False stability = domains marked stable that proved unstable
  const totalFalseStable = fullUnstable + partialUnstable;
  const totalStableMarked = full.length + partial.length;
  const falseStabilityRate = totalStableMarked > 0 ? totalFalseStable / totalStableMarked : 0;

  // Overall accuracy
  const totalValidated = stabilities.filter((s) => s.tierAccurate !== null).length;
  const totalAccurate = stabilities.filter((s) => s.tierAccurate === true).length;
  const overallAccuracy = totalValidated > 0 ? totalAccurate / totalValidated : 0;

  return {
    fullConfidence: {
      total: full.length,
      stayedStable: fullStable,
      provedUnstable: fullUnstable,
      failureRate: fullFailureRate,
      status: full.length < 10 ? 'insufficient_data' : fullFailureRate > 0.15 ? 'model_lying' : 'healthy',
    },
    partialConfidence: {
      total: partial.length,
      stayedStable: partialStable,
      provedUnstable: partialUnstable,
      failureRate: partialFailureRate,
    },
    provisional: {
      total: provisional.length,
      provedVolatile: provisionalVolatile,
      provedStable: provisionalStable,
      volatileRate,
    },
    falseStabilityRate,
    overallAccuracy,
  };
}

// ============================================================
// INSIGHT OUTCOME VALIDATION
// ============================================================

interface InsightOutcomeMetrics {
  total: number;
  confirmed: number;
  partial: number;
  reversed: number;
  inconclusive: number;
  pending: number;
  superseded: number;
  confirmationRate: number;
  reversalRate: number;
  status: 'healthy' | 'high_reversal' | 'low_validation' | 'insufficient_data';
}

/**
 * Calculate insight outcome distribution.
 *
 * High reversal rate (>20%) indicates poor prediction quality.
 */
export async function calculateInsightOutcomes(
  prisma: PrismaClient,
  options: { since?: Date } = {}
): Promise<InsightOutcomeMetrics> {
  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const outcomes = await prisma.insight.groupBy({
    by: ['outcome'],
    where: {
      createdAt: { gte: since },
    },
    _count: true,
  });

  const counts: Record<InsightOutcome, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    PARTIAL: 0,
    REVERSED: 0,
    INCONCLUSIVE: 0,
    SUPERSEDED: 0,
  };

  for (const o of outcomes) {
    counts[o.outcome] = o._count;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const validated = counts.CONFIRMED + counts.PARTIAL + counts.REVERSED;

  const confirmationRate = validated > 0 ? (counts.CONFIRMED + counts.PARTIAL) / validated : 0;
  const reversalRate = validated > 0 ? counts.REVERSED / validated : 0;

  let status: InsightOutcomeMetrics['status'] = 'insufficient_data';
  if (validated >= 10) {
    if (reversalRate > 0.2) {
      status = 'high_reversal';
    } else if (validated / total < 0.3 && total > 20) {
      status = 'low_validation';
    } else {
      status = 'healthy';
    }
  }

  return {
    total,
    confirmed: counts.CONFIRMED,
    partial: counts.PARTIAL,
    reversed: counts.REVERSED,
    inconclusive: counts.INCONCLUSIVE,
    pending: counts.PENDING,
    superseded: counts.SUPERSEDED,
    confirmationRate,
    reversalRate,
    status,
  };
}

// ============================================================
// RETRACTION LATENCY
// ============================================================

interface RetractionLatencyMetrics {
  totalRetractions: number;
  avgLatencyHours: number | null;
  medianLatencyHours: number | null;
  within72Hours: number;
  within1Week: number;
  exceeds1Week: number;
  slaBreach72h: number;
  slaBreach1w: number;
  status: 'healthy' | 'credibility_damage' | 'authority_erosion' | 'insufficient_data';
}

/**
 * Calculate retraction latency metrics.
 *
 * SLA Thresholds:
 * - > 72 hours: Credibility damage begins
 * - > 1 week: Authority erosion
 */
export async function calculateRetractionLatency(
  prisma: PrismaClient,
  options: { since?: Date } = {}
): Promise<RetractionLatencyMetrics> {
  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const retractions = await prisma.insight.findMany({
    where: {
      outcome: 'REVERSED',
      incorrectDetectedAt: { not: null },
      createdAt: { gte: since },
    },
    select: {
      incorrectDetectedAt: true,
      retractionPublishedAt: true,
      retractionLatencyHours: true,
    },
  });

  const latencies: number[] = [];
  let within72h = 0;
  let within1w = 0;
  let exceeds1w = 0;

  for (const r of retractions) {
    let hours = r.retractionLatencyHours;

    // Calculate if not stored
    if (hours === null && r.incorrectDetectedAt && r.retractionPublishedAt) {
      hours = (r.retractionPublishedAt.getTime() - r.incorrectDetectedAt.getTime()) / (60 * 60 * 1000);
    }

    if (hours !== null) {
      latencies.push(hours);
      if (hours <= 72) within72h++;
      else if (hours <= 168) within1w++;
      else exceeds1w++;
    }
  }

  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  // Median
  let median: number | null = null;
  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const midVal = sorted[mid] ?? 0;
    const midPrevVal = sorted[mid - 1] ?? 0;
    median = sorted.length % 2 ? midVal : (midPrevVal + midVal) / 2;
  }

  const total = retractions.length;
  const slaBreach72h = total > 0 ? (within1w + exceeds1w) / total : 0;
  const slaBreach1w = total > 0 ? exceeds1w / total : 0;

  let status: RetractionLatencyMetrics['status'] = 'insufficient_data';
  if (total >= 5) {
    if (slaBreach1w > 0.1) {
      status = 'authority_erosion';
    } else if (slaBreach72h > 0.2) {
      status = 'credibility_damage';
    } else {
      status = 'healthy';
    }
  }

  return {
    totalRetractions: total,
    avgLatencyHours: avg,
    medianLatencyHours: median,
    within72Hours: within72h,
    within1Week: within1w,
    exceeds1Week: exceeds1w,
    slaBreach72h,
    slaBreach1w,
    status,
  };
}

// ============================================================
// RETRACTION VISIBILITY LAG
// ============================================================

interface RetractionVisibilityMetrics {
  totalWithVisibility: number;
  avgVisibilityLagHours: number | null;
  within12Hours: number;
  exceeds12Hours: number;
  exceeds24Hours: number;
  visibilitySla12h: number; // % within 12h
  status: 'healthy' | 'hidden_corrections' | 'insufficient_data';
}

/**
 * Calculate retraction visibility lag.
 *
 * Hidden corrections are equivalent to no corrections.
 * Target: <12 hours from retraction publish to visible in public feeds.
 */
export async function calculateRetractionVisibilityLag(
  prisma: PrismaClient,
  options: { since?: Date } = {}
): Promise<RetractionVisibilityMetrics> {
  const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const retractions = await prisma.insight.findMany({
    where: {
      outcome: 'REVERSED',
      retractionPublishedAt: { not: null },
      createdAt: { gte: since },
    },
    select: {
      retractionPublishedAt: true,
      retractionVisibleAt: true,
      visibilityLagHours: true,
    },
  });

  const lags: number[] = [];
  let within12h = 0;
  let exceeds12h = 0;
  let exceeds24h = 0;

  for (const r of retractions) {
    let hours = r.visibilityLagHours;

    // Calculate if not stored
    if (hours === null && r.retractionPublishedAt && r.retractionVisibleAt) {
      hours = (r.retractionVisibleAt.getTime() - r.retractionPublishedAt.getTime()) / (60 * 60 * 1000);
    }

    if (hours !== null) {
      lags.push(hours);
      if (hours <= 12) within12h++;
      else if (hours <= 24) exceeds12h++;
      else exceeds24h++;
    }
  }

  const avg = lags.length > 0 ? lags.reduce((a, b) => a + b, 0) / lags.length : null;
  const total = lags.length;
  const visibilitySla12h = total > 0 ? within12h / total : 0;

  let status: RetractionVisibilityMetrics['status'] = 'insufficient_data';
  if (total >= 3) {
    status = visibilitySla12h >= 0.8 ? 'healthy' : 'hidden_corrections';
  }

  return {
    totalWithVisibility: total,
    avgVisibilityLagHours: avg,
    within12Hours: within12h,
    exceeds12Hours: exceeds12h,
    exceeds24Hours: exceeds24h,
    visibilitySla12h,
    status,
  };
}

// ============================================================
// GOVERNANCE ENFORCEMENT FREQUENCY
// ============================================================

interface GovernanceEnforcementMetrics {
  period: { start: Date; end: Date };
  narratives: {
    attempted: number;
    blocked: number;
    approved: number;
    blockRate: number;
    status: 'enforcing' | 'rules_fake' | 'insufficient_data';
  };
  retractions: {
    attempted: number;
    passed: number;
    failed: number;
    failRate: number;
  };
  insights: {
    generated: number;
    failedQuality: number;
    published: number;
    qualityRejectRate: number;
  };
  changeDetection: {
    scansProcessed: number;
    noChangeRate: number;
    belowThresholdRate: number;
    status: 'sensitive' | 'normal' | 'missing_signals';
  };
}

/**
 * Calculate governance enforcement metrics.
 *
 * If enforcement never blocks anything → rules are fake.
 */
export async function calculateGovernanceEnforcement(
  prisma: PrismaClient,
  options: { since?: Date } = {}
): Promise<GovernanceEnforcementMetrics> {
  const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  // Get governance metrics for period
  const metrics = await prisma.governanceMetrics.findMany({
    where: {
      date: { gte: since },
    },
  });

  // Aggregate
  const totals = {
    narrativesAttempted: 0,
    narrativesBlocked: 0,
    narrativesApproved: 0,
    retractionsAttempted: 0,
    retractionsPassed: 0,
    retractionsFailed: 0,
    insightsGenerated: 0,
    insightsFailedQuality: 0,
    insightsPublished: 0,
    scansProcessed: 0,
    scansWithNoChange: 0,
    changesBelow: 0,
  };

  for (const m of metrics) {
    totals.narrativesAttempted += m.narrativesAttempted;
    totals.narrativesBlocked += m.narrativesBlocked;
    totals.narrativesApproved += m.narrativesApproved;
    totals.retractionsAttempted += m.retractionsAttempted;
    totals.retractionsPassed += m.retractionsPassed;
    totals.retractionsFailed += m.retractionsFailed;
    totals.insightsGenerated += m.insightsGenerated;
    totals.insightsFailedQuality += m.insightsFailedQuality;
    totals.insightsPublished += m.insightsPublished;
    totals.scansProcessed += m.scansProcessed;
    totals.scansWithNoChange += m.scansWithNoChange;
    totals.changesBelow += m.changesBelow;
  }

  const blockRate = totals.narrativesAttempted > 0 ? totals.narrativesBlocked / totals.narrativesAttempted : 0;
  const retractionFailRate =
    totals.retractionsAttempted > 0 ? totals.retractionsFailed / totals.retractionsAttempted : 0;
  const qualityRejectRate =
    totals.insightsGenerated > 0 ? totals.insightsFailedQuality / totals.insightsGenerated : 0;
  const noChangeRate = totals.scansProcessed > 0 ? totals.scansWithNoChange / totals.scansProcessed : 0;
  const belowThresholdRate = totals.scansProcessed > 0 ? totals.changesBelow / totals.scansProcessed : 0;

  // Determine narrative enforcement status
  let narrativeStatus: 'enforcing' | 'rules_fake' | 'insufficient_data' = 'insufficient_data';
  if (totals.narrativesAttempted >= 10) {
    narrativeStatus = blockRate > 0.01 ? 'enforcing' : 'rules_fake';
  }

  // Determine change detection status
  let changeStatus: 'sensitive' | 'normal' | 'missing_signals' = 'normal';
  if (totals.scansProcessed >= 100) {
    if (noChangeRate > 0.9) {
      changeStatus = 'missing_signals';
    } else if (noChangeRate < 0.5) {
      changeStatus = 'sensitive';
    }
  }

  return {
    period: { start: since, end: now },
    narratives: {
      attempted: totals.narrativesAttempted,
      blocked: totals.narrativesBlocked,
      approved: totals.narrativesApproved,
      blockRate,
      status: narrativeStatus,
    },
    retractions: {
      attempted: totals.retractionsAttempted,
      passed: totals.retractionsPassed,
      failed: totals.retractionsFailed,
      failRate: retractionFailRate,
    },
    insights: {
      generated: totals.insightsGenerated,
      failedQuality: totals.insightsFailedQuality,
      published: totals.insightsPublished,
      qualityRejectRate,
    },
    changeDetection: {
      scansProcessed: totals.scansProcessed,
      noChangeRate,
      belowThresholdRate,
      status: changeStatus,
    },
  };
}

// ============================================================
// COMPREHENSIVE TRUTH REPORT
// ============================================================

export interface TruthMetricsReport {
  generatedAt: Date;
  observationPeriodDays: number;
  truthHalfLife: TruthHalfLifeMetrics;
  stabilityTierValidation: StabilityTierValidation;
  insightOutcomes: InsightOutcomeMetrics;
  retractionLatency: RetractionLatencyMetrics;
  retractionVisibility: RetractionVisibilityMetrics;
  governanceEnforcement: GovernanceEnforcementMetrics;
  overallStatus: 'HEALTHY' | 'CONCERNS' | 'CRITICAL' | 'INSUFFICIENT_DATA';
  phase4Ready: boolean;
  blockers: string[];
}

/**
 * Generate comprehensive truth metrics report.
 *
 * This is the key question: "Does the system resist telling convincing lies?"
 */
export async function generateTruthMetricsReport(
  prisma: PrismaClient,
  options: { days?: number } = {}
): Promise<TruthMetricsReport> {
  const days = options.days || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [truthHalfLife, stabilityTierValidation, insightOutcomes, retractionLatency, retractionVisibility, governanceEnforcement] =
    await Promise.all([
      calculateTruthHalfLife(prisma, { since }),
      validateStabilityTiers(prisma, { since }),
      calculateInsightOutcomes(prisma, { since }),
      calculateRetractionLatency(prisma, { since }),
      calculateRetractionVisibilityLag(prisma, { since }),
      calculateGovernanceEnforcement(prisma, { since }),
    ]);

  // Determine overall status and blockers
  const blockers: string[] = [];

  // Check truth half-life
  if (truthHalfLife.status === 'overfitting_noise') {
    blockers.push('Truth half-life < 14 days: System is overfitting noise');
  } else if (truthHalfLife.status === 'missing_signals') {
    blockers.push('Truth half-life > 60 days: System is missing change signals');
  }

  // Check stability tier
  if (stabilityTierValidation.fullConfidence.status === 'model_lying') {
    blockers.push(`Full-confidence failure rate ${(stabilityTierValidation.fullConfidence.failureRate * 100).toFixed(1)}% > 15%: Model is lying`);
  }

  // Check insight outcomes
  if (insightOutcomes.status === 'high_reversal') {
    blockers.push(`Insight reversal rate ${(insightOutcomes.reversalRate * 100).toFixed(1)}% > 20%: Poor prediction quality`);
  }

  // Check retraction latency
  if (retractionLatency.status === 'authority_erosion') {
    blockers.push('Retraction latency exceeds 1 week: Authority erosion');
  } else if (retractionLatency.status === 'credibility_damage') {
    blockers.push('Retraction latency exceeds 72 hours: Credibility damage');
  }

  // Check governance
  if (governanceEnforcement.narratives.status === 'rules_fake') {
    blockers.push('Governance never blocks narratives: Rules are fake');
  }

  // Check retraction visibility (hidden corrections = no corrections)
  if (retractionVisibility.status === 'hidden_corrections') {
    blockers.push(`Retraction visibility lag > 12h: Hidden corrections (${retractionVisibility.avgVisibilityLagHours?.toFixed(1)}h avg)`);
  }

  // Determine overall status
  let overallStatus: TruthMetricsReport['overallStatus'] = 'HEALTHY';
  const criticalBlockers = blockers.filter(
    (b) => b.includes('lying') || b.includes('Authority erosion') || b.includes('fake')
  );

  if (criticalBlockers.length > 0) {
    overallStatus = 'CRITICAL';
  } else if (blockers.length > 0) {
    overallStatus = 'CONCERNS';
  } else if (
    truthHalfLife.status === 'insufficient_data' ||
    stabilityTierValidation.fullConfidence.status === 'insufficient_data' ||
    insightOutcomes.status === 'insufficient_data'
  ) {
    overallStatus = 'INSUFFICIENT_DATA';
  }

  return {
    generatedAt: new Date(),
    observationPeriodDays: days,
    truthHalfLife,
    stabilityTierValidation,
    insightOutcomes,
    retractionLatency,
    retractionVisibility,
    governanceEnforcement,
    overallStatus,
    phase4Ready: overallStatus === 'HEALTHY' && blockers.length === 0,
    blockers,
  };
}

// ============================================================
// RECORD GOVERNANCE METRICS (called by other services)
// ============================================================

/**
 * Record daily governance metrics.
 * Called by narrative generation, insight generation, and change detection.
 */
export async function recordGovernanceMetric(
  prisma: PrismaClient,
  metric: Partial<{
    narrativesAttempted: number;
    narrativesBlocked: number;
    narrativesApproved: number;
    forbiddenCausalCount: number;
    missingHedgeCount: number;
    overconfidentCount: number;
    retractionsAttempted: number;
    retractionsPassed: number;
    retractionsFailed: number;
    insightsGenerated: number;
    insightsFailedQuality: number;
    insightsPublished: number;
    scansProcessed: number;
    scansWithNoChange: number;
    changesBelow: number;
  }>
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.governanceMetrics.upsert({
    where: { date: today },
    create: {
      date: today,
      ...metric,
    },
    update: {
      narrativesAttempted: { increment: metric.narrativesAttempted || 0 },
      narrativesBlocked: { increment: metric.narrativesBlocked || 0 },
      narrativesApproved: { increment: metric.narrativesApproved || 0 },
      forbiddenCausalCount: { increment: metric.forbiddenCausalCount || 0 },
      missingHedgeCount: { increment: metric.missingHedgeCount || 0 },
      overconfidentCount: { increment: metric.overconfidentCount || 0 },
      retractionsAttempted: { increment: metric.retractionsAttempted || 0 },
      retractionsPassed: { increment: metric.retractionsPassed || 0 },
      retractionsFailed: { increment: metric.retractionsFailed || 0 },
      insightsGenerated: { increment: metric.insightsGenerated || 0 },
      insightsFailedQuality: { increment: metric.insightsFailedQuality || 0 },
      insightsPublished: { increment: metric.insightsPublished || 0 },
      scansProcessed: { increment: metric.scansProcessed || 0 },
      scansWithNoChange: { increment: metric.scansWithNoChange || 0 },
      changesBelow: { increment: metric.changesBelow || 0 },
    },
  });
}
