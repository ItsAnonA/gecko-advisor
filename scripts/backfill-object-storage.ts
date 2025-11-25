#!/usr/bin/env npx tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT

Backfill Script: Migrate existing reports from PostgreSQL to Object Storage

Usage:
  # Dry run (see what would be uploaded)
  npx tsx scripts/backfill-object-storage.ts --dry-run

  # Backfill all completed scans
  npx tsx scripts/backfill-object-storage.ts

  # Backfill with batch size and delay
  npx tsx scripts/backfill-object-storage.ts --batch-size=50 --delay-ms=100

  # Backfill specific date range
  npx tsx scripts/backfill-object-storage.ts --since="2025-01-01" --until="2025-11-26"

Environment variables required:
  DATABASE_URL - PostgreSQL connection string
  OBJECT_STORAGE_ENABLED=true
  OBJECT_STORAGE_ENDPOINT
  OBJECT_STORAGE_BUCKET
  OBJECT_STORAGE_ACCESS_KEY
  OBJECT_STORAGE_SECRET_KEY
*/

import { PrismaClient } from '@prisma/client';
import { ObjectStorageService, buildReportPayload, buildReportStorageKey } from '@gecko-advisor/shared';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg?.split('=')[1];
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const DRY_RUN = hasFlag('dry-run');
const BATCH_SIZE = parseInt(getArg('batch-size') ?? '100', 10);
const DELAY_MS = parseInt(getArg('delay-ms') ?? '50', 10);
const SINCE = getArg('since');
const UNTIL = getArg('until');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Object Storage
const objectStorage = new ObjectStorageService({
  enabled: process.env.OBJECT_STORAGE_ENABLED === 'true',
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
  region: process.env.OBJECT_STORAGE_REGION ?? 'eu-central',
  forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== 'false',
  accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
  secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY,
  bucket: process.env.OBJECT_STORAGE_BUCKET,
  publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL,
  reportPrefix: process.env.OBJECT_STORAGE_REPORT_PREFIX ?? 'reports/',
  signedUrlExpirySeconds: parseInt(process.env.OBJECT_STORAGE_SIGNED_URL_SECONDS ?? '3600', 10),
}, console);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Stats {
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
  startTime: number;
}

async function backfillReports() {
  console.log('\n========================================');
  console.log('  Gecko Advisor - Object Storage Backfill');
  console.log('========================================\n');

  // Check object storage is enabled
  if (!objectStorage.isEnabled()) {
    console.error('ERROR: Object Storage is not enabled or misconfigured.');
    console.error('Required environment variables:');
    console.error('  OBJECT_STORAGE_ENABLED=true');
    console.error('  OBJECT_STORAGE_ENDPOINT=https://...');
    console.error('  OBJECT_STORAGE_BUCKET=your-bucket');
    console.error('  OBJECT_STORAGE_ACCESS_KEY=...');
    console.error('  OBJECT_STORAGE_SECRET_KEY=...');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log(`  Batch Size: ${BATCH_SIZE}`);
  console.log(`  Delay between uploads: ${DELAY_MS}ms`);
  console.log(`  Date Range: ${SINCE ?? 'beginning'} to ${UNTIL ?? 'now'}`);
  console.log(`  Bucket: ${process.env.OBJECT_STORAGE_BUCKET}`);
  console.log(`  Prefix: ${process.env.OBJECT_STORAGE_REPORT_PREFIX ?? 'reports/'}`);
  console.log('');

  // Build query filters
  const whereClause: Record<string, unknown> = {
    status: 'done',
  };

  if (SINCE || UNTIL) {
    whereClause.createdAt = {};
    if (SINCE) (whereClause.createdAt as Record<string, Date>).gte = new Date(SINCE);
    if (UNTIL) (whereClause.createdAt as Record<string, Date>).lte = new Date(UNTIL);
  }

  // Count total scans to process
  const totalCount = await prisma.scan.count({ where: whereClause });
  console.log(`Found ${totalCount} completed scans to process.\n`);

  if (totalCount === 0) {
    console.log('No scans to backfill. Exiting.');
    return;
  }

  if (DRY_RUN) {
    console.log('DRY RUN MODE - No uploads will be performed.\n');
  }

  const stats: Stats = {
    total: totalCount,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    startTime: Date.now(),
  };

  let cursor: string | undefined;
  let processed = 0;

  while (processed < totalCount) {
    // Fetch batch of scans with evidence and issues
    const scans = await prisma.scan.findMany({
      where: whereClause,
      include: {
        evidence: { orderBy: { createdAt: 'asc' } },
        issues: { orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }] },
      },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'asc' },
    });

    if (scans.length === 0) break;

    for (const scan of scans) {
      processed++;
      const progress = `[${processed}/${totalCount}]`;
      const storageKey = buildReportStorageKey(scan.id, {
        prefix: process.env.OBJECT_STORAGE_REPORT_PREFIX ?? 'reports/',
      });

      try {
        // Build the report payload
        const payload = buildReportPayload(scan, {
          evidence: scan.evidence ?? [],
          issues: scan.issues ?? [],
        });

        if (DRY_RUN) {
          console.log(`${progress} Would upload: ${storageKey} (${scan.slug ?? scan.id})`);
          stats.uploaded++;
        } else {
          // Upload to Object Storage
          const success = await objectStorage.uploadJson(storageKey, payload, {
            metadata: {
              'scan-id': scan.id,
              slug: scan.slug ?? '',
              'stored-at': new Date().toISOString(),
              'backfill': 'true',
            },
          });

          if (success) {
            console.log(`${progress} Uploaded: ${storageKey} (${scan.slug ?? scan.id})`);
            stats.uploaded++;
          } else {
            console.error(`${progress} FAILED: ${storageKey} (${scan.slug ?? scan.id})`);
            stats.failed++;
          }

          // Small delay to avoid overwhelming the storage service
          if (DELAY_MS > 0) await sleep(DELAY_MS);
        }
      } catch (error) {
        console.error(`${progress} ERROR: ${scan.id} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        stats.failed++;
      }

      cursor = scan.id;
    }
  }

  // Print summary
  const elapsedSeconds = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('\n========================================');
  console.log('  Backfill Complete');
  console.log('========================================');
  console.log(`  Total Scans: ${stats.total}`);
  console.log(`  Uploaded: ${stats.uploaded}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Time: ${elapsedSeconds}s`);
  console.log(`  Rate: ${(stats.uploaded / parseFloat(elapsedSeconds)).toFixed(1)} reports/sec`);
  console.log('========================================\n');

  if (stats.failed > 0) {
    console.log('WARNING: Some uploads failed. Re-run the script to retry.');
  }
}

// Main execution
backfillReports()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
