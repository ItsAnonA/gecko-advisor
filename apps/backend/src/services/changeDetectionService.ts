/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Change Detection Service
 *
 * Detects, records, and queries privacy changes between scans.
 * Enables "What changed on this domain?" and site-wide change feed.
 */

import type { PrismaClient, ChangeType, DomainChange, Scan } from "@prisma/client";
import { normalizeDomain } from "./domainService.js";
import { logger } from "../logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Extracted scan data for comparison
 */
interface ScanData {
  scanId: string;
  score: number;
  trackers: string[];
  trackerCount: number;
  hasFingerprinting: boolean;
  finishedAt: Date | null;
}

/**
 * Result of change detection
 */
export interface ChangeDetectionResult {
  recorded: boolean;
  result?: DomainChange;
  reason?: string;
}

/**
 * Options for querying changes
 */
export interface ChangeQueryOptions {
  limit?: number;
  offset?: number;
  changeTypes?: ChangeType[];
  minSignificance?: number;
}

/**
 * Change statistics
 */
export interface ChangeStats {
  totalChanges: number;
  byType: Record<ChangeType, number>;
  avgScoreDelta: number;
  domainsWithChanges: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Thresholds for change classification
 */
const THRESHOLDS = {
  SKIP_DELTA: 2, // Skip recording if |scoreDelta| < 2
  SKIP_SIGNIFICANCE: 0.05, // Skip if significance < 0.05
  MINOR_MAX: 5, // 2-5 points
  MODERATE_MAX: 15, // 6-15 points
  MAJOR_MAX: 25, // 16-25 points
  // >25 = CRITICAL
};

// ============================================================================
// Core Detection Functions
// ============================================================================

/**
 * Main entry point: Detect and record changes for a completed scan.
 * Called by the worker after scan completion.
 */
export async function detectChangesForScan(
  prisma: PrismaClient,
  scanId: string
): Promise<ChangeDetectionResult> {
  try {
    // 1. Get the current scan with evidence
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        evidence: {
          select: {
            kind: true,
            details: true,
          },
        },
        domain: true,
      },
    });

    if (!scan) {
      return { recorded: false, reason: "Scan not found" };
    }

    if (scan.status !== "done" || scan.score === null) {
      return { recorded: false, reason: "Scan not complete or has no score" };
    }

    if (!scan.domainId) {
      return { recorded: false, reason: "Scan has no linked domain" };
    }

    // 2. Find the previous completed scan for this domain
    const previousScan = await prisma.scan.findFirst({
      where: {
        domainId: scan.domainId,
        status: "done",
        score: { not: null },
        id: { not: scanId },
        finishedAt: { lt: scan.finishedAt ?? new Date() },
      },
      orderBy: {
        finishedAt: "desc",
      },
      include: {
        evidence: {
          select: {
            kind: true,
            details: true,
          },
        },
      },
    });

    if (!previousScan) {
      return { recorded: false, reason: "No previous scan to compare" };
    }

    // 3. Extract data from both scans
    const currentData = extractScanData(scan as Scan & { evidence: Array<{ kind: string; details: unknown }> });
    const previousData = extractScanData(previousScan as Scan & { evidence: Array<{ kind: string; details: unknown }> });

    // 4. Calculate changes
    const scoreDelta = currentData.score - previousData.score;
    const absScoreDelta = Math.abs(scoreDelta);

    const trackersAdded = currentData.trackers.filter(
      (t) => !previousData.trackers.includes(t)
    );
    const trackersRemoved = previousData.trackers.filter(
      (t) => !currentData.trackers.includes(t)
    );

    const fingerprintingChanged =
      currentData.hasFingerprinting !== previousData.hasFingerprinting;

    // 5. Classify the change
    const changeType = classifyChange(
      scoreDelta,
      fingerprintingChanged,
      trackersAdded.length,
      trackersRemoved.length
    );

    // 6. Calculate significance score
    const significanceScore = calculateSignificance(
      absScoreDelta,
      fingerprintingChanged,
      trackersAdded.length,
      trackersRemoved.length
    );

    // 7. Skip if change is insignificant
    if (
      changeType === "NONE" &&
      absScoreDelta < THRESHOLDS.SKIP_DELTA &&
      significanceScore < THRESHOLDS.SKIP_SIGNIFICANCE
    ) {
      return { recorded: false, reason: "Change too small to record" };
    }

    // 8. Build change reasons
    const changeReasons = buildChangeReasons(
      scoreDelta,
      fingerprintingChanged,
      currentData.hasFingerprinting,
      trackersAdded,
      trackersRemoved
    );

    // 9. Check if change already exists (idempotency)
    const existingChange = await prisma.domainChange.findUnique({
      where: {
        domainId_scanId: {
          domainId: scan.domainId,
          scanId: scanId,
        },
      },
    });

    if (existingChange) {
      return { recorded: false, reason: "Change already recorded" };
    }

    // 10. Record the change
    const domainChange = await prisma.domainChange.create({
      data: {
        domainId: scan.domainId,
        scanId: scanId,
        previousScanId: previousScan.id,
        scoreBefore: previousData.score,
        scoreAfter: currentData.score,
        scoreDelta,
        trackerCountBefore: previousData.trackerCount,
        trackerCountAfter: currentData.trackerCount,
        trackersAdded,
        trackersRemoved,
        fingerprintingBefore: previousData.hasFingerprinting,
        fingerprintingAfter: currentData.hasFingerprinting,
        fingerprintingChanged,
        changeType,
        significanceScore,
        changeReasons,
      },
    });

    logger.info(
      {
        domainId: scan.domainId,
        scanId,
        changeType,
        scoreDelta,
        significanceScore,
      },
      "Change recorded"
    );

    return { recorded: true, result: domainChange };
  } catch (error) {
    logger.error({ error, scanId }, "Failed to detect changes");
    return { recorded: false, reason: `Error: ${String(error)}` };
  }
}

