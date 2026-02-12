// SPDX-License-Identifier: MIT
import { Router } from "express";
import { z } from "zod";
import {
  UrlScanRequestSchema,
  AppScanRequestSchema,
  AddressScanRequestSchema,
  ScanQueuedResponseSchema,
  normalizeUrl,
  isBlockedDomain,
  getBlockReason,
} from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { scanQueue } from "../queue.js";
import { createScanWithSlug } from "../services/slug.js";
import { findReusableScan } from "../services/dedupe.js";
import { logger } from "../logger.js";
import { config } from "../config.js";
import { requireTurnstile } from "../middleware/turnstile.js";
import { scanRateLimiter, rateLimitService } from "../middleware/scanRateLimit.js";

const UrlScanBodySchema = UrlScanRequestSchema.extend({
  force: z.boolean().optional(),
});

const CachedResponseSchema = ScanQueuedResponseSchema.extend({
  deduped: z.literal(true),
});

const mapToLegacyQueued = (payload: z.infer<typeof ScanQueuedResponseSchema>) => ({
  scanId: payload.scanId,
  reportSlug: payload.slug,
});

export const scanV1Router = Router();

scanV1Router.post(['/', '/url'], requireTurnstile, scanRateLimiter, async (req, res) => {
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

  // Check blocklist - reject adult content domains
  const hostname = normalized.hostname;
  if (isBlockedDomain(hostname)) {
    const reason = getBlockReason(hostname);
    logger.info({ hostname, reason, ip: req.ip }, 'Blocked domain scan attempt (v1)');
    return problem(res, 403, 'Domain Blocked', 'This domain cannot be scanned due to content policy.');
  }

  const normalizedInput = normalized.toString();

  if (!force) {
    const cached = await findReusableScan(prisma, normalizedInput);
    if (cached) {
      logger.info({ scanId: cached.id, requestId: res.locals.requestId }, 'Reusing cached scan result (v1)');
      const body = CachedResponseSchema.parse({
        scanId: cached.id,
        slug: cached.slug,
        deduped: true,
      });
      return res.json({ ...mapToLegacyQueued(body), deduped: true });
    }
  }

  try {
    const scan = await createScanWithSlug(prisma, {
      targetType: 'url',
      input: url,
      normalizedInput,
      status: 'queued',
      progress: 0,
      source: force ? 'manual_force' : 'manual',
    });

    await scanQueue.add(
      'scan-url',
      {
        scanId: scan.id,
        url: normalized.href,
        normalizedInput,
        requestId: res.locals.requestId,
      },
      {
        jobId: scan.id,
        attempts: config.workerAttempts,
        backoff: {
          type: 'exponential',
          delay: config.workerBackoffMs,
        },
        removeOnComplete: config.nodeEnv === 'development' ? false : 100,
        removeOnFail: config.nodeEnv === 'development' ? false : 200,
      }
    );

    // Increment rate limit counter after successful queue
    const identifier = req.ip || 'unknown';
    await rateLimitService.incrementScan(identifier);

    const response = mapToLegacyQueued(ScanQueuedResponseSchema.parse({
      scanId: scan.id,
      slug: scan.slug,
    }));

    res.status(202).json(response);
  } catch (error) {
    logger.error({ error, requestId: res.locals.requestId }, 'Failed to enqueue scan (v1)');
    return problem(res, 500, 'Unable to queue scan');
  }
});

scanV1Router.get('/:id/status', async (req, res) => {
  const scan = await prisma.scan.findUnique({ where: { id: req.params.id } });
  if (!scan) {
    return problem(res, 404, 'Scan not found');
  }

  res.json({
    status: scan.status,
    score: scan.score ?? undefined,
    label: scan.label ?? undefined,
    reportSlug: scan.slug,
    updatedAt: scan.updatedAt,
  });
});

scanV1Router.post('/app', async (req, res) => {
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
    label: 'Moderate Privacy Risk',
    summary: 'App scan stubbed. Detailed analysis coming soon.',
  });
  res.json(mapToLegacyQueued(ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug })));
});

scanV1Router.post('/address', async (req, res) => {
  const parsed = AddressScanRequestSchema.safeParse(req.body);
  if (!parsed.success) return problem(res, 400, 'Invalid Request', parsed.error.flatten());
  const scan = await createScanWithSlug(prisma, {
    targetType: 'address',
    input: parsed.data.address,
    status: 'done',
    progress: 100,
    source: 'stub',
    score: 80,
    label: 'Low Privacy Risk',
    summary: 'Address reputation stubbed. Detailed analysis coming soon.',
    meta: { chain: parsed.data.chain },
  });
  res.json(mapToLegacyQueued(ScanQueuedResponseSchema.parse({ scanId: scan.id, slug: scan.slug })));
});
