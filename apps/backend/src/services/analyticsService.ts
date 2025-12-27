/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { PrismaClient } from "@prisma/client";
import { CacheService } from "../cache.js";
import { logger } from "../logger.js";

/**
 * Cache TTL for analytics data (6 hours in seconds)
 */
const ANALYTICS_CACHE_TTL = 6 * 60 * 60; // 6 hours

/**
 * Cache keys for analytics data
 */
export const ANALYTICS_CACHE_KEYS = {
  GLOBAL_BENCHMARKS: 'analytics:global:benchmarks',
  SCORE_DISTRIBUTION: 'analytics:score:distribution',
  TRACKER_FREQUENCY: 'analytics:tracker:frequency',
} as const;

/**
 * Score distribution entry
 */
export interface ScoreDistributionEntry {
  score: number;
  count: number;
  cumulative: number;
}

/**
 * Top tracker entry
 */
export interface TopTrackerEntry {
  domain: string;
  count: number;
  percentage: number;
}

/**
 * Global benchmark data cached every 6 hours
 */
export interface GlobalBenchmarks {
  totalDomains: number;
  averageScore: number;
  medianScore: number;
  scoreDistribution: ScoreDistributionEntry[];
  topTrackers: TopTrackerEntry[];
  averageTrackerCount: number;
  averageCookieCount: number;
  lastUpdated: string;
}

/**
 * Benchmark comparison for a specific scan
 */
export interface BenchmarkComparison {
  percentile: number; // 0-100, "better than X%"
  comparedToAverage: number; // +/- points vs average score
  trackerComparison: 'below' | 'average' | 'above';
  cookieComparison: 'below' | 'average' | 'above';
}

/**
 * Tracker insights for a specific scan
 */
export interface TrackerInsights {
  uniqueTrackers: number;
  commonTrackers: string[]; // Most common trackers found on this site
  rarityScore: number; // 0-100, how unusual the tracker set is
}

/**
 * Analytics Service for calculating benchmarks and comparisons
 */
