/**
 * Domain Narrative Pre-computation Script (Phase A - SEO Architecture)
 *
 * Computes and stores per-domain narrative context fields:
 * - trackerPercentile: percentile rank by tracker count within category
 * - scorePercentile: percentile rank by privacy score globally
 * - categoryRank: rank within category by privacy score (1 = best)
 * - globalRank: rank globally by privacy score
 * - hasRareTracker: true if any tracker found on <50 domains
 * - rarestTracker: name of rarest tracker
 * - rarestTrackerDomainCount: how many other domains have this tracker
 *
 * Run nightly: 0 4 * * * npx tsx scripts/precompute-domain-narrative.ts
 *
 * Usage:
 *   npx tsx scripts/precompute-domain-narrative.ts
 *   npx tsx scripts/precompute-domain-narrative.ts --quality-only  # Only 3+ scan domains
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 500;
const RARE_TRACKER_THRESHOLD = 50; // Tracker found on fewer than this many domains

interface TrackerGlobalCount {
  name: string;
  domainCount: number;
}

async function main() {
  const qualityOnly = process.argv.includes('--quality-only');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DOMAIN NARRATIVE PRE-COMPUTATION (Phase A SEO)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Step 1: Compute global tracker counts (how many domains use each tracker)
  console.log('Step 1: Computing global tracker prevalence...');
  const trackerCounts = await computeTrackerGlobalCounts();
  console.log(`  Found ${trackerCounts.size} unique trackers across dataset\n`);

  // Step 2: Compute global score ranking
  console.log('Step 2: Computing global score rankings...');
  const globalRankings = await computeGlobalScoreRankings();
  console.log(`  Ranked ${globalRankings.size} domains globally\n`);

  // Step 3: Compute global score percentiles
  console.log('Step 3: Computing global score percentiles...');
  const allScores = await getAllDomainScores();
  console.log(`  ${allScores.length} domains have scores\n`);

  // Step 4: Compute category rankings
  console.log('Step 4: Computing category rankings...');
  const categoryRankings = await computeCategoryRankings();
  const categoryCount = Object.keys(categoryRankings).length;
  console.log(`  Computed rankings for ${categoryCount} categories\n`);

  // Step 5: Compute category tracker percentiles
  console.log('Step 5: Computing category tracker percentiles...');
  const categoryTrackerPercentiles = await computeCategoryTrackerPercentiles();
  console.log(`  Computed tracker percentiles for ${Object.keys(categoryTrackerPercentiles).length} categories\n`);

  // Step 6: Get domains to update
  const whereClause = qualityOnly
    ? { scanCount: { gte: 3 } }
    : { scanCount: { gte: 2 } };

  const totalDomains = await prisma.domain.count({ where: whereClause });
  console.log(`Step 6: Updating ${totalDomains} domains${qualityOnly ? ' (quality-only mode)' : ''}...\n`);

  let updated = 0;
  let offset = 0;

  while (offset < totalDomains) {
    const domains = await prisma.domain.findMany({
      where: whereClause,
      select: {
        id: true,
        domain: true,
        categoryId: true,
        latestScanId: true,
      },
      orderBy: { domain: 'asc' },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (domains.length === 0) break;

    // Get latest scan evidence for tracker analysis (batch query)
    const domainIds = domains.map(d => d.id);
    const latestScanIds = domains
      .map(d => d.latestScanId)
      .filter((id): id is string => id !== null);

    // Get tracker evidence for these scans
    const trackerEvidence = latestScanIds.length > 0
      ? await prisma.evidence.findMany({
          where: {
            scanId: { in: latestScanIds },
            kind: 'tracker',
          },
          select: {
            scanId: true,
            title: true,
          },
        })
      : [];

    // Group trackers by scanId
    const trackersByScan = new Map<string, string[]>();
    for (const ev of trackerEvidence) {
      const existing = trackersByScan.get(ev.scanId) || [];
      existing.push(ev.title);
      trackersByScan.set(ev.scanId, existing);
    }

    // Prepare batch updates
    const updates = domains.map(domain => {
      const trackers = domain.latestScanId
        ? trackersByScan.get(domain.latestScanId) || []
        : [];

      // Find rarest tracker
      let hasRareTracker = false;
      let rarestTracker: string | null = null;
      let rarestTrackerDomainCount: number | null = null;

      for (const tracker of trackers) {
        const count = trackerCounts.get(tracker) || 0;
        if (count < RARE_TRACKER_THRESHOLD) {
          if (!hasRareTracker || (rarestTrackerDomainCount !== null && count < rarestTrackerDomainCount)) {
            hasRareTracker = true;
            rarestTracker = tracker;
            rarestTrackerDomainCount = count;
          }
        }
      }

      // Global rank and score percentile
      const globalRank = globalRankings.get(domain.id) || null;
      const scorePercentile = globalRank && allScores.length > 0
        ? Math.round(((allScores.length - globalRank) / allScores.length) * 100)
        : null;

      // Category rank and tracker percentile
      const categoryRank = domain.categoryId
        ? categoryRankings[domain.categoryId]?.get(domain.id) || null
        : null;

      const trackerPercentile = domain.categoryId
        ? categoryTrackerPercentiles[domain.categoryId]?.get(domain.id) || null
        : null;

      return {
        id: domain.id,
        data: {
          trackerPercentile,
          scorePercentile,
          categoryRank,
          globalRank,
          hasRareTracker,
          rarestTracker,
          rarestTrackerDomainCount,
          narrativeComputedAt: new Date(),
        },
      };
    });

    // Batch update using transaction
    await prisma.$transaction(
      updates.map(u =>
        prisma.domain.update({
          where: { id: u.id },
          data: u.data,
        })
      )
    );

    updated += domains.length;
    offset += BATCH_SIZE;

    if (updated % 1000 === 0 || updated === totalDomains) {
      console.log(`  Progress: ${updated}/${totalDomains} (${((updated / totalDomains) * 100).toFixed(1)}%)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done. Updated ${updated} domains in ${elapsed}s`);
  console.log(`  Unique trackers indexed: ${trackerCounts.size}`);
  console.log(`  Categories ranked: ${categoryCount}`);
}

/**
 * Count how many domains use each tracker globally.
 * Returns Map<trackerName, domainCount>
 */
