/**
 * Tracker Evolution Service (Phase 3C)
 *
 * Tracks adoption and removal trends for third-party trackers.
 * Identifies which trackers are growing or declining across the web.
 */

import type { PrismaClient, PeriodType } from '@prisma/client';

interface TrackerMover {
  tracker: string;
  additions: number;
  removals: number;
  net: number;
}

interface TrackerDomainCounts {
  tracker_domain: string;
  domain_count: bigint;
  tier_a_count: bigint;
  tier_b_count: bigint;
  tier_c_count: bigint;
}

interface TrackerCategoryRow {
  tracker_domain: string;
  category: string;
  count: bigint;
}

/**
 * Get top growing and declining trackers.
 */
export async function getTrackerMovers(
  prisma: PrismaClient,
  periodType: PeriodType = 'WEEKLY'
): Promise<{
  growing: TrackerMover[];
  declining: TrackerMover[];
}> {
  const periodDays = periodType === 'WEEKLY' ? 7 : 30;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Aggregate tracker additions
  const additions = await prisma.domainChange.findMany({
    where: {
      detectedAt: { gte: periodStart },
      trackersAdded: { isEmpty: false },
    },
    select: { trackersAdded: true },
  });

  const removals = await prisma.domainChange.findMany({
    where: {
      detectedAt: { gte: periodStart },
      trackersRemoved: { isEmpty: false },
    },
    select: { trackersRemoved: true },
  });

  // Count occurrences
  const additionCounts = new Map<string, number>();
  const removalCounts = new Map<string, number>();

  for (const change of additions) {
    for (const tracker of change.trackersAdded) {
      additionCounts.set(tracker, (additionCounts.get(tracker) || 0) + 1);
    }
  }

  for (const change of removals) {
    for (const tracker of change.trackersRemoved) {
      removalCounts.set(tracker, (removalCounts.get(tracker) || 0) + 1);
    }
  }

  // Calculate net change
  const allTrackers = new Set([...additionCounts.keys(), ...removalCounts.keys()]);
  const netChanges: TrackerMover[] = [];

  for (const tracker of allTrackers) {
    const adds = additionCounts.get(tracker) || 0;
    const removes = removalCounts.get(tracker) || 0;
    netChanges.push({
      tracker,
      additions: adds,
      removals: removes,
      net: adds - removes,
    });
  }

  // Sort
  netChanges.sort((a, b) => b.net - a.net);

  return {
    growing: netChanges.filter((t) => t.net > 0).slice(0, 20),
    declining: netChanges.filter((t) => t.net < 0).slice(0, 20),
  };
}

/**
 * Update tracker trends.
 * Run weekly.
 */
