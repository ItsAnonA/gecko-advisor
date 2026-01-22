/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { PrismaClient } from "@prisma/client";
import { isValidComparableDomain } from "@gecko-advisor/shared";
import { CacheService, redis } from "../cache.js";
import { logger } from "../logger.js";
import type { AnalyticsService } from "./analyticsService.js";

/**
 * Cache TTL values
 */
const COMPARISON_CACHE_TTL = 60 * 60; // 1 hour
const SUGGESTIONS_CACHE_TTL = 30 * 60; // 30 minutes

/**
 * Cache keys for comparison data
 */
export const COMPARISON_CACHE_KEYS = {
  COMPARISON: (domainA: string, domainB: string) => {
    // Normalize key order for consistent caching
    const [first, second] = [domainA, domainB].sort();
    return `compare:${first}:${second}`;
  },
  SUGGESTIONS: (domain: string) => `compare:suggestions:${domain}`,
  POPULAR_PAIRS: 'compare:popular',
} as const;

/**
 * Summary of a domain's privacy metrics
 */
export interface DomainSummary {
  domain: string;
  score: number;
  percentile: number;
  label: string;
  trackerCount: number;
  cookieCount: number;
  thirdPartyCount: number;
  hasFingerprinting: boolean;
  tlsGrade: string | null;
  lastScanned: string;
}

/**
 * A single difference between two domains
 */
export interface ComparisonDiff {
  metric: string;
  label: string;
  valueA: number | string | boolean;
  valueB: number | string | boolean;
  better: 'A' | 'B' | 'tie';
  significance: 'high' | 'medium' | 'low';
  explanation: string;
}

/**
 * Full comparison between two domains
 */
export interface DomainComparison {
  domainA: DomainSummary;
  domainB: DomainSummary;
  differences: ComparisonDiff[];
  winner: 'A' | 'B' | 'tie';
  summary: string;
  commonTrackers: string[];
  uniqueToA: string[];
  uniqueToB: string[];
}

/**
 * A suggested domain to compare
 */
export interface SuggestedComparison {
  domain: string;
  score: number;
  reason: string;
}

/**
 * Comparison Service for domain-vs-domain comparisons
 */
export class ComparisonService {
  private prisma: PrismaClient;
  private analyticsService: AnalyticsService;

  constructor(prisma: PrismaClient, analyticsService: AnalyticsService) {
    this.prisma = prisma;
    this.analyticsService = analyticsService;
  }

  /**
   * Compare two domains
   */
  async compareDomains(domainA: string, domainB: string): Promise<DomainComparison | null> {
    const cacheKey = COMPARISON_CACHE_KEYS.COMPARISON(domainA, domainB);

    // Try cache first
    const cached = await CacheService.get<DomainComparison>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch both domain summaries
    const [summaryA, summaryB] = await Promise.all([
      this.getDomainSummary(domainA),
      this.getDomainSummary(domainB),
    ]);

    if (!summaryA || !summaryB) {
      return null;
    }

    // Calculate differences
    const differences = this.calculateDifferences(summaryA, summaryB);

    // Determine winner
    const winner = this.determineWinner(differences);

    // Generate summary
    const summary = this.generateSummary(summaryA, summaryB, differences, winner);

    // Get tracker overlap
    const { commonTrackers, uniqueToA, uniqueToB } = await this.getTrackerOverlap(domainA, domainB);

    const comparison: DomainComparison = {
      domainA: summaryA,
      domainB: summaryB,
      differences,
      winner,
      summary,
      commonTrackers,
      uniqueToA,
      uniqueToB,
    };

    // Cache the result
    await CacheService.set(cacheKey, comparison, COMPARISON_CACHE_TTL);

    // Track this comparison pair
    await this.trackComparisonPair(domainA, domainB);

    return comparison;
  }

