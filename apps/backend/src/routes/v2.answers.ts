/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Answers API (Phase C1 - Query-First SEO)
 *
 * Serves curated answer pages targeting high-volume search queries.
 * Each answer page combines data queries with template-based content.
 */

import { Router } from 'express';
import { labelForScore, slugifyTracker } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { CacheService } from '../cache.js';
import { answerRegistry, getAnswerBySlug } from '../services/answerRegistry.js';
import {
  generateDomainTrackingContent,
  generateCategoryRankingContent,
  generateTrackerUsageContent,
} from '../services/answerContentService.js';

export const answersV2Router = Router();

const CACHE_TTL = 3600;

interface RawDomainRow {
  domain: string;
  display_name: string | null;
  score: number;
  tracker_count: bigint;
  cookie_count: bigint;
  has_fingerprinting: boolean;
}

interface RawTrackerNameRow {
  title: string;
}

interface RawCategoryDomainRow {
  domain: string;
  display_name: string | null;
  score: number;
  tracker_count: bigint;
  cookie_count: bigint;
}

interface RawCategoryAvgRow {
  avg_score: number;
}

interface RawTrackerUsageDomainRow {
  domain: string;
  display_name: string | null;
  score: number;
}

interface RawTrackerCountRow {
  domain_count: bigint;
  total_domains: bigint;
}

/**
 * GET /api/v2/answers — list all answer slugs (for sitemap)
 */
answersV2Router.get('/', (_req, res) => {
  const slugs = answerRegistry.map((a) => ({
    slug: a.slug,
    title: a.title,
    queryType: a.queryType,
  }));
  return res.json({ answers: slugs });
});

/**
 * GET /api/v2/answers/:slug — full answer data + generated content
 */
answersV2Router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const entry = getAnswerBySlug(slug);
    if (!entry) {
      return problem(res, 404, 'Answer not found');
    }

    const cacheKey = `answers:${slug}`;
    const cached = await CacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let result: Record<string, unknown>;

    switch (entry.queryType) {
      case 'domain-tracking':
        result = await handleDomainTracking(entry);
        break;
      case 'category-ranking':
        result = await handleCategoryRanking(entry);
        break;
      case 'tracker-usage':
        result = await handleTrackerUsage(entry);
        break;
      default:
        return problem(res, 500, 'Unknown query type');
    }

    // Add related answers
    const relatedAnswers = entry.relatedSlugs
      .map((s) => {
        const related = getAnswerBySlug(s);
        return related ? { slug: related.slug, title: related.title } : null;
      })
      .filter(Boolean);

    result.relatedAnswers = relatedAnswers;
    result.slug = entry.slug;
    result.title = entry.title;
    result.queryType = entry.queryType;

    await CacheService.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Failed to fetch answer');
    return problem(res, 500, 'Internal Server Error');
  }
});

async function handleDomainTracking(entry: { title: string; params: Record<string, string> }): Promise<Record<string, unknown>> {
  const domain = entry.params.domain!;

  // Fetch domain data
  const rows = await prisma.$queryRaw<RawDomainRow[]>`
    SELECT
      d.domain,
      d."displayName" as display_name,
      s.score,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker')) as tracker_count,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'cookie') as cookie_count,
      EXISTS(SELECT 1 FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'fingerprint') as has_fingerprinting
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE d.domain = ${domain} AND s.status = 'done'
    LIMIT 1
  `;

  if (rows.length === 0 || !rows[0]) {
    return { content: null, domain, noData: true };
  }

  const row = rows[0];

  // Fetch tracker names
  const trackerRows = await prisma.$queryRaw<RawTrackerNameRow[]>`
    SELECT DISTINCT e.title
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    WHERE d.domain = ${domain} AND e.kind IN ('tracker', 'third_party_tracker')
      AND s.status = 'done'
    ORDER BY e.title
  `;

  const content = generateDomainTrackingContent({
    domain,
    score: row.score,
    trackerCount: Number(row.tracker_count),
    cookieCount: Number(row.cookie_count),
    hasFingerprinting: row.has_fingerprinting,
    trackerNames: trackerRows.map((r) => r.title),
  });

  return {
    content,
    domain,
    score: row.score,
    label: labelForScore(row.score),
    trackerCount: Number(row.tracker_count),
    cookieCount: Number(row.cookie_count),
    hasFingerprinting: row.has_fingerprinting,
    trackers: trackerRows.map((r) => ({
      name: r.title,
      slug: slugifyTracker(r.title),
    })),
  };
}

