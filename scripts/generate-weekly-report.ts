#!/usr/bin/env npx ts-node

/**
 * GENERATE WEEKLY REPORT
 *
 * Weekly job to generate comprehensive privacy report.
 * Aggregates insights, category trends, and tracker movements.
 * Produces a narrative summary of the week's changes.
 *
 * Usage:
 *   npx tsx scripts/generate-weekly-report.ts
 *   npx tsx scripts/generate-weekly-report.ts --json   # Output as JSON
 *
 * Schedule: Weekly (Monday 6 AM UTC)
 *   0 6 * * 1 docker exec ga-backend npx tsx /app/scripts/generate-weekly-report.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateWeeklyReport } from '../apps/backend/src/services/weeklyReportService';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');

interface WeeklyReportOutput {
  date: string;
  reportId: string;
  weekStart: string;
  weekEnd: string;
  domainsScanned: number;
  changesDetected: number;
  avgScoreChange: number;
  narrativeSummary: string | null;
  duration: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              WEEKLY REPORT GENERATION                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
    console.log('');
  }

  try {
    if (!outputJson) {
      console.log('Generating weekly report...');
      console.log('');
    }

    const report = await generateWeeklyReport(prisma);

    const output: WeeklyReportOutput = {
      date: new Date().toISOString().split('T')[0] || '',
      reportId: report.id,
      weekStart: report.weekStart.toISOString().split('T')[0] || '',
      weekEnd: report.weekEnd.toISOString().split('T')[0] || '',
      domainsScanned: report.domainsScanned,
      changesDetected: report.changesDetected,
      avgScoreChange: report.avgScoreChange,
      narrativeSummary: report.narrativeSummary,
      duration: Date.now() - startTime,
    };

    if (!outputJson) {
      console.log('────────────────────────────────────────────────────────────');
      console.log('REPORT SUMMARY');
      console.log(`  Week: ${output.weekStart} to ${output.weekEnd}`);
      console.log(`  Domains scanned: ${output.domainsScanned}`);
      console.log(`  Changes detected: ${output.changesDetected}`);
      console.log(`  Avg score change: ${output.avgScoreChange >= 0 ? '+' : ''}${output.avgScoreChange.toFixed(2)}`);
      console.log('');
      console.log('  Narrative:');
      console.log(`    ${output.narrativeSummary || '(No narrative generated)'}`);
      console.log('');
      console.log(`  Duration: ${(output.duration / 1000).toFixed(1)}s`);
      console.log('');
      console.log('✅ Weekly report generated');
      console.log(`   Report ID: ${output.reportId}`);
    } else {
      console.log(JSON.stringify(output, null, 2));
    }

    // Save status to database
    await prisma.systemState.upsert({
      where: { key: 'weekly_report_status' },
      create: {
        key: 'weekly_report_status',
        value: {
          lastRun: new Date().toISOString(),
          reportId: output.reportId,
          success: true,
        },
      },
      update: {
        value: {
          lastRun: new Date().toISOString(),
          reportId: output.reportId,
          success: true,
        },
      },
    });
  } catch (error) {
    console.error('❌ Weekly report generation failed:', error);

    // Record failure
    await prisma.systemState.upsert({
      where: { key: 'weekly_report_status' },
      create: {
        key: 'weekly_report_status',
        value: {
          lastRun: new Date().toISOString(),
          success: false,
          error: String(error),
        },
      },
      update: {
        value: {
          lastRun: new Date().toISOString(),
          success: false,
          error: String(error),
        },
      },
    });

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