  /**
   * Get summary for a single domain
   */
  async getDomainSummary(domain: string): Promise<DomainSummary | null> {
    try {
      // Find the domain with its latest scan
      const domainRecord = await this.prisma.domain.findUnique({
        where: { domain },
        include: {
          latestScan: {
            include: {
              evidence: {
                select: { kind: true, details: true },
              },
            },
          },
        },
      });

      if (!domainRecord?.latestScan || domainRecord.latestScan.status !== 'done') {
        return null;
      }

      const scan = domainRecord.latestScan;
      const score = scan.score ?? 0;

      // Count evidence by type
      const trackerCount = scan.evidence.filter(e => e.kind === 'tracker').length;
      const cookieCount = scan.evidence.filter(e => e.kind === 'cookie').length;
      const thirdPartyCount = scan.evidence.filter(e => e.kind === 'thirdparty').length;
      const hasFingerprinting = scan.evidence.some(e => e.kind === 'fingerprint');

      // Get TLS grade from evidence
      const tlsEvidence = scan.evidence.find(e => e.kind === 'tls');
      const tlsGrade = tlsEvidence
        ? (tlsEvidence.details as { grade?: string })?.grade ?? null
        : null;

      // Calculate percentile
      const percentile = await this.analyticsService.calculatePercentile(score);

      return {
        domain,
        score,
        percentile,
        label: scan.label ?? 'Unknown',
        trackerCount,
        cookieCount,
        thirdPartyCount,
        hasFingerprinting,
        tlsGrade,
        lastScanned: scan.finishedAt?.toISOString() ?? scan.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error({ error, domain }, 'Failed to get domain summary');
      return null;
    }
  }

  /**
   * Calculate differences between two domains
   */
  private calculateDifferences(a: DomainSummary, b: DomainSummary): ComparisonDiff[] {
    const differences: ComparisonDiff[] = [];

    // Score difference
    const scoreDiff = Math.abs(a.score - b.score);
    differences.push({
      metric: 'score',
      label: 'Privacy Score',
      valueA: a.score,
      valueB: b.score,
      better: a.score > b.score ? 'A' : a.score < b.score ? 'B' : 'tie',
      significance: scoreDiff > 20 ? 'high' : scoreDiff > 10 ? 'medium' : 'low',
      explanation: this.getScoreDiffExplanation(a.score, b.score),
    });

    // Percentile difference
    differences.push({
      metric: 'percentile',
      label: 'Percentile Ranking',
      valueA: a.percentile,
      valueB: b.percentile,
      better: a.percentile > b.percentile ? 'A' : a.percentile < b.percentile ? 'B' : 'tie',
      significance: Math.abs(a.percentile - b.percentile) > 20 ? 'high' : 'medium',
      explanation: `${a.domain} ranks in the ${this.getOrdinal(a.percentile)} percentile, ${b.domain} in the ${this.getOrdinal(b.percentile)}`,
    });

    // Tracker count (fewer is better)
    const trackerRatio = Math.max(a.trackerCount, b.trackerCount) /
      Math.max(Math.min(a.trackerCount, b.trackerCount), 1);
    differences.push({
      metric: 'trackers',
      label: 'Trackers',
      valueA: a.trackerCount,
      valueB: b.trackerCount,
      better: a.trackerCount < b.trackerCount ? 'A' : a.trackerCount > b.trackerCount ? 'B' : 'tie',
      significance: trackerRatio > 2 ? 'high' : trackerRatio > 1.5 ? 'medium' : 'low',
      explanation: this.getTrackerDiffExplanation(a, b),
    });

    // Cookie count (fewer is better)
    differences.push({
      metric: 'cookies',
      label: 'Insecure Cookies',
      valueA: a.cookieCount,
      valueB: b.cookieCount,
      better: a.cookieCount < b.cookieCount ? 'A' : a.cookieCount > b.cookieCount ? 'B' : 'tie',
      significance: Math.abs(a.cookieCount - b.cookieCount) > 5 ? 'medium' : 'low',
      explanation: `${a.domain} has ${a.cookieCount} insecure cookies, ${b.domain} has ${b.cookieCount}`,
    });

    // Fingerprinting (having it is worse)
    if (a.hasFingerprinting !== b.hasFingerprinting) {
      differences.push({
        metric: 'fingerprinting',
        label: 'Fingerprinting',
        valueA: a.hasFingerprinting ? 'Yes' : 'No',
        valueB: b.hasFingerprinting ? 'Yes' : 'No',
        better: a.hasFingerprinting ? 'B' : 'A',
        significance: 'high',
        explanation: `${a.hasFingerprinting ? a.domain : b.domain} uses browser fingerprinting, which can track you without cookies`,
      });
    }

    // TLS grade (if different)
    if (a.tlsGrade && b.tlsGrade && a.tlsGrade !== b.tlsGrade) {
      const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'F'];
      const aIndex = gradeOrder.indexOf(a.tlsGrade);
      const bIndex = gradeOrder.indexOf(b.tlsGrade);
      differences.push({
        metric: 'tls',
        label: 'TLS Security',
        valueA: a.tlsGrade,
        valueB: b.tlsGrade,
        better: aIndex < bIndex ? 'A' : aIndex > bIndex ? 'B' : 'tie',
        significance: Math.abs(aIndex - bIndex) > 1 ? 'high' : 'medium',
        explanation: `${a.domain} has TLS grade ${a.tlsGrade}, ${b.domain} has grade ${b.tlsGrade}`,
      });
    }

    return differences;
  }

