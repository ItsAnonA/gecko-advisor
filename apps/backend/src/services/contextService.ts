/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { PrismaClient } from "@prisma/client";
import { CacheService } from "../cache.js";
import { logger } from "../logger.js";
import type { AnalyticsService, GlobalBenchmarks } from "./analyticsService.js";

/**
 * Cache TTL for context data (6 hours in seconds)
 */
const CONTEXT_CACHE_TTL = 6 * 60 * 60; // 6 hours

/**
 * Cache keys for context data
 */
export const CONTEXT_CACHE_KEYS = {
  CONTEXT: (domain: string) => `context:${domain}:v1`,
  PREVALENCE_FINGERPRINTING: 'prevalence:fingerprinting',
  PREVALENCE_EXCESSIVE_TRACKERS: 'prevalence:excessive_trackers',
  PREVALENCE_HIGH_AD_RATIO: 'prevalence:high_ad_ratio',
} as const;

/**
 * Severity levels for unusual findings
 */
export type FindingSeverity = 'info' | 'warning' | 'critical';

/**
 * Types of unusual findings we detect
 */
export type FindingType =
  | 'fingerprinting'
  | 'excessive_trackers'
  | 'long_term_cookies'
  | 'high_ad_ratio'
  | 'no_privacy_policy'
  | 'http_only'
  | 'poor_tls';

/**
 * An unusual finding that should be highlighted to users
 */
export interface UnusualFinding {
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  description: string;
  prevalence: number; // Percentage of sites with this issue
  prevalenceLabel: string; // e.g., "Only 12% of sites"
  learnMoreSlug?: string;
}

/**
 * Interpretation of a specific data category
 */
export interface Interpretation {
  category: 'tracking' | 'security' | 'cookies' | 'thirdparty' | 'compliance';
  label: string; // "Excellent", "Good", "Fair", "Poor"
  score: number; // Category-specific penalty
  context: string; // Human-readable explanation
}

/**
 * Prevalence statistics for unusual findings
 */
export interface PrevalenceStats {
  fingerprintingRate: number;
  excessiveTrackerRate: number;
  highAdRatioRate: number;
  httpOnlyRate: number;
}

/**
 * Full context data for a domain report
 */
export interface ContextData {
  percentile: number;
  percentileLabel: string;
  positionLabel: string; // "Top 10%", "Upper half", etc.
  unusualFindings: UnusualFinding[];
  interpretations: Interpretation[];
  prevalenceStats: PrevalenceStats;
}

/**
 * Report data structure (simplified for context calculation)
 */
export interface ReportDataForContext {
  score: number;
  trackerCount: number;
  cookieCount: number;
  thirdPartyCount: number;
  hasFingerprinting: boolean;
  hasPolicyLink: boolean;
  isHttpOnly: boolean;
  tlsGrade?: string;
  penalties?: {
    tracking: number;
    security: number;
    thirdParty: number;
    cookies: number;
    compliance: number;
  };
  trackerCategories?: {
    advertising: number;
    analytics: number;
    fingerprinting: number;
    other: number;
  };
}

/**
 * Context Service for generating contextual interpretations
 */
export class ContextService {
  private prisma: PrismaClient;
  private analyticsService: AnalyticsService;

  constructor(prisma: PrismaClient, analyticsService: AnalyticsService) {
    this.prisma = prisma;
    this.analyticsService = analyticsService;
  }

  /**
   * Get full context data for a domain report
   */
  async getContext(domain: string, reportData: ReportDataForContext): Promise<ContextData> {
    const cacheKey = CONTEXT_CACHE_KEYS.CONTEXT(domain);

    // Try cache first
    const cached = await CacheService.get<ContextData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate fresh context
    const benchmarks = await this.analyticsService.getGlobalBenchmarks();
    const percentile = await this.analyticsService.calculatePercentile(reportData.score);

    const [
      percentileLabel,
      positionLabel,
      unusualFindings,
      interpretations,
      prevalenceStats,
    ] = await Promise.all([
      this.getPercentileLabel(percentile, reportData.score, benchmarks),
      this.getPositionLabel(percentile),
      this.detectUnusualFindings(reportData, benchmarks),
      this.generateInterpretations(reportData, benchmarks),
      this.getPrevalenceStats(),
    ]);

    const context: ContextData = {
      percentile,
      percentileLabel,
      positionLabel,
      unusualFindings,
      interpretations,
      prevalenceStats,
    };

    // Cache the result
    await CacheService.set(cacheKey, context, CONTEXT_CACHE_TTL);

    return context;
  }

