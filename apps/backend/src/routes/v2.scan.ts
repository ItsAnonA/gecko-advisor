// SPDX-License-Identifier: MIT
import { Router } from "express";
import { z } from "zod";
import {
  UrlScanRequestSchema,
  AppScanRequestSchema,
  AddressScanRequestSchema,
  ScanQueuedResponseSchema,
  normalizeUrl,
} from "@privacy-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { addScanJob, SCAN_PRIORITY, scanQueue } from "../queue.js";
import { createScanWithSlug } from "../services/slug.js";
import { findReusableScan } from "../services/dedupe.js";
import { logger } from "../logger.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";
import { requireTurnstile } from "../middleware/turnstile.js";

const UrlScanBodySchema = UrlScanRequestSchema.extend({
  force: z.boolean().optional(),
});

const CachedResponseSchema = ScanQueuedResponseSchema.extend({
  deduped: z.literal(true),
});

export const scanV2Router = Router();

scanV2Router.post(['/', '/url'], requireTurnstile, async (req, res) => {
  const parsed = UrlScanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  }

  const { url, force } = parsed.data;

  let normalized: URL;
  try {
    normalized = normalizeUrl(url);
  } catch (error) {
    return problem(res, 400, 'Invalid URL', error instanceof Error ? error.message : 'Unable to parse URL');
  }

  const normalizedInput = normalized.toString();

  if (!force) {
    const cached = await findReusableScan(prisma, normalizedInput);
    if (cached) {
      logger.info({ scanId: cached.id, requestId: res.locals.requestId }, 'Reusing cached scan result');
      const body = CachedResponseSchema.parse({
        scanId: cached.id,
        slug: cached.slug,
        deduped: true,
      });
      return res.json(body);
    }
  }

  try {
    // Prepare scan data - no user tracking
    // All scans are public and free - no PRO tier
    const scanData = {
      targetType: 'url',
      input: url,
      normalizedInput,
      status: 'queued',
      progress: 0,
      source: force ? 'manual-force' : 'manual',
      // No user tracking for scan history
      userId: null,
      scannerIp: req.ip || null,
      // All scans are public (100% free, no PRO tier)
      isPublic: true,
      isProScan: false,
    };

    const scan = await createScanWithSlug(prisma, scanData);

    await addScanJob(
      'scan-url',
      {
        scanId: scan.id,
        url: normalized.href,
        normalizedInput,
        requestId: res.locals.requestId,
      },
      {
        priority: force ? SCAN_PRIORITY.URGENT : SCAN_PRIORITY.NORMAL,
        scanComplexity: 'simple',
        isRetry: false,
        requestId: res.locals.requestId,
      }
    );

    const response = ScanQueuedResponseSchema.parse({
      scanId: scan.id,
      slug: scan.slug,
    });

    res.status(202).json(response);
  } catch (error) {
    logger.error({ error, requestId: res.locals.requestId }, 'Failed to enqueue scan');
    return problem(res, 500, 'Unable to queue scan');
  }
});

scanV2Router.get('/:id/status', async (req, res) => {
  const scanId = req.params.id;

  const cacheKey = CACHE_KEYS.SCAN_STATUS(scanId);

  let scanData = await CacheService.get<{
    id: string;
    status: string;
    score: number | null;
    label: string | null;
    slug: string | null;
    updatedAt: Date;
    progress: number | null;
  }>(cacheKey);

  if (!scanData) {
    scanData = await prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        status: true,
        score: true,
        label: true,
        slug: true,
        updatedAt: true,
        progress: true,
      },
    });

    if (!scanData) {
      return problem(res, 404, 'Scan not found');
    }

    if (scanData.status === 'done' || scanData.status === 'error') {
      await CacheService.set(cacheKey, scanData, CACHE_TTL.SCAN_STATUS);
    } else {
      await CacheService.del(cacheKey);
    }
  }

  let progress = scanData.progress ?? 0;

  if (scanData.status === 'queued' || scanData.status === 'running') {
    await CacheService.del(cacheKey);
    try {
      const job = await scanQueue.getJob(scanId);
      if (job) {
        const rawJobProgress = job.progress as number | Record<string, unknown> | undefined;
        const jobProgress = typeof rawJobProgress === 'number' ? rawJobProgress : undefined;
        if (typeof jobProgress === 'number') {
          progress = jobProgress;
          if (scanData.progress !== jobProgress) {
            await prisma.scan.update({
              where: { id: scanId },
              data: { progress: jobProgress },
            }).catch((error) => {
              logger.debug({ error, scanId, jobProgress }, 'Failed to persist live progress');
            });
            scanData.progress = jobProgress;
          }
        }
      }
    } catch (error) {
      logger.debug({ error, scanId }, 'Failed to fetch queue progress');
    }
    progress = Math.max(0, Math.min(progress, 99));
  } else if (scanData.status === 'done') {
    progress = 100;
    if (scanData.progress !== 100) {
      await prisma.scan.update({
        where: { id: scanId },
        data: { progress: 100 },
      }).catch((error) => {
        logger.debug({ error, scanId }, 'Failed to persist final progress');
      });
    }
  } else {
    progress = Math.max(0, Math.min(progress, 100));
  }

  progress = Math.max(0, Math.min(100, Math.round(progress)));

  res.json({
    status: scanData.status,
    progress,
    score: scanData.score ?? undefined,
    label: scanData.label ?? undefined,
    slug: scanData.slug ?? undefined,
    updatedAt: scanData.updatedAt,
  });
});

scanV2Router.post('/app', async (req, res) => {
  const parsed = AppScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());

  const { appId } = parsed.data;
  const scan = await createScanWithSlug(prisma, {
    targetType: 'app',
    input: appId,
    status: 'done',
    progress: 100,
    source: 'stub',
    score: 75,
    label: 'Caution',
    summary: 'App scan stubbed. Detailed analysis coming soon.',
  });
  const response = ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug });
  res.json(response);
});

scanV2Router.post('/address', async (req, res) => {
  const parsed = AddressScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  const scan = await createScanWithSlug(prisma, {
    targetType: 'address',
    input: parsed.data.address,
    status: 'done',
    progress: 100,
    source: 'stub',
    score: 80,
    label: 'Safe',
    summary: 'Address reputation stubbed. Detailed analysis coming soon.',
    meta: { chain: parsed.data.chain },
  });
  const response = ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug });
  res.json(response);
});
