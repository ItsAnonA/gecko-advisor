/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { normalizeUrl } from "@gecko-advisor/shared";
import { adminGuard } from "../middleware/admin.js";
import { loadDemoLists } from "../lists.js";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { addScanJob, SCAN_PRIORITY } from "../queue.js";
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
        source: 'admin-bulk',
        scannerIp: req.ip || 'admin',
        isPublic: true,
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
