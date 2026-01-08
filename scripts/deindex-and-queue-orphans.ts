#!/usr/bin/env npx tsx
/*
 * SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
 * SPDX-License-Identifier: MIT
 *
 * De-index and queue orphaned domains
 *
 * Finds domains that are marked isIndexed=true but have no completed scan,
 * de-indexes them, and adds them to ScanQueue for re-scanning.
 *
 * Usage:
 *   pnpm deindex-orphans              # Dry run (preview only)
 *   pnpm deindex-orphans --execute    # Actually perform the changes
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

interface OrphanDomain {
  domain: string;
  latestScanId: string | null;
  scanStatus: string | null;
}

async function findOrphanedDomains(): Promise<OrphanDomain[]> {
  // Find domains that are indexed but have no completed scan
  const orphans = await prisma.$queryRaw<OrphanDomain[]>`
    SELECT
      d.domain,
      d."latestScanId",
      s.status as "scanStatus"
    FROM "Domain" d
    LEFT JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE d."isIndexed" = true
      AND (s.id IS NULL OR s.status != 'done')
  `;

  return orphans;
}

async function deindexDomains(domains: string[]): Promise<number> {
  const result = await prisma.domain.updateMany({
    where: {
      domain: { in: domains },
      isIndexed: true,
    },
    data: {
      isIndexed: false,
    },
  });

  return result.count;
}

async function addToScanQueue(domains: string[], batchId: string): Promise<{ imported: number; skipped: number }> {
  // Check which domains are already in the queue
  const existingInQueue = await prisma.scanQueue.findMany({
    where: { domain: { in: domains } },
    select: { domain: true },
  });
  const existingSet = new Set(existingInQueue.map(d => d.domain));

  // Filter out domains already in queue
  const toImport = domains.filter(d => !existingSet.has(d));

  if (toImport.length === 0) {
    return { imported: 0, skipped: domains.length };
  }

  // Import in batches of 1000
  const BATCH_SIZE = 1000;
  let imported = 0;

  for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
    const batch = toImport.slice(i, i + BATCH_SIZE);

    const result = await prisma.scanQueue.createMany({
      data: batch.map((domain, idx) => ({
        domain,
        status: 'PENDING',
        priority: 50, // Medium priority for re-scans
        source: 'rescan-orphan',
        sourceRank: i + idx + 1,
        batchId,
      })),
      skipDuplicates: true,
    });

    imported += result.count;
  }

  return {
    imported,
    skipped: existingSet.size,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const batchId = createId();

  console.log('🔍 Finding orphaned domains (indexed but no completed scan)...\n');

  const orphans = await findOrphanedDomains();

  if (orphans.length === 0) {
    console.log('✅ No orphaned domains found. All indexed domains have completed scans.');
    return;
  }

  console.log(`Found ${orphans.length} orphaned domains:\n`);

  // Group by scan status
  const byStatus: Record<string, number> = {};
  for (const o of orphans) {
    const status = o.scanStatus || 'no-scan';
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  console.log('Breakdown by scan status:');
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`  - ${status}: ${count}`);
  }
  console.log('');

  // Show sample
  console.log('Sample orphaned domains:');
  for (const o of orphans.slice(0, 10)) {
    console.log(`  - ${o.domain} (scan: ${o.scanStatus || 'none'})`);
  }
  if (orphans.length > 10) {
    console.log(`  ... and ${orphans.length - 10} more`);
  }
  console.log('');

  if (!execute) {
    console.log('ℹ️  DRY RUN - No changes made.');
    console.log('   Run with --execute to:');
    console.log(`   1. De-index ${orphans.length} domains`);
    console.log(`   2. Add them to ScanQueue for re-scanning`);
    console.log('\n   Command: pnpm deindex-orphans --execute');
    return;
  }

  // Execute the changes
  console.log('🚀 Executing changes...\n');

  const domainNames = orphans.map(o => o.domain);

  // Step 1: De-index
  console.log('Step 1: De-indexing domains...');
  const deindexed = await deindexDomains(domainNames);
  console.log(`  ✅ De-indexed ${deindexed} domains\n`);

  // Step 2: Add to ScanQueue
  console.log('Step 2: Adding to ScanQueue...');
  const queueResult = await addToScanQueue(domainNames, batchId);
  console.log(`  ✅ Imported ${queueResult.imported} domains to queue`);
  console.log(`  ⏭️  Skipped ${queueResult.skipped} domains (already in queue)\n`);

  console.log('📋 Summary:');
  console.log(`  - Batch ID: ${batchId}`);
  console.log(`  - De-indexed: ${deindexed}`);
  console.log(`  - Queued for re-scan: ${queueResult.imported}`);
  console.log(`  - Skipped (already queued): ${queueResult.skipped}`);
  console.log('\n✅ Done! Use /admin/scan-queue/process to start scanning.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