export async function updateTrackerTrends(
  prisma: PrismaClient,
  periodType: PeriodType = 'WEEKLY'
): Promise<{ updated: number }> {
  const { growing, declining } = await getTrackerMovers(prisma, periodType);

  const allTrackers = [...growing, ...declining];
  const periodDays = periodType === 'WEEKLY' ? 7 : 30;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  // --- Step 1: Calculate actual domain counts per tracker from Evidence ---
  // Uses latest scan per domain only (via latestScanId join) to avoid double-counting
  const domainCountRows = await prisma.$queryRaw<TrackerDomainCounts[]>`
    SELECT
      COALESCE(e.details->>'domain', e.details->>'root') AS tracker_domain,
      COUNT(DISTINCT d.id) AS domain_count,
      COUNT(DISTINCT CASE WHEN d."indexTier" = 'A' THEN d.id END) AS tier_a_count,
      COUNT(DISTINCT CASE WHEN d."indexTier" = 'B' THEN d.id END) AS tier_b_count,
      COUNT(DISTINCT CASE WHEN d."indexTier" = 'C' THEN d.id END) AS tier_c_count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON s."domainId" = d.id
    WHERE e.kind = 'tracker'
      AND s.status = 'done'
      AND s.id = d."latestScanId"
      AND COALESCE(e.details->>'domain', e.details->>'root') IS NOT NULL
    GROUP BY tracker_domain
  `;

  const domainCountMap = new Map<string, {
    domainCount: number;
    tierACount: number;
    tierBCount: number;
    tierCCount: number;
  }>();
  for (const row of domainCountRows) {
    domainCountMap.set(row.tracker_domain, {
      domainCount: Number(row.domain_count),
      tierACount: Number(row.tier_a_count),
      tierBCount: Number(row.tier_b_count),
      tierCCount: Number(row.tier_c_count),
    });
  }

  // --- Step 2: Calculate top categories per tracker ---
  const categoryRows = await prisma.$queryRaw<TrackerCategoryRow[]>`
    SELECT
      COALESCE(e.details->>'domain', e.details->>'root') AS tracker_domain,
      c.name AS category,
      COUNT(DISTINCT d.id) AS count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON s."domainId" = d.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE e.kind = 'tracker'
      AND s.status = 'done'
      AND s.id = d."latestScanId"
      AND COALESCE(e.details->>'domain', e.details->>'root') IS NOT NULL
    GROUP BY tracker_domain, c.name
    ORDER BY tracker_domain, count DESC
  `;

  const topCategoriesMap = new Map<string, Array<{ category: string; count: number }>>();
  for (const row of categoryRows) {
    const existing = topCategoriesMap.get(row.tracker_domain) || [];
    // Keep top 5 per tracker (rows are ordered by count DESC)
    if (existing.length < 5) {
      existing.push({ category: row.category, count: Number(row.count) });
      topCategoriesMap.set(row.tracker_domain, existing);
    }
  }

  // --- Step 3: Fetch existing TrackerTrend records for domainCountPrev ---
  const trackerDomains = allTrackers.map((t) => t.tracker);
  const existingTrends = await prisma.trackerTrend.findMany({
    where: {
      trackerDomain: { in: trackerDomains },
      periodType,
    },
    orderBy: { periodStart: 'desc' },
    select: {
      trackerDomain: true,
      domainCount: true,
      periodStart: true,
    },
  });

  // Map tracker -> most recent domainCount (for domainCountPrev)
  const prevCountMap = new Map<string, number>();
  for (const trend of existingTrends) {
    // First match per tracker is the most recent (ordered desc)
    if (!prevCountMap.has(trend.trackerDomain)) {
      prevCountMap.set(trend.trackerDomain, trend.domainCount);
    }
  }

  // --- Step 4: Upsert with real data ---
  let updated = 0;

  for (const tracker of allTrackers) {
    const counts = domainCountMap.get(tracker.tracker) || {
      domainCount: 0,
      tierACount: 0,
      tierBCount: 0,
      tierCCount: 0,
    };
    const categories = topCategoriesMap.get(tracker.tracker) || [];
    const domainCountPrev = prevCountMap.get(tracker.tracker) ?? 0;

    await prisma.trackerTrend.upsert({
      where: {
        trackerDomain_periodStart_periodType: {
          trackerDomain: tracker.tracker,
          periodStart,
          periodType,
        },
      },
      create: {
        trackerDomain: tracker.tracker,
        periodStart,
        periodEnd: now,
        periodType,
        domainCount: counts.domainCount,
        domainCountPrev,
        adoptionChange: tracker.additions + tracker.removals > 0
          ? Math.round((tracker.net / (tracker.additions + tracker.removals)) * 100)
          : 0,
        adoptionTrend: tracker.net > 0 ? 'UP' : tracker.net < 0 ? 'DOWN' : 'FLAT',
        tierACount: counts.tierACount,
        tierBCount: counts.tierBCount,
        tierCCount: counts.tierCCount,
        topCategories: categories,
        newAdoptions: tracker.additions,
        removals: tracker.removals,
        netChange: tracker.net,
      },
      update: {
        periodEnd: now,
        domainCount: counts.domainCount,
        domainCountPrev,
        tierACount: counts.tierACount,
        tierBCount: counts.tierBCount,
        tierCCount: counts.tierCCount,
        topCategories: categories,
        newAdoptions: tracker.additions,
        removals: tracker.removals,
        netChange: tracker.net,
        adoptionChange: tracker.additions + tracker.removals > 0
          ? Math.round((tracker.net / (tracker.additions + tracker.removals)) * 100)
          : 0,
        adoptionTrend: tracker.net > 0 ? 'UP' : tracker.net < 0 ? 'DOWN' : 'FLAT',
        calculatedAt: now,
      },
    });
    updated++;
  }

  return { updated };
}

/**
 * Get tracker trend details.
 */
export async function getTrackerTrend(
  prisma: PrismaClient,
  trackerDomain: string,
  periodType: PeriodType = 'WEEKLY'
): Promise<{
  trackerDomain: string;
  newAdoptions: number;
  removals: number;
  netChange: number;
  adoptionTrend: string;
} | null> {
  const periodDays = periodType === 'WEEKLY' ? 7 : 30;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const trend = await prisma.trackerTrend.findFirst({
    where: {
      trackerDomain,
      periodType,
      periodStart: { gte: new Date(periodStart.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { periodStart: 'desc' },
    select: {
      trackerDomain: true,
      newAdoptions: true,
      removals: true,
      netChange: true,
      adoptionTrend: true,
    },
  });

  return trend;
}
