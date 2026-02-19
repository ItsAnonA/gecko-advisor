/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import http from "node:http";
import { Worker, QueueEvents, Queue, type Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { scanSiteJob } from "./scanner.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { initSentry, Sentry } from "./sentry.js";
import { normalizeDomain, isBlockedDomain } from "@gecko-advisor/shared";

/**
 * Laplace-smoothed beta mean for scan confidence.
 * Duplicated from stabilityService to avoid cross-package import in worker.
 */
function computeScanConfidence(successes: number, failures: number): number {
  return (successes + 1) / (successes + failures + 2);
}

/**
 * Upsert a Domain record when a scan completes.
 * This ensures the domain appears in the dynamic sitemap.
 * Also links the Scan to the Domain for volatility tracking.
 */
async function upsertDomainOnScanComplete(
  scanId: string,
  url: string,
  isSuccess = true,
): Promise<void> {
  try {
    const domain = normalizeDomain(url);
    if (!domain || domain === 'invalid') {
      logger.debug({ url, domain }, 'Skipping domain upsert for invalid domain');
      return;
    }

    // Skip blocked domains (adult content) - don't add to sitemap
    if (isBlockedDomain(domain)) {
      logger.debug({ url, domain }, 'Skipping domain upsert for blocked domain');
      return;
    }

    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      select: { id: true, finishedAt: true, createdAt: true, score: true },
    });

    if (!scan) {
      logger.warn({ scanId }, 'Scan not found for domain upsert');
      return;
    }

    // Upsert the domain record
    const domainRecord = await prisma.domain.upsert({
      where: { domain },
      create: {
        domain,
        latestScanId: scan.id,
        firstScanned: scan.finishedAt ?? new Date(),
        lastScanned: scan.finishedAt ?? new Date(),
        lastScannedAt: scan.finishedAt ?? new Date(),
        scanCount: 1,
        isIndexed: true,
        // Set historical peak score from first scan
        historicalPeakScore: scan.score ?? undefined,
        historicalPeakDate: scan.score ? (scan.finishedAt ?? new Date()) : undefined,
        // Error-weighted confidence tracking
        scanSuccessCount: isSuccess ? 1 : 0,
        scanFailureCount: isSuccess ? 0 : 1,
        scanConfidence: computeScanConfidence(isSuccess ? 1 : 0, isSuccess ? 0 : 1),
        confidenceUpdatedAt: new Date(),
      },
      update: {
        latestScanId: scan.id,
        lastScanned: scan.finishedAt ?? new Date(),
        lastScannedAt: scan.finishedAt ?? new Date(),
        scanCount: { increment: 1 },
        // Increment success counter for confidence
        ...(isSuccess && { scanSuccessCount: { increment: 1 } }),
      },
    });

    // Recompute confidence after updating counts
    if (isSuccess) {
      const newConfidence = computeScanConfidence(
        domainRecord.scanSuccessCount, // Already incremented by upsert
        domainRecord.scanFailureCount,
      );
      await prisma.domain.update({
        where: { id: domainRecord.id },
        data: { scanConfidence: newConfidence, confidenceUpdatedAt: new Date() },
      });
    }

    // Link scan to domain for volatility tracking
    await prisma.scan.update({
      where: { id: scanId },
      data: { domainId: domainRecord.id },
    });

    // Update historical peak score if this scan has a higher score
    if (
      scan.score !== null &&
      (domainRecord.historicalPeakScore === null ||
        scan.score > domainRecord.historicalPeakScore)
    ) {
      await prisma.domain.update({
        where: { id: domainRecord.id },
        data: {
          historicalPeakScore: scan.score,
          historicalPeakDate: scan.finishedAt ?? new Date(),
        },
      });
    }

    logger.debug({ domain, scanId, domainId: domainRecord.id }, 'Domain record upserted for sitemap');
  } catch (error) {
    // Non-fatal error - log but don't fail the scan
    logger.warn({ error, scanId, url }, 'Failed to upsert domain record');
  }
}

/**
 * Update Domain failure counter on scan error.
 * Increments scanFailureCount and recomputes confidence.
 * Non-fatal: logs warning on failure.
 */
