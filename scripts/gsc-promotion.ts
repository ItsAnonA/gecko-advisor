#!/usr/bin/env npx ts-node

/**
 * GSC-DRIVEN PROMOTION
 *
 * Promotes domains based on Google Search Console signals:
 * - Any clicks → Tier A (proven user interest)
 * - 50+ impressions → Tier B (Google showing us in results)
 *
 * GSC data must be synced separately (from GSC API or manual import).
 *
 * Usage:
 *   npx ts-node scripts/gsc-promotion.ts
 *   npx ts-node scripts/gsc-promotion.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { PROMOTION_RULES, TIER_CONFIG } from '../apps/backend/src/config/tier-config';

const prisma = new PrismaClient();

interface TierCapacityInfo {
  total: number;
  current: number;
  available: number;
  reservedForPromotion: number;
  effectiveCapacity: number; // available minus reserve
}

/**
 * Check available capacity for a tier.
 * Returns detailed capacity info including promotion reserves.
 */
async function getTierCapacity(tier: 'A' | 'B'): Promise<TierCapacityInfo> {
  const config = TIER_CONFIG[tier];
  if (config.maxCount === null) {
    return {
      total: Infinity,
      current: await prisma.domain.count({ where: { indexTier: tier, eligibleForScan: true } }),
      available: Infinity,
      reservedForPromotion: 0,
      effectiveCapacity: Infinity,
    };
  }

  const current = await prisma.domain.count({
    where: { indexTier: tier, eligibleForScan: true },
  });

  const available = Math.max(0, config.maxCount - current);

  // Calculate promotion reserve: either % of max or minimum slots, whichever is greater
  const reserveByPercent = Math.floor(config.maxCount * config.promotionReserve);
  const reservedForPromotion = Math.max(reserveByPercent, config.minPromotionSlots);

  // Effective capacity considers that we should leave room for organic promotions
  // If we're at 95%+ capacity, use reserved slots; otherwise, use available
  const utilizationRate = current / config.maxCount;
  const effectiveCapacity =
    utilizationRate > 0.95 ? Math.min(available, reservedForPromotion) : available;

  return {
    total: config.maxCount,
    current,
    available,
    reservedForPromotion,
    effectiveCapacity,
  };
}

/**
 * Find domains that should be demoted to make room for higher-signal domains.
 * Returns domain IDs that are candidates for demotion.
 */
async function findDemotionCandidates(tier: 'A' | 'B', limit: number): Promise<string[]> {
  // Find lowest-value domains in tier:
  // - No GSC signals
  // - Lowest tier scores
  // - Oldest lastScannedAt (stale)
  const candidates = await prisma.domain.findMany({
    where: {
      indexTier: tier,
      eligibleForScan: true,
      gscClicks: 0,
      gscImpressions: { lt: 10 },
      trancoRank: null, // Not in Tranco
    },
    orderBy: [{ tierScore: 'asc' }, { lastScannedAt: 'asc' }],
    take: limit,
    select: { id: true, domain: true, tierScore: true },
  });

  return candidates.map((c) => c.id);
}