  /**
   * Determine overall winner
   */
  private determineWinner(differences: ComparisonDiff[]): 'A' | 'B' | 'tie' {
    // Weight high significance differences more
    const weights = { high: 3, medium: 2, low: 1 };

    let aScore = 0;
    let bScore = 0;

    for (const diff of differences) {
      const weight = weights[diff.significance];
      if (diff.better === 'A') aScore += weight;
      else if (diff.better === 'B') bScore += weight;
    }

    if (aScore > bScore + 2) return 'A';
    if (bScore > aScore + 2) return 'B';
    return 'tie';
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    a: DomainSummary,
    b: DomainSummary,
    differences: ComparisonDiff[],
    winner: 'A' | 'B' | 'tie'
  ): string {
    const highDiffs = differences.filter(d => d.significance === 'high');

    if (winner === 'tie') {
      return `${a.domain} and ${b.domain} have similar privacy practices. Both scored in the ${a.score > 60 ? 'upper' : 'lower'} range.`;
    }

    const better = winner === 'A' ? a : b;
    const worse = winner === 'A' ? b : a;

    if (highDiffs.length === 0) {
      return `${better.domain} has slightly better privacy practices than ${worse.domain}, though both are comparable.`;
    }

    const keyDiff = highDiffs[0];
    if (keyDiff && keyDiff.metric === 'fingerprinting') {
      return `${better.domain} is more privacy-respecting than ${worse.domain}. ${worse.domain} uses browser fingerprinting, which can track you even without cookies.`;
    }

    if (keyDiff && keyDiff.metric === 'trackers') {
      const ratio = Math.max(a.trackerCount, b.trackerCount) / Math.max(Math.min(a.trackerCount, b.trackerCount), 1);
      return `${better.domain} uses ${ratio.toFixed(1)}x fewer trackers than ${worse.domain}, suggesting more privacy-respecting practices.`;
    }

    return `${better.domain} has better privacy practices than ${worse.domain}, scoring ${better.score} vs ${worse.score}.`;
  }