async function upsertDomainOnScanFailure(url: string): Promise<void> {
  try {
    const domain = normalizeDomain(url);
    if (!domain || domain === 'invalid') return;

    const domainRecord = await prisma.domain.findUnique({
      where: { domain },
      select: { id: true, scanSuccessCount: true, scanFailureCount: true },
    });

    if (!domainRecord) return; // Domain not yet created - skip

    const newFailureCount = domainRecord.scanFailureCount + 1;
    const newConfidence = computeScanConfidence(domainRecord.scanSuccessCount, newFailureCount);

    await prisma.domain.update({
      where: { id: domainRecord.id },
      data: {
        scanFailureCount: newFailureCount,
        scanConfidence: newConfidence,
        confidenceUpdatedAt: new Date(),
      },
    });

    logger.debug({ domain, confidence: newConfidence }, 'Domain failure count updated');
  } catch (error) {
    logger.warn({ error, url }, 'Failed to update domain failure count (non-fatal)');
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const RedisConstructor = Redis as unknown as typeof import('ioredis').default;
const baseConnection = new RedisConstructor(config.redisUrl, {
  maxRetriesPerRequest: null,
});
const eventsConnection = baseConnection.duplicate();
const prisma = new PrismaClient();
const deadLetterQueue = new Queue(config.deadLetterQueue, { connection: baseConnection });
const sentryEnabled = initSentry();

interface ScanJobData {
  scanId: string;
  url: string;
  requestId?: string;
  normalizedInput?: string;
  queueItemId?: string; // For ScanQueue tracking in bulk scans
}

interface ReportGenerationJobData {
  domain: string;
}

/**
 * Process a report generation job.
 * Generates SSR report HTML and caches it for future bot requests.
 */
async function processReportGenerationJob(job: Job<ReportGenerationJobData>): Promise<void> {
  const { domain } = job.data;
  logger.info({ jobId: job.id, domain }, 'Starting report generation job');

  try {
    // Find the latest scan for this domain
    const latestScan = await prisma.scan.findFirst({
      where: {
        normalizedInput: domain,
        status: 'done',
      },
      orderBy: {
        finishedAt: 'desc',
      },
      select: {
        id: true,
        score: true,
        label: true,
        input: true,
        createdAt: true,
        finishedAt: true,
        evidence: true,
      },
    });

    if (!latestScan) {
      logger.warn({ domain }, 'No completed scan found for domain - cannot generate report');
      return;
    }

    //NOTE: The actual HTML generation and caching is done in the backend
    // This worker just ensures the job is processed
    // The backend's reportGenerationQueue.processReportGenerationJob() handles:
    // 1. Generating HTML from templates
    // 2. Caching the result in Redis
    // For now, we'll just log success - the backend route already handles caching when it generates

    logger.info(
      {
        jobId: job.id,
        domain,
        scanId: latestScan.id,
        score: latestScan.score,
      },
      'Report generation job completed'
    );
  } catch (error) {
    logger.error(
      {
        jobId: job.id,
        domain,
        error: error instanceof Error ? error.message : String(error),
      },
      'Report generation job failed'
    );
    throw error;
  }
}

export const worker = new Worker<ScanJobData | ReportGenerationJobData>(
  config.queueName,
  async (job: Job<ScanJobData | ReportGenerationJobData>) => {
    // Dispatch based on job name
    if (job.name === 'generate-report') {
      return processReportGenerationJob(job as Job<ReportGenerationJobData>);
    }

    // Default: scan job - cast to ScanJobData
    const scanJob = job as Job<ScanJobData>;
    const { scanId, url, requestId } = scanJob.data;
    logger.info({ jobId: job.id, scanId, requestId }, 'Starting scan job');

    // Update scan to running with progress tracking
    const scanStartTime = Date.now();
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'running',
        startedAt: new Date(),
        progress: 0,
      },
    });

    try {
      // Pass job for progress updates
      await scanSiteJob(prisma, scanId, url, job);

      // Record wall-clock duration for latency percentile tracking
      const durationMs = Date.now() - scanStartTime;
      await prisma.scan.update({
        where: { id: scanId },
        data: { durationMs },
      }).catch((err) => {
        logger.debug({ err, scanId }, 'Failed to record scan duration');
      });

      // Report 100% progress (scan status is updated atomically in scanner.ts)
      await job.updateProgress(100);

      // Update Domain table for sitemap indexing + confidence tracking
      await upsertDomainOnScanComplete(scanId, url, true /* isSuccess */);

      // Phase 3: Change Intelligence - detect and record privacy changes
      try {
        const { detectChangesForScan } = await import('./changeDetection.js');
        const result = await detectChangesForScan(prisma, scanId);
        if (result.recorded && result.result) {
          logger.info({ scanId, changeType: result.result.changeType, scoreDelta: result.result.scoreDelta }, 'Privacy change detected');
        }
      } catch (changeError) {
        // Non-blocking - log warning but don't fail the scan
        logger.warn({ scanId, error: changeError }, 'Change detection failed (non-fatal)');
      }

      // Update ScanQueue if this was a queued scan
      if (scanJob.data.queueItemId) {
        const scan = await prisma.scan.findUnique({
          where: { id: scanId },
          select: { score: true },
        });

        await prisma.scanQueue.update({
          where: { id: scanJob.data.queueItemId },
          data: {
            status: 'SUCCESS',
            score: scan?.score,
          },
        }).catch((err) => {
          logger.warn({ err, queueItemId: scanJob.data.queueItemId }, 'Failed to update ScanQueue status');
        });
      }

      logger.info({ jobId: job.id, scanId }, 'Scan completed');
    } catch (error) {
      logger.error({ jobId: job.id, scanId, err: error }, 'Scan failed');

      // Send to Sentry for monitoring
      if (sentryEnabled) {
        Sentry.captureException(error, {
          tags: {
            component: 'worker',
            queue: config.queueName,
          },
          contexts: {
            job: {
              id: job.id,
              name: job.name,
              attemptsMade: job.attemptsMade,
            },
          },
        });
      }

      // Determine error message based on error type
      const errorMessage = error instanceof Error ? error.message : 'Scan failed due to crawler error';
      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('time out');
      const summary = isTimeout
        ? 'Scan timed out. The site took too long to respond or analyze.'
        : 'Scan failed due to an error during processing.';

      // Update scan status to error with meaningful message + duration
      const durationMs = Date.now() - scanStartTime;
      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          durationMs,
          summary,
        },
      });

      // Update Domain failure counter for confidence tracking
      await upsertDomainOnScanFailure(url);

      throw error;
    }
  },
  {
    connection: baseConnection,
    concurrency: config.concurrency,
    // CRITICAL: Add job-level timeout to prevent hanging
    lockDuration: config.jobTimeoutMs, // Job must complete within this time
    // Settings for stalled job detection
    stalledInterval: 30_000, // Check for stalled jobs every 30 seconds
    maxStalledCount: 1, // Move to failed after 1 stalled detection
  }
);

