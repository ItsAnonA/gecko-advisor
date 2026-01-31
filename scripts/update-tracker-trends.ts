#!/usr/bin/env npx ts-node

/**
 * UPDATE TRACKER TRENDS
 *
 * Weekly job to calculate tracker adoption trends.
 * Identifies growing and declining third-party trackers.
 *
 * Usage:
 *   npx tsx scripts/update-tracker-trends.ts
 *   npx tsx scripts/update-tracker-trends.ts --monthly   # Monthly trends
 *   npx tsx scripts/update-tracker-trends.ts --json      # Output as JSON
 *
 * Schedule: Weekly (Monday 4:30 AM UTC)
 *   30 4 * * 1 docker exec ga-backend npx tsx /app/scripts/update-tracker-trends.ts
 */

import { PrismaClient, PeriodType } from '@prisma/client';
import { updateTrackerTrends, getTrackerMovers } from '../apps/backend/src/services/trackerEvolutionService';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');
const isMonthly = process.argv.includes('--monthly');
const periodType: PeriodType = isMonthly ? 'MONTHLY' : 'WEEKLY';

interface TrackerTrendReport {
  date: string;
  periodType: PeriodType;
  updated: number;
  topGrowing: Array<{ tracker: string; net: number }>;
  topDeclining: Array<{ tracker: string; net: number }>;
  duration: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              TRACKER TREND UPDATE                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`  Period: ${periodType}`);
    console.log('');
  }

  try {
    if (!outputJson) {
      console.log('Processing tracker trends...');
    }

    const result = await updateTrackerTrends(prisma, periodType);
    const movers = await getTrackerMovers(prisma, periodType);

    const report: TrackerTrendReport = {
      date: new Date().toISOString().split('T')[0] || '',
      periodType,
      updated: result.updated,
      topGrowing: movers.growing.slice(0, 10).map((t) => ({
        tracker: t.tracker,
        net: t.net,
      })),
      topDeclining: movers.declining.slice(0, 10).map((t) => ({
        tracker: t.tracker,
        net: t.net,
      })),
      duration: Date.now() - startTime,
    };

    if (!outputJson) {
      console.log('');
      console.log('────────────────────────────────────────────────────────────');
      console.log('SUMMARY');
      console.log(`  Updated: ${report.updated} trackers`);
      console.log('');
      console.log('  Top Growing Trackers:');
      report.topGrowing.forEach((t) => {
        console.log(`    ↑ ${t.tracker}: +${t.net} sites`);
      });
      console.log('');
      console.log('  Top Declining Trackers:');
      report.topDeclining.forEach((t) => {
        console.log(`    ↓ ${t.tracker}: ${t.net} sites`);
      });
      console.log('');
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');
      console.log('✅ Tracker trend update complete');
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'tracker_trend_report' },
      create: {
        key: 'tracker_trend_report',
        value: report as unknown as Record<string, unknown>,
      },
      update: {
        value: report as unknown as Record<string, unknown>,
      },
    });
  } catch (error) {
    console.error('❌ Tracker trend update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