/**
 * Extract relevant data from a scan for comparison
 */
export function extractScanData(
  scan: Scan & { evidence: Array<{ kind: string; details: unknown }> }
): ScanData {
  const trackers: string[] = [];
  let hasFingerprinting = false;

  for (const evidence of scan.evidence) {
    // Extract tracker domains
    if (evidence.kind === "tracker" || evidence.kind === "third_party_tracker") {
      const details = evidence.details as { domain?: string; root?: string };
      const domain = details.domain || details.root;
      if (domain) {
        trackers.push(domain);
      }
    }

    // Check for fingerprinting
    if (
      evidence.kind === "fingerprinting" ||
      evidence.kind === "canvas_fingerprinting" ||
      evidence.kind === "webgl_fingerprinting" ||
      evidence.kind === "audio_fingerprinting"
    ) {
      hasFingerprinting = true;
    }
  }

  return {
    scanId: scan.id,
    score: scan.score ?? 0,
    trackers: [...new Set(trackers)], // Deduplicate
    trackerCount: trackers.length,
    hasFingerprinting,
    finishedAt: scan.finishedAt,
  };
}

/**
 * Classify the type of change based on delta and flags
 */
export function classifyChange(
  scoreDelta: number,
  fingerprintingChanged: boolean,
  trackersAdded: number,
  trackersRemoved: number
): ChangeType {
  const absDelta = Math.abs(scoreDelta);

  // CRITICAL: >25 point swing OR fingerprinting status changed
  if (absDelta > THRESHOLDS.MAJOR_MAX || fingerprintingChanged) {
    return "CRITICAL";
  }

  // MAJOR: 16-25 points
  if (absDelta > THRESHOLDS.MODERATE_MAX) {
    return "MAJOR";
  }

  // MODERATE: 6-15 points
  if (absDelta > THRESHOLDS.MINOR_MAX) {
    return "MODERATE";
  }

  // MINOR: 2-5 points
  if (absDelta >= THRESHOLDS.SKIP_DELTA) {
    return "MINOR";
  }

  // Check if there are significant tracker changes even without score change
  if (trackersAdded >= 3 || trackersRemoved >= 3) {
    return "MINOR";
  }

  return "NONE";
}

/**
 * Calculate significance score (0-1) for ranking and filtering
 */
export function calculateSignificance(
  absScoreDelta: number,
  fingerprintingChanged: boolean,
  trackersAdded: number,
  trackersRemoved: number
): number {
  let score = 0;

  // Score delta contributes up to 0.5
  score += Math.min(absScoreDelta / 50, 0.5);

  // Fingerprinting change is highly significant
  if (fingerprintingChanged) {
    score += 0.3;
  }

  // Tracker changes contribute up to 0.2
  const trackerChanges = trackersAdded + trackersRemoved;
  score += Math.min(trackerChanges / 10, 0.2);

  return Math.min(score, 1);
}

/**
 * Build human-readable change reasons
 */
