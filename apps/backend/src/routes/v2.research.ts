/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Research Reports API (Phase D - Link Magnets)
 *
 * Aggregates existing data into journalist-friendly research reports.
 * Each report type (category-deep-dive, tracker-landscape, cross-category)
 * has its own data pipeline that pulls from Evidence, Domain, Category,
 * and Scan tables.
 */

import { Router } from 'express';
import { labelForScore, slugifyTracker } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { CacheService } from '../cache.js';
import { researchRegistry, getResearchBySlug } from '../services/researchRegistry.js';

export const researchV2Router = Router();

const CACHE_TTL = 3600;

// ─── Types ──────────────────────────────────────────────────────────────

interface RawDomainMetricRow {
  domain: string;
  display_name: string | null;
  score: number;
  tracker_count: bigint;
  cookie_count: bigint;
  has_fingerprinting: boolean;
  category_name: string | null;
  category_slug: string | null;
}

interface RawTrackerPopRow {
  title: string;
  domain_count: bigint;
}

interface RawScoreDistRow {
  range: string;
  count: bigint;
}

interface RawGlobalStatsRow {
  total_domains: bigint;
  avg_score: number;
  median_score: number;
  avg_tracker_count: number;
  avg_cookie_count: number;
  fingerprinting_rate: number;
}

interface RawCategoryStatsRow {
  name: string;
  slug: string;
  domain_count: bigint;
  avg_score: number;
  avg_trackers: number;
  fingerprinting_rate: number;
}

// ─── List endpoint ──────────────────────────────────────────────────────

/**
 * GET /api/v2/research — list all research reports
 */
researchV2Router.get('/', (_req, res) => {
  const reports = [...researchRegistry]
    .sort((a, b) => b.priority - a.priority)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      teaser: r.teaser,
      reportType: r.reportType,
    }));
  return res.json({ reports });
});

// ─── Detail endpoint ────────────────────────────────────────────────────

/**
 * GET /api/v2/research/:slug — full research report data
 */
researchV2Router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const entry = getResearchBySlug(slug);
    if (!entry) {
      return problem(res, 404, 'Research report not found');
    }

    const cacheKey = `research:${slug}`;
    const cached = await CacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let result: Record<string, unknown>;

    switch (entry.reportType) {
      case 'category-deep-dive':
        result = await buildCategoryReport(entry.params.category!);
        break;
      case 'cross-category':
        result = await buildCrossCategoryReport();
        break;
      case 'tracker-landscape':
        result = await buildTrackerLandscapeReport();
        break;
      default:
        return problem(res, 500, 'Unknown report type');
    }

    result.slug = entry.slug;
    result.title = entry.title;
    result.subtitle = entry.subtitle;
    result.reportType = entry.reportType;
    result.generatedAt = new Date().toISOString();

    await CacheService.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Failed to build research report');
    return problem(res, 500, 'Internal Server Error');
  }
});

// ─── Category Deep-Dive ─────────────────────────────────────────────────