  /**
   * Get tracker overlap between two domains
   */
  private async getTrackerOverlap(
    domainA: string,
    domainB: string
  ): Promise<{ commonTrackers: string[]; uniqueToA: string[]; uniqueToB: string[] }> {
    try {
      // Get trackers for domain A
      const domainARecord = await this.prisma.domain.findUnique({
        where: { domain: domainA },
        select: { latestScanId: true },
      });

      // Get trackers for domain B
      const domainBRecord = await this.prisma.domain.findUnique({
        where: { domain: domainB },
        select: { latestScanId: true },
      });

      if (!domainARecord?.latestScanId || !domainBRecord?.latestScanId) {
        return { commonTrackers: [], uniqueToA: [], uniqueToB: [] };
      }

      const [trackersA, trackersB] = await Promise.all([
        this.prisma.evidence.findMany({
          where: { scanId: domainARecord.latestScanId, kind: 'tracker' },
          select: { details: true },
        }),
        this.prisma.evidence.findMany({
          where: { scanId: domainBRecord.latestScanId, kind: 'tracker' },
          select: { details: true },
        }),
      ]);

      const setA = new Set(trackersA.map(e => (e.details as { domain?: string })?.domain).filter(Boolean) as string[]);
      const setB = new Set(trackersB.map(e => (e.details as { domain?: string })?.domain).filter(Boolean) as string[]);

      const commonTrackers = [...setA].filter(t => setB.has(t));
      const uniqueToA = [...setA].filter(t => !setB.has(t));
      const uniqueToB = [...setB].filter(t => !setA.has(t));

      return { commonTrackers, uniqueToA, uniqueToB };
    } catch (error) {
      logger.error({ error }, 'Failed to get tracker overlap');
      return { commonTrackers: [], uniqueToA: [], uniqueToB: [] };
    }
  }