export function buildChangeReasons(
  scoreDelta: number,
  fingerprintingChanged: boolean,
  currentFingerprinting: boolean,
  trackersAdded: string[],
  trackersRemoved: string[]
): string[] {
  const reasons: string[] = [];

  // Score change
  if (scoreDelta !== 0) {
    const direction = scoreDelta > 0 ? "improved" : "decreased";
    reasons.push(`Privacy score ${direction} by ${Math.abs(scoreDelta)} points`);
  }

  // Fingerprinting change
  if (fingerprintingChanged) {
    if (currentFingerprinting) {
      reasons.push("Fingerprinting techniques detected");
    } else {
      reasons.push("Fingerprinting techniques removed");
    }
  }

  // Tracker changes
  if (trackersAdded.length > 0) {
    if (trackersAdded.length <= 3) {
      reasons.push(`Added trackers: ${trackersAdded.join(", ")}`);
    } else {
      reasons.push(
        `Added ${trackersAdded.length} trackers including ${trackersAdded.slice(0, 2).join(", ")}`
      );
    }
  }

  if (trackersRemoved.length > 0) {
    if (trackersRemoved.length <= 3) {
      reasons.push(`Removed trackers: ${trackersRemoved.join(", ")}`);
    } else {
      reasons.push(`Removed ${trackersRemoved.length} trackers`);
    }
  }

  return reasons;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get changes for a specific domain
 */
export async function getChangesForDomain(
  prisma: PrismaClient,
  domain: string,
  options: ChangeQueryOptions = {}
): Promise<DomainChange[]> {
  const { limit = 10, offset = 0, changeTypes, minSignificance } = options;

  const normalized = normalizeDomain(domain);
  if (!normalized) return [];

  const domainRecord = await prisma.domain.findUnique({
    where: { domain: normalized },
    select: { id: true },
  });

  if (!domainRecord) return [];

  return prisma.domainChange.findMany({
    where: {
      domainId: domainRecord.id,
      ...(changeTypes && changeTypes.length > 0 && { changeType: { in: changeTypes } }),
      ...(minSignificance !== undefined && { significanceScore: { gte: minSignificance } }),
    },
    orderBy: { detectedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get recent changes across all domains
 */
export async function getRecentChanges(
  prisma: PrismaClient,
  options: ChangeQueryOptions = {}
): Promise<(DomainChange & { domain: { domain: string } })[]> {
  const { limit = 20, offset = 0, changeTypes, minSignificance } = options;

  return prisma.domainChange.findMany({
    where: {
      ...(changeTypes && changeTypes.length > 0 && { changeType: { in: changeTypes } }),
      ...(minSignificance !== undefined && { significanceScore: { gte: minSignificance } }),
    },
    include: {
      domain: {
        select: { domain: true },
      },
    },
    orderBy: { detectedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get change statistics
 */
export async function getChangeStats(
  prisma: PrismaClient,
  since?: Date
): Promise<ChangeStats> {
  const sinceDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days

  const where = {
    detectedAt: { gte: sinceDate },
  };

  // Total count
  const totalChanges = await prisma.domainChange.count({ where });

  // Count by type
  const typeCounts = await prisma.domainChange.groupBy({
    by: ["changeType"],
    where,
    _count: true,
  });

  const byType: Record<ChangeType, number> = {
    NONE: 0,
    MINOR: 0,
    MODERATE: 0,
    MAJOR: 0,
    CRITICAL: 0,
  };

  for (const tc of typeCounts) {
    byType[tc.changeType] = tc._count;
  }

  // Average score delta
  const avgResult = await prisma.domainChange.aggregate({
    where,
    _avg: { scoreDelta: true },
  });

  // Unique domains with changes
  const domainsWithChanges = await prisma.domainChange.groupBy({
    by: ["domainId"],
    where,
    _count: true,
  });

  return {
    totalChanges,
    byType,
    avgScoreDelta: Math.abs(avgResult._avg.scoreDelta ?? 0),
    domainsWithChanges: domainsWithChanges.length,
  };
}

/**
 * Get the most recent change for a domain
 */
export async function getLatestChange(
  prisma: PrismaClient,
  domain: string
): Promise<DomainChange | null> {
  const changes = await getChangesForDomain(prisma, domain, { limit: 1 });
  return changes[0] ?? null;
}

/**
 * Check if a domain has any recorded changes
 */
export async function hasChanges(
  prisma: PrismaClient,
  domain: string
): Promise<boolean> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  const domainRecord = await prisma.domain.findUnique({
    where: { domain: normalized },
    select: { id: true },
  });

  if (!domainRecord) return false;

  const count = await prisma.domainChange.count({
    where: { domainId: domainRecord.id },
  });

  return count > 0;
}