async function buildCategoryReport(categorySlug: string): Promise<Record<string, unknown>> {
  // Fetch all domains in this category with metrics
  const domains = await prisma.$queryRaw<RawDomainMetricRow[]>`
    SELECT
      d.domain,
      d."displayName" as display_name,
      s.score,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker')) as tracker_count,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'cookie') as cookie_count,
      EXISTS(SELECT 1 FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'fingerprint') as has_fingerprinting,
      c.name as category_name,
      c.slug as category_slug
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE c.slug = ${categorySlug} AND s.status = 'done' AND d."scanCount" >= 2
    ORDER BY s.score ASC
  `;

  if (domains.length === 0) {
    return { domains: [], keyFindings: [], sampleSize: 0 };
  }

  // Calculate aggregate stats
  const scores = domains.map((d) => d.score);
  const trackerCounts = domains.map((d) => Number(d.tracker_count));
  const cookieCounts = domains.map((d) => Number(d.cookie_count));
  const fpCount = domains.filter((d) => d.has_fingerprinting).length;
  const fpRate = Math.round((fpCount / domains.length) * 100);

  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)] ?? 0;
  const avgTrackers = Math.round((trackerCounts.reduce((a, b) => a + b, 0) / trackerCounts.length) * 10) / 10;
  const avgCookies = Math.round((cookieCounts.reduce((a, b) => a + b, 0) / cookieCounts.length) * 10) / 10;

  // Top trackers in this category
  const topTrackers = await prisma.$queryRaw<RawTrackerPopRow[]>`
    SELECT e.title, COUNT(DISTINCT d.id)::bigint as domain_count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE c.slug = ${categorySlug}
      AND e.kind IN ('tracker', 'third_party_tracker')
      AND s.status = 'done' AND d."scanCount" >= 2
    GROUP BY e.title
    ORDER BY domain_count DESC
    LIMIT 10
  `;

  // Fetch global averages for comparison
  const globalStats = await getGlobalStats();

  // Score distribution
  const gradeDistribution = {
    A: scores.filter((s) => s >= 90).length,
    B: scores.filter((s) => s >= 80 && s < 90).length,
    C: scores.filter((s) => s >= 70 && s < 80).length,
    D: scores.filter((s) => s >= 60 && s < 70).length,
    F: scores.filter((s) => s < 60).length,
  };

  // Generate key findings
  const keyFindings = generateCategoryFindings({
    categoryName: domains[0]?.category_name || categorySlug,
    sampleSize: domains.length,
    avgScore,
    medianScore,
    avgTrackers,
    avgCookies,
    fpRate,
    globalAvgScore: globalStats.avgScore,
    globalAvgTrackers: globalStats.avgTrackers,
    globalFpRate: globalStats.fpRate,
  });

  // Top 10 best and worst
  const bestDomains = [...domains]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(mapDomainRow);

  const worstDomains = [...domains]
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .map(mapDomainRow);

  // Most tracked in category
  const mostTracked = [...domains]
    .sort((a, b) => Number(b.tracker_count) - Number(a.tracker_count))
    .slice(0, 10)
    .map(mapDomainRow);

  return {
    sampleSize: domains.length,
    stats: {
      avgScore,
      medianScore,
      avgTrackers,
      avgCookies,
      fingerprintingRate: fpRate,
    },
    globalComparison: {
      avgScore: globalStats.avgScore,
      avgTrackers: globalStats.avgTrackers,
      fingerprintingRate: globalStats.fpRate,
      totalDomains: globalStats.totalDomains,
    },
    gradeDistribution,
    keyFindings,
    bestDomains,
    worstDomains,
    mostTracked,
    topTrackers: topTrackers.map((t) => ({
      name: t.title,
      slug: slugifyTracker(t.title),
      domainCount: Number(t.domain_count),
      penetration: Math.round((Number(t.domain_count) / domains.length) * 100),
    })),
  };
}

// ─── Cross-Category Report ──────────────────────────────────────────────

