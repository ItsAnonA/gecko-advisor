/**
 * Technologies API - SEO Authority Pages
 *
 * Serves aggregated tracker/technology data for authority pages:
 * - GET /api/v2/technologies       - Top 50 trackers by prevalence
 * - GET /api/v2/technologies/:slug - Detail page for a specific tracker
 */

import { Router } from 'express';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

const CACHE_MAX_AGE = 21600; // 6 hours

// Common TLD suffixes to try when reversing a slug to a tracker domain
const TLD_CANDIDATES = ['.com', '.net', '.org', '.io', '.co', '.js', '.tv', '.me', '.info', '.cloud'];

// TLD suffixes to strip when converting tracker domain to slug
const TLD_STRIP_REGEX = /\.(com|net|org|io|co|js|tv|me|info|cloud)$/;

// Risk mapping by tracker category
const RISK_BY_CATEGORY: Record<string, string> = {
  Advertising: 'High',
  'Ad Network': 'High',
  'Ad Exchange': 'High',
  Analytics: 'Medium',
  Social: 'Medium',
  'Social Media': 'Medium',
  CDN: 'Low',
  Essential: 'Low',
  Hosting: 'Low',
  Utility: 'Low',
};

function categoryToRisk(category: string | null): string {
  if (!category) return 'Medium';
  return RISK_BY_CATEGORY[category] ?? 'Medium';
}

function trackerDomainToSlug(domain: string): string {
  return domain.replace(TLD_STRIP_REGEX, '').replace(/\./g, '-');
}

function slugToTrackerDomainCandidates(slug: string): string[] {
  // The slug may have been created by replacing dots with hyphens,
  // but the original domain may also contain hyphens (e.g. google-analytics.com).
  // Generate candidates with both interpretations.
  const dotsOnly = slug.replace(/-/g, '.');
  const candidates = new Set<string>();
  for (const tld of TLD_CANDIDATES) {
    candidates.add(dotsOnly + tld);        // all hyphens → dots
    candidates.add(slug + tld);             // keep original hyphens
  }
  return [...candidates];
}

