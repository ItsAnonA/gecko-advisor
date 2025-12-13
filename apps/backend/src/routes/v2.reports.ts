// SPDX-License-Identifier: MIT
import { Router } from "express";
import { buildReportPayload, etldPlusOne } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";
import { getReportDownloadUrl, getReportFromStorage } from "../services/reportArchive.js";

export const reportV2Router = Router();

reportV2Router.get(['/report/:slug', '/r/:slug'], async (req, res) => {
  try {
    const slug = req.params.slug;

    // First, get minimal scan info to get the scanId for Object Storage lookup
    const scanInfo = await prisma.scan.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!scanInfo) {
      return problem(res, 404, 'Report not found');
    }

    // Try Object Storage first (faster, reduces DB load)
    const cachedReport = await getReportFromStorage(scanInfo.id);
    if (cachedReport) {
      const archive = await getReportDownloadUrl(scanInfo.id);
      return res.json(archive ? { ...cachedReport, archive } : cachedReport);
    }

    // Fallback to database if not in Object Storage
    logger.debug({ slug, scanId: scanInfo.id }, 'Report not in Object Storage, fetching from DB');
    const scan = await prisma.scan.findUnique({
      where: { slug },
      include: {
        evidence: {
          orderBy: { createdAt: 'asc' },
        },
        issues: {
          orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!scan) {
      return problem(res, 404, 'Report not found');
    }

    const payload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });

    const archive = await getReportDownloadUrl(scan.id);
    res.json(archive ? { ...payload, archive } : payload);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error fetching report');
    return problem(res, 500, 'Failed to load report');
  }
});

reportV2Router.get('/scan/:id', async (req, res) => {
  try {
    const scanId = req.params.id;

    // Try Object Storage first (faster, reduces DB load)
    const cachedReport = await getReportFromStorage(scanId);
    if (cachedReport) {
      const archive = await getReportDownloadUrl(scanId);
      return res.json(archive ? { ...cachedReport, archive } : cachedReport);
    }

    // Fallback to database if not in Object Storage
    logger.debug({ scanId }, 'Report not in Object Storage, fetching from DB');
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        evidence: {
          orderBy: { createdAt: 'asc' },
        },
        issues: {
          orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!scan) {
      return problem(res, 404, 'Scan not found');
    }

    const payload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });
    const archive = await getReportDownloadUrl(scan.id);
    res.json(archive ? { ...payload, archive } : payload);
  } catch (error) {
    logger.error({ error, scanId: req.params.id }, 'Error fetching scan report');
    return problem(res, 500, 'Failed to load scan report');
  }
});

reportV2Router.get('/reports/recent', async (_req, res) => {
  try {
    const items = await CacheService.getOrSet(
      CACHE_KEYS.RECENT_REPORTS,
      async () => {
        const scans = await prisma.scan.findMany({
          where: { status: 'done' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            slug: true,
            input: true,
            score: true,
            label: true,
            createdAt: true,
            _count: {
              select: {
                evidence: true,
              },
            },
          },
        });

        return scans.map((scan) => {
          let domain = scan.input;
          try {
            const url = new URL(scan.input);
            domain = etldPlusOne(url.hostname);
          } catch {
            // ignore
          }
          return {
            slug: scan.slug,
            score: scan.score ?? 0,
            label: scan.label ?? 'Moderate Privacy Risk',
            domain,
            createdAt: scan.createdAt,
            evidenceCount: scan._count.evidence,
          };
        });
      },
      CACHE_TTL.RECENT_REPORTS
    );

    res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching recent reports');
    return problem(res, 500, 'Failed to load recent reports');
  }
});

// Stats endpoint - total scans count for credibility display
reportV2Router.get('/stats', async (_req, res) => {
  try {
    const stats = await CacheService.getOrSet(
      CACHE_KEYS.STATS,
      async () => {
        const totalScans = await prisma.scan.count({
          where: { status: 'done' },
        });
        return { totalScans };
      },
      CACHE_TTL.STATS
    );

    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error fetching stats');
    return problem(res, 500, 'Failed to load stats');
  }
});

// Paginated reports endpoint for ReportsPage
reportV2Router.get('/reports/all', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await prisma.scan.count({
      where: { status: 'done' },
    });

    const scans = await prisma.scan.findMany({
      where: { status: 'done' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        input: true,
        score: true,
        label: true,
        createdAt: true,
        _count: {
          select: {
            evidence: true,
          },
        },
      },
    });

    const items = scans.map((scan) => {
      let domain = scan.input;
      try {
        const url = new URL(scan.input);
        domain = etldPlusOne(url.hostname);
      } catch {
        // ignore
      }
      return {
        slug: scan.slug,
        score: scan.score ?? 0,
        label: scan.label ?? 'Moderate Privacy Risk',
        domain,
        createdAt: scan.createdAt,
        evidenceCount: scan._count.evidence,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching all reports');
    return problem(res, 500, 'Failed to load reports');
  }
});
