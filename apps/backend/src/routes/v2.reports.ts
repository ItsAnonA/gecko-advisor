// SPDX-License-Identifier: MIT
import { Router } from "express";
import { buildReportPayload, etldPlusOne, isBlockedDomain } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";
import { getReportDownloadUrl, getReportFromStorage } from "../services/reportArchive.js";
import { createAnalyticsService } from "../services/analyticsService.js";

// Create analytics service instance
const analyticsService = createAnalyticsService(prisma);

/**
 * Enrich report payload with benchmark data for SEO content
 */
async function enrichReportWithBenchmarks(payload: ReturnType<typeof buildReportPayload>) {
  try {
    const score = payload.scan.score;
    const trackerCount = payload.meta.trackerCount;
    const cookieCount = payload.meta.cookieCount;

    // Skip enrichment if no score (incomplete scan)
    if (score === null || score === undefined) {
      return payload;
    }

    // Get benchmark comparison and insights in parallel
    const [benchmarks, globalBenchmarks, trackerInsights] = await Promise.all([
      analyticsService.compareToBenchmarks(score, trackerCount, cookieCount),
      analyticsService.getGlobalBenchmarks(),
      analyticsService.getTrackerInsights(
        payload.evidence
          .filter(e => e.kind === 'tracker')
          .map(e => {
            const details = e.details as { domain?: string };
            return details?.domain ?? '';
          })
          .filter(Boolean)
      ),
    ]);

    // Add benchmark data to meta
    return {
      ...payload,
      meta: {
        ...payload.meta,
        benchmarks,
        trackerInsights,
        globalBenchmarks: {
          totalDomains: globalBenchmarks.totalDomains,
          averageScore: globalBenchmarks.averageScore,
          medianScore: globalBenchmarks.medianScore,
          averageTrackerCount: globalBenchmarks.averageTrackerCount,
          averageCookieCount: globalBenchmarks.averageCookieCount,
        },
      },
    };
  } catch (error) {
    // Log but don't fail - benchmarks are optional enhancement
    logger.warn({ error }, 'Failed to enrich report with benchmarks');
    return payload;
  }
}

/**
 * Extract domain from URL for blocklist checking
 */
function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const reportV2Router = Router();

reportV2Router.get(['/report/:slug', '/r/:slug'], async (req, res) => {
  try {
    const slug = req.params.slug;

    // First, get minimal scan info to get the scanId for Object Storage lookup
    const scanInfo = await prisma.scan.findUnique({
      where: { slug },
      select: { id: true, status: true, input: true },
    });

    if (!scanInfo) {
      return problem(res, 404, 'Report not found');
    }

    // Return 410 Gone for blocked domains (adult content)
    // This helps Google de-index these pages faster
    const domain = getDomainFromUrl(scanInfo.input);
    if (isBlockedDomain(domain)) {
      logger.info({ slug, domain }, 'Blocked domain report requested - returning 410 Gone');
      res.status(410).json({
        type: 'gone',
        status: 410,
        title: 'Report Removed',
        detail: 'This report has been removed due to content policy.',
      });
      return;
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

    const basePayload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });

    // Enrich with benchmark data for SEO
    const payload = await enrichReportWithBenchmarks(basePayload);

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

    const basePayload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });

    // Enrich with benchmark data for SEO
    const payload = await enrichReportWithBenchmarks(basePayload);

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

        return scans
          .map((scan) => {
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
          })
          // Filter out blocked domains from recent reports list
          .filter((item) => !isBlockedDomain(item.domain));
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

    const items = scans
      .map((scan) => {
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
      })
      // Filter out blocked domains from reports list
      .filter((item) => !isBlockedDomain(item.domain));

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

    const items = scans
      .map((scan) => {
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
      })
      // Filter out blocked domains from reports list
      .filter((item) => !isBlockedDomain(item.domain));

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

    // Return 410 Gone for blocked domains (adult content)
    if (isBlockedDomain(domain)) {
      logger.info({ domain }, 'Blocked domain report requested - returning 410 Gone');
      res.status(410).json({
        type: 'gone',
        status: 410,
        title: 'Report Removed',
        detail: 'This report has been removed due to content policy.',
      });
      return;
    }

    // Find the most recent completed scan for this domain (exact match only)
    const scan = await prisma.scan.findFirst({
      where: {
        status: 'done',
        OR: [
          { normalizedInput: { equals: domain, mode: 'insensitive' } },
          { input: { equals: domain, mode: 'insensitive' } },
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

    const basePayload = buildReportPayload(scan, {
      evidence: scan.evidence ?? [],
      issues: scan.issues ?? [],
    });

    // Enrich with benchmark data for SEO
    const payload = await enrichReportWithBenchmarks(basePayload);

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
    const limit = Math.min(10000, Math.max(1, parseInt(req.query.limit as string) || 100));

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

    const domains = scans
      .map((scan) => {
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
      })
      // Filter out blocked domains from sitemap/indexable list
      .filter((item) => !isBlockedDomain(item.domain));

    res.json({ domains });
  } catch (error) {
    logger.error({ error }, 'Error fetching indexable domains');
    return problem(res, 500, 'Failed to get domains');
  }
});

// Analytics endpoint - global benchmarks for market analysis
reportV2Router.get('/analytics/benchmarks', async (_req, res) => {
  try {
    const benchmarks = await analyticsService.getGlobalBenchmarks();
    res.json(benchmarks);
  } catch (error) {
    logger.error({ error }, 'Error fetching analytics benchmarks');
    return problem(res, 500, 'Failed to load benchmarks');
  }
});

// Analytics endpoint - compare a score to benchmarks
reportV2Router.get('/analytics/compare', async (req, res) => {
  try {
    const score = parseInt(req.query.score as string);
    const trackers = parseInt(req.query.trackers as string) || 0;
    const cookies = parseInt(req.query.cookies as string) || 0;

    if (isNaN(score) || score < 0 || score > 100) {
      return problem(res, 400, 'Invalid score parameter (must be 0-100)');
    }

    const comparison = await analyticsService.compareToBenchmarks(score, trackers, cookies);
    res.json(comparison);
  } catch (error) {
    logger.error({ error }, 'Error comparing to benchmarks');
    return problem(res, 500, 'Failed to compare benchmarks');
  }
});

// Admin endpoint - refresh analytics cache
reportV2Router.post('/analytics/refresh', async (req, res) => {
  try {
    // Simple admin key check (should be replaced with proper auth in production)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return problem(res, 401, 'Unauthorized');
    }

    await analyticsService.refreshCache();
    res.json({ success: true, message: 'Analytics cache refreshed' });
  } catch (error) {
    logger.error({ error }, 'Error refreshing analytics cache');
    return problem(res, 500, 'Failed to refresh cache');
  }
});
