/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Change Detection for Worker
 *
 * Detects and records privacy changes between scans.
 * Called after scan completion in the worker.
 */

import type { PrismaClient, ChangeType, DomainChange, Scan } from "@prisma/client";
import { logger } from "./logger.js";

// ============================================================================
// Types
// ============================================================================

interface ScanData {
  scanId: string;
  score: number;
  trackers: string[];
  trackerCount: number;
  hasFingerprinting: boolean;
  finishedAt: Date | null;
}

export interface ChangeDetectionResult {
  recorded: boolean;
  result?: DomainChange;
  reason?: string;
}

// ============================================================================
// Constants
// ============================================================================

const THRESHOLDS = {
  SKIP_DELTA: 2,
  SKIP_SIGNIFICANCE: 0.05,
  MINOR_MAX: 5,
  MODERATE_MAX: 15,
  MAJOR_MAX: 25,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Main entry: Detect and record changes for a completed scan.
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

function extractScanData(
  scan: Scan & { evidence: Array<{ kind: string; details: unknown }> }
): ScanData {
  const trackers: string[] = [];
  let hasFingerprinting = false;

  for (const evidence of scan.evidence) {
    if (evidence.kind === "tracker" || evidence.kind === "third_party_tracker") {
      const details = evidence.details as { domain?: string; root?: string };
      const domain = details.domain || details.root;
      if (domain) {
        trackers.push(domain);
      }
    }

    if (
      evidence.kind === "fingerprint"
    ) {
      hasFingerprinting = true;
    }
  }

  return {
    scanId: scan.id,
    score: scan.score ?? 0,
    trackers: [...new Set(trackers)],
    trackerCount: trackers.length,
    hasFingerprinting,
    finishedAt: scan.finishedAt,
  };
}

function classifyChange(
  scoreDelta: number,
  fingerprintingChanged: boolean,
  trackersAdded: number,
  trackersRemoved: number
): ChangeType {
  const absDelta = Math.abs(scoreDelta);

  if (absDelta > THRESHOLDS.MAJOR_MAX || fingerprintingChanged) {
    return "CRITICAL";
  }

  if (absDelta > THRESHOLDS.MODERATE_MAX) {
    return "MAJOR";
  }

  if (absDelta > THRESHOLDS.MINOR_MAX) {
    return "MODERATE";
  }

  if (absDelta >= THRESHOLDS.SKIP_DELTA) {
    return "MINOR";
  }

  if (trackersAdded >= 3 || trackersRemoved >= 3) {
    return "MINOR";
  }

  return "NONE";
}

function calculateSignificance(
  absScoreDelta: number,
  fingerprintingChanged: boolean,
  trackersAdded: number,
  trackersRemoved: number
): number {
  let score = 0;

  score += Math.min(absScoreDelta / 50, 0.5);

  if (fingerprintingChanged) {
    score += 0.3;
  }

  const trackerChanges = trackersAdded + trackersRemoved;
  score += Math.min(trackerChanges / 10, 0.2);

  return Math.min(score, 1);
}

function buildChangeReasons(
  scoreDelta: number,
  fingerprintingChanged: boolean,
  currentFingerprinting: boolean,
  trackersAdded: string[],
  trackersRemoved: string[]
): string[] {
  const reasons: string[] = [];

  if (scoreDelta !== 0) {
    const direction = scoreDelta > 0 ? "improved" : "decreased";
    reasons.push(`Privacy score ${direction} by ${Math.abs(scoreDelta)} points`);
  }

  if (fingerprintingChanged) {
    if (currentFingerprinting) {
      reasons.push("Fingerprinting techniques detected");
    } else {
      reasons.push("Fingerprinting techniques removed");
    }
  }

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
