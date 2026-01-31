#!/usr/bin/env npx ts-node

/**
 * RETRACTION CANDIDATE DETECTION
 *
 * DAILY job to identify insights that may need retraction or correction.
 * Compares predictions with actual outcomes and flags discrepancies.
 *
 * CRITICAL: Run daily, not weekly.
 * The internet moves faster than weekly crons.
 * A public contradiction can spread in hours.
 * Silence looks defensive, even if unintended.
 *
 * Usage:
 *   npx tsx scripts/detect-retractions.ts
 *   npx tsx scripts/detect-retractions.ts --json      # Output as JSON
 *
 * Schedule: Daily (6 AM UTC) - IMMEDIATELY after insight lifecycle
 *   0 6 * * * docker exec ga-backend npx tsx /app/scripts/detect-retractions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');

interface RetractionCandidate {
  insightId: string;
  insightType: string;
  title: string;
  createdAt: Date;
  originalPrediction: string;
  observedOutcome: string;
  discrepancyReason: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

interface RetractionReport {
  date: string;
  insightsAnalyzed: number;
  candidates: RetractionCandidate[];
  candidateCount: number;
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  duration: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              RETRACTION CANDIDATE DETECTION                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${now.toISOString().split('T')[0]}`);
    console.log('');
  }

  try {
    const candidates: RetractionCandidate[] = [];

    // 1. Check DOMAIN_IMPROVEMENT insights - did the domain actually maintain improvement?
    const improvementInsights = await prisma.insight.findMany({
      where: {
        insightType: 'DOMAIN_IMPROVEMENT',
        createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
        domainId: { not: null },
      },
      include: {
        domain: {
          select: {
            id: true,
            domain: true,
            scans: {
              where: { status: 'done', finishedAt: { gte: sevenDaysAgo } },
              orderBy: { finishedAt: 'desc' },
              take: 1,
              select: { score: true },
            },
          },
        },
      },
    });

    for (const insight of improvementInsights) {
      if (!insight.domain) continue;
      const recentScan = insight.domain.scans[0];
      if (!recentScan) continue;

      const details = insight.details as Record<string, unknown>;
      const predictedScore = details.scoreAfter as number;

      if (recentScan.score && recentScan.score < predictedScore - 10) {
        // Score dropped significantly after predicted improvement
        candidates.push({
          insightId: insight.id,
          insightType: insight.insightType,
          title: insight.title,
          createdAt: insight.createdAt,
          originalPrediction: `Domain improved to score ${predictedScore}`,
          observedOutcome: `Current score is ${recentScan.score}`,
          discrepancyReason: 'Improvement was temporary or reversed',
          confidence: insight.confidence,
          severity: recentScan.score < predictedScore - 20 ? 'high' : 'medium',
        });
      }
    }

    // 2. Check DOMAIN_REGRESSION insights - did the domain actually stay regressed?
    const regressionInsights = await prisma.insight.findMany({
      where: {
        insightType: 'DOMAIN_REGRESSION',
        createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
        domainId: { not: null },
      },
      include: {
        domain: {
          select: {
            id: true,
            domain: true,
            scans: {
              where: { status: 'done', finishedAt: { gte: sevenDaysAgo } },
              orderBy: { finishedAt: 'desc' },
              take: 1,
              select: { score: true },
            },
          },
        },
      },
    });

    for (const insight of regressionInsights) {
      if (!insight.domain) continue;
      const recentScan = insight.domain.scans[0];
      if (!recentScan) continue;

      const details = insight.details as Record<string, unknown>;
      const predictedScore = details.scoreAfter as number;
      const scoreBefore = details.scoreBefore as number;

      if (recentScan.score && recentScan.score > scoreBefore) {
        // Score recovered above original level
        candidates.push({
          insightId: insight.id,
          insightType: insight.insightType,
          title: insight.title,
          createdAt: insight.createdAt,
          originalPrediction: `Domain regressed to score ${predictedScore}`,
          observedOutcome: `Current score is ${recentScan.score} (recovered)`,
          discrepancyReason: 'Regression was temporary, domain recovered',
          confidence: insight.confidence,
          severity: 'medium',
        });
      }
    }

    // 3. Check TRACKER_SURGE insights - did the tracker actually surge?
    const trackerInsights = await prisma.insight.findMany({
      where: {
        insightType: 'TRACKER_SURGE',
        createdAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo },
        trackerDomain: { not: null },
      },
    });

    for (const insight of trackerInsights) {
      if (!insight.trackerDomain) continue;

      // Check current tracker trend
      const recentTrend = await prisma.trackerTrend.findFirst({
        where: {
          trackerDomain: insight.trackerDomain,
          periodType: 'WEEKLY',
          periodStart: { gte: sevenDaysAgo },
        },
        orderBy: { periodStart: 'desc' },
      });

      if (recentTrend && recentTrend.netChange < 0) {
        // Tracker actually declined after predicted surge
        candidates.push({
          insightId: insight.id,
          insightType: insight.insightType,
          title: insight.title,
          createdAt: insight.createdAt,
          originalPrediction: 'Tracker adoption surging',
          observedOutcome: `Tracker actually declined by ${Math.abs(recentTrend.netChange)}`,
          discrepancyReason: 'Surge was temporary or prediction incorrect',
          confidence: insight.confidence,
          severity: Math.abs(recentTrend.netChange) > 10 ? 'high' : 'low',
        });
      }
    }

    // Calculate severity counts
    const bySeverity = {
      high: candidates.filter((c) => c.severity === 'high').length,
      medium: candidates.filter((c) => c.severity === 'medium').length,
      low: candidates.filter((c) => c.severity === 'low').length,
    };

    const totalAnalyzed = improvementInsights.length + regressionInsights.length + trackerInsights.length;

    const report: RetractionReport = {
      date: now.toISOString().split('T')[0] ?? '',
      insightsAnalyzed: totalAnalyzed,
      candidates,
      candidateCount: candidates.length,
      bySeverity,
      duration: Date.now() - startTime,
    };

    if (!outputJson) {
      console.log('Analyzing insights for potential retractions...');
      console.log('');
      console.log('────────────────────────────────────────────────────────────');
      console.log('RETRACTION ANALYSIS');
      console.log('');
      console.log(`  Insights Analyzed: ${report.insightsAnalyzed}`);
      console.log(`  Candidates Found: ${report.candidateCount}`);
      console.log('');
      console.log('  By Severity:');
      console.log(`    High: ${bySeverity.high}`);
      console.log(`    Medium: ${bySeverity.medium}`);
      console.log(`    Low: ${bySeverity.low}`);

      if (candidates.length > 0) {
        console.log('');
        console.log('  Candidates:');
        for (const c of candidates.slice(0, 10)) {
          console.log(`    [${c.severity.toUpperCase()}] ${c.title}`);
          console.log(`      Predicted: ${c.originalPrediction}`);
          console.log(`      Observed: ${c.observedOutcome}`);
          console.log('');
        }
        if (candidates.length > 10) {
          console.log(`    ... and ${candidates.length - 10} more`);
        }
      }

      console.log('');
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');

      if (bySeverity.high > 0) {
        console.log('⚠️ HIGH SEVERITY candidates require immediate review');
      } else {
        console.log('✅ Retraction detection complete');
      }
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'retraction_detection_report' },
      create: { key: 'retraction_detection_report', value: report as unknown as Record<string, unknown> },
      update: { value: report as unknown as Record<string, unknown> },
    });
  } catch (error) {
    console.error('❌ Retraction detection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
