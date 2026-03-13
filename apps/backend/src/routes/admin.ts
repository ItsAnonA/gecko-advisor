/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { normalizeUrl } from "@gecko-advisor/shared";
import type { ScanQueueStatus } from "@prisma/client";
import { adminGuard } from "../middleware/admin.js";
import { loadDemoLists } from "../lists.js";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { addScanJob, SCAN_PRIORITY, pauseQueue, resumeQueue, isQueuePaused, getQueueMetrics } from "../queue.js";
import { createScanWithSlug } from "../services/slug.js";
import { backfillDomainsFromScans, countIndexedDomains } from "../services/domainService.js";

export const adminRouter = Router();

adminRouter.post('/admin/refresh-lists', adminGuard, async (_req, res) => {
  try {
    const loaded = await loadDemoLists();
    await prisma.cachedList.deleteMany({});
    for (const list of loaded) {
      await prisma.cachedList.create({ data: list });
    }
    res.json({ ok: true, sources: loaded.map((list) => list.source) });
  } catch (error) {
    return problem(res, 500, 'Failed to refresh lists', error instanceof Error ? error.message : undefined);
  }
});

/**
 * Admin bulk scan endpoint - NO RATE LIMITING
 *
 * POST /admin/bulk-scan
 * Headers: X-Admin-Key: <ADMIN_API_KEY>
 * Body: { urls: string[] } (max 100 URLs per request)
 *
 * Returns: { batchId, queued, skipped, errors }
 */
const BulkScanSchema = z.object({
  urls: z.array(z.string()).min(1).max(100),
  skipExisting: z.boolean().optional().default(true), // Skip URLs scanned in last 24h
});