  /**
   * Generate a human-readable percentile label
   */
  private async getPercentileLabel(
    percentile: number,
    score: number,
    benchmarks: GlobalBenchmarks
  ): Promise<string> {
    const diff = score - benchmarks.averageScore;
    const diffLabel = diff > 0 ? `${diff} points above` : `${Math.abs(diff)} points below`;

    if (percentile >= 90) {
      return `Excellent — better than ${percentile}% of sites (${diffLabel} average)`;
    } else if (percentile >= 75) {
      return `Good — better than ${percentile}% of sites (${diffLabel} average)`;
    } else if (percentile >= 50) {
      return `Fair — better than ${percentile}% of sites (${diffLabel} average)`;
    } else if (percentile >= 25) {
      return `Below average — worse than ${100 - percentile}% of sites (${diffLabel} average)`;
    } else {
      return `Poor — worse than ${100 - percentile}% of sites (${diffLabel} average)`;
    }
  }

  /**
   * Get position label for the percentile
   */
  private getPositionLabel(percentile: number): string {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Upper half';
    if (percentile >= 25) return 'Lower half';
    return 'Bottom 25%';
  }

  /**
   * Detect unusual findings that should be highlighted
   */
  async detectUnusualFindings(
    reportData: ReportDataForContext,
    benchmarks: GlobalBenchmarks
  ): Promise<UnusualFinding[]> {
    const findings: UnusualFinding[] = [];
    const prevalenceStats = await this.getPrevalenceStats();

    // Check for fingerprinting
    if (reportData.hasFingerprinting) {
      findings.push({
        type: 'fingerprinting',
        severity: 'warning',
        title: 'Browser Fingerprinting Detected',
        description: 'This site can identify your browser even if you clear cookies or use incognito mode. This creates a persistent identifier that is difficult to avoid.',
        prevalence: prevalenceStats.fingerprintingRate,
        prevalenceLabel: `Only ${prevalenceStats.fingerprintingRate}% of sites use this technique`,
        learnMoreSlug: 'fingerprinting-explained',
      });
    }

    // Check for excessive trackers (2x+ average)
    if (reportData.trackerCount > benchmarks.averageTrackerCount * 2) {
      const ratio = (reportData.trackerCount / benchmarks.averageTrackerCount).toFixed(1);
      findings.push({
        type: 'excessive_trackers',
        severity: 'warning',
        title: 'High Tracker Count',
        description: `This site uses ${reportData.trackerCount} trackers — ${ratio}x the average of ${benchmarks.averageTrackerCount.toFixed(1)}. Each tracker can collect and share data about your browsing.`,
        prevalence: prevalenceStats.excessiveTrackerRate,
        prevalenceLabel: `Only ${prevalenceStats.excessiveTrackerRate}% of sites have this many trackers`,
        learnMoreSlug: 'tracker-impact',
      });
    }

    // Check for high advertising tracker ratio
    if (reportData.trackerCategories) {
      const totalTrackers = reportData.trackerCount;
      const adTrackers = reportData.trackerCategories.advertising;
      if (totalTrackers > 3 && adTrackers / totalTrackers > 0.6) {
        findings.push({
          type: 'high_ad_ratio',
          severity: 'info',
          title: 'Advertising-Heavy Tracking',
          description: `${Math.round((adTrackers / totalTrackers) * 100)}% of this site's trackers are for advertising. This suggests aggressive ad monetization that tracks your behavior across the web.`,
          prevalence: prevalenceStats.highAdRatioRate,
          prevalenceLabel: 'Common among ad-supported sites',
          learnMoreSlug: 'ad-tracking',
        });
      }
    }

    // Check for HTTP-only (no HTTPS)
    if (reportData.isHttpOnly) {
      findings.push({
        type: 'http_only',
        severity: 'critical',
        title: 'No HTTPS Encryption',
        description: 'This site does not use HTTPS. All data you send or receive can be intercepted and read by anyone on the network.',
        prevalence: prevalenceStats.httpOnlyRate,
        prevalenceLabel: `Only ${prevalenceStats.httpOnlyRate}% of sites still lack HTTPS`,
        learnMoreSlug: 'https-importance',
      });
    }

    // Check for poor TLS grade
    if (reportData.tlsGrade && ['D', 'F'].includes(reportData.tlsGrade)) {
      findings.push({
        type: 'poor_tls',
        severity: 'warning',
        title: `Weak TLS Configuration (Grade ${reportData.tlsGrade})`,
        description: 'This site uses outdated encryption that could be vulnerable to attacks. Your connection may not be as secure as it should be.',
        prevalence: 5, // Approximately 5% have poor TLS
        prevalenceLabel: 'Uncommon — most sites have better encryption',
        learnMoreSlug: 'tls-security',
      });
    }

    // Check for missing privacy policy
    if (!reportData.hasPolicyLink) {
      findings.push({
        type: 'no_privacy_policy',
        severity: 'info',
        title: 'No Privacy Policy Found',
        description: 'We could not find a privacy policy link on this site. Most legitimate sites disclose how they collect and use your data.',
        prevalence: 15, // Approximately 15% don't have visible policies
        prevalenceLabel: 'About 15% of sites lack visible privacy policies',
        learnMoreSlug: 'privacy-policy-importance',
      });
    }

    // Sort by severity (critical first, then warning, then info)
    const severityOrder: Record<FindingSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return findings;
  }