export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get global benchmarks with caching
   */
  async getGlobalBenchmarks(): Promise<GlobalBenchmarks> {
    return CacheService.getOrSet<GlobalBenchmarks>(
      ANALYTICS_CACHE_KEYS.GLOBAL_BENCHMARKS,
      () => this.calculateGlobalBenchmarks(),
      ANALYTICS_CACHE_TTL
    );
  }

  /**
   * Calculate global benchmarks from database
   */
  private async calculateGlobalBenchmarks(): Promise<GlobalBenchmarks> {
    const startTime = Date.now();
    logger.info('Calculating global benchmarks...');

    try {
      // Get score statistics using aggregation
      const scoreStats = await this.prisma.scan.aggregate({
        where: {
          status: 'done',
          score: { not: null },
        },
        _avg: { score: true },
        _count: { score: true },
      });

      const totalDomains = scoreStats._count.score ?? 0;
      const averageScore = Math.round(scoreStats._avg.score ?? 0);

      // Get score distribution for percentile calculations
      const scoreDistribution = await this.getScoreDistribution();

      // Calculate median from distribution
      const medianScore = this.calculateMedianFromDistribution(scoreDistribution, totalDomains);

      // Get top trackers
      const topTrackers = await this.getTopTrackers();

      // Get average tracker and cookie counts
      const { averageTrackerCount, averageCookieCount } = await this.getAverageEvidenceCounts();

      const benchmarks: GlobalBenchmarks = {
        totalDomains,
        averageScore,
        medianScore,
        scoreDistribution,
        topTrackers,
        averageTrackerCount,
        averageCookieCount,
        lastUpdated: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      logger.info({ duration, totalDomains }, 'Global benchmarks calculated');

      return benchmarks;
    } catch (error) {
      logger.error({ error }, 'Failed to calculate global benchmarks');
      throw error;
    }
  }

  /**
   * Get score distribution grouped by score value
   */
  private async getScoreDistribution(): Promise<ScoreDistributionEntry[]> {
    const cached = await CacheService.get<ScoreDistributionEntry[]>(ANALYTICS_CACHE_KEYS.SCORE_DISTRIBUTION);
    if (cached) return cached;

    // Group scans by score
    const distribution = await this.prisma.scan.groupBy({
      by: ['score'],
      where: {
        status: 'done',
        score: { not: null },
      },
      _count: { score: true },
      orderBy: { score: 'asc' },
    });

    // Calculate cumulative counts
    let cumulative = 0;
    const result: ScoreDistributionEntry[] = distribution
      .filter(d => d.score !== null)
      .map(d => {
        cumulative += d._count.score;
        return {
          score: d.score!,
          count: d._count.score,
          cumulative,
        };
      });

    await CacheService.set(ANALYTICS_CACHE_KEYS.SCORE_DISTRIBUTION, result, ANALYTICS_CACHE_TTL);
    return result;
  }

  /**
   * Calculate median score from distribution
   */
  private calculateMedianFromDistribution(distribution: ScoreDistributionEntry[], total: number): number {
    if (distribution.length === 0 || total === 0) return 0;

    const midpoint = Math.ceil(total / 2);

    for (const entry of distribution) {
      if (entry.cumulative >= midpoint) {
        return entry.score;
      }
    }

    return distribution[distribution.length - 1]?.score ?? 0;
  }

  /**
   * Get most common trackers across all scans
   */
  private async getTopTrackers(limit: number = 20): Promise<TopTrackerEntry[]> {
    const cached = await CacheService.get<TopTrackerEntry[]>(ANALYTICS_CACHE_KEYS.TRACKER_FREQUENCY);
    if (cached) return cached;

    // Get total domain count for percentage calculation
    const totalDomains = await this.prisma.scan.count({
      where: { status: 'done', score: { not: null } },
    });

    if (totalDomains === 0) return [];

    // Use raw SQL for efficient tracker aggregation
    const trackers = await this.prisma.$queryRaw<Array<{ tracker: string; domain_count: bigint }>>`
      SELECT
        details->>'domain' as tracker,
        COUNT(DISTINCT "scanId") as domain_count
      FROM "Evidence"
      WHERE kind = 'tracker' AND details->>'domain' IS NOT NULL
      GROUP BY details->>'domain'
      ORDER BY domain_count DESC
      LIMIT ${limit}
    `;

    const result: TopTrackerEntry[] = trackers.map(t => ({
      domain: t.tracker,
      count: Number(t.domain_count),
      percentage: Math.round((Number(t.domain_count) / totalDomains) * 100),
    }));

    await CacheService.set(ANALYTICS_CACHE_KEYS.TRACKER_FREQUENCY, result, ANALYTICS_CACHE_TTL);
    return result;
  }

  /**
   * Get average tracker and cookie counts
   */
  private async getAverageEvidenceCounts(): Promise<{ averageTrackerCount: number; averageCookieCount: number }> {
    // Get total scans
    const totalScans = await this.prisma.scan.count({
      where: { status: 'done', score: { not: null } },
    });

    if (totalScans === 0) {
      return { averageTrackerCount: 0, averageCookieCount: 0 };
    }

    // Count trackers and cookies
    const [trackerCount, cookieCount] = await Promise.all([
      this.prisma.evidence.count({ where: { kind: 'tracker' } }),
      this.prisma.evidence.count({ where: { kind: 'cookie' } }),
    ]);

    return {
      averageTrackerCount: Math.round((trackerCount / totalScans) * 10) / 10,
      averageCookieCount: Math.round((cookieCount / totalScans) * 10) / 10,
    };
  }

  /**
   * Calculate percentile for a given score
   * Returns the percentage of sites this score is better than
   */
  async calculatePercentile(score: number): Promise<number> {
    const benchmarks = await this.getGlobalBenchmarks();
    const { scoreDistribution, totalDomains } = benchmarks;

    if (totalDomains === 0 || scoreDistribution.length === 0) return 50;

    // Find how many sites have a LOWER score than this one
    // Higher score is better, so we count sites with lower scores
    let belowCount = 0;
    for (const entry of scoreDistribution) {
      if (entry.score < score) {
        belowCount = entry.cumulative;
      } else {
        break;
      }
    }

    // Calculate percentile (what percentage of sites this score is better than)
    const percentile = Math.round((belowCount / totalDomains) * 100);
    return Math.min(99, Math.max(1, percentile)); // Clamp between 1 and 99
  }

  /**
   * Compare a scan's metrics to global benchmarks
   */
  async compareToBenchmarks(
    score: number,
    trackerCount: number,
    cookieCount: number
  ): Promise<BenchmarkComparison> {
    const benchmarks = await this.getGlobalBenchmarks();
    const percentile = await this.calculatePercentile(score);

    // Score comparison
    const comparedToAverage = score - benchmarks.averageScore;

    // Tracker comparison (fewer is better)
    let trackerComparison: 'below' | 'average' | 'above';
    if (trackerCount < benchmarks.averageTrackerCount * 0.8) {
      trackerComparison = 'below'; // Good - fewer trackers than average
    } else if (trackerCount > benchmarks.averageTrackerCount * 1.2) {
      trackerComparison = 'above'; // Bad - more trackers than average
    } else {
      trackerComparison = 'average';
    }

    // Cookie comparison (fewer is better)
    let cookieComparison: 'below' | 'average' | 'above';
    if (cookieCount < benchmarks.averageCookieCount * 0.8) {
      cookieComparison = 'below'; // Good - fewer cookies than average
    } else if (cookieCount > benchmarks.averageCookieCount * 1.2) {
      cookieComparison = 'above'; // Bad - more cookies than average
    } else {
      cookieComparison = 'average';
    }

    return {
      percentile,
      comparedToAverage,
      trackerComparison,
      cookieComparison,
    };
  }

  /**
   * Get tracker insights for a specific set of trackers
   */
  async getTrackerInsights(trackerDomains: string[]): Promise<TrackerInsights> {
    if (trackerDomains.length === 0) {
      return {
        uniqueTrackers: 0,
        commonTrackers: [],
        rarityScore: 100, // No trackers is very rare (good)
      };
    }

    const benchmarks = await this.getGlobalBenchmarks();
    const topTrackerDomains = new Set(benchmarks.topTrackers.map(t => t.domain));

    // Find which of this site's trackers are in the top common trackers
    const commonTrackers = trackerDomains.filter(t => topTrackerDomains.has(t));

    // Rarity score: how many of the trackers are NOT in the common list
    // Higher = more unusual tracker set
    const uncommonCount = trackerDomains.filter(t => !topTrackerDomains.has(t)).length;
    const rarityScore = Math.round((uncommonCount / trackerDomains.length) * 100);

    return {
      uniqueTrackers: trackerDomains.length,
      commonTrackers,
      rarityScore,
    };
  }

  /**
   * Force refresh of all cached analytics data
   */
  async refreshCache(): Promise<void> {
    logger.info('Refreshing analytics cache...');

    // Delete existing cache
    await CacheService.del(ANALYTICS_CACHE_KEYS.GLOBAL_BENCHMARKS);
    await CacheService.del(ANALYTICS_CACHE_KEYS.SCORE_DISTRIBUTION);
    await CacheService.del(ANALYTICS_CACHE_KEYS.TRACKER_FREQUENCY);

    // Recalculate
    await this.getGlobalBenchmarks();

    logger.info('Analytics cache refreshed');
  }
}

/**
 * Create analytics service instance
 */
export function createAnalyticsService(prisma: PrismaClient): AnalyticsService {
  return new AnalyticsService(prisma);
}