  /**
   * Get suggested domains to compare with
   */
  async getSuggestedComparisons(domain: string): Promise<SuggestedComparison[]> {
    const cacheKey = COMPARISON_CACHE_KEYS.SUGGESTIONS(domain);

    // Try cache first
    const cached = await CacheService.get<SuggestedComparison[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions: SuggestedComparison[] = [];

    try {
      // Get current domain's score
      const currentDomain = await this.prisma.domain.findUnique({
        where: { domain },
        include: { latestScan: { select: { score: true } } },
      });

      const currentScore = currentDomain?.latestScan?.score ?? 50;

      // Strategy 1: Similar score range
      // Fetch more than needed to account for filtering out invalid domains
      const similarScoreDomains = await this.prisma.domain.findMany({
        where: {
          domain: { not: domain },
          isIndexed: true,
          latestScan: {
            status: 'done',
            score: {
              gte: currentScore - 15,
              lte: currentScore + 15,
            },
          },
        },
        include: { latestScan: { select: { score: true } } },
        take: 10, // Fetch more to filter
        orderBy: { scanCount: 'desc' },
      });

      for (const d of similarScoreDomains) {
        // Skip invalid domains (TLDs, public suffixes)
        if (!isValidComparableDomain(d.domain)) continue;
        if (suggestions.length >= 3) break;

        suggestions.push({
          domain: d.domain,
          score: d.latestScan?.score ?? 0,
          reason: 'Similar score',
        });
      }

      // Strategy 2: Popular domains (high scan count)
      if (suggestions.length < 5) {
        const popularDomains = await this.prisma.domain.findMany({
          where: {
            domain: { not: domain, notIn: suggestions.map(s => s.domain) },
            isIndexed: true,
            scanCount: { gt: 1 },
            latestScan: { status: 'done' },
          },
          include: { latestScan: { select: { score: true } } },
          take: 15, // Fetch more to filter
          orderBy: { scanCount: 'desc' },
        });

        for (const d of popularDomains) {
          // Skip invalid domains (TLDs, public suffixes)
          if (!isValidComparableDomain(d.domain)) continue;
          if (suggestions.length >= 5) break;

          suggestions.push({
            domain: d.domain,
            score: d.latestScan?.score ?? 0,
            reason: 'Popular site',
          });
        }
      }

      // Strategy 3: High-scoring domains (for contrast)
      if (suggestions.length < 5 && currentScore < 70) {
        const highScoreDomains = await this.prisma.domain.findMany({
          where: {
            domain: { not: domain, notIn: suggestions.map(s => s.domain) },
            isIndexed: true,
            latestScan: {
              status: 'done',
              score: { gte: 80 },
            },
          },
          include: { latestScan: { select: { score: true } } },
          take: 10, // Fetch more to filter
          orderBy: { latestScan: { score: 'desc' } },
        });

        for (const d of highScoreDomains) {
          // Skip invalid domains (TLDs, public suffixes)
          if (!isValidComparableDomain(d.domain)) continue;
          if (suggestions.length >= 5) break;

          suggestions.push({
            domain: d.domain,
            score: d.latestScan?.score ?? 0,
            reason: 'High privacy score',
          });
        }
      }

      // Filter out any invalid domains (TLDs, public suffixes, etc.)
      // This is a safety net in case bad data exists in the Domain table
      const validSuggestions = suggestions.filter(s => isValidComparableDomain(s.domain));

      if (validSuggestions.length !== suggestions.length) {
        const invalidDomains = suggestions
          .filter(s => !isValidComparableDomain(s.domain))
          .map(s => s.domain);
        logger.warn({ domain, invalidDomains }, 'Filtered out invalid comparison suggestions (TLDs/public suffixes)');
      }

      // Cache the result
      await CacheService.set(cacheKey, validSuggestions, SUGGESTIONS_CACHE_TTL);

      return validSuggestions;
    } catch (error) {
      logger.error({ error, domain }, 'Failed to get comparison suggestions');
      return [];
    }
  }

  /**
   * Track a comparison pair for popularity
   */
  async trackComparisonPair(domainA: string, domainB: string): Promise<void> {
    try {
      // Normalize the pair order
      const pairKey = [domainA, domainB].sort().join(':');
      await redis.zincrby(COMPARISON_CACHE_KEYS.POPULAR_PAIRS, 1, pairKey);

      // Keep only top 100 pairs
      await redis.zremrangebyrank(COMPARISON_CACHE_KEYS.POPULAR_PAIRS, 0, -101);
    } catch (error) {
      // Non-critical, just log
      logger.warn({ error }, 'Failed to track comparison pair');
    }
  }

  /**
   * Get popular comparison pairs
   */
  async getPopularPairs(limit: number = 10): Promise<Array<{ domainA: string; domainB: string; count: number }>> {
    try {
      const pairs = await redis.zrevrange(COMPARISON_CACHE_KEYS.POPULAR_PAIRS, 0, limit - 1, 'WITHSCORES');

      const results: Array<{ domainA: string; domainB: string; count: number }> = [];
      for (let i = 0; i < pairs.length; i += 2) {
        const pairKey = pairs[i];
        const scoreStr = pairs[i + 1];
        if (!pairKey || !scoreStr) continue;

        const parts = pairKey.split(':');
        const domainA = parts[0] ?? '';
        const domainB = parts[1] ?? '';
        const count = parseInt(scoreStr, 10);
        if (domainA && domainB) {
          results.push({ domainA, domainB, count });
        }
      }

      return results;
    } catch (error) {
      logger.warn({ error }, 'Failed to get popular comparison pairs');
      return [];
    }
  }

  // Helper methods

  private getScoreDiffExplanation(scoreA: number, scoreB: number): string {
    const diff = Math.abs(scoreA - scoreB);
    if (diff === 0) return 'Both sites have the same privacy score';
    if (diff < 10) return 'Scores are very similar';
    if (diff < 25) return 'Notable difference in privacy practices';
    return 'Significant difference in privacy practices';
  }

  private getTrackerDiffExplanation(a: DomainSummary, b: DomainSummary): string {
    if (a.trackerCount === b.trackerCount) {
      return 'Both sites have the same number of trackers';
    }

    const fewer = a.trackerCount < b.trackerCount ? a : b;
    const more = a.trackerCount < b.trackerCount ? b : a;
    const diff = more.trackerCount - fewer.trackerCount;

    return `${fewer.domain} has ${diff} fewer tracker${diff === 1 ? '' : 's'} than ${more.domain}`;
  }

  private getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'] as const;
    const v = n % 100;
    const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th';
    return `${n}${suffix}`;
  }
}

/**
 * Create comparison service instance
 */
export function createComparisonService(
  prisma: PrismaClient,
  analyticsService: AnalyticsService
): ComparisonService {
  return new ComparisonService(prisma, analyticsService);
}
