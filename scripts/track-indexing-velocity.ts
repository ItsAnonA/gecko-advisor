/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Phase 2A: Indexing Velocity Tracking
 *
 * Tracks daily indexing metrics to measure SEO health.
 * Run daily via cron: 0 6 * * * npx ts-node scripts/track-indexing-velocity.ts
 *
 * FIX #7: Track the only metric that truly matters - net indexing velocity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TIER_B_SITEMAP_LIMIT = 5000;

async function trackIndexingVelocity() {
  console.log('=== INDEXING VELOCITY TRACKING ===\n');
  console.log(`Date: ${new Date().toISOString()}\n`);

  // Get current tier counts
  const tierCounts = await prisma.domain.groupBy({
    by: ['indexTier'],
    _count: true,
  });

  const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
  tierCounts.forEach((t) => {
    counts[t.indexTier] = t._count;
  });

  // Calculate sitemap total (Tier A + limited Tier B)
  const sitemapTotal = counts['A'] + Math.min(counts['B'], TIER_B_SITEMAP_LIMIT);

  // Get previous snapshot for velocity calculation
  const previousSnapshot = await prisma.indexingSnapshot.findFirst({
    orderBy: { date: 'desc' },
  });

  // Calculate net change
  const netChange = previousSnapshot
    ? sitemapTotal - previousSnapshot.sitemapTotal
    : 0;

  // Create today's date (midnight UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Upsert today's snapshot
  const snapshot = await prisma.indexingSnapshot.upsert({
    where: { date: today },
    create: {
      date: today,
      tierACount: counts['A'],
      tierBCount: counts['B'],
      tierCCount: counts['C'],
      sitemapTotal,
      netChange,
    },
    update: {
      tierACount: counts['A'],
      tierBCount: counts['B'],
      tierCCount: counts['C'],
      sitemapTotal,
      netChange,
    },
  });

  // Print report
  console.log('Current State:');
  console.log(`  Tier A: ${counts['A']}`);
  console.log(`  Tier B: ${counts['B']} (${Math.min(counts['B'], TIER_B_SITEMAP_LIMIT)} in sitemap)`);
  console.log(`  Tier C (discovery only): ${counts['C']}`);
  console.log(`  Sitemap total: ${sitemapTotal}`);

  if (previousSnapshot) {
    console.log(`\nVelocity (vs ${previousSnapshot.date.toISOString().split('T')[0]}):`);
    console.log(`  Previous sitemap total: ${previousSnapshot.sitemapTotal}`);
    console.log(`  Net change: ${netChange > 0 ? '+' : ''}${netChange}`);

    if (netChange > 0) {
      console.log('  Status: Trust is returning');
    } else if (netChange < 0) {
      console.log('  Status: Still losing pages - investigate');
    } else {
      console.log('  Status: Stable');
    }
  } else {
    console.log('\nThis is the first snapshot - no velocity data yet.');
  }

  // Show recent history (last 7 days)
  const recentSnapshots = await prisma.indexingSnapshot.findMany({
    orderBy: { date: 'desc' },
    take: 7,
  });

  if (recentSnapshots.length > 1) {
    console.log('\nRecent history (last 7 days):');
    console.log('  Date       | Sitemap | Net Change');
    console.log('  -----------|---------|----------');
    recentSnapshots.forEach((s) => {
      const dateStr = s.date.toISOString().split('T')[0];
      const changeStr = s.netChange > 0 ? `+${s.netChange}` : s.netChange.toString();
      console.log(
        `  ${dateStr} | ${String(s.sitemapTotal).padStart(7)} | ${changeStr.padStart(10)}`
      );
    });
  }

  console.log('\n=== END TRACKING ===');
  console.log(`Snapshot ID: ${snapshot.id}`);
}

trackIndexingVelocity()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
