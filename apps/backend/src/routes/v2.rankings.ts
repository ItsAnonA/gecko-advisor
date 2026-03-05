/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Rankings API (Phase B - Authority Pages)
 *
 * Provides ranked domain lists for SEO authority pages:
 * most-tracked, highest-score, most-cookies, top-100, least-private.
 */

import { Router } from 'express';
import { labelForScore } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { CacheService } from '../cache.js';

export const rankingsV2Router = Router();

const VALID_TYPES = ['most-tracked', 'highest-score', 'most-cookies', 'top-100', 'least-private'] as const;
type RankingType = typeof VALID_TYPES[number];

const CACHE_TTL_RANKINGS = 3600; // 1 hour

interface RankedDomain {
  rank: number;
  domain: string;
  displayName: string;
  score: number;
  label: string;
  trackerCount: number;
  cookieCount: number;
  category: string | null;
  categorySlug: string | null;
  lastScanned: string | null;
}

interface RankingStats {
  totalDomains: number;
  avgScore: number;
  avgTrackerCount: number;
  avgCookieCount: number;
  medianScore: number;
}

interface RawRankingRow {
  domain: string;
  display_name: string | null;
  score: number;
  tracker_count: number;
  cookie_count: number;
  category_name: string | null;
  category_slug: string | null;
  last_scanned: Date | null;
}

interface RawCategoryRow {
  category_name: string;
  category_slug: string;
  domain_count: number;
  avg_score: number;
  avg_tracker_count: number;
  avg_cookie_count: number;
}

function parseLimit(raw: unknown): number {
  const parsed = parseInt(raw as string, 10);
  if (isNaN(parsed) || parsed < 1) return 100;
  return Math.min(parsed, 200);
}

function isValidType(type: string): type is RankingType {
  return (VALID_TYPES as readonly string[]).includes(type);
}

/**
 * Build the ORDER BY clause for each ranking type.
 * These are static strings from a closed set, safe for raw SQL interpolation.
 */
function orderByClause(type: RankingType): string {
  switch (type) {
    case 'most-tracked':
      return 'ORDER BY tracker_count DESC, s.score DESC';
    case 'highest-score':
      return 'ORDER BY s.score DESC, tracker_count ASC';
    case 'most-cookies':
      return 'ORDER BY cookie_count DESC, s.score DESC';
    case 'top-100':
      return 'ORDER BY d."scanCount" DESC, s.score DESC';
    case 'least-private':
      return 'ORDER BY s.score ASC, tracker_count DESC';
  }
}

/**
 * Build the full ranking query. Uses $queryRawUnsafe because the ORDER BY
 * clause varies by ranking type. The type is validated against a closed set
 * so there is no injection risk. The limit is passed as a parameterized value.
 */
function buildRankingQuery(type: RankingType, limit: number): [string, number] {
  const orderBy = orderByClause(type);

  const sql = `
    SELECT
      d.domain,
      d."displayName" as display_name,
      s.score::int as score,
      tc.count::int as tracker_count,
      cc.count::int as cookie_count,
      cat.name as category_name,
      cat.slug as category_slug,
      d."lastScannedAt" as last_scanned
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'tracker'
    ) tc ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'cookie'
    ) cc ON true
    LEFT JOIN "Category" cat ON d."categoryId" = cat.id
    WHERE s.status = 'done'
      AND s.score IS NOT NULL
      AND d."scanCount" >= 2
    ${orderBy}
    LIMIT $1
  `;

  return [sql, limit];
}