async function buildCrossCategoryReport(): Promise<Record<string, unknown>> {
  // Global stats
  const globalStats = await getGlobalStats();

  // Per-category breakdown
  const categoryBreakdown = await prisma.$queryRaw<RawCategoryStatsRow[]>`
    SELECT
      c.name, c.slug,
      COUNT(DISTINCT d.id)::bigint as domain_count,
      AVG(s.score)::float as avg_score,
      AVG((SELECT COUNT(*) FROM "Evidence" e
           WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker'))
      )::float as avg_trackers,
      AVG(CASE WHEN EXISTS(SELECT 1 FROM "Evidence" e
           WHERE e."scanId" = s.id AND e.kind = 'fingerprint') THEN 1.0 ELSE 0.0 END
      )::float as fingerprinting_rate
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    JOIN "Category" c ON d."categoryId" = c.id
    WHERE s.status = 'done' AND d."scanCount" >= 2
    GROUP BY c.name, c.slug
    HAVING COUNT(DISTINCT d.id) >= 5
    ORDER BY avg_score ASC
  `;

  // Top 20 most-tracked domains globally
  const mostTracked = await prisma.$queryRaw<RawDomainMetricRow[]>`
    SELECT
      d.domain, d."displayName" as display_name, s.score,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker')) as tracker_count,
      (SELECT COUNT(*)::bigint FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'cookie') as cookie_count,
      EXISTS(SELECT 1 FROM "Evidence" e
       WHERE e."scanId" = s.id AND e.kind = 'fingerprint') as has_fingerprinting,
      c.name as category_name, c.slug as category_slug
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    LEFT JOIN "Category" c ON d."categoryId" = c.id
    WHERE s.status = 'done' AND d."scanCount" >= 2
    ORDER BY tracker_count DESC
    LIMIT 20
  `;

  // Top trackers globally
  const topTrackers = await prisma.$queryRaw<RawTrackerPopRow[]>`
    SELECT e.title, COUNT(DISTINCT d.id)::bigint as domain_count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    WHERE e.kind IN ('tracker', 'third_party_tracker')
      AND s.status = 'done' AND d."scanCount" >= 2
    GROUP BY e.title
    ORDER BY domain_count DESC
    LIMIT 15
  `;

  // Score distribution
  const scoreDist = await prisma.$queryRaw<RawScoreDistRow[]>`
    SELECT
      CASE
        WHEN s.score >= 90 THEN 'A (90-100)'
        WHEN s.score >= 80 THEN 'B (80-89)'
        WHEN s.score >= 70 THEN 'C (70-79)'
        WHEN s.score >= 60 THEN 'D (60-69)'
        ELSE 'F (0-59)'
      END as range,
      COUNT(*)::bigint as count
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE s.status = 'done' AND d."scanCount" >= 2
    GROUP BY range
    ORDER BY range
  `;

  const categories = categoryBreakdown.map((c) => ({
    name: c.name,
    slug: c.slug,
    domainCount: Number(c.domain_count),
    avgScore: Math.round(c.avg_score * 10) / 10,
    avgTrackers: Math.round(c.avg_trackers * 10) / 10,
    fingerprintingRate: Math.round(c.fingerprinting_rate * 100),
  }));

  // Key findings
  const bestCategory = categories.reduce((a, b) => (a.avgScore > b.avgScore ? a : b));
  const worstCategory = categories.reduce((a, b) => (a.avgScore < b.avgScore ? a : b));
  const mostFpCategory = categories.reduce((a, b) => (a.fingerprintingRate > b.fingerprintingRate ? a : b));

  const keyFindings = [
    `We analyzed ${globalStats.totalDomains.toLocaleString()} domains across ${categories.length} industries. The global average privacy score is ${globalStats.avgScore}/100.`,
    `${bestCategory.name} has the highest average privacy score (${bestCategory.avgScore}/100), while ${worstCategory.name} has the lowest (${worstCategory.avgScore}/100).`,
    `The average website loads ${globalStats.avgTrackers} third-party trackers. ${globalStats.fpRate}% of all scanned domains use browser fingerprinting.`,
    `${mostFpCategory.name} has the highest fingerprinting adoption rate at ${mostFpCategory.fingerprintingRate}% of domains.`,
  ];

  return {
    stats: {
      totalDomains: globalStats.totalDomains,
      avgScore: globalStats.avgScore,
      medianScore: globalStats.medianScore,
      avgTrackers: globalStats.avgTrackers,
      avgCookies: globalStats.avgCookies,
      fingerprintingRate: globalStats.fpRate,
    },
    keyFindings,
    categoryBreakdown: categories,
    scoreDistribution: scoreDist.map((s) => ({
      range: s.range,
      count: Number(s.count),
    })),
    mostTracked: mostTracked.map(mapDomainRow),
    topTrackers: topTrackers.map((t) => ({
      name: t.title,
      slug: slugifyTracker(t.title),
      domainCount: Number(t.domain_count),
    })),
  };
}

// ─── Tracker Landscape Report ───────────────────────────────────────────