worker.on('failed', async (job, err) => {
  if (!job) return;

  // Skip processing for report generation jobs
  if (job.name === 'generate-report') {
    logger.warn({ jobId: job.id, domain: (job.data as ReportGenerationJobData).domain }, 'Report generation job failed');
    return;
  }

  // Handle scan job failures
  const scanJob = job as Job<ScanJobData>;
  const isFinalAttempt = scanJob.attemptsMade >= (scanJob.opts.attempts ?? 1);
  const errorMessage = err?.message ?? 'Unknown error';
  const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('stalled');

  logger.warn(
    {
      jobId: scanJob.id,
      scanId: scanJob.data.scanId,
      attempts: scanJob.attemptsMade,
      err: errorMessage,
      isTimeout,
      isFinalAttempt,
    },
    'Job failed'
  );

  if (isFinalAttempt) {
    // On final failure, ensure scan is marked as error in database
    try {
      const summary = isTimeout
        ? 'Scan timed out. The site took too long to respond or analyze.'
        : 'Scan failed after multiple retry attempts.';

      await prisma.scan.update({
        where: { id: scanJob.data.scanId },
        data: {
          status: 'error',
          finishedAt: new Date(),
          summary,
        },
      });

      // Update ScanQueue if this was a queued scan
      if (scanJob.data.queueItemId) {
        const isBlocked = errorMessage.includes('403') || errorMessage.includes('blocked') || errorMessage.includes('robots');
        const queueStatus = isTimeout ? 'TIMEOUT' : isBlocked ? 'BLOCKED' : 'FAILED';

        await prisma.scanQueue.update({
          where: { id: scanJob.data.queueItemId },
          data: {
            status: queueStatus,
            lastError: errorMessage.substring(0, 500), // Truncate error
          },
        }).catch((qErr) => {
          logger.warn({ qErr, queueItemId: scanJob.data.queueItemId }, 'Failed to update ScanQueue on failure');
        });
      }
    } catch (updateError) {
      logger.error({ updateError, scanId: scanJob.data.scanId }, 'Failed to update scan status on final failure');
    }

    // Add to dead letter queue for investigation
    await deadLetterQueue.add(
      'scan-failed',
      {
        scanId: scanJob.data.scanId,
        url: scanJob.data.url,
        requestId: scanJob.data.requestId,
        error: errorMessage,
        isTimeout,
        failedAt: new Date().toISOString(),
      },
      { removeOnComplete: 100, removeOnFail: 500 }
    );
  }
});

export const queueEvents = new QueueEvents(config.queueName, { connection: eventsConnection });
queueEvents.on('completed', ({ jobId }) => logger.info({ jobId }, 'Job completed'));
queueEvents.on('failed', ({ jobId, failedReason }) => logger.warn({ jobId, failedReason }, 'Job failed event'));

logger.info('Worker running');

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      ok: true,
      queue: config.queueName,
      uptime: process.uptime(),
    })
  );
});

server.listen(config.healthPort, () => {
  logger.info({ port: config.healthPort }, 'Worker health endpoint ready');
});
