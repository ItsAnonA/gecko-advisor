/**
 * Rankings API - Authority Anchor Pages
 *
 * Serves aggregated domain rankings for SEO authority pages:
 * - most-tracked: Domains with the most trackers
 * - least-private: Domains with the lowest privacy scores
 * - most-cookies: Domains with the most cookies
 * - privacy-index: Domains with the highest privacy scores
 *
 * Enhanced with categoryBreakdown and freshness stats.
 */

import { Router } from 'express';
import type { Domain, Scan, Evidence } from '@prisma/client';
import { isBlockedDomain } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

const RANKING_LIMIT = 100;
const CACHE_MAX_AGE = 21600; // 6 hours
const FRESHNESS_CACHE_TTL = 21600000; // 6 hours in ms

const VALID_TYPES = ['most-tracked', 'least-private', 'most-cookies', 'privacy-index'] as const;
type RankingType = (typeof VALID_TYPES)[number];

type DomainWithScanEvidence = Pick<Domain, 'domain'> & {
  categoryId: string | null;
  category: { slug: string; name: string } | null;
  latestScan: (Pick<Scan, 'score'> & {
    evidence: Pick<Evidence, 'kind'>[];
  }) | null;
};

interface RankingEntry {
  rank: number;
  domain: string;
  score: number;
  trackers: number;
  cookies: number;
  grade: string;
}

interface RankingConfig {
  title: string;
  description: string;
  orderBy: Record<string, unknown>;
  sortFn?: (a: RankingEntry, b: RankingEntry) => number;
}

interface CategoryBreakdownEntry {
  category: string;
  slug: string;
  count: number;
  avgScore: number;
}

interface FreshnessStats {
  lastScanDate: string | null;
  totalDomainsInDb: number;
  totalEvidenceCount: number;
  totalCookiesDetected: number;
  totalTrackersDetected: number;
}

// Simple in-memory cache for freshness stats (expensive aggregate queries)
let freshnessCache: { data: FreshnessStats; fetchedAt: number } | null = null;

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

const RANKING_CONFIGS: Record<RankingType, RankingConfig> = {
  'most-tracked': {
    title: 'Most Tracked Domains',
    description: 'Domains with the highest number of third-party trackers detected.',
    // Fetch by score desc as a reasonable initial ordering; re-sort by tracker count after
    orderBy: { latestScan: { score: 'asc' } },
    sortFn: (a, b) => b.trackers - a.trackers,
  },
  'least-private': {
    title: 'Least Private Domains',
    description: 'Domains with the lowest privacy scores based on comprehensive analysis.',
    orderBy: { latestScan: { score: 'asc' } },
  },
  'most-cookies': {
    title: 'Most Cookies Domains',
    description: 'Domains that set the highest number of cookies during browsing.',
    orderBy: { latestScan: { score: 'asc' } },
    sortFn: (a, b) => b.cookies - a.cookies,
  },
  'privacy-index': {
    title: 'Privacy Index - Top Rated Domains',
    description: 'Domains with the highest privacy scores, demonstrating best practices.',
    orderBy: { latestScan: { score: 'desc' } },
  },
};

/**
 * Fetch freshness stats with 6-hour in-memory cache.
 * These are expensive aggregate queries so we cache aggressively.
 */
