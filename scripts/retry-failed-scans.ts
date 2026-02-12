/**
 * Retry Failed Scans Script
 *
 * Finds domains where the latest scan failed and re-queues them for scanning.
 * Only retries scans that failed more than 7 days ago to avoid hammering
 * sites that are temporarily down.
 *
 * Rules:
 * - Only retry if last scan was an error AND older than 7 days
 * - Max 500 retries per run to avoid queue flooding
 * - Skip domains that have been retried recently (within 7 days)
 * - Prioritize domains with higher tier (A > B > C)
 * - Creates pause lock to prevent batch cron from competing
 *
 * Usage:
 *   npx tsx scripts/retry-failed-scans.ts
 *   npx tsx scripts/retry-failed-scans.ts --dry-run
 *   npx tsx scripts/retry-failed-scans.ts --limit 100
 *   npx tsx scripts/retry-failed-scans.ts --min-age-days 14
 *
 * Recommended cron (weekly, Sundays at 3 AM):
 *   0 3 * * 0 /opt/scan-cron/run-in-backend.sh npx tsx /app/scripts/retry-failed-scans.ts
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { customAlphabet } from 'nanoid';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Slug generation (same as backend)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateSlug = customAlphabet(alphabet, 8);

// Pause lock file - batch cron checks this and skips if present
const PAUSE_LOCK_FILE = '/tmp/retry-scans-running.lock';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noPause = args.includes('--no-pause'); // Skip pause lock (for testing)
const limitArg = args.find((a) => a.startsWith('--limit='));
const minAgeArg = args.find((a) => a.startsWith('--min-age-days='));

/**
 * Create pause lock to prevent batch cron from competing.
 * The cron-submitter.sh checks for this file and skips if present.
 */
function acquirePauseLock(): boolean {
  try {
    const lockData = JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      script: 'retry-failed-scans',
    });
    fs.writeFileSync(PAUSE_LOCK_FILE, lockData);
    return true;
  } catch (error) {
    console.warn('⚠️  Failed to create pause lock:', error);
    return false;
  }
}

/**
 * Release pause lock to allow batch cron to resume.
 */
function releasePauseLock(): void {
  try {
    if (fs.existsSync(PAUSE_LOCK_FILE)) {
      fs.unlinkSync(PAUSE_LOCK_FILE);
    }
  } catch (error) {
    console.warn('⚠️  Failed to release pause lock:', error);
  }
}

// Ensure lock is released on exit
process.on('SIGINT', () => {
  releasePauseLock();
  process.exit(130);
});
process.on('SIGTERM', () => {
  releasePauseLock();
  process.exit(143);
});

const MAX_RETRIES = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500;
const MIN_AGE_DAYS = minAgeArg ? parseInt(minAgeArg.split('=')[1], 10) : 7;

// Redis connection for BullMQ - parse REDIS_URL or use defaults
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const parsedRedis = new URL(redisUrl);
const redisHost = parsedRedis.hostname;
const redisPort = parseInt(parsedRedis.port || '6379', 10);
const redisPassword = parsedRedis.password || undefined;

async function retryFailedScans() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              RETRY FAILED SCANS                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No scans will be queued\n');
  }

  // Acquire pause lock to prevent batch cron from competing
  if (!dryRun && !noPause) {
    if (acquirePauseLock()) {
      console.log('⏸️  Paused batch scan cron (lock acquired)\n');
    } else {
      console.log('⚠️  Could not pause batch cron - continuing anyway\n');
    }
  }

  console.log(`Settings:`);
  console.log(`  Max retries per run: ${MAX_RETRIES}`);
  console.log(`  Min age (days): ${MIN_AGE_DAYS}`);
  console.log(`  Redis: ${redisHost}:${redisPort}\n`);

  // Find domains where latest scan failed and is older than MIN_AGE_DAYS
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MIN_AGE_DAYS);

  console.log(`Finding failed scans older than ${cutoffDate.toISOString().split('T')[0]}...\n`);

  const failedDomains = await prisma.domain.findMany({
    where: {
      latestScan: {
        status: 'error',
        createdAt: {
          lt: cutoffDate,
        },
      },
      // Only retry indexed domains (have some value)
      isIndexed: true,
    },
    include: {
      latestScan: {
        select: {
          id: true,
          status: true,
          summary: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      // Prioritize by tier (A first, then B, then C)
      { indexTier: 'asc' },
      // Then by how long ago it failed
      { latestScan: { createdAt: 'asc' } },
    ],
    take: MAX_RETRIES,
  });

  console.log(`Found ${failedDomains.length} domains to retry\n`);

  if (failedDomains.length === 0) {
    console.log('✅ No failed scans to retry!');
    return;
  }

  // Show tier distribution
  const tierCounts = failedDomains.reduce(
    (acc, d) => {
      acc[d.indexTier] = (acc[d.indexTier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log('Tier distribution:');
  Object.entries(tierCounts).forEach(([tier, count]) => {
    console.log(`  Tier ${tier}: ${count}`);
  });
  console.log();

  // Show sample domains
  console.log('Sample domains to retry:');
  failedDomains.slice(0, 5).forEach((d) => {
    const age = Math.floor(
      (Date.now() - new Date(d.latestScan!.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`  ${d.domain} (Tier ${d.indexTier}, failed ${age} days ago)`);
  });
  console.log();

  if (dryRun) {
    console.log('🔍 DRY RUN - Would have queued these scans. Run without --dry-run to execute.\n');
    return;
  }

  // Connect to Redis and create queue
  const connection = new IORedis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
  });

  const queueName = process.env.QUEUE_NAME || 'scan.site';
  const queue = new Queue(queueName, { connection });

  console.log(`Queueing ${failedDomains.length} scans...\n`);

  let queued = 0;
  let errors = 0;

  for (const domain of failedDomains) {
    try {
      // Create new scan record with unique slug
      const scan = await prisma.scan.create({
        data: {
          targetType: 'url',
          input: domain.domain,
          normalizedInput: domain.domain,
          slug: generateSlug(),
          status: 'queued',
          isPublic: true,
          scannerIp: 'retry-script',
          source: 'retry_failed',
        },
      });

      // Add to queue with NORMAL priority (same as batch scans)
      // Priority 0 = NORMAL (processed in FIFO order with batch scans)
      // Since batch cron is paused during retry, these will process immediately
      await queue.add(
        'scan-url',
        {
          scanId: scan.id,
          url: `https://${domain.domain}`,
          requestId: `retry-${scan.id}`,
        },
        {
          jobId: scan.id,
          priority: 0, // NORMAL priority - same as batch scans
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        }
      );

      queued++;

      // Progress indicator
      if (queued % 50 === 0) {
        console.log(`  Queued ${queued}/${failedDomains.length}...`);
      }
    } catch (error) {
      errors++;
      console.error(`  Error queueing ${domain.domain}:`, error);
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Queued: ${queued}`);
  console.log(`  Errors: ${errors}`);

  // Cleanup
  await queue.close();
  await connection.quit();

  // Release pause lock to resume batch cron
  if (!dryRun && !noPause) {
    releasePauseLock();
    console.log('\n▶️  Resumed batch scan cron (lock released)');
  }
}

retryFailedScans()
  .catch((error) => {
    console.error(error);
    // Ensure lock is released even on error
    releasePauseLock();
  })
  .finally(() => prisma.$disconnect());