async function handleCategoryRanking(entry: { title: string; params: Record<string, string> }): Promise<Record<string, unknown>> {
  const category = entry.params.category!;
  const sort = entry.params.sort!;
  const order = entry.params.order!;

  const rows = await prisma.$queryRaw<RawCategoryDomainRow[]>`
    SELECT
      d.domain,
      d."displayName" as display_name,
      s.score,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker')) as tracker_count,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'cookie') as cookie_count
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE c.slug = ${category} AND s.status = 'done' AND d."scanCount" >= 2
    ORDER BY
      CASE WHEN ${sort} = 'score' AND ${order} = 'desc' THEN s.score END DESC,
      CASE WHEN ${sort} = 'score' AND ${order} = 'asc' THEN s.score END ASC,
      CASE WHEN ${sort} = 'trackerCount' AND ${order} = 'desc' THEN
        (SELECT COUNT(*) FROM "Evidence" e WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker'))
      END DESC,
      CASE WHEN ${sort} = 'trackerCount' AND ${order} = 'asc' THEN
        (SELECT COUNT(*) FROM "Evidence" e WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker'))
      END ASC
    LIMIT 50
  `;

  // Fetch average score
  const avgRows = await prisma.$queryRaw<RawCategoryAvgRow[]>`
    SELECT AVG(s.score)::float as avg_score
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE c.slug = ${category} AND s.status = 'done' AND d."scanCount" >= 2
  `;
  const avgScore = avgRows[0]?.avg_score || 0;

  const domains = rows.map((r) => ({
    domain: r.domain,
    displayName: r.display_name || r.domain,
    score: r.score,
    label: labelForScore(r.score),
    trackerCount: Number(r.tracker_count),
    cookieCount: Number(r.cookie_count),
  }));

  const content = generateCategoryRankingContent(
    entry.title,
    category.replace(/-/g, ' '),
    sort,
    domains,
    avgScore,
  );

  return {
    content,
    category,
    categoryDisplayName: category.replace(/-/g, ' '),
    avgScore: Math.round(avgScore * 10) / 10,
    domains,
  };
}

async function handleTrackerUsage(entry: { title: string; params: Record<string, string> }): Promise<Record<string, unknown>> {
  const trackerName = entry.params.tracker!;

  // Count domains using this tracker
  const countRows = await prisma.$queryRaw<RawTrackerCountRow[]>`
    SELECT
      (SELECT COUNT(DISTINCT d.id)::bigint
       FROM "Evidence" e
       JOIN "Scan" s ON e."scanId" = s.id
       JOIN "Domain" d ON d."latestScanId" = s.id
       WHERE e.kind IN ('tracker', 'third_party_tracker') AND e.title = ${trackerName}
         AND s.status = 'done' AND d."scanCount" >= 2) as domain_count,
      (SELECT COUNT(*)::bigint FROM "Domain"
       WHERE "latestScanId" IS NOT NULL AND "scanCount" >= 2) as total_domains
  `;

  const domainCount = Number(countRows[0]?.domain_count || 0);
  const totalDomains = Number(countRows[0]?.total_domains || 1);
  const percentage = Math.round((domainCount / totalDomains) * 1000) / 10;

  // Fetch top domains
  const domainRows = await prisma.$queryRaw<RawTrackerUsageDomainRow[]>`
    SELECT d.domain, d."displayName" as display_name, s.score
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    WHERE e.kind IN ('tracker', 'third_party_tracker') AND e.title = ${trackerName}
      AND s.status = 'done' AND d."scanCount" >= 2
    ORDER BY d."scanCount" DESC
    LIMIT 50
  `;

  const topDomains = domainRows.map((r) => ({
    domain: r.domain,
    displayName: r.display_name || r.domain,
    score: r.score,
    label: labelForScore(r.score),
  }));

  const content = generateTrackerUsageContent({
    trackerName,
    domainCount,
    datasetPercentage: percentage,
    topDomains,
  });

  return {
    content,
    trackerName,
    trackerSlug: slugifyTracker(trackerName),
    domainCount,
    datasetPercentage: percentage,
    domains: topDomains,
  };
}