async function computeTrackerGlobalCounts(): Promise<Map<string, number>> {
  // Use raw query for efficient aggregation
  const results = await prisma.$queryRaw<Array<{ title: string; count: bigint }>>`
    SELECT e.title, COUNT(DISTINCT d.id) as count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON s."domainId" = d.id
    WHERE e.kind = 'tracker'
      AND s.status = 'done'
      AND s.id = d."latestScanId"
    GROUP BY e.title
    ORDER BY count DESC
  `;

  const map = new Map<string, number>();
  for (const row of results) {
    map.set(row.title, Number(row.count));
  }
  return map;
}

/**
 * Rank all domains globally by privacy score (highest score = rank 1).
 * Returns Map<domainId, rank>
 */
async function computeGlobalScoreRankings(): Promise<Map<string, number>> {
  const results = await prisma.$queryRaw<Array<{ id: string; rank: bigint }>>`
    SELECT d.id, ROW_NUMBER() OVER (ORDER BY s.score DESC, d.domain ASC) as rank
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE s.status = 'done'
      AND s.score IS NOT NULL
      AND d."scanCount" >= 2
  `;

  const map = new Map<string, number>();
  for (const row of results) {
    map.set(row.id, Number(row.rank));
  }
  return map;
}

/**
 * Get all domain scores for percentile calculation.
 */
async function getAllDomainScores(): Promise<number[]> {
  const results = await prisma.$queryRaw<Array<{ score: number }>>`
    SELECT s.score
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE s.status = 'done'
      AND s.score IS NOT NULL
      AND d."scanCount" >= 2
    ORDER BY s.score ASC
  `;
  return results.map(r => r.score);
}

/**
 * Rank domains within each category by privacy score.
 * Returns { categoryId: Map<domainId, rank> }
 */
async function computeCategoryRankings(): Promise<Record<string, Map<string, number>>> {
  const results = await prisma.$queryRaw<Array<{ id: string; category_id: string; rank: bigint }>>`
    SELECT d.id, d."categoryId" as category_id,
           ROW_NUMBER() OVER (PARTITION BY d."categoryId" ORDER BY s.score DESC, d.domain ASC) as rank
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE s.status = 'done'
      AND s.score IS NOT NULL
      AND d."categoryId" IS NOT NULL
      AND d."scanCount" >= 2
  `;

  const rankings: Record<string, Map<string, number>> = {};
  for (const row of results) {
    if (!rankings[row.category_id]) {
      rankings[row.category_id] = new Map();
    }
    rankings[row.category_id].set(row.id, Number(row.rank));
  }
  return rankings;
}

/**
 * Compute tracker count percentile within each category.
 * Returns { categoryId: Map<domainId, percentile> }
 */
async function computeCategoryTrackerPercentiles(): Promise<Record<string, Map<string, number>>> {
  // Get tracker counts per domain per category
  const results = await prisma.$queryRaw<Array<{ id: string; category_id: string; tracker_count: bigint; total_in_cat: bigint; rank_in_cat: bigint }>>`
    WITH domain_trackers AS (
      SELECT d.id, d."categoryId" as category_id,
             COUNT(DISTINCT e.title) as tracker_count
      FROM "Domain" d
      JOIN "Scan" s ON d."latestScanId" = s.id
      LEFT JOIN "Evidence" e ON e."scanId" = s.id AND e.kind = 'tracker'
      WHERE s.status = 'done'
        AND d."categoryId" IS NOT NULL
        AND d."scanCount" >= 2
      GROUP BY d.id, d."categoryId"
    )
    SELECT dt.id, dt.category_id, dt.tracker_count,
           COUNT(*) OVER (PARTITION BY dt.category_id) as total_in_cat,
           RANK() OVER (PARTITION BY dt.category_id ORDER BY dt.tracker_count ASC) as rank_in_cat
    FROM domain_trackers dt
  `;

  const percentiles: Record<string, Map<string, number>> = {};
  for (const row of results) {
    if (!percentiles[row.category_id]) {
      percentiles[row.category_id] = new Map();
    }
    const totalInCat = Number(row.total_in_cat);
    const rankInCat = Number(row.rank_in_cat);
    // Percentile: what % of domains have fewer or equal trackers
    const percentile = Math.round((rankInCat / totalInCat) * 100);
    percentiles[row.category_id].set(row.id, percentile);
  }
  return percentiles;
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