function generateDescription(name: string | null, category: string | null): string {
  if (name && category) {
    return `${name} is a third-party ${category.toLowerCase()} technology.`;
  }
  if (name) {
    return `${name} is a third-party web technology.`;
  }
  if (category) {
    return `Third-party ${category.toLowerCase()} technology.`;
  }
  return 'Third-party web technology.';
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export const technologiesV2Router = Router();

/**
 * GET /api/v2/technologies
 * Returns top 50 trackers by prevalence (from most recent WEEKLY TrackerTrend)
 */
technologiesV2Router.get('/v2/technologies', async (_req, res) => {
  try {
    // Get the most recent WEEKLY period trackers, ordered by domain count (prevalence)
    const trends = await prisma.trackerTrend.findMany({
      where: { periodType: 'WEEKLY' },
      orderBy: [{ periodStart: 'desc' }],
      // Grab enough to deduplicate by trackerDomain and still get 50
      take: 200,
    });

    // Deduplicate: keep only the most recent entry per trackerDomain
    const seen = new Set<string>();
    const unique: typeof trends = [];
    for (const t of trends) {
      if (!seen.has(t.trackerDomain)) {
        seen.add(t.trackerDomain);
        unique.push(t);
      }
      if (unique.length >= 50) break;
    }

    // Get total distinct tracker count for context
    const totalTrackers = await prisma.trackerTrend.groupBy({
      by: ['trackerDomain'],
      where: { periodType: 'WEEKLY' },
    });

    // Get total scanned domains (all tiers) for prevalence calculation
    const totalDomains = await prisma.domain.count({
      where: {
        latestScan: { status: 'done', score: { not: null } },
      },
    });

    const technologies = unique.map((t) => ({
      slug: trackerDomainToSlug(t.trackerDomain),
      name: t.trackerName ?? t.trackerDomain,
      domain: t.trackerDomain,
      category: t.trackerCategory ?? 'Unknown',
      prevalence:
        totalDomains > 0
          ? Math.round((t.domainCount / totalDomains) * 1000) / 10
          : 0,
      adoptionTrend: t.adoptionTrend,
      siteCount: t.domainCount,
    }));

    // Sort by siteCount descending (most prevalent first)
    technologies.sort((a, b) => b.siteCount - a.siteCount);

    const lastEntry = unique[0];
    const lastUpdated = lastEntry
      ? lastEntry.periodEnd.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    res.set('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE}`);
    res.json({
      technologies,
      totalTrackers: totalTrackers.length,
      lastUpdated,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching technologies list');
    return problem(res, 500, 'Failed to fetch technologies');
  }
});

/**
 * GET /api/v2/technologies/:slug
 * Returns detail for a specific tracker technology
 */
technologiesV2Router.get('/v2/technologies/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Try to find the matching TrackerTrend by converting slug back to domain
    const candidates = slugToTrackerDomainCandidates(slug);

    // Find the most recent WEEKLY trend for any matching domain candidate
    let trend = await prisma.trackerTrend.findFirst({
      where: {
        trackerDomain: { in: candidates },
        periodType: 'WEEKLY',
      },
      orderBy: { periodStart: 'desc' },
    });

    // If no match with TLD candidates, try exact match (slug might already be a domain)
    if (!trend) {
      trend = await prisma.trackerTrend.findFirst({
        where: {
          trackerDomain: slug,
          periodType: 'WEEKLY',
        },
        orderBy: { periodStart: 'desc' },
      });
    }

    if (!trend) {
      return problem(res, 404, 'Technology not found');
    }

    const trackerDomain = trend.trackerDomain;

    // Get total scanned domains (all tiers) for prevalence calculation
    const totalDomains = await prisma.domain.count({
      where: {
        latestScan: { status: 'done', score: { not: null } },
      },
    });

    // Find domains using this tracker via Evidence table
    // Use JSON path filtering on the details field
    const evidenceWithDomains = await prisma.evidence.findMany({
      where: {
        kind: 'tracker',
        details: {
          path: ['domain'],
          string_contains: trackerDomain,
        },
      },
      select: {
        scan: {
          select: {
            score: true,
            domain: {
              select: {
                domain: true,
              },
            },
            evidence: {
              where: { kind: 'tracker' },
              select: { id: true },
            },
          },
        },
      },
      take: 500, // Over-fetch to deduplicate
    });

    // Deduplicate by domain and build domain list
    const domainMap = new Map<
      string,
      { domain: string; score: number; grade: string; trackers: number }
    >();

    for (const ev of evidenceWithDomains) {
      const scan = ev.scan;
      if (!scan?.domain?.domain || scan.score == null) continue;

      const d = scan.domain.domain;
      // Keep the entry with the most recent data (first seen since we don't sort)
      if (!domainMap.has(d)) {
        domainMap.set(d, {
          domain: d,
          score: scan.score,
          grade: scoreToGrade(scan.score),
          trackers: scan.evidence.length,
        });
      }
    }

    const domains = Array.from(domainMap.values())
      .sort((a, b) => a.score - b.score) // lowest score first (most interesting)
      .slice(0, 100);

    // Calculate stats
    const totalSites = domainMap.size;
    const allScores = Array.from(domainMap.values()).map((d) => d.score);
    const allTrackers = Array.from(domainMap.values()).map((d) => d.trackers);

    const avgScore =
      allScores.length > 0
        ? Math.round(
            (allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10,
          ) / 10
        : 0;
    const avgTrackers =
      allTrackers.length > 0
        ? Math.round(
            (allTrackers.reduce((s, v) => s + v, 0) / allTrackers.length) * 10,
          ) / 10
        : 0;

    // Parse topCategories safely
    let topCategories: unknown[] = [];
    if (trend.topCategories && typeof trend.topCategories === 'object') {
      topCategories = Array.isArray(trend.topCategories)
        ? trend.topCategories
        : [];
    }

    const technology = {
      slug: trackerDomainToSlug(trackerDomain),
      name: trend.trackerName ?? trackerDomain,
      domain: trackerDomain,
      category: trend.trackerCategory ?? 'Unknown',
      description: generateDescription(
        trend.trackerName,
        trend.trackerCategory,
      ),
      riskLevel: categoryToRisk(trend.trackerCategory),
      prevalence:
        totalDomains > 0
          ? Math.round((trend.domainCount / totalDomains) * 1000) / 10
          : 0,
      adoptionTrend: trend.adoptionTrend,
      netChange: trend.netChange,
      topCategories,
    };

    res.set('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE}`);
    res.json({
      technology,
      domains,
      stats: {
        totalSites,
        avgScore,
        avgTrackers,
      },
    });
  } catch (error) {
    logger.error(
      { error, slug: req.params.slug },
      'Error fetching technology detail',
    );
    return problem(res, 500, 'Failed to fetch technology details');
  }
});
