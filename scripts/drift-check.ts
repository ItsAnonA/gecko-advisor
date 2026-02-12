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
    current: { mean: number; stdDev: number; sampleSize: number };
    previous: { mean: number; stdDev: number; sampleSize: number };
    drift: number;
    alert: boolean;
  };
  trackerDetection: {
    currentRate: number;   // avg trackers per scan
    previousRate: number;  // avg trackers per scan
    absoluteDelta: number; // absolute difference in per-scan rate
    alert: boolean;
  };
  fingerprintingRate: {
    current: number;       // percentage of scans with fingerprinting
    previous: number;
    absoluteDeltaPp: number; // absolute percentage-point difference
    alert: boolean;
  };
  insightVolume: {
    currentPerScan: number;  // insights per scan
    previousPerScan: number;
    absoluteDelta: number;
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
    // Alert if >10% drift AND both periods have minimum sample size
    const MIN_SAMPLE_SIZE = 10;
    const scoreDriftAlert = scoreDrift > 10 && currentScoreValues.length >= MIN_SAMPLE_SIZE && previousScoreValues.length >= MIN_SAMPLE_SIZE;

    if (scoreDriftAlert) {
      alerts.push(`Score distribution drifted ${scoreDrift.toFixed(1)}% (current: ${currentMean.toFixed(1)}, previous: ${previousMean.toFixed(1)})`);
    }

    // 2. Tracker Detection Drift (per-scan rate, not raw counts)
    // Count evidence of kind 'tracker' per scan in each period
    const currentTrackerEvidence = await prisma.evidence.count({
      where: {
        kind: 'tracker',
        scan: { status: 'done', finishedAt: { gte: sevenDaysAgo } },
      },
    });

    const previousTrackerEvidence = await prisma.evidence.count({
      where: {
        kind: 'tracker',
        scan: { status: 'done', finishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      },
    });

    const currentTrackerRate = currentScoreValues.length > 0 ? currentTrackerEvidence / currentScoreValues.length : 0;
    const previousTrackerRate = previousScoreValues.length > 0 ? previousTrackerEvidence / previousScoreValues.length : 0;
    const trackerAbsDelta = Math.abs(currentTrackerRate - previousTrackerRate);
    // Alert on absolute per-scan difference > 2 trackers/scan AND minimum sample size
    const trackerAlert = trackerAbsDelta > 2 && currentScoreValues.length >= MIN_SAMPLE_SIZE && previousScoreValues.length >= MIN_SAMPLE_SIZE;

    if (trackerAlert) {
      alerts.push(`Tracker rate changed by ${trackerAbsDelta.toFixed(1)} trackers/scan (current: ${currentTrackerRate.toFixed(1)}, previous: ${previousTrackerRate.toFixed(1)})`);
    }

    // 3. Fingerprinting Rate Drift (absolute pp change, not relative %)
    // Count scans with fingerprinting evidence in each period
    const currentFpScans = await prisma.scan.count({
      where: {
        status: 'done',
        finishedAt: { gte: sevenDaysAgo },
        evidence: { some: { kind: 'fingerprint' } },
      },
    });

    const previousFpScans = await prisma.scan.count({
      where: {
        status: 'done',
        finishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        evidence: { some: { kind: 'fingerprint' } },
      },
    });

    const currentFpRate = currentScoreValues.length > 0 ? (currentFpScans / currentScoreValues.length) * 100 : 0;
    const previousFpRate = previousScoreValues.length > 0 ? (previousFpScans / previousScoreValues.length) * 100 : 0;
    // Use absolute percentage-point difference (not relative %)
    // e.g., 3.8% → 6.3% = 2.5pp change, NOT 65.8% relative change
    const fpAbsDeltaPp = Math.abs(currentFpRate - previousFpRate);
    // Alert on >10 percentage point absolute shift AND minimum sample size
    const fpAlert = fpAbsDeltaPp > 10 && currentScoreValues.length >= MIN_SAMPLE_SIZE && previousScoreValues.length >= MIN_SAMPLE_SIZE;

    if (fpAlert) {
      alerts.push(`Fingerprinting rate shifted ${fpAbsDeltaPp.toFixed(1)}pp (current: ${currentFpRate.toFixed(1)}%, previous: ${previousFpRate.toFixed(1)}%)`);
    }

    // 4. Insight Volume Drift (normalized per scan)
    const currentInsights = await prisma.insight.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const previousInsights = await prisma.insight.count({
      where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    });

    const currentInsightsPerScan = currentScoreValues.length > 0 ? currentInsights / currentScoreValues.length : 0;
    const previousInsightsPerScan = previousScoreValues.length > 0 ? previousInsights / previousScoreValues.length : 0;
    const insightAbsDelta = Math.abs(currentInsightsPerScan - previousInsightsPerScan);
    // Alert on >0.5 insights/scan absolute change AND minimum sample size
    const insightAlert = insightAbsDelta > 0.5 && currentScoreValues.length >= MIN_SAMPLE_SIZE && previousScoreValues.length >= MIN_SAMPLE_SIZE;

    if (insightAlert) {
      alerts.push(`Insight rate changed by ${insightAbsDelta.toFixed(2)}/scan (current: ${currentInsightsPerScan.toFixed(2)}, previous: ${previousInsightsPerScan.toFixed(2)})`);
    }

    const metrics: DriftMetrics = {
      scoreDistribution: {
        current: { mean: Math.round(currentMean * 10) / 10, stdDev: Math.round(currentStdDev * 10) / 10, sampleSize: currentScoreValues.length },
        previous: { mean: Math.round(previousMean * 10) / 10, stdDev: Math.round(previousStdDev * 10) / 10, sampleSize: previousScoreValues.length },
        drift: Math.round(scoreDrift * 10) / 10,
        alert: scoreDriftAlert,
      },
      trackerDetection: {
        currentRate: Math.round(currentTrackerRate * 10) / 10,
        previousRate: Math.round(previousTrackerRate * 10) / 10,
        absoluteDelta: Math.round(trackerAbsDelta * 10) / 10,
        alert: trackerAlert,
      },
      fingerprintingRate: {
        current: Math.round(currentFpRate * 10) / 10,
        previous: Math.round(previousFpRate * 10) / 10,
        absoluteDeltaPp: Math.round(fpAbsDeltaPp * 10) / 10,
        alert: fpAlert,
      },
      insightVolume: {
        currentPerScan: Math.round(currentInsightsPerScan * 100) / 100,
        previousPerScan: Math.round(previousInsightsPerScan * 100) / 100,
        absoluteDelta: Math.round(insightAbsDelta * 100) / 100,
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
      console.log(`    Current: mean=${metrics.scoreDistribution.current.mean}, stdDev=${metrics.scoreDistribution.current.stdDev} (n=${metrics.scoreDistribution.current.sampleSize})`);
      console.log(`    Previous: mean=${metrics.scoreDistribution.previous.mean}, stdDev=${metrics.scoreDistribution.previous.stdDev} (n=${metrics.scoreDistribution.previous.sampleSize})`);
      console.log(`    Drift: ${metrics.scoreDistribution.drift}% ${metrics.scoreDistribution.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('  Tracker Detection (per-scan rate):');
      console.log(`    Current: ${metrics.trackerDetection.currentRate} trackers/scan`);
      console.log(`    Previous: ${metrics.trackerDetection.previousRate} trackers/scan`);
      console.log(`    Delta: ${metrics.trackerDetection.absoluteDelta} trackers/scan ${metrics.trackerDetection.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('  Fingerprinting Rate (absolute pp):');
      console.log(`    Current: ${metrics.fingerprintingRate.current}%`);
      console.log(`    Previous: ${metrics.fingerprintingRate.previous}%`);
      console.log(`    Delta: ${metrics.fingerprintingRate.absoluteDeltaPp}pp ${metrics.fingerprintingRate.alert ? '⚠️' : '✓'}`);
      console.log('');
      console.log('  Insight Volume (per-scan rate):');
      console.log(`    Current: ${metrics.insightVolume.currentPerScan}/scan`);
      console.log(`    Previous: ${metrics.insightVolume.previousPerScan}/scan`);
      console.log(`    Delta: ${metrics.insightVolume.absoluteDelta}/scan ${metrics.insightVolume.alert ? '⚠️' : '✓'}`);
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
