#!/usr/bin/env tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Backfill Domain table from existing completed scans.
 *
 * This script populates the Domain table with records from all completed scans,
 * enabling them to appear in the dynamic sitemap for Google indexing.
 *
 * Usage:
 *   pnpm --filter @gecko-advisor/backend backfill:domains
 *
 * Or directly:
 *   cd apps/backend && npx tsx scripts/backfill-domains.ts
 */

import { PrismaClient } from "@prisma/client";
import { backfillDomainsFromScans } from "../src/services/domainService.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🦎 Starting Domain backfill from existing scans...\n");

  const startTime = Date.now();

  const stats = await backfillDomainsFromScans(prisma, (progress) => {
    process.stdout.write(
      `\r  Processed: ${progress.processed} | Created: ${progress.created} | Updated: ${progress.updated} | Errors: ${progress.errors}`
    );
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n\n✅ Backfill complete!\n");
  console.log("📊 Statistics:");
  console.log(`   Total completed scans: ${stats.totalScans}`);
  console.log(`   Unique domains found:  ${stats.uniqueDomains}`);
  console.log(`   Domain records created: ${stats.created}`);
  console.log(`   Domain records updated: ${stats.updated}`);
  console.log(`   Skipped (already up-to-date): ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`   Duration: ${duration}s\n`);

  // Show sitemap stats
  const indexedCount = await prisma.domain.count({
    where: { isIndexed: true },
  });
  console.log(`🗺️  Total indexed domains for sitemap: ${indexedCount}`);
}

main()
  .catch((error) => {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
