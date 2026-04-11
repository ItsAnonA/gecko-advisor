// SPDX-License-Identifier: MIT
import { Router } from "express";
import { buildReportPayload, etldPlusOne, isBlockedDomain, isValidDomain } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";
import { getReportDownloadUrl, getReportFromStorage } from "../services/reportArchive.js";
import { createAnalyticsService } from "../services/analyticsService.js";
import { findLatestScanForDomain, normalizeDomain, buildCategoryContext, getRelatedDomains } from "../services/domainService.js";

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
    const domain = payload.meta.domain;

    // Skip enrichment if no score (incomplete scan)
    if (score === null || score === undefined) {
      return payload;
    }

    // Get benchmark comparison, insights, category context, and related domains in parallel
    const [benchmarks, globalBenchmarks, trackerInsights, categoryContext, relatedDomains] = await Promise.all([
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
      domain ? buildCategoryContext(prisma, domain, score) : null,
      domain && score ? getRelatedDomainsForReport(prisma, domain, score) : [],
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
        categoryContext: categoryContext ?? undefined,
        relatedDomains: relatedDomains.length > 0 ? relatedDomains : undefined,
      },
    };
  } catch (error) {
    // Log but don't fail - benchmarks are optional enhancement
    logger.warn({ error }, 'Failed to enrich report with benchmarks');
    return payload;
  }
}

/**
 * Get related domains for report — ranked by semantic relevance + hierarchy.
 *
 * Two rings of links:
 *   Ring 1 (12): Same category, score-proximate, ranked by relevance
 *   Ring 2 (8):  Lower-tier domains in same category (pushes crawl depth DOWN)
 *
 * Ring 2 ensures links flow top→mid→tail, not just sideways.
 * For Tier A domains: ring 2 pulls from B/C tiers
 * For Tier B domains: ring 2 pulls from C tier
 * For Tier C domains: ring 2 is skipped (no lower tier to link to)
 */
