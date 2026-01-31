#!/usr/bin/env npx ts-node

/**
 * UPDATE CATEGORY TRENDS
 *
 * Weekly job to calculate category-level privacy trends.
 * Identifies improving and declining industry categories.
 *
 * Usage:
 *   npx tsx scripts/update-category-trends.ts
 *   npx tsx scripts/update-category-trends.ts --monthly   # Monthly trends
 *   npx tsx scripts/update-category-trends.ts --json      # Output as JSON
 *
 * Schedule: Weekly (Monday 4 AM UTC)
 *   0 4 * * 1 docker exec ga-backend npx tsx /app/scripts/update-category-trends.ts
 */

import { PrismaClient, PeriodType } from '@prisma/client';
import { updateAllCategoryTrends, getCategoryRankings } from '../apps/backend/src/services/categoryIntelligenceService';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');
const isMonthly = process.argv.includes('--monthly');
const periodType: PeriodType = isMonthly ? 'MONTHLY' : 'WEEKLY';

interface CategoryTrendReport {
  date: string;
  periodType: PeriodType;
  processed: number;
  updated: number;
  topImproving: Array<{ name: string; change: number }>;
  topDeclining: Array<{ name: string; change: number }>;
  duration: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              CATEGORY TREND UPDATE                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`  Period: ${periodType}`);
    console.log('');
  }

  try {
    if (!outputJson) {
      console.log('Processing categories...');
    }

    const result = await updateAllCategoryTrends(prisma, periodType);
    const rankings = await getCategoryRankings(prisma, periodType);

    const report: CategoryTrendReport = {
      date: new Date().toISOString().split('T')[0] || '',
      periodType,
      processed: result.processed,
      updated: result.updated,
      topImproving: rankings.improving.slice(0, 5).map((c) => ({
        name: c.category.name,
        change: c.scoreChange,
      })),
      topDeclining: rankings.declining.slice(0, 5).map((c) => ({
        name: c.category.name,
        change: c.scoreChange,
      })),
      duration: Date.now() - startTime,
    };

    if (!outputJson) {
      console.log('');
      console.log('────────────────────────────────────────────────────────────');
      console.log('SUMMARY');
      console.log(`  Processed: ${report.processed}`);
      console.log(`  Updated: ${report.updated}`);
      console.log('');
      console.log('  Top Improving:');
      report.topImproving.forEach((c) => {
        console.log(`    ↑ ${c.name}: +${c.change.toFixed(1)}%`);
      });
      console.log('');
      console.log('  Top Declining:');
      report.topDeclining.forEach((c) => {
        console.log(`    ↓ ${c.name}: ${c.change.toFixed(1)}%`);
      });
      console.log('');
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');
      console.log('✅ Category trend update complete');
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'category_trend_report' },
      create: {
        key: 'category_trend_report',
        value: report as unknown as Record<string, unknown>,
      },
      update: {
        value: report as unknown as Record<string, unknown>,
      },
    });
  } catch (error) {
    console.error('❌ Category trend update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
