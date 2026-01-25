/**
 * Category Benchmarks Calculation Script (Phase 2B)
 *
 * Calculates privacy benchmarks for each category:
 * - Average/median scores
 * - Tracker/cookie averages
 * - Fingerprinting rate
 * - Score percentiles
 *
 * Usage:
 *   npx tsx scripts/calculate-benchmarks.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Benchmarks {
  avgScore: number;
  medianScore: number;
  avgTrackers: number;
  avgCookies: number;
  fingerprintingRate: number;
  sampleSize: number;
  scorePercentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  topDomains: string[];
  worstDomains: string[];
  calculatedAt: string;
}

async function calculateBenchmarks() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CATEGORY BENCHMARKS CALCULATION (Phase 2B)         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const categories = await prisma.category.findMany();

  if (categories.length === 0) {
    console.log('❌ No categories found. Run classify-domains.ts first.');
    return;
  }

  console.log(`Found ${categories.length} categories to process\n`);

  for (const category of categories) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Processing: ${category.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Get all Tier A/B domains in this category with their latest scan
    const domains = await prisma.domain.findMany({
      where: {
        categoryId: category.id,
        indexTier: { in: ['A', 'B'] },
      },
      select: {
        id: true,
        domain: true,
        latestScan: {
          select: {
            score: true,
            meta: true,
          },
        },
      },
    });

    // Filter to domains with valid scans and scores
    const validDomains = domains.filter(
      (d) => d.latestScan && d.latestScan.score !== null
    );

    if (validDomains.length < 10) {
      console.log(`  ⚠️  Skipping: only ${validDomains.length} domains (need 10+)\n`);
      continue;
    }

    // Extract metrics
    const scores: number[] = [];
    const trackers: number[] = [];
    const cookies: number[] = [];
    let fingerprintingCount = 0;

    for (const d of validDomains) {
      const scan = d.latestScan!;
      scores.push(scan.score!);

      // Extract tracker/cookie counts from meta
      const meta = scan.meta as Record<string, unknown> | null;
      if (meta) {
        trackers.push((meta.trackerCount as number) || 0);
        cookies.push((meta.cookieCount as number) || 0);
        if (meta.fingerprintingDetected) {
          fingerprintingCount++;
        }
      } else {
        trackers.push(0);
        cookies.push(0);
      }
    }

    // Sort scores for percentile calculation
    scores.sort((a, b) => a - b);

    // Calculate benchmarks
    const benchmarks: Benchmarks = {
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      medianScore: scores[Math.floor(scores.length / 2)],
      avgTrackers: Math.round((trackers.reduce((a, b) => a + b, 0) / trackers.length) * 10) / 10,
      avgCookies: Math.round((cookies.reduce((a, b) => a + b, 0) / cookies.length) * 10) / 10,
      fingerprintingRate: Math.round((fingerprintingCount / validDomains.length) * 100),
      sampleSize: validDomains.length,
      scorePercentiles: {
        p10: scores[Math.floor(scores.length * 0.1)] || scores[0],
        p25: scores[Math.floor(scores.length * 0.25)] || scores[0],
        p50: scores[Math.floor(scores.length * 0.5)] || scores[0],
        p75: scores[Math.floor(scores.length * 0.75)] || scores[0],
        p90: scores[Math.floor(scores.length * 0.9)] || scores[0],
      },
      // Top 5 domains by score
      topDomains: validDomains
        .sort((a, b) => (b.latestScan!.score || 0) - (a.latestScan!.score || 0))
        .slice(0, 5)
        .map((d) => d.domain),
      // Bottom 5 domains by score
      worstDomains: validDomains
        .sort((a, b) => (a.latestScan!.score || 0) - (b.latestScan!.score || 0))
        .slice(0, 5)
        .map((d) => d.domain),
      calculatedAt: new Date().toISOString(),
    };

    // Update category with benchmarks
    await prisma.category.update({
      where: { id: category.id },
      data: {
        benchmarks: benchmarks as unknown as Record<string, unknown>,
        benchmarksCalculatedAt: new Date(),
      },
    });

    // Print results
    console.log(`  Sample size:        ${benchmarks.sampleSize.toLocaleString()} domains`);
    console.log(`  Average score:      ${benchmarks.avgScore}/100`);
    console.log(`  Median score:       ${benchmarks.medianScore}/100`);
    console.log(`  Avg trackers:       ${benchmarks.avgTrackers}`);
    console.log(`  Avg cookies:        ${benchmarks.avgCookies}`);
    console.log(`  Fingerprinting:     ${benchmarks.fingerprintingRate}%`);
    console.log(`  Score percentiles:  P10=${benchmarks.scorePercentiles.p10}, P50=${benchmarks.scorePercentiles.p50}, P90=${benchmarks.scorePercentiles.p90}`);
    console.log(`  Top 5:              ${benchmarks.topDomains.join(', ')}`);
    console.log(`  Bottom 5:           ${benchmarks.worstDomains.join(', ')}`);
    console.log();
  }

  // Print summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const updatedCategories = await prisma.category.findMany({
    where: { benchmarksCalculatedAt: { not: null } },
    select: { name: true, benchmarks: true },
  });

  console.log('Category Comparison:\n');
  console.log('Category              | Avg Score | Trackers | FP Rate | Sample');
  console.log('─────────────────────────────────────────────────────────────────');

  for (const cat of updatedCategories) {
    const b = cat.benchmarks as Benchmarks | null;
    if (b) {
      const name = cat.name.padEnd(20);
      const score = String(b.avgScore).padStart(5);
      const trackers = b.avgTrackers.toFixed(1).padStart(8);
      const fp = (b.fingerprintingRate + '%').padStart(7);
      const sample = String(b.sampleSize).padStart(6);
      console.log(`${name} | ${score}     | ${trackers} | ${fp} | ${sample}`);
    }
  }

  console.log('\n✅ Benchmarks calculation complete!');
}

calculateBenchmarks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