async function getRelatedDomainsForReport(
  prismaClient: typeof prisma,
  domain: string,
  score: number
): Promise<Array<{ domain: string; score: number; categoryName?: string }>> {
  try {
    const normalized = normalizeDomain(domain);

    const domainRecord = await prismaClient.domain.findUnique({
      where: { domain: normalized },
      select: { indexTier: true, category: { select: { id: true, name: true } } },
    });

    if (!domainRecord?.category) {
      return getRelatedDomains(prismaClient, domain, score, 10);
    }

    const categoryId = domainRecord.category.id;
    const currentTier = domainRecord.indexTier;
    const scoreMin = Math.max(20, score - 25);
    const scoreMax = Math.min(100, score + 25);

    // Ring 1: Same-tier or higher, score-proximate (the "sideways" cluster)
    const ring1Promise = prismaClient.domain.findMany({
      where: {
        domain: { not: normalized },
        categoryId,
        isIndexed: true,
        scanCount: { gte: 3 },
        latestScan: { status: 'done', score: { gte: scoreMin, lte: scoreMax } },
      },
      select: {
        domain: true,
        indexTier: true,
        scanCount: true,
        tierScore: true,
        category: { select: { name: true } },
        latestScan: { select: { score: true } },
      },
      orderBy: [{ tierScore: 'desc' }, { scanCount: 'desc' }],
      take: 30,
    });

    // Ring 2: Hierarchical links — flow DOWN for high-tier, flow UP for low-tier
    // Tier A → links to B/C (downward push)
    // Tier B → links to C (downward) + A (upward anchor)
    // Tier C → links to A/B (upward anchor for cluster reciprocity)
    const ring2Tiers: string[] =
      currentTier === 'A' ? ['B', 'C'] :
      currentTier === 'B' ? ['A', 'C'] :
      /* C */ ['A', 'B'];

    const ring2Promise = prismaClient.domain.findMany({
      where: {
        domain: { not: normalized },
        categoryId,
        isIndexed: true,
        indexTier: { in: ring2Tiers as ('A' | 'B' | 'C')[] },
        latestScan: { status: 'done', score: { gte: 30 } },
      },
      select: {
        domain: true,
        indexTier: true,
        scanCount: true,
        tierScore: true,
        category: { select: { name: true } },
        latestScan: { select: { score: true } },
      },
      orderBy: [{ tierScore: 'desc' }, { scanCount: 'desc' }],
      take: 15,
    });

    const [ring1Raw, ring2Raw] = await Promise.all([ring1Promise, ring2Promise]);

    // Rank ring 1 by composite relevance
    const tierWeight: Record<string, number> = { A: 3, B: 2, C: 1 };
    function rankCandidate(d: typeof ring1Raw[number]) {
      const s = d.latestScan?.score ?? 0;
      const scoreDist = Math.abs(s - score);
      const proximity = 1 - Math.min(scoreDist, 25) / 25;
      const authority = (tierWeight[d.indexTier] || 1) / 3;
      const depth = Math.min(d.scanCount / 10, 1);
      return proximity * 0.5 + authority * 0.3 + depth * 0.2;
    }

    const ring1 = ring1Raw
      .filter(d => d.latestScan?.score != null)
      .map(d => ({ ...d, relevance: rankCandidate(d) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 12);

    // Ring 2: dedupe against ring 1, take up to 8
    const ring1Domains = new Set(ring1.map(d => d.domain));
    const ring2 = ring2Raw
      .filter(d => d.latestScan?.score != null && !ring1Domains.has(d.domain))
      .slice(0, 8);

    // Combine: ring 1 first (quality cluster), then ring 2 (downward links)
    const combined = [
      ...ring1.map(d => ({
        domain: d.domain,
        score: d.latestScan!.score!,
        categoryName: d.category?.name,
      })),
      ...ring2.map(d => ({
        domain: d.domain,
        score: d.latestScan!.score!,
        categoryName: d.category?.name,
      })),
    ];

    return combined;
  } catch (error) {
    logger.warn({ error, domain }, 'Failed to get related domains for report');
    return [];
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
              // etldPlusOne returns null for bare TLDs, fall back to hostname
              domain = etldPlusOne(url.hostname) ?? url.hostname;
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

// Stats endpoint - total scans count + domain count for credibility display
// Also returns lastScanTime, lastChangeDetected for API landing page
reportV2Router.get('/stats', async (_req, res) => {
  try {
    const stats = await CacheService.getOrSet(
      CACHE_KEYS.STATS,
      async () => {
        const [totalScans, domainCount, lastScan, lastChange] = await Promise.all([
          prisma.scan.count({ where: { status: 'done' } }),
          prisma.domain.count(),
          prisma.scan.findFirst({
            where: { status: 'done' },
            orderBy: { finishedAt: 'desc' },
            select: { finishedAt: true },
          }),
          prisma.domainChange.findFirst({
            orderBy: { detectedAt: 'desc' },
            select: { detectedAt: true },
          }),
        ]);
        return {
          totalScans,
          domainCount,
          lastScanTime: lastScan?.finishedAt?.toISOString() ?? null,
          lastChangeDetected: lastChange?.detectedAt?.toISOString() ?? null,
        };
      },
      CACHE_TTL.STATS
    );

    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error fetching stats');
    return problem(res, 500, 'Failed to load stats');
  }
});

/**
 * Quality-gated reports query (discovery layer).
 *
 * Intentionally looser than sitemap/index-gating:
 * - Sitemap: strict (score >= 60, complete analysis, isIndexed)
 * - /reports: moderate (score >= 40, any evidence, no isIndexed gate)
 *
 * Discovery depends on DATA QUALITY, not Google history (isIndexed).
 * This prevents a closed graph where only already-indexed domains
 * can be re-discovered. Google needs candidates to evaluate —
 * including some medium-quality pages for ranking contrast.
 * Individual domain pages handle their own robots via index-gating.ts.
 */
const REPORTS_QUALITY_GATE = {
  MIN_SCORE: 60, // C-grade+ (aligned with sitemap — no more thin page leakage)
  MIN_EVIDENCE: 5, // Aligned with sitemap — only complete scans
  MAX_AGE_DAYS: 90,
};

function getQualityGateWhere() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REPORTS_QUALITY_GATE.MAX_AGE_DAYS);

  // No isIndexed filter — discovery should depend on data quality, not index history.
  // Otherwise new domains never enter Google's evaluation pipeline.
  return {
    lastScanned: { gte: cutoff },
    latestScan: {
      status: 'done' as const,
      score: { gte: REPORTS_QUALITY_GATE.MIN_SCORE },
      evidence: { some: {} },
    },
  };
}

// Paginated reports endpoint for ReportsPage
reportV2Router.get('/reports/all', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const skip = (page - 1) * limit;

    const where = getQualityGateWhere();

    // Get total count for pagination (quality-gated)
    const totalCount = await prisma.domain.count({ where });

    const domains = await prisma.domain.findMany({
      where,
      orderBy: { lastScanned: 'desc' },
      skip,
      take: limit,
      select: {
        domain: true,
        lastScanned: true,
        latestScan: {
          select: {
            slug: true,
            score: true,
            label: true,
            createdAt: true,
            _count: { select: { evidence: true } },
          },
        },
      },
    });

    const items = domains
      .filter((d) => d.latestScan && !isBlockedDomain(d.domain))
      .filter((d) => (d.latestScan?._count?.evidence ?? 0) >= REPORTS_QUALITY_GATE.MIN_EVIDENCE)
      .map((d) => ({
        slug: d.latestScan!.slug,
        score: d.latestScan!.score ?? 0,
        label: d.latestScan!.label ?? 'Moderate Privacy Risk',
        domain: d.domain,
        createdAt: d.latestScan!.createdAt,
        evidenceCount: d.latestScan!._count.evidence,
      }));

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

    const where = getQualityGateWhere();

    const totalCount = await prisma.domain.count({ where });

    const domains = await prisma.domain.findMany({
      where,
      orderBy: { lastScanned: 'desc' },
      skip,
      take: limit,
      select: {
        domain: true,
        lastScanned: true,
        latestScan: {
          select: {
            slug: true,
            score: true,
            label: true,
            createdAt: true,
            _count: { select: { evidence: true } },
          },
        },
      },
    });

    const items = domains
      .filter((d) => d.latestScan && !isBlockedDomain(d.domain))
      .filter((d) => (d.latestScan?._count?.evidence ?? 0) >= REPORTS_QUALITY_GATE.MIN_EVIDENCE)
      .map((d) => ({
        slug: d.latestScan!.slug,
        score: d.latestScan!.score ?? 0,
        label: d.latestScan!.label ?? 'Moderate Privacy Risk',
        domain: d.domain,
        createdAt: d.latestScan!.createdAt,
        evidenceCount: d.latestScan!._count.evidence,
      }));

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

/**
 * Get report by domain - finds the most recent completed scan for a domain.
 *
 * Response codes:
 * - 200: Report found (GET returns JSON, HEAD returns empty)
 * - 404: Domain invalid or no scan exists (expected, not an error)
 * - 410: Domain blocked (adult content)
 * - 500: Real error (DB failure, code exception)
 */
reportV2Router.get('/domain/:domain', async (req, res) => {
  const rawDomain = decodeURIComponent(req.params.domain);

  // Guard 1: Validate domain format BEFORE any DB query
  // This rejects garbage like "837fy38r2", unicode noise, bot-invented paths
  const domain = normalizeDomain(rawDomain);
  if (!domain || !isValidDomain(domain)) {
    // Expected state - don't log as error
    return res.status(404).json({
      type: 'about:blank',
      status: 404,
      title: 'Invalid domain',
      detail: 'Please provide a valid domain name',
    });
  }

  // Guard 2: Return 410 Gone for blocked domains (adult content)
  // This helps Google de-index these pages faster
  if (isBlockedDomain(domain)) {
    logger.debug({ domain }, 'Blocked domain report requested - returning 410 Gone');
    return res.status(410).json({
      type: 'gone',
      status: 410,
      title: 'Report Removed',
      detail: 'This report has been removed due to content policy.',
    });
  }

  try {
    // Find the most recent completed scan for this domain
    // Uses Domain table first (fast), falls back to Scan table query
    const scan = await findLatestScanForDomain(prisma, domain);

    // Guard 3: No scan found - return 404 (expected state, not an error)
    if (!scan) {
      // Debug level only - this is expected for domains never scanned
      logger.debug({ domain }, 'No scan found for domain');
      return res.status(404).json({
        type: 'about:blank',
        status: 404,
        title: 'No report found',
        detail: `No privacy report exists for ${domain}. You can scan it from the homepage.`,
      });
    }

    // Guard 4: HEAD requests - return 200 without building expensive response
    // Bots use HEAD aggressively to check if pages exist
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Build full response for GET requests
    const basePayload = buildReportPayload(scan, {
      evidence: (scan.evidence ?? []) as Parameters<typeof buildReportPayload>[1]['evidence'],
      issues: (scan.issues ?? []) as Parameters<typeof buildReportPayload>[1]['issues'],
    });

    // Enrich with benchmark data for SEO
    const payload = await enrichReportWithBenchmarks(basePayload);

    // Lookup scanConfidence (do not expose raw success/failure counts)
    const domainRecord = await prisma.domain.findUnique({
      where: { domain },
      select: { scanConfidence: true },
    });

    const archive = await getReportDownloadUrl(scan.id);
    const enriched = archive ? { ...payload, archive } : payload;
    return res.json({ ...enriched, scanConfidence: domainRecord?.scanConfidence ?? null });
  } catch (error) {
    // Real errors (DB failure, code exception) - log as error
    logger.error({ error, domain }, 'Error fetching report by domain');
    return problem(res, 500, 'Failed to load report');
  }
});

// Indexable domains count for sitemap generation
reportV2Router.get('/domains/indexable-count', async (_req, res) => {
  try {
    const count = await CacheService.getOrSet(
      'indexable_domains_count',
      async () => {
        // Count unique domains with completed scans that have required evidence
        const result = await prisma.scan.groupBy({
          by: ['normalizedInput'],
          where: {
            status: 'done',
            score: { gte: 40 },
            evidence: { some: { kind: { in: ['tracker', 'thirdparty', 'tls'] } } },
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
    // Only include scans with score >= 40 and required evidence to avoid sitemap 404s
    const scans = await prisma.scan.findMany({
      where: {
        status: 'done',
        score: { gte: 40 },
        evidence: { some: { kind: { in: ['tracker', 'thirdparty', 'tls'] } } },
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
        const rawDomain = scan.normalizedInput || scan.input;
        try {
          const url = new URL(rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`);
          // etldPlusOne returns null for bare TLDs (public suffixes) - filter these out
          const domain = etldPlusOne(url.hostname);
          if (!domain) {
            return null; // Skip bare TLDs like gov.br, co.uk, etc.
          }
          return {
            domain,
            scannedAt: scan.createdAt.toISOString(),
          };
        } catch {
          return null; // Skip malformed URLs
        }
      })
      // Filter out nulls and blocked domains from sitemap/indexable list
      .filter((item): item is NonNullable<typeof item> => item !== null && !isBlockedDomain(item.domain));

    res.json({ domains });
  } catch (error) {
    logger.error({ error }, 'Error fetching indexable domains');
    return problem(res, 500, 'Failed to get domains');
  }
});

// Tiered sitemap endpoint — returns domains for a specific sitemap tier
// Used by frontend sitemap-core-{a,b,c}.xml routes
reportV2Router.get('/domains/sitemap-tier', async (req, res) => {
  try {
    const tier = req.query.tier as string;
    const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit as string) || 300));

    if (!tier || !['1a', '1b', '1c', '2'].includes(tier)) {
      return problem(res, 400, 'Invalid tier. Must be one of: 1a, 1b, 1c, 2');
    }

    const cacheKey = `sitemap_tier_${tier}_${limit}`;
    const domains = await CacheService.getOrSet(
      cacheKey,
      async () => {
        // Quality tier: scanCount >= 3, ordered by scanCount desc then domain
        // Tier 1a: top 300 (offset 0)
        // Tier 1b: next 700 (offset 300)
        // Tier 1c: remaining quality tier (offset 1000)
        // Tier 2: 2-scan domains, top by score

        // Shared evidence filter: report page 404s without these evidence kinds
        // Cast needed because Prisma expects mutable EvidenceKind[]
        const REQUIRED_EVIDENCE_KINDS: ('tracker' | 'thirdparty' | 'tls')[] = ['tracker', 'thirdparty', 'tls'];

        if (tier === '2') {
          // Tier 2: domains with exactly 2 scans, ordered by score
          const results = await prisma.domain.findMany({
            where: {
              scanCount: 2,
              latestScanId: { not: null },
              latestScan: {
                status: 'done',
                score: { gte: 40 },
                evidence: { some: { kind: { in: REQUIRED_EVIDENCE_KINDS } } },
              },
            },
            orderBy: [
              { latestScan: { score: 'desc' } },
              { domain: 'asc' },
            ],
            take: limit,
            select: {
              domain: true,
              lastScannedAt: true,
            },
          });
          return results.map(d => ({
            domain: d.domain,
            lastScannedAt: d.lastScannedAt?.toISOString() || null,
          }));
        }

        // Quality tiers (1a, 1b, 1c): scanCount >= 3
        const offsets: Record<string, number> = {
          '1a': 0,
          '1b': 300,
          '1c': 1000,
        };
        const offset = offsets[tier] || 0;

        const results = await prisma.domain.findMany({
          where: {
            scanCount: { gte: 3 },
            latestScanId: { not: null },
            latestScan: {
              status: 'done',
              score: { gte: 40 },
              evidence: { some: { kind: { in: REQUIRED_EVIDENCE_KINDS } } },
            },
          },
          orderBy: [
            { scanCount: 'desc' },
            { domain: 'asc' },
          ],
          skip: offset,
          take: limit,
          select: {
            domain: true,
            lastScannedAt: true,
          },
        });

        return results.map(d => ({
          domain: d.domain,
          lastScannedAt: d.lastScannedAt?.toISOString() || null,
        }));
      },
      3600 // 1 hour cache
    );

    res.json({ domains, tier, count: domains.length });
  } catch (error) {
    logger.error({ error }, 'Error fetching sitemap tier domains');
    return problem(res, 500, 'Failed to get tier domains');
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
