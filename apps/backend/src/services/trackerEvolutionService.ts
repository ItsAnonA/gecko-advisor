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

  let updated = 0;

  for (const tracker of allTrackers) {
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
        domainCount: 0, // Would need separate calculation
        domainCountPrev: 0,
        // Calculate adoption change as percentage of total activity, not binary ±100
        // This gives a meaningful rate: net change relative to total tracker activity
        adoptionChange: tracker.additions + tracker.removals > 0
          ? Math.round((tracker.net / (tracker.additions + tracker.removals)) * 100)
          : 0,
        adoptionTrend: tracker.net > 0 ? 'UP' : tracker.net < 0 ? 'DOWN' : 'FLAT',
        tierACount: 0,
        tierBCount: 0,
        tierCCount: 0,
        topCategories: [],
        newAdoptions: tracker.additions,
        removals: tracker.removals,
        netChange: tracker.net,
      },
      update: {
        periodEnd: now,
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
