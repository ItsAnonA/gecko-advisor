/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Trackers API (Phase C2 - Query-First SEO)
 *
 * Provides tracker/technology pages: list of all tracked technologies
 * and individual tracker detail pages with domain lists, category
 * breakdowns, and related trackers.
 */

import { Router } from 'express';
import { slugifyTracker } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { CacheService } from '../cache.js';

export const trackersV2Router = Router();

const CACHE_TTL = 3600; // 1 hour
const MIN_DOMAIN_COUNT = 5; // quality gate

interface TrackerListItem {
  slug: string;
  name: string;
  domainCount: number;
}

interface RawTrackerRow {
  title: string;
  domain_count: bigint;
}

interface RawTrackerDomainRow {
  domain: string;
  display_name: string | null;
  score: number;
  label: string;
  tracker_count: bigint;
  category_name: string | null;
  category_slug: string | null;
  scan_count: number;
}

interface RawCategoryBreakdownRow {
  category_name: string;
  category_slug: string;
  domain_count: bigint;
}

interface RawRelatedTrackerRow {
  title: string;
  overlap: bigint;
}

/**
 * GET /api/v2/trackers — paginated list of tracked technologies
 */
trackersV2Router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const cacheKey = `trackers:list:${offset}:${limit}`;
    const cached = await CacheService.get<{ trackers: TrackerListItem[]; total: number }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const rows = await prisma.$queryRaw<RawTrackerRow[]>`
      SELECT e.title, COUNT(DISTINCT d.id)::bigint as domain_count
      FROM "Evidence" e
      JOIN "Scan" s ON e."scanId" = s.id
      JOIN "Domain" d ON d."latestScanId" = s.id
      WHERE e.kind IN ('tracker', 'third_party_tracker')
        AND s.status = 'done'
        AND d."scanCount" >= 2
      GROUP BY e.title
      HAVING COUNT(DISTINCT d.id) >= ${MIN_DOMAIN_COUNT}
      ORDER BY domain_count DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*)::bigint as total FROM (
        SELECT e.title
        FROM "Evidence" e
        JOIN "Scan" s ON e."scanId" = s.id
        JOIN "Domain" d ON d."latestScanId" = s.id
        WHERE e.kind IN ('tracker', 'third_party_tracker')
          AND s.status = 'done'
          AND d."scanCount" >= 2
        GROUP BY e.title
        HAVING COUNT(DISTINCT d.id) >= ${MIN_DOMAIN_COUNT}
      ) sub
    `;

    const trackers: TrackerListItem[] = rows.map((r) => ({
      slug: slugifyTracker(r.title),
      name: r.title,
      domainCount: Number(r.domain_count),
    }));

    const result = { trackers, total: Number(countResult[0].total) };
    await CacheService.set(cacheKey, result, CACHE_TTL);

    return res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch tracker list');
    return problem(res, 500, 'Internal Server Error');
  }
});

/**
 * GET /api/v2/trackers/:slug — tracker detail page data
 */
