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

// Alias: /reports -> /reports/all (for Next.js SSR compatibility)
reportV2Router.get('/reports', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

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
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching reports');
    return problem(res, 500, 'Failed to load reports');
  }
});

// Get report by domain - finds the most recent completed scan for a domain
reportV2Router.get('/domain/:domain', async (req, res) => {
  try {
    const rawDomain = decodeURIComponent(req.params.domain);

    // Normalize domain (remove protocol, www, trailing slash)
    let domain = rawDomain.toLowerCase().trim();
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      try {
        const url = new URL(domain);
        domain = url.hostname;
      } catch {
        // Keep as-is if URL parsing fails
      }
    }
    domain = domain.replace(/^www\./, '').replace(/\/$/, '');

    // Find the most recent completed scan for this domain
    const scan = await prisma.scan.findFirst({
      where: {
        status: 'done',
        OR: [
          { normalizedInput: { contains: domain, mode: 'insensitive' } },
          { input: { contains: domain, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
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
      return problem(res, 404, 'No report found for this domain');
    }

    const payload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });

    const archive = await getReportDownloadUrl(scan.id);
    res.json(archive ? { ...payload, archive } : payload);
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error fetching report by domain');
    return problem(res, 500, 'Failed to load report');
  }
});

// Indexable domains count for sitemap generation
reportV2Router.get('/domains/indexable-count', async (_req, res) => {
  try {
    const count = await CacheService.getOrSet(
      'indexable_domains_count',
      async () => {
        // Count unique domains with completed scans
        const result = await prisma.scan.groupBy({
          by: ['normalizedInput'],
          where: {
            status: 'done',
            score: { not: null },
          },
          _count: true,
        });
        return result.length;
      },
      300 // 5 minute cache
    );

    res.json({ count });
  } catch (error) {
    logger.error({ error }, 'Error fetching indexable domain count');
    return problem(res, 500, 'Failed to get domain count');
  }
});

// Indexable domains list for sitemap generation (paginated)
reportV2Router.get('/domains/indexable', async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));

    // Get unique domains with their most recent scan date
    const scans = await prisma.scan.findMany({
      where: {
        status: 'done',
        score: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['normalizedInput'],
      skip: offset,
      take: limit,
      select: {
        normalizedInput: true,
        input: true,
        createdAt: true,
      },
    });

    const domains = scans.map((scan) => {
      let domain = scan.normalizedInput || scan.input;
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = etldPlusOne(url.hostname);
      } catch {
        // Keep as-is
      }
      return {
        domain,
        scannedAt: scan.createdAt.toISOString(),
      };
    });

    res.json({ domains });
  } catch (error) {
    logger.error({ error }, 'Error fetching indexable domains');
    return problem(res, 500, 'Failed to get domains');
  }
});
