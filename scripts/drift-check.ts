#!/usr/bin/env npx ts-node

/**
 * DRIFT MONITORING CHECK
 *
 * Daily job to detect statistical and operational drift.
 * Identifies changes in score distributions, detection patterns,
 * and methodology effectiveness.
 *
 * Usage:
 *   npx tsx scripts/drift-check.ts
 *   npx tsx scripts/drift-check.ts --json      # Output as JSON
 *
 * Schedule: Daily (1 AM UTC)
 *   0 1 * * * docker exec ga-backend npx tsx /app/scripts/drift-check.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');

interface DriftMetrics {
  scoreDistribution: {
    current: { mean: number; stdDev: number };
    previous: { mean: number; stdDev: number };
    drift: number;
    alert: boolean;
  };
  trackerDetection: {
    currentAvg: number;
    previousAvg: number;
    changePercent: number;
    alert: boolean;
  };
  fingerprintingRate: {
    current: number;
    previous: number;
    changePercent: number;
    alert: boolean;
  };
  insightVolume: {
    current: number;
    previous: number;
    changePercent: number;
    alert: boolean;
  };
}

interface DriftReport {
  date: string;
  metrics: DriftMetrics;
  alerts: string[];
  overallStatus: 'healthy' | 'warning' | 'critical';
  duration: number;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              DAILY DRIFT MONITORING CHECK                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${now.toISOString().split('T')[0]}`);
    console.log('');
  }

  try {
    const alerts: string[] = [];

    // 1. Score Distribution Drift
    const currentScores = await prisma.scan.findMany({
      where: { status: 'done', finishedAt: { gte: sevenDaysAgo }, score: { not: null } },
      select: { score: true },
    });

    const previousScores = await prisma.scan.findMany({
      where: { status: 'done', finishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, score: { not: null } },
      select: { score: true },
    });

    const currentScoreValues = currentScores.map((s) => s.score!);
    const previousScoreValues = previousScores.map((s) => s.score!);

    const currentMean = currentScoreValues.length > 0 ? currentScoreValues.reduce((a, b) => a + b, 0) / currentScoreValues.length : 0;
    const previousMean = previousScoreValues.length > 0 ? previousScoreValues.reduce((a, b) => a + b, 0) / previousScoreValues.length : 0;

    const currentStdDev = calculateStdDev(currentScoreValues);
    const previousStdDev = calculateStdDev(previousScoreValues);

    const scoreDrift = previousMean !== 0 ? Math.abs((currentMean - previousMean) / previousMean) * 100 : 0;
    const scoreDriftAlert = scoreDrift > 10; // Alert if >10% drift

    if (scoreDriftAlert) {
      alerts.push(`Score distribution drifted ${scoreDrift.toFixed(1)}% (threshold: 10%)`);
    }

    // 2. Tracker Detection Drift
    const currentTrackers = await prisma.domainChange.aggregate({
      where: { detectedAt: { gte: sevenDaysAgo } },
      _avg: { trackerCountAfter: true },
    });

    const previousTrackers = await prisma.domainChange.aggregate({
      where: { detectedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      _avg: { trackerCountAfter: true },
    });

    const currentTrackerAvg = currentTrackers._avg.trackerCountAfter ?? 0;
    const previousTrackerAvg = previousTrackers._avg.trackerCountAfter ?? 0;
    const trackerChangePercent = previousTrackerAvg !== 0 ? ((currentTrackerAvg - previousTrackerAvg) / previousTrackerAvg) * 100 : 0;
    const trackerAlert = Math.abs(trackerChangePercent) > 20;

    if (trackerAlert) {
      alerts.push(`Tracker detection changed ${trackerChangePercent.toFixed(1)}% (threshold: 20%)`);
    }

    // 3. Fingerprinting Rate Drift
    const currentFpChanges = await prisma.domainChange.count({
      where: { detectedAt: { gte: sevenDaysAgo }, fingerprintingChanged: true },
    });

    const previousFpChanges = await prisma.domainChange.count({
      where: { detectedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, fingerprintingChanged: true },
    });

    const currentTotalChanges = await prisma.domainChange.count({
      where: { detectedAt: { gte: sevenDaysAgo } },
    });

    const previousTotalChanges = await prisma.domainChange.count({
      where: { detectedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    });

    const currentFpRate = currentTotalChanges > 0 ? (currentFpChanges / currentTotalChanges) * 100 : 0;
    const previousFpRate = previousTotalChanges > 0 ? (previousFpChanges / previousTotalChanges) * 100 : 0;
    const fpChangePercent = previousFpRate !== 0 ? ((currentFpRate - previousFpRate) / previousFpRate) * 100 : 0;
    const fpAlert = Math.abs(fpChangePercent) > 30;

    if (fpAlert) {
      alerts.push(`Fingerprinting rate changed ${fpChangePercent.toFixed(1)}% (threshold: 30%)`);
    }

    // 4. Insight Volume Drift
    const currentInsights = await prisma.insight.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const previousInsights = await prisma.insight.count({
      where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    });

    const insightChangePercent = previousInsights !== 0 ? ((currentInsights - previousInsights) / previousInsights) * 100 : 0;
    const insightAlert = Math.abs(insightChangePercent) > 50;

    if (insightAlert) {
      alerts.push(`Insight volume changed ${insightChangePercent.toFixed(1)}% (threshold: 50%)`);
    }

    const metrics: DriftMetrics = {
      scoreDistribution: {
        current: { mean: Math.round(currentMean * 10) / 10, stdDev: Math.round(currentStdDev * 10) / 10 },
        previous: { mean: Math.round(previousMean * 10) / 10, stdDev: Math.round(previousStdDev * 10) / 10 },
        drift: Math.round(scoreDrift * 10) / 10,
        alert: scoreDriftAlert,
      },
      trackerDetection: {
        currentAvg: Math.round(currentTrackerAvg * 10) / 10,
        previousAvg: Math.round(previousTrackerAvg * 10) / 10,
        changePercent: Math.round(trackerChangePercent * 10) / 10,
        alert: trackerAlert,
      },
      fingerprintingRate: {
        current: Math.round(currentFpRate * 10) / 10,
        previous: Math.round(previousFpRate * 10) / 10,
        changePercent: Math.round(fpChangePercent * 10) / 10,
        alert: fpAlert,
      },
      insightVolume: {
        current: currentInsights,
        previous: previousInsights,
        changePercent: Math.round(insightChangePercent * 10) / 10,
        alert: insightAlert,
      },
    };

    const overallStatus: DriftReport['overallStatus'] =
      alerts.length >= 3 ? 'critical' : alerts.length >= 1 ? 'warning' : 'healthy';

    const report: DriftReport = {
      date: now.toISOString().split('T')[0] ?? '',
      metrics,
      alerts,
      overallStatus,
      duration: Date.now() - startTime,
    };

    if (!outputJson) {
      console.log('────────────────────────────────────────────────────────────');
      console.log('DRIFT ANALYSIS');
      console.log('');
      console.log('  Score Distribution:');
      console.log(`    Current: mean=${metrics.scoreDistribution.current.mean}, stdDev=${metrics.scoreDistribution.current.stdDev}`);
      console.log(`    Previous: mean=${metrics.scoreDistribution.previous.mean}, stdDev=${metrics.scoreDistribution.previous.stdDev}`);
      console.log(`    Drift: ${metrics.scoreDistribution.drift}% ${metrics.scoreDistribution.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('  Tracker Detection:');
      console.log(`    Current avg: ${metrics.trackerDetection.currentAvg}`);
      console.log(`    Previous avg: ${metrics.trackerDetection.previousAvg}`);
      console.log(`    Change: ${metrics.trackerDetection.changePercent}% ${metrics.trackerDetection.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('  Fingerprinting Rate:');
      console.log(`    Current: ${metrics.fingerprintingRate.current}%`);
      console.log(`    Previous: ${metrics.fingerprintingRate.previous}%`);
      console.log(`    Change: ${metrics.fingerprintingRate.changePercent}% ${metrics.fingerprintingRate.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('  Insight Volume:');
      console.log(`    Current: ${metrics.insightVolume.current}`);
      console.log(`    Previous: ${metrics.insightVolume.previous}`);
      console.log(`    Change: ${metrics.insightVolume.changePercent}% ${metrics.insightVolume.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('────────────────────────────────────────────────────────────');
      console.log(`STATUS: ${overallStatus.toUpperCase()}`);
      if (alerts.length > 0) {
        console.log('');
        console.log('ALERTS:');
        alerts.forEach((a) => console.log(`  ⚠️ ${a}`));
      }
      console.log('');
      console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');
      console.log(overallStatus === 'healthy' ? '✅ Drift check complete' : '⚠️ Drift check complete with alerts');
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'drift_check_report' },
      create: { key: 'drift_check_report', value: report as unknown as Record<string, unknown> },
      update: { value: report as unknown as Record<string, unknown> },
    });
  } catch (error) {
    console.error('❌ Drift check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
