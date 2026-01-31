#!/usr/bin/env npx ts-node

/**
 * INSIGHT LIFECYCLE PROCESSING
 *
 * Daily job to manage insight aging, relevance, and supersession.
 * Identifies insights that need validation, are aging out,
 * or have been superseded by newer data.
 *
 * Usage:
 *   npx tsx scripts/insight-lifecycle.ts
 *   npx tsx scripts/insight-lifecycle.ts --json      # Output as JSON
 *
 * Schedule: Daily (5 AM UTC)
 *   0 5 * * * docker exec ga-backend npx tsx /app/scripts/insight-lifecycle.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');

interface LifecycleReport {
  date: string;
  processed: number;
  aged: {
    historical: number;
    superseded: number;
  };
  validation: {
    needsValidation: number;
    validated: number;
  };
  quality: {
    avgAge: number;
    oldestInsight: number;
    publishableCount: number;
  };
  duration: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              INSIGHT LIFECYCLE PROCESSING                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${now.toISOString().split('T')[0]}`);
    console.log('');
  }

  try {
    // 1. Get all insights
    const allInsights = await prisma.insight.findMany({
      select: {
        id: true,
        createdAt: true,
        isPublishable: true,
        magnitude: true,
        confidence: true,
        insightType: true,
      },
    });

    // 2. Calculate age statistics
    const ages = allInsights.map((i) => Math.floor((now.getTime() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000)));
    const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const oldestInsight = ages.length > 0 ? Math.max(...ages) : 0;

    // 3. Classify insights by age
    const historicalInsights = allInsights.filter((i) => {
      const age = (now.getTime() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      return age > 90;
    });

    const supersededCount = 0; // Will track when we add supersession logic

    // 4. Identify insights needing validation
    // Insights older than 30 days that haven't been validated
    const needsValidation = allInsights.filter((i) => {
      const age = (now.getTime() - i.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      return age > 30 && age <= 90;
    });

    // 5. Count publishable insights
    const publishableCount = allInsights.filter((i) => i.isPublishable).length;

    // 6. Update insight metadata (would update details with lifecycle info)
    // For now, log the analysis
    if (!outputJson) {
      console.log('Processing insights...');
    }

    const report: LifecycleReport = {
      date: now.toISOString().split('T')[0] ?? '',
      processed: allInsights.length,
      aged: {
        historical: historicalInsights.length,
        superseded: supersededCount,
      },
      validation: {
        needsValidation: needsValidation.length,
        validated: 0, // Will track when validation system is in place
      },
      quality: {
        avgAge: Math.round(avgAge),
        oldestInsight,
        publishableCount,
      },
      duration: Date.now() - startTime,
    };

    if (!outputJson) {
      console.log('');
      console.log('────────────────────────────────────────────────────────────');
      console.log('LIFECYCLE SUMMARY');
      console.log('');
      console.log(`  Total Insights: ${report.processed}`);
      console.log(`  Publishable: ${report.quality.publishableCount}`);
      console.log('');
      console.log('  Age Statistics:');
      console.log(`    Average age: ${report.quality.avgAge} days`);
      console.log(`    Oldest insight: ${report.quality.oldestInsight} days`);
      console.log('');
      console.log('  Aging Out:');
      console.log(`    Historical (>90 days): ${report.aged.historical}`);
      console.log(`    Superseded: ${report.aged.superseded}`);
      console.log('');
      console.log('  Validation Status:');
      console.log(`    Needs validation (30-90 days): ${report.validation.needsValidation}`);
      console.log(`    Validated: ${report.validation.validated}`);
      console.log('');
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');
      console.log('✅ Insight lifecycle processing complete');
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'insight_lifecycle_report' },
      create: { key: 'insight_lifecycle_report', value: report as unknown as Record<string, unknown> },
      update: { value: report as unknown as Record<string, unknown> },
    });
  } catch (error) {
    console.error('❌ Insight lifecycle processing failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