// GET /api/v2/rankings/privacy-index -- Aggregated data for the Privacy Index page
rankingsV2Router.get('/privacy-index', async (_req, res) => {
  try {
    const result = await CacheService.getOrSet(
      'rankings:privacy-index',
      async () => {
        // Category breakdown
        const categories = await prisma.$queryRaw<RawCategoryRow[]>`
          SELECT
            cat.name as category_name,
            cat.slug as category_slug,
            COUNT(DISTINCT d.id)::int as domain_count,
            AVG(s.score)::float as avg_score,
            AVG(tc.count)::float as avg_tracker_count,
            AVG(cc.count)::float as avg_cookie_count
          FROM "Domain" d
          JOIN "Scan" s ON d."latestScanId" = s.id
          JOIN "Category" cat ON d."categoryId" = cat.id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'tracker'
          ) tc ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'cookie'
          ) cc ON true
          WHERE s.status = 'done'
            AND s.score IS NOT NULL
            AND d."scanCount" >= 2
            AND d."categoryId" IS NOT NULL
          GROUP BY cat.id, cat.name, cat.slug
          HAVING COUNT(DISTINCT d.id) >= 2
          ORDER BY avg_score DESC
        `;

        // Score distribution
        const distRows = await prisma.$queryRaw<Array<{ range: string; count: number }>>`
          SELECT
            CASE
              WHEN s.score >= 90 THEN '90-100'
              WHEN s.score >= 80 THEN '80-89'
              WHEN s.score >= 70 THEN '70-79'
              WHEN s.score >= 60 THEN '60-69'
              WHEN s.score >= 50 THEN '50-59'
              WHEN s.score >= 40 THEN '40-49'
              WHEN s.score >= 30 THEN '30-39'
              WHEN s.score >= 20 THEN '20-29'
              WHEN s.score >= 10 THEN '10-19'
              ELSE '0-9'
            END as range,
            COUNT(*)::int as count
          FROM "Domain" d
          JOIN "Scan" s ON d."latestScanId" = s.id
          WHERE s.status = 'done'
            AND s.score IS NOT NULL
            AND d."scanCount" >= 2
          GROUP BY range
          ORDER BY range DESC
        `;

        // Top trackers
        const trackerRows = await prisma.$queryRaw<Array<{ name: string; count: number }>>`
          SELECT
            e.title as name,
            COUNT(DISTINCT d.id)::int as count
          FROM "Evidence" e
          JOIN "Scan" s ON e."scanId" = s.id
          JOIN "Domain" d ON d."latestScanId" = s.id
          WHERE e.kind = 'tracker'
            AND s.status = 'done'
            AND d."scanCount" >= 2
          GROUP BY e.title
          ORDER BY count DESC
          LIMIT 15
        `;

        // Total findings count
        const findingsResult = await prisma.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int as count
          FROM "Evidence" e
          JOIN "Scan" s ON e."scanId" = s.id
          JOIN "Domain" d ON d."latestScanId" = s.id
          WHERE s.status = 'done'
            AND d."scanCount" >= 2
        `;

        return {
          categoryBreakdown: categories.map(row => ({
            name: row.category_name,
            slug: row.category_slug,
            avgScore: Math.round((row.avg_score || 0) * 10) / 10,
            avgTrackers: Math.round((row.avg_tracker_count || 0) * 10) / 10,
            domainCount: row.domain_count,
          })),
          scoreDistribution: distRows,
          topTrackers: trackerRows,
          totalFindings: findingsResult[0]?.count || 0,
          generatedAt: new Date().toISOString(),
        };
      },
      CACHE_TTL_RANKINGS,
    );

    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Error fetching privacy index data');
    return problem(res, 500, 'Failed to get privacy index data');
  }
});

// GET /api/v2/rankings/global-stats -- Global dataset statistics (cached 1hr)
rankingsV2Router.get('/global-stats', async (_req, res) => {
  try {
    const stats = await fetchGlobalStats();
    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error fetching ranking global stats');
    return problem(res, 500, 'Failed to get global stats');
  }
});

// GET /api/v2/rankings/:type -- Ranked domain list
rankingsV2Router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;

    if (!isValidType(type)) {
      return problem(res, 400, `Invalid ranking type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const limit = parseLimit(req.query.limit);
    const cacheKey = `rankings:${type}:${limit}`;

    const result = await CacheService.getOrSet(
      cacheKey,
      async () => {
        const [sql, limitParam] = buildRankingQuery(type, limit);
        const rows = await prisma.$queryRawUnsafe<RawRankingRow[]>(sql, limitParam);

        const domains: RankedDomain[] = rows.map((row, idx) => ({
          rank: idx + 1,
          domain: row.domain,
          displayName: row.display_name || row.domain,
          score: row.score,
          label: labelForScore(row.score),
          trackerCount: row.tracker_count,
          cookieCount: row.cookie_count,
          category: row.category_name,
          categorySlug: row.category_slug,
          lastScanned: row.last_scanned ? new Date(row.last_scanned).toISOString() : null,
        }));

        const stats = await fetchGlobalStats();

        return {
          type,
          domains,
          stats,
          generatedAt: new Date().toISOString(),
        };
      },
      CACHE_TTL_RANKINGS,
    );

    res.json(result);
  } catch (error) {
    logger.error({ error, type: req.params.type }, 'Error fetching rankings');
    return problem(res, 500, 'Failed to get rankings');
  }
});

// GET /api/v2/rankings/:type/categories -- Per-category averages for a ranking metric
rankingsV2Router.get('/:type/categories', async (req, res) => {
  try {
    const { type } = req.params;

    if (!isValidType(type)) {
      return problem(res, 400, `Invalid ranking type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const cacheKey = `rankings:${type}:categories`;

    const result = await CacheService.getOrSet(
      cacheKey,
      async () => {
        const orderBy = orderByForCategories(type);

        const sql = `
          SELECT
            cat.name as category_name,
            cat.slug as category_slug,
            COUNT(DISTINCT d.id)::int as domain_count,
            AVG(s.score)::float as avg_score,
            AVG(tc.count)::float as avg_tracker_count,
            AVG(cc.count)::float as avg_cookie_count
          FROM "Domain" d
          JOIN "Scan" s ON d."latestScanId" = s.id
          JOIN "Category" cat ON d."categoryId" = cat.id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'tracker'
          ) tc ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'cookie'
          ) cc ON true
          WHERE s.status = 'done'
            AND s.score IS NOT NULL
            AND d."scanCount" >= 2
            AND d."categoryId" IS NOT NULL
          GROUP BY cat.id, cat.name, cat.slug
          HAVING COUNT(DISTINCT d.id) >= 2
          ORDER BY ${orderBy}
        `;

        const rows = await prisma.$queryRawUnsafe<RawCategoryRow[]>(sql);

        return {
          type,
          categories: rows.map(row => ({
            categoryName: row.category_name,
            categorySlug: row.category_slug,
            domainCount: row.domain_count,
            avgScore: Math.round((row.avg_score || 0) * 10) / 10,
            avgTrackerCount: Math.round((row.avg_tracker_count || 0) * 10) / 10,
            avgCookieCount: Math.round((row.avg_cookie_count || 0) * 10) / 10,
          })),
          generatedAt: new Date().toISOString(),
        };
      },
      CACHE_TTL_RANKINGS,
    );

    res.json(result);
  } catch (error) {
    logger.error({ error, type: req.params.type }, 'Error fetching ranking categories');
    return problem(res, 500, 'Failed to get ranking categories');
  }
});

/**
 * Determine ORDER BY for category breakdown based on ranking type.
 * Returns a static SQL fragment from a closed set (no injection risk).
 */
function orderByForCategories(type: RankingType): string {
  switch (type) {
    case 'most-tracked':
      return 'avg_tracker_count DESC';
    case 'highest-score':
      return 'avg_score DESC';
    case 'most-cookies':
      return 'avg_cookie_count DESC';
    case 'top-100':
      return 'domain_count DESC';
    case 'least-private':
      return 'avg_score ASC';
  }
}

/**
 * Fetch global stats with 1-hour cache. Shared by rankings list and global-stats endpoint.
 */
async function fetchGlobalStats(): Promise<RankingStats> {
  return CacheService.getOrSet(
    'rankings:global_stats',
    async () => {
      const agg = await prisma.$queryRaw<Array<{
        total_domains: number;
        avg_score: number;
        median_score: number;
        avg_tracker_count: number;
        avg_cookie_count: number;
      }>>`
        SELECT
          COUNT(DISTINCT d.id)::int as total_domains,
          AVG(s.score)::float as avg_score,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score)::float as median_score,
          AVG(tc.count)::float as avg_tracker_count,
          AVG(cc.count)::float as avg_cookie_count
        FROM "Domain" d
        JOIN "Scan" s ON d."latestScanId" = s.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'tracker'
        ) tc ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'cookie'
        ) cc ON true
        WHERE s.status = 'done'
          AND s.score IS NOT NULL
          AND d."scanCount" >= 2
      `;

      const row = agg[0] || { total_domains: 0, avg_score: 0, median_score: 0, avg_tracker_count: 0, avg_cookie_count: 0 };

      return {
        totalDomains: row.total_domains || 0,
        avgScore: Math.round((row.avg_score || 0) * 10) / 10,
        avgTrackerCount: Math.round((row.avg_tracker_count || 0) * 10) / 10,
        avgCookieCount: Math.round((row.avg_cookie_count || 0) * 10) / 10,
        medianScore: Math.round(row.median_score || 0),
      };
    },
    CACHE_TTL_RANKINGS,
  );
}
