#!/usr/bin/env npx ts-node

/**
 * TLD PRIORITY ADJUSTMENT
 *
 * Adjusts priority for low-priority TLDs.
 * IMPORTANT: These domains remain SCANNABLE, just deprioritized.
 * They can be promoted if Tranco/GSC proves value.
 *
 * Usage:
 *   npx ts-node scripts/adjust-tld-priority.ts --dry-run
 *   npx ts-node scripts/adjust-tld-priority.ts
 */

import { PrismaClient } from '@prisma/client';
import { LOW_PRIORITY_TLDS, WHITELIST } from '../apps/backend/src/config/tier-config';

const prisma = new PrismaClient();

async function adjustTLDPriority(dryRun: boolean): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       TLD PRIORITY ADJUSTMENT (Deprioritize, Not Exclude)    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('⚠️  Domains remain SCANNABLE, just lower priority');
  console.log(`   Whitelist size: ${WHITELIST.size}`);
  console.log('');

  const now = new Date();
  let totalAdjusted = 0;
  let totalProtected = 0;

  for (const tld of LOW_PRIORITY_TLDS) {
    // Count domains with this TLD that could be adjusted
    const candidates = await prisma.domain.findMany({
      where: {
        domain: { endsWith: tld },
        eligibleForScan: true,
        // Don't touch if already proven valuable
        trancoRank: null,
        gscClicks: { equals: 0 },
        gscImpressions: { lt: 10 },
      },
      select: { id: true, domain: true },
    });

    // Filter out whitelisted
    const toAdjust = candidates.filter((d) => !WHITELIST.has(d.domain));
    const protectedCount = candidates.length - toAdjust.length;

    if (toAdjust.length === 0) {
      console.log(
        `  ${tld.padEnd(10)} → 0 adjusted (${protectedCount} protected by whitelist/GSC/Tranco)`
      );
      totalProtected += protectedCount;
      continue;
    }

    if (!dryRun) {
      // Adjust priority (not exclude!)
      await prisma.domain.updateMany({
        where: { id: { in: toAdjust.map((d) => d.id) } },
        data: {
          rescanPriority: 10, // Low priority
          eligibilityReason: `low_priority_tld:${tld}`,
          eligibilityTaggedAt: now,
          // eligibleForScan stays TRUE
        },
      });
    }

    console.log(
      `  ${tld.padEnd(10)} → ${toAdjust.length} ${dryRun ? 'would be ' : ''}deprioritized (${protectedCount} protected)`
    );
    totalAdjusted += toAdjust.length;
    totalProtected += protectedCount;
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`Total ${dryRun ? 'would be ' : ''}deprioritized: ${totalAdjusted}`);
  console.log(`Total protected: ${totalProtected}`);

  // Show current priority distribution
  const distribution = await prisma.domain.groupBy({
    by: ['rescanPriority'],
    where: { eligibleForScan: true },
    _count: true,
    orderBy: { rescanPriority: 'desc' },
  });

  console.log('');
  console.log('Priority distribution:');
  distribution.slice(0, 10).forEach((d) => {
    console.log(`  Priority ${d.rescanPriority ?? 'null'}: ${d._count} domains`);
  });

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

adjustTLDPriority(dryRun)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
