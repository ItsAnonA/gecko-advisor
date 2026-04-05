/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Narrative Context API (Phase A - SEO Architecture)
 *
 * Provides consolidated data for domain page narrative generation.
 * Single endpoint returns all context needed to generate 500-900 word narratives.
 */

import { Router } from 'express';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { CacheService } from '../cache.js';
import { analyzeTrackerPurposes } from '@gecko-advisor/shared';

// TLD suffixes to strip when converting tracker domain to technology page slug
const TLD_STRIP_REGEX = /\.(com|net|org|io|co|js|tv|me|info|cloud)$/;

// ── Cookie Persistence Analysis ──

type PersistenceBand = 'session-only' | 'short-lived' | 'mixed' | 'long-lived';

interface CookiePersistence {
  sessionCount: number;
  shortLivedCount: number;   // < 24h
  mediumLivedCount: number;  // 1-30 days
  longLivedCount: number;    // > 30 days
  maxDaysObserved: number;
  persistenceBand: PersistenceBand;
}

function parseCookiePersistence(cookieEvidence: Array<{ details: unknown }>): CookiePersistence {
  let sessionCount = 0;
  let shortLivedCount = 0;
  let mediumLivedCount = 0;
  let longLivedCount = 0;
  let maxDaysObserved = 0;

  for (const ev of cookieEvidence) {
    const details = ev.details as Record<string, unknown> | null;
    const cookieStr = (details?.cookie as string) || '';
    const days = extractCookieDays(cookieStr);

    if (days === null) {
      sessionCount++;
    } else if (days < 1) {
      shortLivedCount++;
    } else if (days <= 30) {
      mediumLivedCount++;
    } else {
      longLivedCount++;
    }

    if (days !== null && days > maxDaysObserved) {
      maxDaysObserved = Math.round(days);
    }
  }

  const total = cookieEvidence.length || 1;
  let persistenceBand: PersistenceBand;
  if (total === 0 || sessionCount === total) {
    persistenceBand = 'session-only';
  } else if (longLivedCount / total > 0.5) {
    persistenceBand = 'long-lived';
  } else if (shortLivedCount / total > 0.5 || (sessionCount + shortLivedCount) / total > 0.7) {
    persistenceBand = 'short-lived';
  } else {
    persistenceBand = 'mixed';
  }

  return { sessionCount, shortLivedCount, mediumLivedCount, longLivedCount, maxDaysObserved, persistenceBand };
}

function extractCookieDays(cookieStr: string): number | null {
  const lower = cookieStr.toLowerCase();

  // Try max-age first (seconds)
  const maxAgeMatch = lower.match(/max-age\s*=\s*(\d+)/);
  if (maxAgeMatch) {
    return parseInt(maxAgeMatch[1]!, 10) / 86400;
  }

  // Try expires
  const expiresMatch = cookieStr.match(/expires\s*=\s*([^;]+)/i);
  if (expiresMatch) {
    const expiresDate = new Date(expiresMatch[1]!.trim());
    if (!isNaN(expiresDate.getTime())) {
      return (expiresDate.getTime() - Date.now()) / (1000 * 86400);
    }
  }

  // No expiry = session cookie
  return null;
}

function trackerDomainToSlug(domain: string): string {
  return domain.replace(TLD_STRIP_REGEX, '').replace(/\./g, '-');
}

export const narrativeV2Router = Router();

// GET /api/v2/stats/global — Global dataset statistics
narrativeV2Router.get('/stats/global', async (_req, res) => {
  try {
    const stats = await CacheService.getOrSet(
      'narrative:global_stats',
      async () => {
        const [domainCount, scoreAgg, findingsCount] = await Promise.all([
          prisma.domain.count({ where: { scanCount: { gte: 2 } } }),
          prisma.$queryRaw<Array<{ avg_score: number; median_score: number; avg_trackers: number; avg_cookies: number }>>`
            SELECT
              AVG(s.score)::float as avg_score,
              PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score)::float as median_score,
              AVG(tracker_counts.count)::float as avg_trackers,
              AVG(cookie_counts.count)::float as avg_cookies
            FROM "Domain" d
            JOIN "Scan" s ON d."latestScanId" = s.id
            LEFT JOIN LATERAL (
              SELECT COUNT(*) as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'tracker'
            ) tracker_counts ON true
            LEFT JOIN LATERAL (
              SELECT COUNT(*) as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'cookie'
            ) cookie_counts ON true
            WHERE s.status = 'done' AND s.score IS NOT NULL AND d."scanCount" >= 2
          `,
          prisma.evidence.count(),
        ]);

        const agg = scoreAgg[0] || { avg_score: 0, median_score: 0, avg_trackers: 0, avg_cookies: 0 };

        return {
          totalDomains: domainCount,
          avgPrivacyScore: Math.round((agg.avg_score || 0) * 10) / 10,
          medianPrivacyScore: Math.round(agg.median_score || 0),
          avgTrackerCount: Math.round((agg.avg_trackers || 0) * 10) / 10,
          avgCookieCount: Math.round((agg.avg_cookies || 0) * 10) / 10,
          totalFindings: findingsCount,
        };
      },
      3600 // 1 hour
    );

    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error fetching global stats');
    return problem(res, 500, 'Failed to get global stats');
  }
});

