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