  /**
   * Generate interpretations for each scoring category
   */
  private generateInterpretations(
    reportData: ReportDataForContext,
    benchmarks: GlobalBenchmarks
  ): Interpretation[] {
    const interpretations: Interpretation[] = [];
    const penalties = reportData.penalties;

    if (!penalties) {
      return interpretations;
    }

    // Tracking interpretation
    interpretations.push({
      category: 'tracking',
      label: this.getPenaltyLabel(penalties.tracking, 50),
      score: penalties.tracking,
      context: this.getTrackingContext(reportData, benchmarks, penalties.tracking),
    });

    // Security interpretation
    interpretations.push({
      category: 'security',
      label: this.getPenaltyLabel(penalties.security, 45),
      score: penalties.security,
      context: this.getSecurityContext(reportData, penalties.security),
    });

    // Third-party interpretation
    interpretations.push({
      category: 'thirdparty',
      label: this.getPenaltyLabel(penalties.thirdParty, 15),
      score: penalties.thirdParty,
      context: this.getThirdPartyContext(reportData, benchmarks, penalties.thirdParty),
    });

    // Cookies interpretation
    interpretations.push({
      category: 'cookies',
      label: this.getPenaltyLabel(penalties.cookies, 10),
      score: penalties.cookies,
      context: this.getCookieContext(reportData, benchmarks, penalties.cookies),
    });

    // Compliance interpretation
    interpretations.push({
      category: 'compliance',
      label: this.getPenaltyLabel(penalties.compliance, 5),
      score: penalties.compliance,
      context: this.getComplianceContext(reportData, penalties.compliance),
    });

    return interpretations;
  }

  /**
   * Get label based on penalty relative to max
   */
  private getPenaltyLabel(penalty: number, maxPenalty: number): string {
    const ratio = penalty / maxPenalty;
    if (ratio === 0) return 'Excellent';
    if (ratio <= 0.2) return 'Good';
    if (ratio <= 0.5) return 'Fair';
    if (ratio <= 0.8) return 'Poor';
    return 'Critical';
  }

  /**
   * Generate tracking context
   */
  private getTrackingContext(
    reportData: ReportDataForContext,
    benchmarks: GlobalBenchmarks,
    penalty: number
  ): string {
    if (penalty === 0) {
      return 'No trackers detected — this site respects your privacy.';
    }

    const comparison = reportData.trackerCount <= benchmarks.averageTrackerCount
      ? `fewer than average (${benchmarks.averageTrackerCount.toFixed(1)})`
      : `more than the average of ${benchmarks.averageTrackerCount.toFixed(1)}`;

    if (reportData.hasFingerprinting) {
      return `${reportData.trackerCount} trackers detected (${comparison}), including fingerprinting techniques that can track you without cookies.`;
    }

    return `${reportData.trackerCount} trackers detected — ${comparison} for sites we've analyzed.`;
  }

