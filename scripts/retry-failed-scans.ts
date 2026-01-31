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
 *
 * Usage:
 *   npx tsx scripts/retry-failed-scans.ts
 *   npx tsx scripts/retry-failed-scans.ts --dry-run
 *   npx tsx scripts/retry-failed-scans.ts --limit 100
 *   npx tsx scripts/retry-failed-scans.ts --min-age-days 14
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const minAgeArg = args.find((a) => a.startsWith('--min-age-days='));

const MAX_RETRIES = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500;
const MIN_AGE_DAYS = minAgeArg ? parseInt(minAgeArg.split('=')[1], 10) : 7;

// Redis connection for BullMQ
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

async function retryFailedScans() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              RETRY FAILED SCANS                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No scans will be queued\n');
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

  const queueName = process.env.QUEUE_NAME || 'scan-jobs';
  const queue = new Queue(queueName, { connection });

  console.log(`Queueing ${failedDomains.length} scans...\n`);

  let queued = 0;
  let errors = 0;

  for (const domain of failedDomains) {
    try {
      // Create new scan record
      const scan = await prisma.scan.create({
        data: {
          input: domain.domain,
          normalizedInput: domain.domain,
          status: 'queued',
          isPublic: true,
          scannerIp: 'retry-script',
        },
      });

      // Add to queue with lower priority (don't compete with user scans)
      await queue.add(
        'scan-url',
        {
          scanId: scan.id,
          url: `https://${domain.domain}`,
          requestId: `retry-${scan.id}`,
        },
        {
          jobId: scan.id,
          priority: 100, // Lower priority than user scans (which are typically 1-10)
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
}

retryFailedScans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