// GET /api/v2/categories/:slug/stats — Category statistics for narrative
narrativeV2Router.get('/categories/:slug/stats', async (req, res) => {
  try {
    const { slug } = req.params;

    const stats = await CacheService.getOrSet(
      `narrative:category_stats:${slug}`,
      async () => {
        const category = await prisma.category.findUnique({
          where: { slug },
          select: { id: true, name: true, slug: true },
        });

        if (!category) return null;

        // Get domains in this category with their latest scan
        const domains = await prisma.domain.findMany({
          where: {
            categoryId: category.id,
            scanCount: { gte: 2 },
            latestScanId: { not: null },
            latestScan: { status: 'done', score: { not: null } },
          },
          select: {
            domain: true,
            latestScan: {
              select: { score: true },
            },
          },
          orderBy: { latestScan: { score: 'desc' } },
        });

        if (domains.length === 0) {
          return {
            categoryName: category.name,
            slug: category.slug,
            avgPrivacyScore: 0,
            medianPrivacyScore: 0,
            avgTrackerCount: 0,
            avgCookieCount: 0,
            totalDomains: 0,
            topDomain: '',
            topScore: 0,
            bottomDomain: '',
            bottomScore: 0,
            zeroTrackerCount: 0,
            topTrackers: [],
          };
        }

        // Aggregate stats using raw query for efficiency
        const agg = await prisma.$queryRaw<Array<{
          avg_score: number;
          median_score: number;
          avg_trackers: number;
          avg_cookies: number;
          zero_tracker_count: number;
        }>>`
          SELECT
            AVG(s.score)::float as avg_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score)::float as median_score,
            AVG(tc.count)::float as avg_trackers,
            AVG(cc.count)::float as avg_cookies,
            COUNT(CASE WHEN tc.count = 0 THEN 1 END)::int as zero_tracker_count
          FROM "Domain" d
          JOIN "Scan" s ON d."latestScanId" = s.id
          LEFT JOIN LATERAL (
            SELECT COUNT(*) as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'tracker'
          ) tc ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*) as count FROM "Evidence" WHERE "scanId" = s.id AND kind = 'cookie'
          ) cc ON true
          WHERE d."categoryId" = ${category.id}
            AND s.status = 'done'
            AND s.score IS NOT NULL
            AND d."scanCount" >= 2
        `;

        // Top trackers in category
        const topTrackers = await prisma.$queryRaw<Array<{ name: string; count: number }>>`
          SELECT e.title as name, COUNT(DISTINCT d.id)::int as count
          FROM "Evidence" e
          JOIN "Scan" s ON e."scanId" = s.id
          JOIN "Domain" d ON s."domainId" = d.id
          WHERE e.kind = 'tracker'
            AND d."categoryId" = ${category.id}
            AND s.id = d."latestScanId"
            AND d."scanCount" >= 2
          GROUP BY e.title
          ORDER BY count DESC
          LIMIT 10
        `;

        const topDomain = domains[0]!;
        const bottomDomain = domains[domains.length - 1]!;
        const stats = agg[0] || { avg_score: 0, median_score: 0, avg_trackers: 0, avg_cookies: 0, zero_tracker_count: 0 };

        return {
          categoryName: category.name,
          slug: category.slug,
          avgPrivacyScore: Math.round((stats.avg_score || 0) * 10) / 10,
          medianPrivacyScore: Math.round(stats.median_score || 0),
          avgTrackerCount: Math.round((stats.avg_trackers || 0) * 10) / 10,
          avgCookieCount: Math.round((stats.avg_cookies || 0) * 10) / 10,
          totalDomains: domains.length,
          topDomain: topDomain.domain,
          topScore: topDomain.latestScan?.score || 0,
          bottomDomain: bottomDomain.domain,
          bottomScore: bottomDomain.latestScan?.score || 0,
          zeroTrackerCount: Number(stats.zero_tracker_count) || 0,
          topTrackers: topTrackers.map(t => ({ name: t.name, count: Number(t.count) })),
        };
      },
      3600 // 1 hour
    );

    if (!stats) {
      return problem(res, 404, 'Category not found');
    }

    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error fetching category stats');
    return problem(res, 500, 'Failed to get category stats');
  }
});