async function buildTrackerLandscapeReport(): Promise<Record<string, unknown>> {
  const globalStats = await getGlobalStats();

  // Top 25 trackers with category penetration
  const topTrackers = await prisma.$queryRaw<RawTrackerPopRow[]>`
    SELECT e.title, COUNT(DISTINCT d.id)::bigint as domain_count
    FROM "Evidence" e
    JOIN "Scan" s ON e."scanId" = s.id
    JOIN "Domain" d ON d."latestScanId" = s.id
    WHERE e.kind IN ('tracker', 'third_party_tracker')
      AND s.status = 'done' AND d."scanCount" >= 2
    GROUP BY e.title
    ORDER BY domain_count DESC
    LIMIT 25
  `;

  // For each top tracker, get category breakdown
  const trackerDetails = [];
  for (const t of topTrackers.slice(0, 10)) {
    const catBreakdown = await prisma.$queryRaw<Array<{ category_name: string; category_slug: string; count: bigint }>>`
      SELECT c.name as category_name, c.slug as category_slug, COUNT(DISTINCT d.id)::bigint as count
      FROM "Evidence" e
      JOIN "Scan" s ON e."scanId" = s.id
      JOIN "Domain" d ON d."latestScanId" = s.id
      JOIN "Category" c ON d."categoryId" = c.id
      WHERE e.title = ${t.title}
        AND e.kind IN ('tracker', 'third_party_tracker')
        AND s.status = 'done' AND d."scanCount" >= 2
      GROUP BY c.name, c.slug
      ORDER BY count DESC
      LIMIT 5
    `;

    trackerDetails.push({
      name: t.title,
      slug: slugifyTracker(t.title),
      domainCount: Number(t.domain_count),
      penetration: Math.round((Number(t.domain_count) / globalStats.totalDomains) * 100 * 10) / 10,
      topCategories: catBreakdown.map((c) => ({
        name: c.category_name,
        slug: c.category_slug,
        count: Number(c.count),
      })),
    });
  }

  // Tracker ecosystem: group by vendor
  const vendorMap: Record<string, { trackers: string[]; totalDomains: number }> = {};
  for (const t of topTrackers) {
    const vendor = inferVendor(t.title);
    if (!vendorMap[vendor]) vendorMap[vendor] = { trackers: [], totalDomains: 0 };
    vendorMap[vendor].trackers.push(t.title);
    vendorMap[vendor].totalDomains += Number(t.domain_count);
  }

  const vendorBreakdown = Object.entries(vendorMap)
    .map(([vendor, data]) => ({ vendor, ...data }))
    .sort((a, b) => b.totalDomains - a.totalDomains);

  const keyFindings = [
    `${topTrackers[0]?.title || 'The top tracker'} is the most widely deployed tracker, found on ${Number(topTrackers[0]?.domain_count || 0).toLocaleString()} domains (${Math.round((Number(topTrackers[0]?.domain_count || 0) / globalStats.totalDomains) * 100)}% of all scanned sites).`,
    `The top 5 trackers collectively appear on the majority of websites we scanned, suggesting significant market concentration.`,
    `${vendorBreakdown[0]?.vendor || 'Google'} dominates the tracker landscape with ${vendorBreakdown[0]?.trackers.length || 0} distinct tracking technologies in the top 25.`,
    `${globalStats.fpRate}% of websites use browser fingerprinting in addition to traditional cookie-based tracking.`,
  ];

  return {
    stats: {
      totalDomains: globalStats.totalDomains,
      totalTrackers: topTrackers.length,
      avgTrackersPerSite: globalStats.avgTrackers,
      fingerprintingRate: globalStats.fpRate,
    },
    keyFindings,
    topTrackers: topTrackers.map((t) => ({
      name: t.title,
      slug: slugifyTracker(t.title),
      domainCount: Number(t.domain_count),
      penetration: Math.round((Number(t.domain_count) / globalStats.totalDomains) * 100 * 10) / 10,
    })),
    trackerDetails,
    vendorBreakdown,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

async function getGlobalStats(): Promise<{
  totalDomains: number;
  avgScore: number;
  medianScore: number;
  avgTrackers: number;
  avgCookies: number;
  fpRate: number;
}> {
  const cached = await CacheService.get<ReturnType<typeof getGlobalStats> extends Promise<infer T> ? T : never>('research:global-stats');
  if (cached) return cached;

  const rows = await prisma.$queryRaw<RawGlobalStatsRow[]>`
    SELECT
      COUNT(DISTINCT d.id)::bigint as total_domains,
      AVG(s.score)::float as avg_score,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score)::float as median_score,
      AVG((SELECT COUNT(*) FROM "Evidence" e
           WHERE e."scanId" = s.id AND e.kind IN ('tracker', 'third_party_tracker'))
      )::float as avg_tracker_count,
      AVG((SELECT COUNT(*) FROM "Evidence" e
           WHERE e."scanId" = s.id AND e.kind = 'cookie')
      )::float as avg_cookie_count,
      AVG(CASE WHEN EXISTS(SELECT 1 FROM "Evidence" e
           WHERE e."scanId" = s.id AND e.kind = 'fingerprint') THEN 1.0 ELSE 0.0 END
      )::float as fingerprinting_rate
    FROM "Domain" d
    JOIN "Scan" s ON d."latestScanId" = s.id
    WHERE s.status = 'done' AND d."scanCount" >= 2
  `;

  const r = rows[0];
  const stats = {
    totalDomains: Number(r?.total_domains || 0),
    avgScore: Math.round((r?.avg_score || 0) * 10) / 10,
    medianScore: Math.round(r?.median_score || 0),
    avgTrackers: Math.round((r?.avg_tracker_count || 0) * 10) / 10,
    avgCookies: Math.round((r?.avg_cookie_count || 0) * 10) / 10,
    fpRate: Math.round((r?.fingerprinting_rate || 0) * 100),
  };

  await CacheService.set('research:global-stats', stats, CACHE_TTL);
  return stats;
}

function mapDomainRow(d: RawDomainMetricRow) {
  return {
    domain: d.domain,
    displayName: d.display_name || d.domain,
    score: d.score,
    label: labelForScore(d.score),
    trackerCount: Number(d.tracker_count),
    cookieCount: Number(d.cookie_count),
    hasFingerprinting: d.has_fingerprinting,
    category: d.category_name,
    categorySlug: d.category_slug,
  };
}

function inferVendor(trackerName: string): string {
  const lower = trackerName.toLowerCase();
  if (lower.includes('google') || lower.includes('doubleclick') || lower.includes('youtube')) return 'Google';
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'Meta';
  if (lower.includes('amazon') || lower.includes('aws')) return 'Amazon';
  if (lower.includes('microsoft') || lower.includes('bing') || lower.includes('linkedin')) return 'Microsoft';
  if (lower.includes('tiktok') || lower.includes('bytedance')) return 'TikTok/ByteDance';
  if (lower.includes('twitter') || lower.includes('x.com')) return 'X (Twitter)';
  if (lower.includes('adobe')) return 'Adobe';
  if (lower.includes('oracle') || lower.includes('bluekai')) return 'Oracle';
  return 'Other';
}

function generateCategoryFindings(data: {
  categoryName: string;
  sampleSize: number;
  avgScore: number;
  medianScore: number;
  avgTrackers: number;
  avgCookies: number;
  fpRate: number;
  globalAvgScore: number;
  globalAvgTrackers: number;
  globalFpRate: number;
}): string[] {
  const findings: string[] = [];

  findings.push(
    `We analyzed ${data.sampleSize} ${data.categoryName} domains. The average privacy score is ${data.avgScore}/100 (median: ${data.medianScore}/100).`
  );

  const scoreDiff = Math.round((data.avgScore - data.globalAvgScore) * 10) / 10;
  if (Math.abs(scoreDiff) >= 2) {
    findings.push(
      scoreDiff > 0
        ? `${data.categoryName} domains score ${scoreDiff} points above the global average of ${data.globalAvgScore}/100.`
        : `${data.categoryName} domains score ${Math.abs(scoreDiff)} points below the global average of ${data.globalAvgScore}/100.`
    );
  }

  findings.push(
    `The average ${data.categoryName} website loads ${data.avgTrackers} trackers and ${data.avgCookies} cookies.`
  );

  if (data.fpRate > 0) {
    const fpDiff = data.fpRate - data.globalFpRate;
    if (Math.abs(fpDiff) >= 5) {
      findings.push(
        `${data.fpRate}% of ${data.categoryName} domains use fingerprinting — ${fpDiff > 0 ? `${fpDiff} percentage points above` : `${Math.abs(fpDiff)} percentage points below`} the global rate of ${data.globalFpRate}%.`
      );
    } else {
      findings.push(
        `${data.fpRate}% of ${data.categoryName} domains use browser fingerprinting (global average: ${data.globalFpRate}%).`
      );
    }
  }

  return findings;
}