async function promoteFromGSC(dryRun: boolean): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   GSC-DRIVEN PROMOTION                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('Promotion Rules:');
  console.log(`  Tier A: ${PROMOTION_RULES.gscClicksForTierA}+ clicks`);
  console.log(`  Tier B: ${PROMOTION_RULES.gscImpressionsForTierB}+ impressions`);
  console.log('');

  // Current GSC signal distribution
  const withClicks = await prisma.domain.count({
    where: { gscClicks: { gte: PROMOTION_RULES.gscClicksForTierA } },
  });
  const withImpressions = await prisma.domain.count({
    where: { gscImpressions: { gte: PROMOTION_RULES.gscImpressionsForTierB } },
  });
  console.log('Current GSC signal distribution:');
  console.log(`  Domains with ${PROMOTION_RULES.gscClicksForTierA}+ clicks: ${withClicks}`);
  console.log(`  Domains with ${PROMOTION_RULES.gscImpressionsForTierB}+ impressions: ${withImpressions}`);
  console.log('');

  // Check tier capacities
  const tierACapacity = await getTierCapacity('A');
  const tierBCapacity = await getTierCapacity('B');

  console.log('Tier capacity:');
  console.log(`  A: ${tierACapacity.current}/${tierACapacity.total} (${tierACapacity.effectiveCapacity} slots available, ${tierACapacity.reservedForPromotion} reserved)`);
  console.log(`  B: ${tierBCapacity.current}/${tierBCapacity.total === Infinity ? 'unlimited' : tierBCapacity.total} (${tierBCapacity.effectiveCapacity === Infinity ? 'unlimited' : tierBCapacity.effectiveCapacity} slots available)`);
  console.log('');

  // Check if we need to make room via demotion
  let demotedFromA = 0;
  const tierAQualifyingCount = await prisma.domain.count({
    where: {
      indexTier: { not: 'A' },
      gscClicks: { gte: PROMOTION_RULES.gscClicksForTierA },
      eligibleForScan: true,
    },
  });

  if (tierACapacity.effectiveCapacity === 0 && tierAQualifyingCount > 0) {
    // Tier A at capacity but we have high-value domains waiting
    // Find lowest-value domains to demote
    const demotionNeeded = Math.min(tierAQualifyingCount, tierACapacity.reservedForPromotion);
    if (demotionNeeded > 0) {
      console.log(`🔄 Tier A at capacity. Finding ${demotionNeeded} low-value domains to demote...`);
      const demotionCandidates = await findDemotionCandidates('A', demotionNeeded);

      if (!dryRun && demotionCandidates.length > 0) {
        await prisma.domain.updateMany({
          where: { id: { in: demotionCandidates } },
          data: { indexTier: 'B', rescanPriority: 40, lastDemotedAt: new Date() },
        });
        demotedFromA = demotionCandidates.length;
        console.log(`   Demoted ${demotedFromA} low-value domains to Tier B`);
      } else {
        console.log(`   Would demote ${demotionCandidates.length} domains`);
      }
    }
  }

  // Refresh capacity after potential demotions
  const refreshedTierACapacity = demotedFromA > 0 ? await getTierCapacity('A') : tierACapacity;

  // Promote to Tier A: Has clicks (respecting cap)
  const tierACandidates = await prisma.domain.findMany({
    where: {
      indexTier: { not: 'A' },
      gscClicks: { gte: PROMOTION_RULES.gscClicksForTierA },
      eligibleForScan: true,
    },
    orderBy: { gscClicks: 'desc' }, // Prioritize by clicks
    take: refreshedTierACapacity.effectiveCapacity > 0 ? refreshedTierACapacity.effectiveCapacity : 0,
    select: { id: true },
  });

  if (refreshedTierACapacity.effectiveCapacity === 0) {
    console.log(`⚠️  Tier A at capacity (${TIER_CONFIG.A.maxCount}). No promotions allowed.`);
    console.log(`   ${tierAQualifyingCount} domains would qualify but are waitlisted.`);
  } else if (!dryRun && tierACandidates.length > 0) {
    const toTierA = await prisma.domain.updateMany({
      where: { id: { in: tierACandidates.map((d) => d.id) } },
      data: {
        indexTier: 'A',
        rescanPriority: 80,
        lastPromotedAt: new Date(),
      },
    });
    console.log(
      `Promoted to Tier A (${PROMOTION_RULES.gscClicksForTierA}+ clicks): ${toTierA.count}`
    );
  } else {
    console.log(`Would promote to Tier A: ${tierACandidates.length}`);
  }

  // Promote to Tier B: Has impressions (only from Tier C, respecting cap)
  const tierBCandidates = await prisma.domain.findMany({
    where: {
      indexTier: 'C',
      gscImpressions: { gte: PROMOTION_RULES.gscImpressionsForTierB },
      eligibleForScan: true,
    },
    orderBy: { gscImpressions: 'desc' },
    take: tierBCapacity.effectiveCapacity === Infinity ? undefined : (tierBCapacity.effectiveCapacity > 0 ? tierBCapacity.effectiveCapacity : 0),
    select: { id: true },
  });

  if (tierBCapacity.effectiveCapacity === 0) {
    console.log(`⚠️  Tier B at capacity. No promotions allowed.`);
  } else if (!dryRun && tierBCandidates.length > 0) {
    const toTierB = await prisma.domain.updateMany({
      where: { id: { in: tierBCandidates.map((d) => d.id) } },
      data: {
        indexTier: 'B',
        rescanPriority: 50,
        lastPromotedAt: new Date(),
      },
    });
    console.log(
      `Promoted to Tier B (${PROMOTION_RULES.gscImpressionsForTierB}+ impressions): ${toTierB.count}`
    );
  } else {
    console.log(`Would promote to Tier B: ${tierBCandidates.length}`);
  }

  // Log promotions for audit trail
  if (!dryRun && (tierACandidates.length > 0 || tierBCandidates.length > 0)) {
    console.log('');
    console.log('Creating promotion audit records...');

    // Get promoted domains for audit logging
    const promotedToA = await prisma.domain.findMany({
      where: {
        indexTier: 'A',
        gscClicks: { gte: PROMOTION_RULES.gscClicksForTierA },
        lastPromotedAt: { gte: new Date(Date.now() - 60000) }, // Last minute
      },
      select: { id: true },
    });

    const promotedToB = await prisma.domain.findMany({
      where: {
        indexTier: 'B',
        gscImpressions: { gte: PROMOTION_RULES.gscImpressionsForTierB },
        lastPromotedAt: { gte: new Date(Date.now() - 60000) },
      },
      select: { id: true },
    });

    // Create TierPromotion records
    if (promotedToA.length > 0) {
      await prisma.tierPromotion.createMany({
        data: promotedToA.map((d) => ({
          domainId: d.id,
          fromTier: 'B', // Assume from B or C
          toTier: 'A',
          reason: 'gsc_clicks',
        })),
        skipDuplicates: true,
      });
    }

    if (promotedToB.length > 0) {
      await prisma.tierPromotion.createMany({
        data: promotedToB.map((d) => ({
          domainId: d.id,
          fromTier: 'C',
          toTier: 'B',
          reason: 'gsc_impressions',
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  Created ${promotedToA.length + promotedToB.length} audit records`);
  }

  // Final distribution
  const tierCounts = await prisma.domain.groupBy({
    by: ['indexTier'],
    where: { eligibleForScan: true },
    _count: true,
  });

  console.log('');
  console.log('─'.repeat(60));
  console.log('TIER DISTRIBUTION');
  tierCounts
    .sort((a, b) => a.indexTier.localeCompare(b.indexTier))
    .forEach((t) => {
      console.log(`  Tier ${t.indexTier}: ${t._count.toLocaleString()}`);
    });

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

promoteFromGSC(dryRun)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
