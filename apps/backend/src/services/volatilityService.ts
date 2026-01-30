/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * VOLATILITY SERVICE
 *
 * Computes score volatility metrics for domains to determine
 * if they need early rescans. Uses batched queries to avoid N+1.
 *
 * Based on volatility analysis (Jan 30, 2026):
 * - p50 stddev = 0 (75% of domains have ZERO score change)
 * - p90 stddev = 3 (even "volatile" domains barely move)
 *
 * Conclusion: Weekly rescans are unjustifiable. Only domains with
 * stddev > 4.0, range > 6, and 3+ scans over 14+ days qualify
 * for early rescan.
 */

import type { PrismaClient } from '@prisma/client';
import { VOLATILITY_RULES, SCAN_QUALITY_CRITERIA } from '../config/tier-config.js';

export interface VolatilityData {
  stddev: number;
  scanCount: number;
  scoreRange: number;
  timeSpanDays: number;
}

/**
 * Batch compute volatility for multiple domains in ONE query.
 * This is O(1) instead of O(n) queries.
 *
 * CRITICAL: Do not call computeVolatility() per domain in a loop.
 *
 * @param prisma - Prisma client instance
 * @param domainIds - Array of domain IDs to compute volatility for
 * @returns Map of domainId -> VolatilityData
 */
export async function batchComputeVolatility(
  prisma: PrismaClient,
  domainIds: string[]
): Promise<Map<string, VolatilityData>> {
  if (domainIds.length === 0) {
    return new Map();
  }

  // Use raw query for efficient aggregation across all domains at once
  // Only considers the 5 most recent scans per domain to prevent
  // historical data from skewing current volatility
  const results = await prisma.$queryRaw<
    {
      domainId: string;
      scan_count: bigint;
      score_stddev: number | null;
      score_range: number | null;
      time_span_days: number | null;
    }[]
  >`
    WITH recent_scans AS (
      SELECT
        "domainId",
        score,
        "finishedAt",
        ROW_NUMBER() OVER (PARTITION BY "domainId" ORDER BY "finishedAt" DESC) as rn
      FROM "Scan"
      WHERE "domainId" = ANY(${domainIds}::text[])
        AND status = 'done'
        AND score IS NOT NULL
    )
    SELECT
      "domainId",
      COUNT(*) as scan_count,
      STDDEV_POP(score) as score_stddev,
      MAX(score) - MIN(score) as score_range,
      EXTRACT(EPOCH FROM (MAX("finishedAt") - MIN("finishedAt"))) / 86400 as time_span_days
    FROM recent_scans
    WHERE rn <= 5
    GROUP BY "domainId"
    HAVING COUNT(*) >= 2
  `;

  const volatilityMap = new Map<string, VolatilityData>();

  for (const row of results) {
    volatilityMap.set(row.domainId, {
      stddev: row.score_stddev ?? 0,
      scanCount: Number(row.scan_count),
      scoreRange: row.score_range ?? 0,
      timeSpanDays: row.time_span_days ?? 0,
    });
  }

  return volatilityMap;
}

/**
 * Batch compute volatility using ONLY quality scans.
 * Filters out scans that may have been affected by scanner instability.
 *
 * Quality criteria:
 * - Status = 'done'
 * - Duration within normal range (5-120 seconds)
 * - Has required payload fields
 *
 * @param prisma - Prisma client instance
 * @param domainIds - Array of domain IDs to compute volatility for
 * @returns Map of domainId -> VolatilityData
 */
export async function batchComputeVolatilityWithQuality(
  prisma: PrismaClient,
  domainIds: string[]
): Promise<Map<string, VolatilityData>> {
  if (domainIds.length === 0) {
    return new Map();
  }

  const criteria = SCAN_QUALITY_CRITERIA;

  // Query with quality filters
  const results = await prisma.$queryRaw<
    {
      domainId: string;
      scan_count: bigint;
      score_stddev: number | null;
      score_range: number | null;
      time_span_days: number | null;
    }[]
  >`
    WITH quality_scans AS (
      SELECT
        "domainId",
        score,
        "finishedAt",
        "createdAt",
        EXTRACT(EPOCH FROM ("finishedAt" - "createdAt")) as duration_seconds,
        ROW_NUMBER() OVER (PARTITION BY "domainId" ORDER BY "finishedAt" DESC) as rn
      FROM "Scan"
      WHERE "domainId" = ANY(${domainIds}::text[])
        AND status = ${criteria.requiredStatus}
        AND score IS NOT NULL
        AND "finishedAt" IS NOT NULL
        AND "createdAt" IS NOT NULL
        -- Duration filter: exclude abnormally fast or slow scans
        AND EXTRACT(EPOCH FROM ("finishedAt" - "createdAt")) >= ${criteria.minDurationSeconds}
        AND EXTRACT(EPOCH FROM ("finishedAt" - "createdAt")) <= ${criteria.maxDurationSeconds}
    ),
    recent_quality_scans AS (
      SELECT * FROM quality_scans WHERE rn <= 5
    )
    SELECT
      "domainId",
      COUNT(*) as scan_count,
      STDDEV_POP(score) as score_stddev,
      MAX(score) - MIN(score) as score_range,
      EXTRACT(EPOCH FROM (MAX("finishedAt") - MIN("finishedAt"))) / 86400 as time_span_days
    FROM recent_quality_scans
    GROUP BY "domainId"
    HAVING COUNT(*) >= ${VOLATILITY_RULES.minScansRequired}
  `;

  const volatilityMap = new Map<string, VolatilityData>();

  for (const row of results) {
    volatilityMap.set(row.domainId, {
      stddev: row.score_stddev ?? 0,
      scanCount: Number(row.scan_count),
      scoreRange: row.score_range ?? 0,
      timeSpanDays: row.time_span_days ?? 0,
    });
  }

  return volatilityMap;
}

