#!/usr/bin/env npx ts-node

/**
 * GENERATE INSIGHTS
 *
 * Weekly job to generate publishable insights from change data.
 * Creates narratives about domain improvements, regressions,
 * tracker surges, and fingerprinting shifts.
 *
 * Usage:
 *   npx tsx scripts/generate-insights.ts
 *   npx tsx scripts/generate-insights.ts --days=14   # Look back 14 days
 *   npx tsx scripts/generate-insights.ts --json      # Output as JSON
 *
 * Schedule: Weekly (Monday 5 AM UTC)
 *   0 5 * * 1 docker exec ga-backend npx tsx /app/scripts/generate-insights.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateInsights, persistInsights, generateTieredInsights, persistTieredInsights, INSIGHT_TIERS } from '../apps/backend/src/services/insightGeneratorService';
import { recordGovernanceMetric } from '../apps/backend/src/services/truthMetricsService';
import { processInsightNarratives } from '../apps/backend/src/services/insightNarrativeService';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');
const useTiered = process.argv.includes('--tiered') || process.argv.includes('--v2');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const periodDays = daysArg ? parseInt(daysArg.split('=')[1] ?? '7', 10) : 7;

interface InsightReport {
  date: string;
  periodDays: number;
  generated: number;
  publishable: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  duration: number;
  // V2 tiered fields
  byTier?: {
    breaking: number;
    notable: number;
    emerging: number;
  };
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              INSIGHT GENERATION                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`  Period: Last ${periodDays} days`);
    console.log('');
  }

  try {
    if (!outputJson) {
      console.log(`Generating insights${useTiered ? ' (tiered)' : ''}...`);
    }

    let report: InsightReport;

    if (useTiered) {
      // Use tiered insight generation for higher volume
      const tieredInsights = await generateTieredInsights(prisma, periodDays);
      const counts = await persistTieredInsights(prisma, tieredInsights, periodStart);

      // Aggregate by type and severity across all tiers
      const allInsights = [
        ...tieredInsights.breaking,
        ...tieredInsights.notable,
        ...tieredInsights.emerging,
      ];

      const byType: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};

      for (const insight of allInsights) {
        byType[insight.type] = (byType[insight.type] || 0) + 1;
        bySeverity[insight.severity] = (bySeverity[insight.severity] || 0) + 1;
      }

      report = {
        date: new Date().toISOString().split('T')[0] || '',
        periodDays,
        generated: tieredInsights.total,
        publishable: counts.breaking + counts.notable,
        byType,
        bySeverity,
        duration: Date.now() - startTime,
        byTier: {
          breaking: counts.breaking,
          notable: counts.notable,
          emerging: counts.emerging,
        },
      };

      if (!outputJson) {
        console.log('');
        console.log('────────────────────────────────────────────────────────────');
        console.log('SUMMARY (Quality-Only - No Volume Targets)');
        console.log(`  Generated: ${report.generated}`);
        console.log(`  Publishable: ${report.publishable}`);
        console.log('');
        console.log('  By Tier (all that met quality threshold):');
        console.log(`    Breaking (mag≥70, conf≥0.9): ${counts.breaking}`);
        console.log(`    Notable (mag≥40, conf≥0.75): ${counts.notable}`);
        console.log(`    Emerging (mag≥25, conf≥0.6): ${counts.emerging}`);
        console.log('');
        console.log('  By Type:');
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
        console.log('');
        console.log('  By Severity:');
        Object.entries(bySeverity).forEach(([severity, count]) => {
          console.log(`    ${severity}: ${count}`);
        });
        console.log('');
        console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
        console.log('');
        console.log('✅ Insight generation complete');
      } else {
        console.log(JSON.stringify(report, null, 2));
      }
    } else {
      // Original flow
      const insights = await generateInsights(prisma, periodDays);
      await persistInsights(prisma, insights, periodStart);

      // Aggregate by type and severity
      const byType: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};

      for (const insight of insights) {
        byType[insight.type] = (byType[insight.type] || 0) + 1;
        bySeverity[insight.severity] = (bySeverity[insight.severity] || 0) + 1;
      }

      // Use lowered thresholds for publishable count
      const publishable = insights.filter((i) => i.magnitude >= 25 && i.confidence >= 0.6).length;

      report = {
        date: new Date().toISOString().split('T')[0] || '',
        periodDays,
        generated: insights.length,
        publishable,
        byType,
        bySeverity,
        duration: Date.now() - startTime,
      };

      if (!outputJson) {
        console.log('');
        console.log('────────────────────────────────────────────────────────────');
        console.log('SUMMARY');
        console.log(`  Generated: ${report.generated}`);
        console.log(`  Publishable: ${report.publishable}`);
        console.log('');
        console.log('  By Type:');
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
        console.log('');
        console.log('  By Severity:');
        Object.entries(bySeverity).forEach(([severity, count]) => {
          console.log(`    ${severity}: ${count}`);
        });
        console.log('');
        console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
        console.log('');
        console.log('✅ Insight generation complete');
      } else {
        console.log(JSON.stringify(report, null, 2));
      }
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'insight_generation_report' },
      create: {
        key: 'insight_generation_report',
        value: report as unknown as Record<string, unknown>,
      },
      update: {
        value: report as unknown as Record<string, unknown>,
      },
    });

    // Narrative governance: generate + validate narratives for all publishable insights
    const narrativeResult = await processInsightNarratives(prisma, periodStart);

    if (!outputJson) {
      console.log('');
      console.log('  Narrative Governance:');
      console.log(`    Attempted: ${narrativeResult.attempted}`);
      console.log(`    Approved: ${narrativeResult.approved}`);
      console.log(`    Blocked: ${narrativeResult.blocked}`);
      console.log(`    Errored: ${narrativeResult.errored}`);
      console.log(`    Skipped: ${narrativeResult.skipped}`);
      const totalBlocked = narrativeResult.blocked + narrativeResult.errored;
      const blockRate = narrativeResult.attempted > 0
        ? ((totalBlocked / narrativeResult.attempted) * 100).toFixed(1)
        : '0.0';
      console.log(`    Block Rate: ${blockRate}%`);
    }

    // Record governance metrics for insight generation
    await recordGovernanceMetric(prisma, {
      insightsGenerated: report.generated,
      insightsPublished: report.publishable,
      insightsFailedQuality: report.generated - report.publishable,
      narrativesAttempted: narrativeResult.attempted,
      narrativesBlocked: narrativeResult.blocked + narrativeResult.errored,
      narrativesApproved: narrativeResult.approved,
    });
  } catch (error) {
    console.error('❌ Insight generation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