async function getFreshnessStats(): Promise<FreshnessStats> {
  const now = Date.now();
  if (freshnessCache && now - freshnessCache.fetchedAt < FRESHNESS_CACHE_TTL) {
    return freshnessCache.data;
  }

  const [lastScan, totalDomainsInDb, totalEvidenceCount, totalCookiesDetected, totalTrackersDetected] =
    await Promise.all([
      prisma.scan.findFirst({
        where: { status: 'done' },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      prisma.domain.count(),
      prisma.evidence.count(),
      prisma.evidence.count({ where: { kind: 'cookie' } }),
      prisma.evidence.count({ where: { kind: 'tracker' } }),
    ]);

  const data: FreshnessStats = {
    lastScanDate: lastScan?.updatedAt?.toISOString() ?? null,
    totalDomainsInDb,
    totalEvidenceCount,
    totalCookiesDetected,
    totalTrackersDetected,
  };

  freshnessCache = { data, fetchedAt: now };
  return data;
}

/**
 * Build category breakdown from the ranked domain entries.
 * Uses the domain/category data already fetched in the main query.
 */
function buildCategoryBreakdown(
  rankedDomains: Array<{ domain: string; score: number }>,
  domainCategoryMap: Map<string, { slug: string; name: string }>,
): CategoryBreakdownEntry[] {
  const buckets = new Map<string, { slug: string; name: string; scores: number[] }>();

  for (const entry of rankedDomains) {
    const cat = domainCategoryMap.get(entry.domain);
    if (!cat) continue;

    let bucket = buckets.get(cat.slug);
    if (!bucket) {
      bucket = { slug: cat.slug, name: cat.name, scores: [] };
      buckets.set(cat.slug, bucket);
    }
    bucket.scores.push(entry.score);
  }

  const breakdown: CategoryBreakdownEntry[] = [];
  for (const bucket of buckets.values()) {
    const sum = bucket.scores.reduce((a, b) => a + b, 0);
    breakdown.push({
      category: bucket.name,
      slug: bucket.slug,
      count: bucket.scores.length,
      avgScore: Math.round((sum / bucket.scores.length) * 10) / 10,
    });
  }

  // Sort by count descending
  breakdown.sort((a, b) => b.count - a.count);
  return breakdown;
}

export const rankingsV2Router = Router();

/**
 * GET /api/v2/rankings/:type
 * Returns ranked domain list for authority anchor pages
 */
rankingsV2Router.get('/v2/rankings/:type', async (req, res) => {
  try {
    const { type } = req.params;

    if (!VALID_TYPES.includes(type as RankingType)) {
      return problem(res, 400, 'Invalid ranking type', `Valid types: ${VALID_TYPES.join(', ')}`);
    }

    const rankingType = type as RankingType;
    const config = RANKING_CONFIGS[rankingType];

    // For tracker/cookie sorting we need to over-fetch then sort in memory,
    // since Prisma cannot order by evidence count.
    // Fetch more than needed to account for blocked domain filtering and re-sorting.
    const fetchLimit = config.sortFn ? RANKING_LIMIT * 5 : RANKING_LIMIT * 2;

    const [domains, totalDomains, freshness] = await Promise.all([
      prisma.domain.findMany({
        where: {
          indexTier: 'A',
          latestScan: {
            status: 'done',
            score: { not: null },
          },
        },
        select: {
          domain: true,
          categoryId: true,
          category: {
            select: { slug: true, name: true },
          },
          latestScan: {
            select: {
              score: true,
              evidence: {
                select: { kind: true },
              },
            },
          },
        },
        orderBy: config.orderBy,
        take: fetchLimit,
      }),
      // Count total Tier A domains for context
      prisma.domain.count({
        where: {
          indexTier: 'A',
          latestScan: {
            status: 'done',
            score: { not: null },
          },
        },
      }),
      // Freshness stats (cached)
      getFreshnessStats(),
    ]);

    // Build domain-to-category map for category breakdown
    const domainCategoryMap = new Map<string, { slug: string; name: string }>();
    for (const d of domains as DomainWithScanEvidence[]) {
      if (d.category) {
        domainCategoryMap.set(d.domain, { slug: d.category.slug, name: d.category.name });
      }
    }

    // Transform and filter
    const entries: RankingEntry[] = [];
    for (const d of domains as DomainWithScanEvidence[]) {
      if (!d.latestScan) continue;
      if (isBlockedDomain(d.domain)) continue;

      const score = d.latestScan.score ?? 0;
      const trackers = d.latestScan.evidence.filter((e) => e.kind === 'tracker').length;
      const cookies = d.latestScan.evidence.filter((e) => e.kind === 'cookie').length;

      entries.push({
        rank: 0, // assigned after sorting
        domain: d.domain,
        score,
        trackers,
        cookies,
        grade: scoreToGrade(score),
      });
    }

    // Apply custom sort if needed (tracker/cookie count ordering)
    if (config.sortFn) {
      entries.sort(config.sortFn);
    }

    // Trim to limit and assign ranks
    const rankings = entries.slice(0, RANKING_LIMIT).map((entry, i) => ({
      ...entry,
      rank: i + 1,
    }));

    // Calculate aggregate stats
    const totalTrackers = rankings.reduce((sum, r) => sum + r.trackers, 0);
    const totalCookies = rankings.reduce((sum, r) => sum + r.cookies, 0);
    const totalScore = rankings.reduce((sum, r) => sum + r.score, 0);
    const count = rankings.length;

    const stats = {
      averageScore: count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0,
      averageTrackers: count > 0 ? Math.round((totalTrackers / count) * 10) / 10 : 0,
      averageCookies: count > 0 ? Math.round((totalCookies / count) * 10) / 10 : 0,
      totalAnalyzed: count,
    };

    // Build category breakdown from the final ranked entries
    const categoryBreakdown = buildCategoryBreakdown(rankings, domainCategoryMap);

    res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
    res.json({
      type: rankingType,
      title: config.title,
      description: config.description,
      lastUpdated: new Date().toISOString(),
      totalDomains,
      rankings,
      stats,
      categoryBreakdown,
      freshness,
    });
  } catch (error) {
    logger.error({ error, type: req.params.type }, 'Error fetching rankings');
    return problem(res, 500, 'Failed to fetch rankings');
  }
});