/**
 * Check if domain qualifies for early rescan based on volatility.
 * ALL criteria must be met.
 *
 * Criteria (from volatility analysis):
 * - stddev >= 4.0 (statistical significance)
 * - scanCount >= 3 (enough history)
 * - scoreRange >= 6 (not just noise)
 * - timeSpanDays >= 14 (scans must span 14+ days)
 */
export function isHighVolatility(data: VolatilityData | undefined): boolean {
  if (!data) return false;

  return (
    data.stddev >= VOLATILITY_RULES.threshold &&
    data.scanCount >= VOLATILITY_RULES.minScansRequired &&
    data.scoreRange >= VOLATILITY_RULES.minScoreRange &&
    data.timeSpanDays >= VOLATILITY_RULES.minTimeSpanDays
  );
}

/**
 * Get volatility summary for a single domain.
 * Use batchComputeVolatility for multiple domains.
 */
export async function getVolatilitySummary(
  prisma: PrismaClient,
  domainId: string
): Promise<VolatilityData | null> {
  const results = await batchComputeVolatility(prisma, [domainId]);
  return results.get(domainId) ?? null;
}

/**
 * Run volatility analysis for SLA reporting.
 * Returns percentile distribution of score volatility across all domains.
 */
export async function runVolatilityAnalysis(
  prisma: PrismaClient
): Promise<{
  domainsWithMultipleScans: number;
  avgScansPerDomain: number;
  maxScans: number;
  p50Stddev: number;
  p75Stddev: number;
  p90Stddev: number;
  p95Stddev: number;
  p99Stddev: number;
  p50Range: number;
  p90Range: number;
  avgRange: number;
}> {
  const results = await prisma.$queryRaw<
    {
      domains_with_multiple_scans: bigint;
      avg_scans_per_domain: number;
      max_scans: bigint;
      p50_stddev: number;
      p75_stddev: number;
      p90_stddev: number;
      p95_stddev: number;
      p99_stddev: number;
      p50_range: number;
      p90_range: number;
      avg_range: number;
    }[]
  >`
    WITH domain_scan_stats AS (
      SELECT
        "domainId",
        COUNT(*) as scan_count,
        STDDEV_POP(score) as score_stddev,
        MAX(score) - MIN(score) as score_range
      FROM "Scan"
      WHERE
        status = 'done'
        AND score IS NOT NULL
        AND "domainId" IS NOT NULL
      GROUP BY "domainId"
      HAVING COUNT(*) >= 2
    )
    SELECT
      COUNT(*) as domains_with_multiple_scans,
      ROUND(AVG(scan_count)::numeric, 1) as avg_scans_per_domain,
      MAX(scan_count) as max_scans,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score_stddev)::numeric, 2) as p50_stddev,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score_stddev)::numeric, 2) as p75_stddev,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY score_stddev)::numeric, 2) as p90_stddev,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY score_stddev)::numeric, 2) as p95_stddev,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY score_stddev)::numeric, 2) as p99_stddev,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score_range)::numeric, 1) as p50_range,
      ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY score_range)::numeric, 1) as p90_range,
      ROUND(AVG(score_range)::numeric, 2) as avg_range
    FROM domain_scan_stats
  `;

  const row = results[0];
  if (!row) {
    return {
      domainsWithMultipleScans: 0,
      avgScansPerDomain: 0,
      maxScans: 0,
      p50Stddev: 0,
      p75Stddev: 0,
      p90Stddev: 0,
      p95Stddev: 0,
      p99Stddev: 0,
      p50Range: 0,
      p90Range: 0,
      avgRange: 0,
    };
  }

  return {
    domainsWithMultipleScans: Number(row.domains_with_multiple_scans),
    avgScansPerDomain: row.avg_scans_per_domain ?? 0,
    maxScans: Number(row.max_scans),
    p50Stddev: row.p50_stddev ?? 0,
    p75Stddev: row.p75_stddev ?? 0,
    p90Stddev: row.p90_stddev ?? 0,
    p95Stddev: row.p95_stddev ?? 0,
    p99Stddev: row.p99_stddev ?? 0,
    p50Range: row.p50_range ?? 0,
    p90Range: row.p90_range ?? 0,
    avgRange: row.avg_range ?? 0,
  };
}