trackersV2Router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `trackers:detail:${slug}`;

    const cached = await CacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Resolve slug → canonical title via lookup
    const titleRow = await resolveTrackerTitle(slug);
    if (!titleRow) {
      return problem(res, 404, 'Tracker not found');
    }

    const trackerTitle = titleRow;

    // Fetch in parallel: domains, category breakdown, related trackers
    const [domains, categoryBreakdown, relatedTrackers] = await Promise.all([
      fetchTrackerDomains(trackerTitle),
      fetchCategoryBreakdown(trackerTitle),
      fetchRelatedTrackers(trackerTitle),
    ]);

    if (domains.length === 0) {
      return problem(res, 404, 'Tracker not found');
    }

    // Calculate stats
    const totalDomains = domains.length;
    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // Fetch total domain count for percentage calculation
    const totalResult = await prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*)::bigint as total FROM "Domain"
      WHERE "latestScanId" IS NOT NULL AND "scanCount" >= 2
    `;
    const totalInDataset = Number(totalResult[0].total);
    const percentage = totalInDataset > 0 ? ((totalDomains / totalInDataset) * 100) : 0;

    const result = {
      slug,
      name: trackerTitle,
      domainCount: totalDomains,
      datasetPercentage: Math.round(percentage * 10) / 10,
      topCategory: topCategory ? { name: topCategory.categoryName, count: topCategory.domainCount } : null,
      domains: domains.slice(0, 50).map((d) => ({
        domain: d.domain,
        displayName: d.display_name || d.domain,
        score: d.score,
        label: d.label,
        trackerCount: Number(d.tracker_count),
        category: d.category_name,
        categorySlug: d.category_slug,
        scanCount: d.scan_count,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        categoryName: c.categoryName,
        categorySlug: c.categorySlug,
        domainCount: c.domainCount,
      })),
      relatedTrackers: relatedTrackers.map((r) => ({
        slug: slugifyTracker(r.name),
        name: r.name,
        overlap: r.overlap,
      })),
    };

    await CacheService.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Failed to fetch tracker detail');
    return problem(res, 500, 'Internal Server Error');
  }
});

/**
 * Resolve slug → canonical tracker title from Evidence table.
 */
async function resolveTrackerTitle(slug: string): Promise<string | null> {
  const cacheKey = `trackers:slug-map`;

  // Try cached slug map first
  let slugMap = await CacheService.get<Record<string, string>>(cacheKey);
  if (!slugMap) {
    // Build slug map from all qualifying trackers
    const rows = await prisma.$queryRaw<{ title: string }[]>`
      SELECT DISTINCT e.title
      FROM "Evidence" e
      JOIN "Scan" s ON e."scanId" = s.id
      JOIN "Domain" d ON d."latestScanId" = s.id
      WHERE e.kind IN ('tracker', 'third_party_tracker')
        AND s.status = 'done'
        AND d."scanCount" >= 2
      GROUP BY e.title
      HAVING COUNT(DISTINCT d.id) >= ${MIN_DOMAIN_COUNT}
    `;

    slugMap = {};
    for (const row of rows) {
      slugMap[slugifyTracker(row.title)] = row.title;
    }
    await CacheService.set(cacheKey, slugMap, CACHE_TTL);
  }

  return slugMap[slug] || null;
}

/**
 * Fetch top domains using a specific tracker.
 */
async function fetchTrackerDomains(trackerTitle: string): Promise<RawTrackerDomainRow[]> {
  return prisma.$queryRaw<RawTrackerDomainRow[]>`
    SELECT
      d.domain,
      d."displayName" as display_name,
      s.score,
      s.label,
      (SELECT COUNT(*)::bigint FROM "Evidence" e2
       WHERE e2."scanId" = s.id
         AND e2.kind IN ('tracker', 'third_party_tracker')) as tracker_count,
      c.name as category_name,
      c.slug as category_slug,
      d."scanCount" as scan_count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    LEFT JOIN "Category" c ON d."categoryId" = c.id
    WHERE e.kind IN ('tracker', 'third_party_tracker')
      AND e.title = ${trackerTitle}
      AND s.status = 'done'
      AND d."scanCount" >= 2
    ORDER BY d."scanCount" DESC, s.score ASC
    LIMIT 100
  `;
}

/**
 * Fetch category breakdown for a tracker.
 */
async function fetchCategoryBreakdown(trackerTitle: string): Promise<Array<{ categoryName: string; categorySlug: string; domainCount: number }>> {
  const rows = await prisma.$queryRaw<RawCategoryBreakdownRow[]>`
    SELECT
      c.name as category_name,
      c.slug as category_slug,
      COUNT(DISTINCT d.id)::bigint as domain_count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE e.kind IN ('tracker', 'third_party_tracker')
      AND e.title = ${trackerTitle}
      AND s.status = 'done'
      AND d."scanCount" >= 2
    GROUP BY c.name, c.slug
    ORDER BY domain_count DESC
    LIMIT 10
  `;

  return rows.map((r) => ({
    categoryName: r.category_name,
    categorySlug: r.category_slug,
    domainCount: Number(r.domain_count),
  }));
}

/**
 * Fetch related (co-occurring) trackers.
 */
async function fetchRelatedTrackers(trackerTitle: string): Promise<Array<{ name: string; overlap: number }>> {
  const rows = await prisma.$queryRaw<RawRelatedTrackerRow[]>`
    SELECT e2.title, COUNT(DISTINCT d.id)::bigint as overlap
    FROM "Evidence" e1
    JOIN "Scan" s ON e1."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    JOIN "Evidence" e2 ON e2."scanId" = s.id
      AND e2.kind IN ('tracker', 'third_party_tracker')
    WHERE e1.title = ${trackerTitle}
      AND e2.title != ${trackerTitle}
      AND e1.kind IN ('tracker', 'third_party_tracker')
      AND s.status = 'done'
      AND d."scanCount" >= 2
    GROUP BY e2.title
    ORDER BY overlap DESC
    LIMIT 10
  `;

  return rows.map((r) => ({
    name: r.title,
    overlap: Number(r.overlap),
  }));
}
