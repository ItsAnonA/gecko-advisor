/**
 * Truth Metrics Report (Phase 3C Observation)
 *
 * The Real Question: "Does the system resist telling convincing lies?"
 *
 * Run weekly (Friday 8 AM) to evaluate truth-centric metrics before Phase 4.
 *
 * 5 Critical Metrics:
 * 1. Truth Half-Life: 14-60 days (healthy)
 * 2. Stability Tier Failure: <15% (hard gate)
 * 3. Insight Accuracy: >70% confirmed+partial (hard gate)
 * 4. Retraction Latency: <48 hours (hard gate)
 * 5. Governance Block Rate: 5-20% (healthy range)
 *
 * Phase 4 Clearance: ALL hard gates must pass.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// OUTCOME EVALUATION
// ============================================================

type InsightOutcomeResult = 'CONFIRMED' | 'PARTIAL' | 'REVERSED' | 'INCONCLUSIVE';

async function evaluateInsightOutcome(
  insight: any,
  prisma: PrismaClient
): Promise<{ outcome: InsightOutcomeResult; reason: string }> {
  const domainId = insight.domainId;
  const insightType = insight.insightType;

  if (!domainId) {
    return { outcome: 'INCONCLUSIVE', reason: 'No domain associated' };
  }

  // Get recent scans after insight was published
  const recentScans = await prisma.scan.findMany({
    where: {
      domainId,
      status: 'done',
      completedAt: { gt: insight.createdAt },
    },
    orderBy: { completedAt: 'desc' },
    take: 3,
    select: { score: true, completedAt: true },
  });

  if (recentScans.length < 2) {
    return { outcome: 'INCONCLUSIVE', reason: 'Insufficient follow-up scans' };
  }

  const latestScore = recentScans[0]?.score;
  const previousScore = recentScans[1]?.score;

  if (latestScore === null || previousScore === null) {
    return { outcome: 'INCONCLUSIVE', reason: 'Missing score data' };
  }

  const recentDelta = latestScore - previousScore;
  const details = insight.details as any;
  const predictedDelta = details?.scoreDelta || details?.delta || 0;

  switch (insightType) {
    case 'DOMAIN_IMPROVEMENT':
      if (recentDelta > 5) return { outcome: 'CONFIRMED', reason: `Continued improving: +${recentDelta}` };
      if (recentDelta >= 0) return { outcome: 'PARTIAL', reason: `Stable/slight improvement: ${recentDelta}` };
      return { outcome: 'REVERSED', reason: `Reversed to decline: ${recentDelta}` };

    case 'DOMAIN_REGRESSION':
      if (recentDelta < -5) return { outcome: 'CONFIRMED', reason: `Continued declining: ${recentDelta}` };
      if (recentDelta <= 0) return { outcome: 'PARTIAL', reason: `Stable/slight decline: ${recentDelta}` };
      return { outcome: 'REVERSED', reason: `Reversed to improvement: +${recentDelta}` };

    case 'CATEGORY_TREND':
      // Would need category-wide comparison
      return { outcome: 'INCONCLUSIVE', reason: 'Category trends require aggregate analysis' };

    case 'TRACKER_SURGE':
    case 'TRACKER_DECLINE':
      // Would need tracker-specific comparison
      return { outcome: 'INCONCLUSIVE', reason: 'Tracker trends require specific analysis' };

    default:
      return { outcome: 'INCONCLUSIVE', reason: `Unknown insight type: ${insightType}` };
  }
}

// ============================================================
// TRUTH HALF-LIFE
// ============================================================

async function calculateTruthHalfLife() {
  console.log('\n📊 TRUTH HALF-LIFE');
  console.log('─'.repeat(50));

  // Get insights published 14+ days ago for evaluation
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const publishedInsights = await prisma.insight.findMany({
    where: {
      isPublishable: true,
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const results: {
    insightId: string;
    daysToEvaluation: number;
    outcome: InsightOutcomeResult;
    reason: string;
  }[] = [];

  for (const insight of publishedInsights) {
    const evaluation = await evaluateInsightOutcome(insight, prisma);
    const days = Math.floor((Date.now() - insight.createdAt.getTime()) / (24 * 60 * 60 * 1000));

    results.push({
      insightId: insight.id,
      daysToEvaluation: days,
      outcome: evaluation.outcome,
      reason: evaluation.reason,
    });

    // Update insight with outcome if not already set
    if (insight.outcome === 'PENDING') {
      await prisma.insight.update({
        where: { id: insight.id },
        data: {
          outcome: evaluation.outcome,
          outcomeDetails: evaluation.reason,
          outcomeValidatedAt: new Date(),
          ...(evaluation.outcome === 'CONFIRMED' && { confirmedAt: new Date() }),
          ...(evaluation.outcome === 'REVERSED' && {
            reversedAt: new Date(),
            incorrectDetectedAt: new Date(),
          }),
        },
      });
    }
  }

  const evaluated = results.filter((r) => r.outcome !== 'INCONCLUSIVE');
  const avgHalfLife = evaluated.length > 0
    ? evaluated.reduce((sum, r) => sum + r.daysToEvaluation, 0) / evaluated.length
    : null;

  const healthy = avgHalfLife !== null && avgHalfLife >= 14 && avgHalfLife <= 60;
  const status = avgHalfLife === null
    ? 'INSUFFICIENT_DATA'
    : avgHalfLife < 14
      ? 'OVERFITTING_NOISE'
      : avgHalfLife > 60
        ? 'MISSING_SIGNALS'
        : 'HEALTHY';

  console.log(`  Average: ${avgHalfLife?.toFixed(1) ?? 'N/A'} days ${healthy ? '✅' : status === 'INSUFFICIENT_DATA' ? '⚪' : '⚠️'}`);
  console.log(`  Evaluated: ${evaluated.length}/${publishedInsights.length} insights`);
  console.log(`  Status: ${status}`);

  return {
    avgDays: avgHalfLife,
    evaluated: evaluated.length,
    total: publishedInsights.length,
    healthy,
    status,
  };
}

// ============================================================
// STABILITY TIER FAILURE RATE
// ============================================================

async function calculateStabilityTierFailure() {
  console.log('\n📊 STABILITY TIER FAILURE RATE');
  console.log('─'.repeat(50));

  // Get domains with full confidence
  const fullConfidence = await prisma.domainStability.findMany({
    where: { confidenceTier: 'FULL' },
    include: { domain: true },
  });

  let failed = 0;
  const failures: { domain: string; reason: string }[] = [];

  for (const ds of fullConfidence) {
    // Get recent changes for this domain (last 14 days)
    const recentChanges = await prisma.domainChange.findMany({
      where: {
        domainId: ds.domainId,
        detectedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    });

    // If "stable" domain had significant changes → failure
    const hadSignificantChange = recentChanges.some(
      (c) => Math.abs(c.scoreDelta) >= 10 || c.fingerprintingChanged
    );

    if (hadSignificantChange && ds.trend === 'STABLE') {
      failed++;
      failures.push({
        domain: ds.domain.name,
        reason: recentChanges.map((c) => `Δ${c.scoreDelta}`).join(', '),
      });

      // Update validation result
      await prisma.domainStability.update({
        where: { id: ds.id },
        data: {
          tierValidatedAt: new Date(),
          tierValidationResult: false,
          tierAccurate: false,
          actualVolatility: Math.max(...recentChanges.map((c) => Math.abs(c.scoreDelta))),
        },
      });
    }
  }

  const failureRate = fullConfidence.length > 0 ? (failed / fullConfidence.length) * 100 : 0;
  const healthy = failureRate < 15;

  console.log(`  Rate: ${failureRate.toFixed(1)}% ${healthy ? '✅' : '🔴 MODEL LYING'}`);
  console.log(`  Full confidence: ${fullConfidence.length}, Failed: ${failed}`);
  console.log(`  Threshold: <15%`);

  if (failures.length > 0 && failures.length <= 5) {
    console.log(`  Failures:`);
    failures.forEach((f) => console.log(`    - ${f.domain}: ${f.reason}`));
  }

  return {
    rate: failureRate,
    total: fullConfidence.length,
    failed,
    healthy,
    status: fullConfidence.length < 10 ? 'INSUFFICIENT_DATA' : healthy ? 'HEALTHY' : 'MODEL_LYING',
  };
}

// ============================================================
// INSIGHT OUTCOME VALIDATION
// ============================================================

async function calculateInsightAccuracy() {
  console.log('\n📊 INSIGHT ACCURACY');
  console.log('─'.repeat(50));

  // Get outcome distribution
  const outcomes = await prisma.insight.groupBy({
    by: ['outcome'],
    where: {
      isPublishable: true,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _count: true,
  });

  const counts: Record<string, number> = {
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
  const accurate = counts.CONFIRMED + counts.PARTIAL;
  const accuracyRate = validated > 0 ? (accurate / validated) * 100 : 0;
  const healthy = accuracyRate >= 70;

  console.log(`  Accuracy: ${accuracyRate.toFixed(1)}% ${healthy ? '✅' : '⚠️'}`);
  console.log(`  Confirmed: ${counts.CONFIRMED}, Partial: ${counts.PARTIAL}`);
  console.log(`  Reversed: ${counts.REVERSED}, Inconclusive: ${counts.INCONCLUSIVE}`);
  console.log(`  Pending: ${counts.PENDING}, Total: ${total}`);
  console.log(`  Target: >70% confirmed+partial`);

  return {
    rate: accuracyRate,
    confirmed: counts.CONFIRMED,
    partial: counts.PARTIAL,
    reversed: counts.REVERSED,
    inconclusive: counts.INCONCLUSIVE,
    pending: counts.PENDING,
    total,
    validated,
    healthy,
    status: validated < 10 ? 'INSUFFICIENT_DATA' : healthy ? 'HEALTHY' : 'HIGH_REVERSAL',
  };
}

// ============================================================
// RETRACTION LATENCY
// ============================================================

async function calculateRetractionLatency() {
  console.log('\n📊 RETRACTION LATENCY');
  console.log('─'.repeat(50));

  const retractions = await prisma.insight.findMany({
    where: {
      outcome: 'REVERSED',
      incorrectDetectedAt: { not: null },
    },
    select: {
      id: true,
      incorrectDetectedAt: true,
      retractionPublishedAt: true,
      retractionLatencyHours: true,
    },
  });

  const latencies: number[] = [];
  let under48h = 0;
  let under72h = 0;
  let under1w = 0;
  let over1w = 0;

  for (const r of retractions) {
    let hours = r.retractionLatencyHours;

    if (hours === null && r.incorrectDetectedAt && r.retractionPublishedAt) {
      hours = (r.retractionPublishedAt.getTime() - r.incorrectDetectedAt.getTime()) / (60 * 60 * 1000);
    }

    if (hours !== null) {
      latencies.push(hours);
      if (hours <= 48) under48h++;
      else if (hours <= 72) under72h++;
      else if (hours <= 168) under1w++;
      else over1w++;
    }
  }

  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : null;

  const healthy = avgLatency !== null && avgLatency < 48;

  let status = 'INSUFFICIENT_DATA';
  if (latencies.length >= 3) {
    if (avgLatency! > 168) status = 'AUTHORITY_EROSION';
    else if (avgLatency! > 72) status = 'CREDIBILITY_DAMAGE';
    else if (avgLatency! > 48) status = 'WARNING';
    else status = 'HEALTHY';
  }

  console.log(`  Average: ${avgLatency?.toFixed(1) ?? 'N/A'} hours ${healthy ? '✅' : status === 'INSUFFICIENT_DATA' ? '⚪' : '⚠️'}`);
  console.log(`  Under 48h: ${under48h}, 48-72h: ${under72h}, 72h-1w: ${under1w}, Over 1w: ${over1w}`);
  console.log(`  Total retractions: ${retractions.length}`);
  console.log(`  Threshold: <48 hours`);
  console.log(`  Status: ${status}`);

  return {
    avgHours: avgLatency,
    under48h,
    under72h,
    under1w,
    over1w,
    total: retractions.length,
    healthy,
    status,
  };
}

// ============================================================
// GOVERNANCE ENFORCEMENT FREQUENCY
// ============================================================

async function calculateGovernanceBlockRate() {
  console.log('\n📊 GOVERNANCE ENFORCEMENT');
  console.log('─'.repeat(50));

  // Get governance metrics for last 7 days
  const metrics = await prisma.governanceMetrics.findMany({
    where: {
      date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  const totals = {
    narrativesAttempted: 0,
    narrativesBlocked: 0,
    narrativesApproved: 0,
    retractionsAttempted: 0,
    retractionsPassed: 0,
    retractionsFailed: 0,
    insightsGenerated: 0,
    insightsFailedQuality: 0,
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
  }

  const blockRate = totals.narrativesAttempted > 0
    ? (totals.narrativesBlocked / totals.narrativesAttempted) * 100
    : null;

  const healthy = blockRate !== null && blockRate >= 5 && blockRate <= 20;

  let status = 'INSUFFICIENT_DATA';
  if (totals.narrativesAttempted >= 10) {
    if (blockRate! < 1) status = 'RULES_FAKE';
    else if (blockRate! > 30) status = 'RULES_TOO_AGGRESSIVE';
    else if (blockRate! >= 5 && blockRate! <= 20) status = 'HEALTHY';
    else status = 'WARNING';
  }

  console.log(`  Block rate: ${blockRate?.toFixed(1) ?? 'N/A'}% ${healthy ? '✅' : status === 'INSUFFICIENT_DATA' ? '⚪' : '⚠️'}`);
  console.log(`  Narratives: ${totals.narrativesBlocked}/${totals.narrativesAttempted} blocked`);
  console.log(`  Retractions: ${totals.retractionsPassed}/${totals.retractionsAttempted} passed tone`);
  console.log(`  Insights: ${totals.insightsFailedQuality}/${totals.insightsGenerated} failed quality`);
  console.log(`  Healthy range: 5-20%`);
  console.log(`  Status: ${status}`);

  return {
    blockRate,
    narrativesAttempted: totals.narrativesAttempted,
    narrativesBlocked: totals.narrativesBlocked,
    healthy,
    status,
  };
}

// ============================================================
// CHANGE SIGNAL QUALITY
// ============================================================

async function calculateChangeSignalQuality() {
  console.log('\n📊 CHANGE SIGNAL QUALITY');
  console.log('─'.repeat(50));

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const scansProcessed = await prisma.scan.count({
    where: {
      status: 'done',
      completedAt: { gte: since },
    },
  });

  const changesDetected = await prisma.domainChange.count({
    where: {
      detectedAt: { gte: since },
    },
  });

  const changesBelowThreshold = await prisma.domainChange.count({
    where: {
      detectedAt: { gte: since },
      changeType: 'MINOR',
    },
  });

  const noChangeRate = scansProcessed > 0
    ? ((scansProcessed - changesDetected) / scansProcessed) * 100
    : 0;

  const belowThresholdRate = scansProcessed > 0
    ? (changesBelowThreshold / scansProcessed) * 100
    : 0;

  // Healthy: 60-80% no-change, 15-30% below-threshold
  const noChangeHealthy = noChangeRate >= 60 && noChangeRate <= 80;
  const belowHealthy = belowThresholdRate >= 15 && belowThresholdRate <= 30;

  let status = 'NORMAL';
  if (noChangeRate > 90) status = 'MISSING_SIGNALS';
  else if (noChangeRate < 50) status = 'TOO_SENSITIVE';
  else if (!noChangeHealthy) status = 'WARNING';

  console.log(`  No-change rate: ${noChangeRate.toFixed(1)}% ${noChangeHealthy ? '✅' : '⚠️'} (target: 60-80%)`);
  console.log(`  Below-threshold: ${belowThresholdRate.toFixed(1)}% ${belowHealthy ? '✅' : '⚠️'} (target: 15-30%)`);
  console.log(`  Scans: ${scansProcessed}, Changes: ${changesDetected}`);
  console.log(`  Status: ${status}`);

  return {
    noChangeRate,
    belowThresholdRate,
    scansProcessed,
    changesDetected,
    noChangeHealthy,
    belowHealthy,
    status,
  };
}

// ============================================================
// SCALE-UP GATE CHECK
// ============================================================

interface ScaleUpGate {
  name: string;
  passed: boolean;
  value: string;
  threshold: string;
}

function checkScaleUpGates(metrics: any): { gates: ScaleUpGate[]; allPassed: boolean } {
  const gates: ScaleUpGate[] = [
    {
      name: 'Reversal rate stable',
      passed: metrics.insightAccuracy.status !== 'HIGH_REVERSAL',
      value: `${(100 - metrics.insightAccuracy.rate).toFixed(1)}%`,
      threshold: '<30%',
    },
    {
      name: 'Retraction latency',
      passed: metrics.retractionLatency.status === 'HEALTHY' || metrics.retractionLatency.status === 'INSUFFICIENT_DATA',
      value: metrics.retractionLatency.avgHours?.toFixed(1) ?? 'N/A',
      threshold: '<48h',
    },
    {
      name: 'Truth half-life in range',
      passed: metrics.truthHalfLife.status === 'HEALTHY' || metrics.truthHalfLife.status === 'INSUFFICIENT_DATA',
      value: metrics.truthHalfLife.avgDays?.toFixed(1) ?? 'N/A',
      threshold: '14-60 days',
    },
    {
      name: 'No-change rate stable',
      passed: metrics.changeSignal.noChangeHealthy || metrics.changeSignal.scansProcessed < 100,
      value: `${metrics.changeSignal.noChangeRate.toFixed(1)}%`,
      threshold: '60-80%',
    },
    {
      name: 'Stability tier accuracy',
      passed: metrics.stabilityTier.status !== 'MODEL_LYING',
      value: `${(100 - metrics.stabilityTier.rate).toFixed(1)}%`,
      threshold: '>85%',
    },
  ];

  return {
    gates,
    allPassed: gates.every((g) => g.passed),
  };
}

// ============================================================
// MAIN REPORT
// ============================================================

async function generateTruthMetricsReport() {
  const observationStart = new Date('2026-01-31');
  const now = new Date();
  const observationDays = Math.floor((now.getTime() - observationStart.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil(observationDays / 7);

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              TRUTH METRICS REPORT (Phase 3C)                 ║');
  console.log('║   "Does the system resist telling convincing lies?"          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  Date: ${now.toISOString().split('T')[0]}`);
  console.log(`  Observation Week: ${week}`);
  console.log(`  Days Since Start: ${observationDays}`);

  // Calculate all metrics
  const truthHalfLife = await calculateTruthHalfLife();
  const stabilityTier = await calculateStabilityTierFailure();
  const insightAccuracy = await calculateInsightAccuracy();
  const retractionLatency = await calculateRetractionLatency();
  const governanceBlock = await calculateGovernanceBlockRate();
  const changeSignal = await calculateChangeSignalQuality();

  // Check scale-up gates
  const metrics = { truthHalfLife, stabilityTier, insightAccuracy, retractionLatency, governanceBlock, changeSignal };
  const scaleUpCheck = checkScaleUpGates(metrics);

  console.log('\n' + '═'.repeat(60));
  console.log('SCALE-UP GATES (Before increasing scan rate)');
  console.log('─'.repeat(60));

  for (const gate of scaleUpCheck.gates) {
    const icon = gate.passed ? '✅' : '❌';
    console.log(`  ${icon} ${gate.name}: ${gate.value} (threshold: ${gate.threshold})`);
  }

  console.log(`\n  All gates passed: ${scaleUpCheck.allPassed ? '✅ YES' : '❌ NO'}`);

  // Phase 4 readiness
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 4 CLEARANCE');
  console.log('─'.repeat(60));

  const hardGates = [
    { name: 'Observation days ≥30', passed: observationDays >= 30, value: observationDays },
    { name: 'Truth half-life 14-60d', passed: truthHalfLife.healthy || truthHalfLife.status === 'INSUFFICIENT_DATA', value: truthHalfLife.avgDays },
    { name: 'Stability tier <15%', passed: stabilityTier.healthy || stabilityTier.status === 'INSUFFICIENT_DATA', value: stabilityTier.rate },
    { name: 'Insight accuracy >70%', passed: insightAccuracy.healthy || insightAccuracy.status === 'INSUFFICIENT_DATA', value: insightAccuracy.rate },
    { name: 'Retraction latency <48h', passed: retractionLatency.healthy || retractionLatency.status === 'INSUFFICIENT_DATA', value: retractionLatency.avgHours },
    { name: 'Governance 5-20%', passed: governanceBlock.healthy || governanceBlock.status === 'INSUFFICIENT_DATA', value: governanceBlock.blockRate },
  ];

  for (const gate of hardGates) {
    const icon = gate.passed ? '✅' : '❌';
    const value = gate.value !== null ? (typeof gate.value === 'number' ? gate.value.toFixed(1) : gate.value) : 'N/A';
    console.log(`  ${icon} ${gate.name}: ${value}`);
  }

  const phase4Ready = hardGates.every((g) => g.passed);
  console.log(`\n  Phase 4 Ready: ${phase4Ready ? '✅ CLEARED' : '❌ NOT CLEARED'}`);

  if (!phase4Ready) {
    const blockers = hardGates.filter((g) => !g.passed).map((g) => g.name);
    console.log(`  Blockers: ${blockers.join(', ')}`);
  }

  // Store report
  const report = {
    date: now.toISOString(),
    week,
    observationDays,
    metrics: {
      truthHalfLife,
      stabilityTier,
      insightAccuracy,
      retractionLatency,
      governanceBlock,
      changeSignal,
    },
    scaleUpGates: scaleUpCheck,
    phase4Ready,
    hardGates,
  };

  await prisma.systemState.upsert({
    where: { key: 'truth_metrics' },
    create: { key: 'truth_metrics', value: report as any },
    update: { value: report as any },
  });

  console.log('\n✅ Report stored in SystemState[truth_metrics]');

  return report;
}

// ============================================================
// EXECUTE
// ============================================================

generateTruthMetricsReport()
  .then(() => {
    console.log('\n' + '═'.repeat(60));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Truth metrics failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