  /**
   * Generate security context
   */
  private getSecurityContext(reportData: ReportDataForContext, penalty: number): string {
    if (penalty === 0) {
      return 'Strong security configuration with HTTPS and recommended security headers.';
    }

    if (reportData.isHttpOnly) {
      return 'Critical: This site does not use HTTPS. Your connection is not encrypted.';
    }

    if (reportData.tlsGrade && ['D', 'F'].includes(reportData.tlsGrade)) {
      return `TLS grade ${reportData.tlsGrade} indicates outdated encryption configuration.`;
    }

    return 'Some security headers are missing, which could leave users vulnerable to certain attacks.';
  }

  /**
   * Generate third-party context
   */
  private getThirdPartyContext(
    reportData: ReportDataForContext,
    benchmarks: GlobalBenchmarks,
    penalty: number
  ): string {
    if (penalty === 0) {
      return 'Minimal third-party connections — your data stays with this site.';
    }

    return `${reportData.thirdPartyCount} external domains contacted. Each third-party receives some information about your visit.`;
  }

  /**
   * Generate cookie context
   */
  private getCookieContext(
    reportData: ReportDataForContext,
    benchmarks: GlobalBenchmarks,
    penalty: number
  ): string {
    if (penalty === 0) {
      return 'Cookies are properly secured with Secure and SameSite attributes.';
    }

    const comparison = reportData.cookieCount <= benchmarks.averageCookieCount
      ? 'below average'
      : 'above average';

    return `${reportData.cookieCount} cookies detected (${comparison}). Some are missing security attributes.`;
  }

  /**
   * Generate compliance context
   */
  private getComplianceContext(reportData: ReportDataForContext, penalty: number): string {
    if (penalty === 0) {
      return 'Privacy policy found — the site discloses its data practices.';
    }

    return 'No privacy policy link found. Legitimate sites typically disclose how they handle your data.';
  }

  /**
   * Get prevalence statistics for unusual findings
   */
  async getPrevalenceStats(): Promise<PrevalenceStats> {
    // Try to get from cache
    const cachedFP = await CacheService.get<number>(CONTEXT_CACHE_KEYS.PREVALENCE_FINGERPRINTING);
    const cachedET = await CacheService.get<number>(CONTEXT_CACHE_KEYS.PREVALENCE_EXCESSIVE_TRACKERS);
    const cachedHA = await CacheService.get<number>(CONTEXT_CACHE_KEYS.PREVALENCE_HIGH_AD_RATIO);

    if (cachedFP !== null && cachedET !== null && cachedHA !== null) {
      return {
        fingerprintingRate: cachedFP,
        excessiveTrackerRate: cachedET,
        highAdRatioRate: cachedHA,
        httpOnlyRate: 3, // Hardcoded - very few sites are HTTP-only now
      };
    }

    // Calculate from database
    return this.calculatePrevalenceStats();
  }

