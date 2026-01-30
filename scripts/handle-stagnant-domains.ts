#!/usr/bin/env npx ts-node

/**
 * STAGNANT DOMAIN HANDLING
 *
 * Conservative two-stage approach to handling domains with no GSC traffic:
 *
 * Stage 1: FREQUENCY DOWNGRADE (2+ months no traffic)
 *   - Keep domain in Tier A
 *   - Reduce scan priority from ~80 to 30
 *   - Domain still gets scanned, just less often
 *
 * Stage 2: FULL TIER DEMOTION (4+ months no traffic)
 *   - Demote from Tier A to Tier B
 *   - Multiple protection guards:
 *     - Must not be in Tranco top 1M
 *     - Must not be category leader (top 10 in category)
 *     - Must not have high historical score (>=80)
 *     - Must have 5+ scans (enough history)
 *
 * Usage:
 *   npx ts-node scripts/handle-stagnant-domains.ts
 *   npx ts-node scripts/handle-stagnant-domains.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { DEMOTION_RULES } from '../apps/backend/src/config/tier-config';

const prisma = new PrismaClient();

async function isCategoryLeader(domainId: string): Promise<boolean> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { categoryId: true, tierScore: true },
  });

  if (!domain?.categoryId) return false;

  const rank = await prisma.domain.count({
    where: {
      categoryId: domain.categoryId,
      tierScore: { gt: domain.tierScore || 0 },
    },
  });

  return rank < DEMOTION_RULES.fullDemotion.protectCategoryLeaders;
}

async function handleStagnantDomains(dryRun: boolean): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         STAGNATION HANDLING (Conservative Two-Stage)         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const now = new Date();
  const rules = DEMOTION_RULES;

  // ================================================================
  // STAGE 1: Frequency Downgrade (Keep Tier, Reduce Priority)
  // ================================================================

  console.log('STAGE 1: FREQUENCY DOWNGRADE');
  console.log(`  Criteria: ${rules.frequencyDowngrade.minMonthsNoTraffic}+ months no GSC traffic`);
  console.log('  Action: Reduce scan priority (keep Tier A)');
  console.log('');

  const frequencyCutoff = new Date(
    now.getTime() - rules.frequencyDowngrade.minMonthsNoTraffic * 30 * 24 * 60 * 60 * 1000
  );

  const toDowngrade = await prisma.domain.findMany({
    where: {
      indexTier: 'A',
      gscClicks: { equals: 0 },
      gscImpressions: { lt: 10 },
      createdAt: { lt: frequencyCutoff },
      rescanPriority: { gte: 50 }, // Not already downgraded
    },
    select: { id: true, domain: true },
  });

  if (toDowngrade.length > 0 && !dryRun) {
    await prisma.domain.updateMany({
      where: { id: { in: toDowngrade.map((d) => d.id) } },
      data: { rescanPriority: rules.frequencyDowngrade.newPriorityScore },
    });
  }

  console.log(
    `  ${dryRun ? 'Would frequency downgrade' : 'Frequency downgraded'}: ${toDowngrade.length} (still Tier A)`
  );

  // ================================================================
  // STAGE 2: Full Tier Demotion (Very Conservative)
  // ================================================================

  console.log('');
  console.log('STAGE 2: FULL TIER DEMOTION');
  console.log(`  Criteria: ${rules.fullDemotion.minMonthsNoTraffic}+ months no traffic`);
  console.log(
    `  Guards: ${rules.fullDemotion.minScansRequired}+ scans, no Tranco, not category leader, no high historical score`
  );
  console.log('');

  const demotionCutoff = new Date(
    now.getTime() - rules.fullDemotion.minMonthsNoTraffic * 30 * 24 * 60 * 60 * 1000
  );

  const demotionCandidates = await prisma.domain.findMany({
    where: {
      indexTier: 'A',
      gscClicks: { equals: 0 },
      gscImpressions: { lt: 5 },
      createdAt: { lt: demotionCutoff },
      ...(rules.fullDemotion.requireNoTrancoRank ? { trancoRank: null } : {}),
    },
    include: {
      scans: { where: { status: 'done' }, select: { id: true } },
    },
  });

  let demoted = 0;
  let protectedCategory = 0;
  let protectedScans = 0;
  let protectedHistorical = 0;
  let protectedTranco = 0;

  for (const domain of demotionCandidates) {
    // Guard: Minimum scans
    if (domain.scans.length < rules.fullDemotion.minScansRequired) {
      protectedScans++;
      continue;
    }

    // Guard: Category leader
    if (await isCategoryLeader(domain.id)) {
      protectedCategory++;
      continue;
    }

    // Guard: High historical score
    if (
      domain.historicalPeakScore &&
      domain.historicalPeakScore >= rules.fullDemotion.protectHighHistoricalScore
    ) {
      protectedHistorical++;
      continue;
    }

    // Guard: Tranco rank (double-check even though query filters)
    if (domain.trancoRank !== null) {
      protectedTranco++;
      continue;
    }

    // All guards passed - demote
    if (!dryRun) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          indexTier: 'B',
          lastDemotedAt: new Date(),
        },
      });

      // Create demotion audit record
      await prisma.tierPromotion.create({
        data: {
          domainId: domain.id,
          fromTier: 'A',
          toTier: 'B',
          reason: 'no_traffic_stagnation',
        },
      });
    }
    demoted++;
  }

  console.log(`  ${dryRun ? 'Would demote' : 'Demoted'} A → B: ${demoted}`);
  console.log(`  Protected (category leaders): ${protectedCategory}`);
  console.log(`  Protected (insufficient scans): ${protectedScans}`);
  console.log(`  Protected (high historical score): ${protectedHistorical}`);
  console.log(`  Protected (has Tranco rank): ${protectedTranco}`);

  // Summary statistics
  console.log('');
  console.log('─'.repeat(60));
  console.log('SUMMARY');
  console.log(`  Stage 1 (frequency downgrade): ${toDowngrade.length}`);
  console.log(`  Stage 2 (full demotion): ${demoted}`);
  console.log(`  Total protected: ${protectedCategory + protectedScans + protectedHistorical + protectedTranco}`);

  // Final tier distribution
  const tierCounts = await prisma.domain.groupBy({
    by: ['indexTier'],
    where: { eligibleForScan: true },
    _count: true,
  });

  console.log('');
  console.log('FINAL TIER DISTRIBUTION');
  tierCounts
    .sort((a, b) => a.indexTier.localeCompare(b.indexTier))
    .forEach((t) => {
      console.log(`  Tier ${t.indexTier}: ${t._count.toLocaleString()}`);
    });

  // Priority distribution
  const priorityDist = await prisma.domain.groupBy({
    by: ['rescanPriority'],
    where: { indexTier: 'A', eligibleForScan: true },
    _count: true,
    orderBy: { rescanPriority: 'desc' },
  });

  console.log('');
  console.log('TIER A PRIORITY DISTRIBUTION');
  priorityDist.slice(0, 5).forEach((p) => {
    console.log(`  Priority ${p.rescanPriority ?? 'null'}: ${p._count} domains`);
  });

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

handleStagnantDomains(dryRun)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