// GET /api/v2/domain/:domain/narrative-context — All narrative data in one call
narrativeV2Router.get('/domain/:domain/narrative-context', async (req, res) => {
  try {
    const { domain: domainName } = req.params;

    const result = await CacheService.getOrSet(
      `narrative:domain:${domainName}`,
      async () => {
        // Find the domain
        const domain = await prisma.domain.findUnique({
          where: { domain: domainName },
          select: {
            id: true,
            domain: true,
            displayName: true,
            scanCount: true,
            categoryId: true,
            latestScanId: true,
            trackerPercentile: true,
            scorePercentile: true,
            categoryRank: true,
            globalRank: true,
            hasRareTracker: true,
            rarestTracker: true,
            rarestTrackerDomainCount: true,
            category: { select: { slug: true, name: true } },
            stability: {
              select: {
                confidenceTier: true,
                trend: true,
              },
            },
            latestScan: {
              select: {
                id: true,
                score: true,
                finishedAt: true,
              },
            },
          },
        });

        if (!domain || !domain.latestScan) return null;

        // Parallel data fetching
        const [scanHistory, trackerEvidence, cookieEvidence, relatedDomains] = await Promise.all([
          // Scan history (last 10 scans)
          prisma.scan.findMany({
            where: {
              domainId: domain.id,
              status: 'done',
              score: { not: null },
            },
            orderBy: { finishedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              score: true,
              finishedAt: true,
            },
          }),

          // Tracker evidence from latest scan (include details.domain for technology links)
          prisma.evidence.findMany({
            where: {
              scanId: domain.latestScanId!,
              kind: 'tracker',
            },
            select: { title: true, details: true },
          }),

          // Cookie evidence from latest scan
          prisma.evidence.findMany({
            where: {
              scanId: domain.latestScanId!,
              kind: 'cookie',
            },
            select: {
              title: true,
              details: true,
            },
          }),

          // Related domains in same category (15 closest by score, ranked by tier + depth)
          domain.categoryId
            ? prisma.domain.findMany({
                where: {
                  categoryId: domain.categoryId,
                  id: { not: domain.id },
                  scanCount: { gte: 2 },
                  isIndexed: true,
                  latestScan: { status: 'done', score: { not: null } },
                },
                orderBy: [
                  { tierScore: 'desc' },
                  { scanCount: 'desc' },
                  { latestScan: { score: 'desc' } },
                ],
                take: 15,
                select: {
                  domain: true,
                  displayName: true,
                  latestScan: { select: { score: true } },
                },
              })
            : Promise.resolve([]),
        ]);

        // Get tracker names from all historical scans for change detection
        const scanIds = scanHistory.map(s => s.id);
        const historicalTrackers = scanIds.length > 0
          ? await prisma.evidence.findMany({
              where: { scanId: { in: scanIds }, kind: 'tracker' },
              select: { scanId: true, title: true },
            })
          : [];

        const trackersByScan = new Map<string, string[]>();
        for (const ev of historicalTrackers) {
          const list = trackersByScan.get(ev.scanId) || [];
          list.push(ev.title);
          trackersByScan.set(ev.scanId, list);
        }

        // Get global count for each tracker (how many domains use it)
        const trackerNames = trackerEvidence.map(e => e.title);
        const trackerGlobalCounts = trackerNames.length > 0
          ? await prisma.$queryRaw<Array<{ title: string; count: bigint }>>`
              SELECT e.title, COUNT(DISTINCT d.id) as count
              FROM "Evidence" e
              JOIN "Scan" s ON e."scanId" = s.id
              JOIN "Domain" d ON s."domainId" = d.id
              WHERE e.kind = 'tracker'
                AND e.title = ANY(${trackerNames})
                AND s.id = d."latestScanId"
              GROUP BY e.title
            `
          : [];

        const globalCountMap = new Map<string, number>();
        for (const row of trackerGlobalCounts) {
          globalCountMap.set(row.title, Number(row.count));
        }

        // Count cookies by party
        let firstPartyCookies = 0;
        let thirdPartyCookies = 0;
        for (const cookie of cookieEvidence) {
          const details = cookie.details as Record<string, unknown> | null;
          if (details && details.thirdParty === true) {
            thirdPartyCookies++;
          } else {
            firstPartyCookies++;
          }
        }

        // ── Tracker purpose analysis ──
        const trackerDomainsList: string[] = [];
        for (const ev of trackerEvidence) {
          const details = ev.details as Record<string, unknown> | null;
          const td = details?.domain as string | undefined;
          if (td) trackerDomainsList.push(td);
        }
        const purposeAnalysis = analyzeTrackerPurposes(trackerDomainsList);

        // ── Cookie persistence analysis ──
        const cookiePersistence = parseCookiePersistence(cookieEvidence);

        // ── Category quartile (from scorePercentile already on Domain model) ──
        let categoryQuartile: string | null = null;
        let scoreDeltaVsCategoryMedian: number | null = null;
        const pct = domain.scorePercentile;
        if (pct !== null && pct !== undefined) {
          if (pct >= 75) categoryQuartile = 'top';
          else if (pct >= 50) categoryQuartile = 'upper';
          else if (pct >= 25) categoryQuartile = 'lower';
          else categoryQuartile = 'bottom';
        }

        // Same-tracker domains (top 5 trackers, 4 domains each — strengthens crawl graph)
        const sameTrackerDomains: Record<string, string[]> = {};
        const topTrackers = trackerNames.slice(0, 5);
        if (topTrackers.length > 0) {
          for (const trackerName of topTrackers) {
            const others = await prisma.$queryRaw<Array<{ domain: string }>>`
              SELECT DISTINCT d.domain
              FROM "Evidence" e
              JOIN "Scan" s ON e."scanId" = s.id
              JOIN "Domain" d ON s."domainId" = d.id
              WHERE e.kind = 'tracker'
                AND e.title = ${trackerName}
                AND s.id = d."latestScanId"
                AND d.domain != ${domainName}
                AND d."isIndexed" = true
              LIMIT 4
            `;
            sameTrackerDomains[trackerName] = others.map(o => o.domain);
          }
        }

        return {
          domain: {
            name: domain.domain,
            displayName: domain.displayName || domain.domain,
            privacyScore: domain.latestScan.score || 0,
            trackerCount: trackerEvidence.length,
            cookieCount: cookieEvidence.length,
            scanCount: domain.scanCount,
            stabilityTier: domain.stability?.confidenceTier || 'PROVISIONAL',
            trend: domain.stability?.trend || 'STABLE',
            categoryName: domain.category?.name || null,
            trackerPercentile: domain.trackerPercentile,
            scorePercentile: domain.scorePercentile,
            categoryRank: domain.categoryRank,
            globalRank: domain.globalRank,
            hasRareTracker: domain.hasRareTracker,
            rarestTracker: domain.rarestTracker,
            rarestTrackerDomainCount: domain.rarestTrackerDomainCount,
            firstPartyCookies,
            thirdPartyCookies,
            trackers: trackerEvidence.map(e => ({
              name: e.title,
              globalDomainCount: globalCountMap.get(e.title) || 0,
            })),
            purposeAnalysis,
            cookiePersistence,
            categoryQuartile,
            scoreDeltaVsCategoryMedian,
          },
          scanHistory: scanHistory.map(s => ({
            date: s.finishedAt?.toISOString() || '',
            privacyScore: s.score || 0,
            trackerCount: (trackersByScan.get(s.id) || []).length,
            trackers: trackersByScan.get(s.id) || [],
          })),
          relatedDomains: relatedDomains.map(d => {
            const relScore = d.latestScan?.score || 0;
            const myScore = domain.latestScan?.score || 0;
            const scoreDiff = Math.abs(relScore - myScore);
            const relationReason = scoreDiff <= 10
              ? 'same-category-similar-score' as const
              : 'same-category' as const;
            return {
              domain: d.domain,
              displayName: d.displayName || d.domain,
              privacyScore: relScore,
              relationReason,
            };
          }),
          sameTrackerDomains,
          // Cluster anchors: technology page links derived from tracker domains
          technologyLinks: (() => {
            const seen = new Set<string>();
            const links: Array<{ name: string; slug: string }> = [];
            for (const ev of trackerEvidence) {
              const details = ev.details as Record<string, unknown> | null;
              const trackerDomain = details?.domain as string | undefined;
              if (!trackerDomain) continue;
              const slug = trackerDomainToSlug(trackerDomain);
              if (seen.has(slug)) continue;
              seen.add(slug);
              links.push({ name: ev.title, slug });
              if (links.length >= 5) break; // Top 5 trackers → technology pages
            }
            return links;
          })(),
          // Category slug for upward linking
          categorySlug: domain.category?.name
            ? domain.category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')
            : null,
        };
      },
      3600 // 1 hour
    );

    if (!result) {
      return problem(res, 404, 'Domain not found');
    }

    res.json(result);
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error fetching narrative context');
    return problem(res, 500, 'Failed to get narrative context');
  }
});
