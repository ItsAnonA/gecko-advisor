#!/usr/bin/env tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Cleanup Blocked Domains Script
 *
 * This script identifies domains in the Domain table that match the blocklist
 * (adult content, piracy sites, etc.) and marks them as isIndexed=false.
 *
 * This removes them from the sitemap without deleting the data.
 *
 * Usage:
 *   pnpm --filter @gecko-advisor/backend cleanup:blocked
 *
 * Or directly:
 *   cd apps/backend && npx tsx scripts/cleanup-blocked-domains.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 */

import { PrismaClient } from "@prisma/client";
import { isBlockedDomain, getBlockReason } from "@gecko-advisor/shared";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

interface BlockedDomainInfo {
  domain: string;
  reason: string | null;
  scanCount: number;
  lastScanned: Date | null;
}

async function main() {
  console.log("🦎 Cleanup Blocked Domains from Sitemap\n");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  const startTime = Date.now();

  // Fetch all indexed domains
  console.log("Fetching indexed domains from database...");
  const domains = await prisma.domain.findMany({
    where: { isIndexed: true },
    select: {
      id: true,
      domain: true,
      scanCount: true,
      lastScanned: true,
    },
  });

  console.log(`Found ${domains.length} indexed domains\n`);

  // Find blocked domains
  const blockedDomains: BlockedDomainInfo[] = [];

  for (const d of domains) {
    if (isBlockedDomain(d.domain)) {
      blockedDomains.push({
        domain: d.domain,
        reason: getBlockReason(d.domain),
        scanCount: d.scanCount,
        lastScanned: d.lastScanned,
      });
    }
  }

  if (blockedDomains.length === 0) {
    console.log("✅ No blocked domains found in sitemap. Everything is clean!\n");
    return;
  }

  console.log(`⚠️  Found ${blockedDomains.length} blocked domains:\n`);

  // Group by block reason for summary
  const byReason = new Map<string, string[]>();
  for (const d of blockedDomains) {
    const reason = d.reason || 'unknown';
    if (!byReason.has(reason)) {
      byReason.set(reason, []);
    }
    byReason.get(reason)!.push(d.domain);
  }

  // Print summary by reason
  console.log("Blocked domains by reason:");
  console.log("-".repeat(60));
  for (const [reason, domains] of byReason.entries()) {
    console.log(`\n${reason} (${domains.length} domains):`);
    // Show first 10 examples
    const examples = domains.slice(0, 10);
    for (const domain of examples) {
      console.log(`  - ${domain}`);
    }
    if (domains.length > 10) {
      console.log(`  ... and ${domains.length - 10} more`);
    }
  }
  console.log("\n" + "-".repeat(60));

  if (isDryRun) {
    console.log("\n🔍 DRY RUN: Would mark these domains as isIndexed=false");
    console.log("   Run without --dry-run to apply changes.\n");
    return;
  }

  // Update blocked domains to isIndexed=false
  console.log("\nUpdating domains to isIndexed=false...");

  const domainNames = blockedDomains.map(d => d.domain);

  const result = await prisma.domain.updateMany({
    where: {
      domain: { in: domainNames },
    },
    data: {
      isIndexed: false,
    },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Domains de-indexed: ${result.count}`);
  console.log(`   Duration: ${duration}s\n`);

  // Verify
  const remainingIndexed = await prisma.domain.count({
    where: { isIndexed: true },
  });
  const totalBlocked = await prisma.domain.count({
    where: { isIndexed: false },
  });

  console.log("📊 Current state:");
  console.log(`   Indexed domains (in sitemap): ${remainingIndexed}`);
  console.log(`   De-indexed domains: ${totalBlocked}\n`);
}

main()
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