adminRouter.post('/admin/bulk-scan', adminGuard, async (req, res) => {
  const parsed = BulkScanSchema.safeParse(req.body);

  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { urls, skipExisting } = parsed.data;
  const batchId = createId();
  const results = {
    batchId,
    queued: [] as { url: string; scanId: string; slug: string }[],
    skipped: [] as { url: string; reason: string; existingScanId?: string }[],
    errors: [] as { url: string; error: string }[],
  };

  // Check for recent scans if skipExisting is true
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const url of urls) {
    try {
      // Normalize URL
      let normalized: URL;
      try {
        normalized = normalizeUrl(url);
      } catch (e) {
        results.errors.push({ url, error: `Invalid URL: ${e instanceof Error ? e.message : 'parse error'}` });
        continue;
      }

      // Check for existing recent scan
      if (skipExisting) {
        const existing = await prisma.scan.findFirst({
          where: {
            normalizedInput: normalized.href,
            createdAt: { gte: twentyFourHoursAgo },
            status: { in: ['done', 'queued', 'running'] },
          },
          select: { id: true, slug: true, status: true },
        });

        if (existing) {
          results.skipped.push({
            url,
            reason: `Already scanned (${existing.status})`,
            existingScanId: existing.id,
          });
          continue;
        }
      }

      // Create scan record
      const scan = await createScanWithSlug(prisma, {
        targetType: 'url',
        input: url,
        normalizedInput: normalized.href,
        status: 'queued',
        progress: 0,
        source: 'admin_bulk',
        scannerIp: req.ip || 'admin',
        meta: { batchId, adminBulk: true },
      });

      // Queue the job
      await addScanJob(
        'scan-url',
        {
          scanId: scan.id,
          url: normalized.href,
          normalizedInput: normalized.href,
          requestId: res.locals.requestId || batchId,
          batchId,
        },
        {
          priority: SCAN_PRIORITY.NORMAL,
          scanComplexity: 'simple',
          isRetry: false,
          requestId: res.locals.requestId || batchId,
        }
      );

      results.queued.push({
        url,
        scanId: scan.id,
        slug: scan.slug,
      });

    } catch (error) {
      logger.error({ error, url, batchId }, 'Failed to queue bulk scan URL');
      results.errors.push({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info({
    batchId,
    total: urls.length,
    queued: results.queued.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
  }, 'Admin bulk scan completed');

  res.json({
    batchId,
    total: urls.length,
    queued: results.queued.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
    details: results,
  });
});

/**
 * Get admin bulk scan batch status
 *
 * GET /admin/bulk-scan/:batchId
 * Headers: X-Admin-Key: <ADMIN_API_KEY>
 */
adminRouter.get('/admin/bulk-scan/:batchId', adminGuard, async (req, res) => {
  const { batchId } = req.params;

  const scans = await prisma.scan.findMany({
    where: {
      meta: {
        path: ['batchId'],
        equals: batchId,
      },
    },
    select: {
      id: true,
      slug: true,
      input: true,
      status: true,
      score: true,
      label: true,
      createdAt: true,
      finishedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (scans.length === 0) {
    return problem(res, 404, 'Batch not found');
  }

  const statusCounts = {
    total: scans.length,
    done: scans.filter(s => s.status === 'done').length,
    error: scans.filter(s => s.status === 'error').length,
    running: scans.filter(s => s.status === 'running').length,
    queued: scans.filter(s => s.status === 'queued').length,
  };

  res.json({
    batchId,
    ...statusCounts,
    isComplete: statusCounts.done + statusCounts.error === statusCounts.total,
    scans: scans.map(s => ({
      scanId: s.id,
      slug: s.slug,
      url: s.input,
      status: s.status,
      score: s.score,
      label: s.label,
    })),
  });
});

/**
 * Backfill Domain table from existing scans
 * This populates the Domain table for all unique domains from completed scans,
 * enabling sitemap generation for SEO.
 *
 * POST /admin/backfill-domains
 * Headers: X-Admin-Key: <ADMIN_API_KEY>
 */
adminRouter.post('/admin/backfill-domains', adminGuard, async (_req, res) => {
  try {
    // Get initial stats
    const initialDomainCount = await countIndexedDomains(prisma);
    const totalScans = await prisma.scan.count({ where: { status: 'done' } });

    logger.info({
      initialDomainCount,
      totalScans,
    }, 'Starting domain backfill');

    // Run the backfill
    const result = await backfillDomainsFromScans(prisma, (progress) => {
      logger.info(progress, 'Domain backfill progress');
    });

    // Get final stats
    const finalDomainCount = await countIndexedDomains(prisma);

    logger.info({
      ...result,
      initialDomainCount,
      finalDomainCount,
      netIncrease: finalDomainCount - initialDomainCount,
    }, 'Domain backfill completed');

    res.json({
      success: true,
      before: {
        domainCount: initialDomainCount,
        totalScans,
      },
      after: {
        domainCount: finalDomainCount,
      },
      stats: {
        uniqueDomains: result.uniqueDomains,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
      },
      netIncrease: finalDomainCount - initialDomainCount,
    });
  } catch (error) {
    logger.error({ error }, 'Domain backfill failed');
    return problem(res, 500, 'Backfill failed', error instanceof Error ? error.message : undefined);
  }
});

/**
 * Get domain backfill status/preview
 * Shows the gap between scans and domains before running backfill.
 *
 * GET /admin/backfill-domains/status
 * Headers: X-Admin-Key: <ADMIN_API_KEY>
 */
adminRouter.get('/admin/backfill-domains/status', adminGuard, async (_req, res) => {
  try {
    const [totalScans, domainCount, uniqueInputs] = await Promise.all([
      prisma.scan.count({ where: { status: 'done' } }),
      countIndexedDomains(prisma),
      prisma.scan.groupBy({
        by: ['normalizedInput'],
        where: {
          status: 'done',
          normalizedInput: { not: null },
        },
        _count: true,
      }),
    ]);

    const uniqueDomains = uniqueInputs.length;
    const missingDomains = uniqueDomains - domainCount;

    res.json({
      totalScans,
      currentDomainRecords: domainCount,
      uniqueDomainsInScans: uniqueDomains,
      estimatedMissing: missingDomains > 0 ? missingDomains : 0,
      sitemapCoverage: domainCount > 0 ? `${((domainCount / uniqueDomains) * 100).toFixed(1)}%` : '0%',
      recommendation: missingDomains > 0
        ? `Run POST /api/admin/backfill-domains to add ~${missingDomains} domains to sitemap`
        : 'Domain table is up to date',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get backfill status');
    return problem(res, 500, 'Failed to get status', error instanceof Error ? error.message : undefined);
  }
});

// =============================================================================
// SCAN QUEUE MANAGEMENT (100k bulk scanning)
// =============================================================================

/**
 * Import domains into ScanQueue
 * POST /admin/scan-queue/import
 *
 * Body: { domains: string[], source?: string, startRank?: number }
 */
const ImportQueueSchema = z.object({
  domains: z.array(z.string()).min(1).max(10000), // Max 10k per request
  source: z.string().optional().default('manual'),
  startRank: z.number().optional().default(1),
  skipExistingScans: z.boolean().optional().default(true), // Skip domains already scanned
});

adminRouter.post('/admin/scan-queue/import', adminGuard, async (req, res) => {
  const parsed = ImportQueueSchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { domains, source, startRank, skipExistingScans } = parsed.data;
  const batchId = createId();

  const results = {
    batchId,
    imported: 0,
    skippedDuplicate: 0,
    skippedScanned: 0,
    errors: [] as { domain: string; error: string }[],
  };

  // Get existing domains in queue
  const existingQueue = await prisma.scanQueue.findMany({
    where: { domain: { in: domains } },
    select: { domain: true },
  });
  const existingQueueSet = new Set(existingQueue.map(d => d.domain));

  // Get already scanned domains if skipExistingScans is true
  let scannedDomainsSet = new Set<string>();
  if (skipExistingScans) {
    const scannedDomains = await prisma.domain.findMany({
      where: { domain: { in: domains } },
      select: { domain: true },
    });
    scannedDomainsSet = new Set(scannedDomains.map(d => d.domain));
  }

  // Calculate priority based on rank (higher rank = higher priority)
  // Top 10k: priority 100-90, Next 10k: 89-80, etc.
  const getPriority = (rank: number) => {
    const tier = Math.floor(rank / 10000);
    return Math.max(0, 100 - tier * 10);
  };

  // Import domains
  const toImport = [];
  let currentRank = startRank;

  for (const domain of domains) {
    const normalized = domain.toLowerCase().trim();

    if (!normalized || normalized.length < 3) {
      results.errors.push({ domain, error: 'Invalid domain' });
      continue;
    }

    if (existingQueueSet.has(normalized)) {
      results.skippedDuplicate++;
      currentRank++;
      continue;
    }

    if (scannedDomainsSet.has(normalized)) {
      results.skippedScanned++;
      currentRank++;
      continue;
    }

    toImport.push({
      domain: normalized,
      status: 'PENDING' as ScanQueueStatus,
      priority: getPriority(currentRank),
      source,
      sourceRank: currentRank,
      batchId,
    });

    currentRank++;
  }

  // Batch insert
  if (toImport.length > 0) {
    try {
      const result = await prisma.scanQueue.createMany({
        data: toImport,
        skipDuplicates: true, // Safety net
      });
      results.imported = result.count;
    } catch (error) {
      logger.error({ error, batchId }, 'Failed to import scan queue');
      return problem(res, 500, 'Import failed', error instanceof Error ? error.message : undefined);
    }
  }

  logger.info({
    ...results,
    source,
    total: domains.length,
  }, 'Scan queue import completed');

  res.json({
    success: true,
    total: domains.length,
    ...results,
  });
});

/**
 * Get scan queue statistics
 * GET /admin/scan-queue/stats
 */
adminRouter.get('/admin/scan-queue/stats', adminGuard, async (_req, res) => {
  try {
    const [statusCounts, sourceCounts, totalScanned] = await Promise.all([
      prisma.scanQueue.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.scanQueue.groupBy({
        by: ['source'],
        _count: true,
      }),
      prisma.domain.count(),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = row._count;
    }

    const sourceMap: Record<string, number> = {};
    for (const row of sourceCounts) {
      sourceMap[row.source ?? 'unknown'] = row._count;
    }

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const pending = statusMap['PENDING'] ?? 0;
    const queued = statusMap['QUEUED'] ?? 0;
    const success = statusMap['SUCCESS'] ?? 0;
    const failed = statusMap['FAILED'] ?? 0;
    const blocked = statusMap['BLOCKED'] ?? 0;
    const timeout = statusMap['TIMEOUT'] ?? 0;
    const invalid = statusMap['INVALID'] ?? 0;

    res.json({
      queue: {
        total,
        pending,
        queued,
        success,
        failed,
        blocked,
        timeout,
        invalid,
        progress: total > 0 ? `${((success / total) * 100).toFixed(1)}%` : '0%',
      },
      sources: sourceMap,
      database: {
        totalScannedDomains: totalScanned,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get scan queue stats');
    return problem(res, 500, 'Failed to get stats', error instanceof Error ? error.message : undefined);
  }
});

/**
 * Process batch from scan queue
 * POST /admin/scan-queue/process
 *
 * Body: { batchSize?: number, maxRetries?: number }
 */
const ProcessQueueSchema = z.object({
  batchSize: z.number().min(1).max(100).optional().default(50),
  maxRetries: z.number().min(1).max(5).optional().default(3),
});

adminRouter.post('/admin/scan-queue/process', adminGuard, async (req, res) => {
  const parsed = ProcessQueueSchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { batchSize, maxRetries } = parsed.data;
  const processBatchId = createId();

  // Get next batch of domains to process (prioritized)
  const toProcess = await prisma.scanQueue.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        {
          status: 'TIMEOUT',
          attemptCount: { lt: maxRetries },
        },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { sourceRank: 'asc' },
    ],
    take: batchSize,
  });

  if (toProcess.length === 0) {
    return res.json({
      success: true,
      message: 'No domains to process',
      queued: 0,
    });
  }

  const results = {
    processBatchId,
    queued: [] as { domain: string; scanId: string }[],
    errors: [] as { domain: string; error: string }[],
  };

  for (const item of toProcess) {
    try {
      const url = `https://${item.domain}`;
      const normalized = normalizeUrl(url);

      // Create scan record
      const scan = await createScanWithSlug(prisma, {
        targetType: 'url',
        input: url,
        normalizedInput: normalized.href,
        status: 'queued',
        progress: 0,
        source: 'scan_queue',
        scannerIp: 'admin',
        meta: { queueId: item.id, processBatchId },
      });

      // Queue the job
      await addScanJob(
        'scan-url',
        {
          scanId: scan.id,
          url: normalized.href,
          normalizedInput: normalized.href,
          requestId: processBatchId,
          queueItemId: item.id, // Track queue item for status update
        },
        {
          priority: SCAN_PRIORITY.NORMAL,
          scanComplexity: 'simple',
          isRetry: item.attemptCount > 0,
          requestId: processBatchId,
        }
      );

      // Update queue item
      await prisma.scanQueue.update({
        where: { id: item.id },
        data: {
          status: 'QUEUED',
          lastAttempt: new Date(),
          attemptCount: { increment: 1 },
          scanId: scan.id,
        },
      });

      results.queued.push({ domain: item.domain, scanId: scan.id });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await prisma.scanQueue.update({
        where: { id: item.id },
        data: {
          status: 'INVALID',
          lastAttempt: new Date(),
          attemptCount: { increment: 1 },
          lastError: errorMsg,
        },
      });

      results.errors.push({ domain: item.domain, error: errorMsg });
    }
  }

  logger.info({
    processBatchId,
    requested: batchSize,
    found: toProcess.length,
    queued: results.queued.length,
    errors: results.errors.length,
  }, 'Scan queue batch processed');

  res.json({
    success: true,
    processBatchId,
    queued: results.queued.length,
    errors: results.errors.length,
    details: results,
  });
});

/**
 * Reset failed/blocked items for retry
 * POST /admin/scan-queue/reset
 *
 * Body: { statuses?: string[], olderThanHours?: number }
 */
const ResetQueueSchema = z.object({
  statuses: z.array(z.enum(['FAILED', 'BLOCKED', 'TIMEOUT', 'INVALID'])).optional(),
  olderThanHours: z.number().min(1).optional().default(24),
});

adminRouter.post('/admin/scan-queue/reset', adminGuard, async (req, res) => {
  const parsed = ResetQueueSchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { statuses, olderThanHours } = parsed.data;
  const statusesToReset = statuses ?? ['TIMEOUT']; // Only reset timeouts by default

  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

  const result = await prisma.scanQueue.updateMany({
    where: {
      status: { in: statusesToReset as ScanQueueStatus[] },
      lastAttempt: { lt: cutoff },
    },
    data: {
      status: 'PENDING',
    },
  });

  logger.info({
    statuses: statusesToReset,
    olderThanHours,
    reset: result.count,
  }, 'Scan queue items reset');

  res.json({
    success: true,
    reset: result.count,
    statuses: statusesToReset,
    olderThanHours,
  });
});

/**
 * Get queue items by status (for debugging)
 * GET /admin/scan-queue/items?status=FAILED&limit=100
 */
adminRouter.get('/admin/scan-queue/items', adminGuard, async (req, res) => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const offset = parseInt(req.query.offset as string) || 0;

  const where = status ? { status: status as ScanQueueStatus } : {};

  const [items, total] = await Promise.all([
    prisma.scanQueue.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { sourceRank: 'asc' },
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        domain: true,
        status: true,
        priority: true,
        source: true,
        sourceRank: true,
        attemptCount: true,
        lastAttempt: true,
        lastError: true,
        scanId: true,
        score: true,
      },
    }),
    prisma.scanQueue.count({ where }),
  ]);

  res.json({
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  });
});

// =============================================================================
// QUEUE CONTROL (pause/resume for maintenance)
// =============================================================================

/**
 * Pause the BullMQ scan queue
 * POST /admin/queue/pause
 *
 * Workers will finish current jobs but won't pick up new ones
 */
adminRouter.post('/admin/queue/pause', adminGuard, async (_req, res) => {
  try {
    const wasPaused = await isQueuePaused();
    if (wasPaused) {
      return res.json({
        success: true,
        message: 'Queue was already paused',
        paused: true,
      });
    }

    await pauseQueue();

    logger.info('Admin paused scan queue');

    res.json({
      success: true,
      message: 'Queue paused successfully. Workers will finish current jobs but won\'t pick up new ones.',
      paused: true,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to pause queue');
    return problem(res, 500, 'Failed to pause queue', error instanceof Error ? error.message : undefined);
  }
});

/**
 * Resume the BullMQ scan queue
 * POST /admin/queue/resume
 */
adminRouter.post('/admin/queue/resume', adminGuard, async (_req, res) => {
  try {
    const wasPaused = await isQueuePaused();
    if (!wasPaused) {
      return res.json({
        success: true,
        message: 'Queue was already running',
        paused: false,
      });
    }

    await resumeQueue();

    logger.info('Admin resumed scan queue');

    res.json({
      success: true,
      message: 'Queue resumed successfully. Workers will start picking up jobs.',
      paused: false,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to resume queue');
    return problem(res, 500, 'Failed to resume queue', error instanceof Error ? error.message : undefined);
  }
});

/**
 * Get queue status including pause state and metrics
 * GET /admin/queue/status
 */
adminRouter.get('/admin/queue/status', adminGuard, async (_req, res) => {
  try {
    const [paused, metrics] = await Promise.all([
      isQueuePaused(),
      getQueueMetrics(),
    ]);

    res.json({
      paused,
      metrics,
      message: paused
        ? 'Queue is PAUSED - workers are not picking up new jobs'
        : 'Queue is RUNNING - workers are processing jobs normally',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get queue status');
    return problem(res, 500, 'Failed to get queue status', error instanceof Error ? error.message : undefined);
  }
});