  /**
   * Calculate prevalence statistics from database
   */
  private async calculatePrevalenceStats(): Promise<PrevalenceStats> {
    const startTime = Date.now();
    logger.info('Calculating prevalence statistics...');

    try {
      // Get total completed scans
      const totalScans = await this.prisma.scan.count({
        where: { status: 'done', score: { not: null } },
      });

      if (totalScans === 0) {
        return {
          fingerprintingRate: 12,
          excessiveTrackerRate: 15,
          highAdRatioRate: 25,
          httpOnlyRate: 3,
        };
      }

      // Count scans with fingerprinting evidence
      const fingerprintingCount = await this.prisma.evidence.groupBy({
        by: ['scanId'],
        where: { kind: 'fingerprint' },
      });
      const fingerprintingRate = Math.round((fingerprintingCount.length / totalScans) * 100);

      // Get benchmarks for tracker threshold
      const benchmarks = await this.analyticsService.getGlobalBenchmarks();
      const trackerThreshold = benchmarks.averageTrackerCount * 2;

      // Count scans with excessive trackers (using raw SQL for efficiency)
      const excessiveTrackerScans = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT e."scanId") as count
        FROM "Evidence" e
        WHERE e.kind = 'tracker'
        GROUP BY e."scanId"
        HAVING COUNT(*) > ${Math.ceil(trackerThreshold)}
      `;
      const excessiveTrackerRate = Math.round(
        (Number(excessiveTrackerScans[0]?.count || 0) / totalScans) * 100
      );

      // Cache the results
      await CacheService.set(CONTEXT_CACHE_KEYS.PREVALENCE_FINGERPRINTING, fingerprintingRate, CONTEXT_CACHE_TTL);
      await CacheService.set(CONTEXT_CACHE_KEYS.PREVALENCE_EXCESSIVE_TRACKERS, excessiveTrackerRate, CONTEXT_CACHE_TTL);
      await CacheService.set(CONTEXT_CACHE_KEYS.PREVALENCE_HIGH_AD_RATIO, 25, CONTEXT_CACHE_TTL); // Estimated

      const duration = Date.now() - startTime;
      logger.info({ duration, fingerprintingRate, excessiveTrackerRate }, 'Prevalence statistics calculated');

      return {
        fingerprintingRate,
        excessiveTrackerRate,
        highAdRatioRate: 25, // Estimated - would need tracker categorization to calculate
        httpOnlyRate: 3, // Very few sites are HTTP-only
      };
    } catch (error) {
      logger.error({ error }, 'Failed to calculate prevalence statistics');
      // Return reasonable defaults
      return {
        fingerprintingRate: 12,
        excessiveTrackerRate: 15,
        highAdRatioRate: 25,
        httpOnlyRate: 3,
      };
    }
  }

  /**
   * Invalidate context cache for a domain
   */
  async invalidateCache(domain: string): Promise<void> {
    await CacheService.del(CONTEXT_CACHE_KEYS.CONTEXT(domain));
  }

  /**
   * Refresh all prevalence statistics
   */
  async refreshPrevalenceStats(): Promise<void> {
    await CacheService.del(CONTEXT_CACHE_KEYS.PREVALENCE_FINGERPRINTING);
    await CacheService.del(CONTEXT_CACHE_KEYS.PREVALENCE_EXCESSIVE_TRACKERS);
    await CacheService.del(CONTEXT_CACHE_KEYS.PREVALENCE_HIGH_AD_RATIO);
    await this.getPrevalenceStats();
  }

  /**
   * Get global statistics for the benchmarks page
   */
  async getGlobalStats(): Promise<{
    totalScans: number;
    averageScore: number;
    averageTrackerCount: number;
    averageCookieCount: number;
    distribution: Array<{ bucket: string; count: number; percentage: number }>;
  }> {
    const cacheKey = 'context:global_stats:v1';

    return CacheService.getOrSet(cacheKey, async () => {
      const benchmarks = await this.analyticsService.getGlobalBenchmarks();

      // Get score distribution by buckets
      const distribution = await this.calculateScoreDistribution();

      return {
        totalScans: benchmarks.totalDomains,
        averageScore: benchmarks.averageScore,
        averageTrackerCount: benchmarks.averageTrackerCount,
        averageCookieCount: benchmarks.averageCookieCount,
        distribution,
      };
    }, 300); // 5 minute cache
  }

  /**
   * Calculate score distribution for histogram
   */
  private async calculateScoreDistribution(): Promise<
    Array<{ bucket: string; count: number; percentage: number }>
  > {
    const buckets = [
      { label: '0-20', min: 0, max: 20 },
      { label: '21-40', min: 21, max: 40 },
      { label: '41-60', min: 41, max: 60 },
      { label: '61-80', min: 61, max: 80 },
      { label: '81-100', min: 81, max: 100 },
    ];

    const results: Array<{ bucket: string; count: number; percentage: number }> = [];
    let totalCount = 0;

    // Count scans in each bucket
    const counts = await Promise.all(
      buckets.map(async (bucket) => {
        const count = await this.prisma.scan.count({
          where: {
            status: 'done',
            score: {
              gte: bucket.min,
              lte: bucket.max,
            },
          },
        });
        return { label: bucket.label, count };
      })
    );

    // Calculate total
    totalCount = counts.reduce((sum, b) => sum + b.count, 0);

    // Calculate percentages
    for (const { label, count } of counts) {
      results.push({
        bucket: label,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      });
    }

    return results;
  }
}

/**
 * Create context service instance
 */
export function createContextService(
  prisma: PrismaClient,
  analyticsService: AnalyticsService
): ContextService {
  return new ContextService(prisma, analyticsService);
}
