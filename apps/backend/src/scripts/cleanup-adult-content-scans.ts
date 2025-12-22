#!/usr/bin/env tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
/**
 * Cleanup script to delete scans of adult content domains
 *
 * This script:
 * 1. Finds all scans matching the blocklist patterns
 * 2. Deletes them along with their evidence and issues (cascade)
 * 3. Logs summary for Google Search Console URL removal
 *
 * Run with: npx tsx apps/backend/src/scripts/cleanup-adult-content-scans.ts
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --verbose    Show detailed output for each scan
 */

import { PrismaClient } from '@prisma/client';
import { isBlockedDomain } from '@gecko-advisor/shared';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

/**
 * Extract domain from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function cleanupAdultContentScans() {
  console.log('🧹 Adult Content Scan Cleanup Script\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE (scans will be deleted)'}\n`);

  // Fetch all scans
  console.log('📊 Fetching all scans...');
  const allScans = await prisma.scan.findMany({
    select: {
      id: true,
      slug: true,
      input: true,
      normalizedInput: true,
      createdAt: true,
    },
  });

  console.log(`Found ${allScans.length} total scans\n`);

  // Filter scans that match blocklist
  const blockedScans = allScans.filter((scan) => {
    const domain = getDomainFromUrl(scan.normalizedInput || scan.input);
    return isBlockedDomain(domain);
  });

  if (blockedScans.length === 0) {
    console.log('✅ No adult content scans found. Database is clean!\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`🚫 Found ${blockedScans.length} scans matching adult content blocklist:\n`);

  // Group by domain for summary
  const domainCounts: Record<string, number> = {};
  const urlsForRemoval: string[] = [];

  for (const scan of blockedScans) {
    const domain = getDomainFromUrl(scan.normalizedInput || scan.input);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;

    // Generate URLs for Google Search Console removal
    urlsForRemoval.push(`https://geckoadvisor.com/r/${scan.slug}`);
    urlsForRemoval.push(`https://geckoadvisor.com/privacy-policy/${domain}`);

    if (VERBOSE) {
      console.log(`  - ${scan.slug}: ${domain} (created: ${scan.createdAt.toISOString()})`);
    }
  }

  // Show domain summary
  console.log('\n📈 Summary by domain:');
  const sortedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  for (const [domain, count] of sortedDomains) {
    console.log(`  ${domain}: ${count} scan${count !== 1 ? 's' : ''}`);
  }

  // Output URLs for Google Search Console removal
  console.log('\n📋 URLs to request removal from Google Search Console:');
  console.log('(Copy these to GSC Removals tool)\n');

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urlsForRemoval)].sort();
  for (const url of uniqueUrls) {
    console.log(url);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN: No scans were deleted.');
    console.log('Run without --dry-run to delete these scans.\n');
  } else {
    // Delete the scans (evidence and issues cascade delete)
    console.log('\n🗑️  Deleting scans...');

    const scanIds = blockedScans.map((s) => s.id);
    const deleteResult = await prisma.scan.deleteMany({
      where: {
        id: { in: scanIds },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} scans\n`);

    // Also clean up orphaned Domain records
    console.log('🧹 Cleaning up orphaned Domain records...');
    const orphanedDomains = await prisma.domain.findMany({
      where: {
        latestScanId: null,
      },
      select: { id: true, domain: true },
    });

    if (orphanedDomains.length > 0) {
      const domainIds = orphanedDomains.map((d) => d.id);
      const domainDeleteResult = await prisma.domain.deleteMany({
        where: { id: { in: domainIds } },
      });
      console.log(`✅ Deleted ${domainDeleteResult.count} orphaned Domain records\n`);
    } else {
      console.log('No orphaned Domain records found.\n');
    }
  }

  // Verify remaining scans
  const remainingCount = await prisma.scan.count();
  console.log(`📊 Total scans remaining in database: ${remainingCount}\n`);

  // Remind about cache invalidation
  console.log('⚠️  Remember to:');
  console.log('1. Request URL removal in Google Search Console');
  console.log('2. Clear Redis cache: FLUSHDB or restart Redis');
  console.log('3. Clear CDN cache if applicable\n');

  await prisma.$disconnect();
}

cleanupAdultContentScans()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  });
