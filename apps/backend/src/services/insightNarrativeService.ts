/**
 * Insight Narrative Service
 *
 * Wires narrative generation into the insight pipeline so every publishable
 * insight gets a narrative generated and validated through hedge language
 * enforcement. This closes the governance gap where 98% of insights were
 * publishing without any narrative governance checks.
 *
 * Design: fail-closed. Any error during generation → narrativeStatus: 'error'.
 * Idempotent: only processes insights where narrativeStatus IS NULL.
 */

import type { PrismaClient, InsightType } from '@prisma/client';
import { generateNarrativeWithValidation } from './narrativeService.js';

// ============================================================
// TEMPLATE DATA EXTRACTION
// ============================================================

interface TemplateMapping {
  templateId: string;
  data: Record<string, unknown>;
}

/**
 * Extract template ID and data from an insight based on its type.
 * Returns null for types that should be skipped (WEEKLY_SUMMARY)
 * or when required data is missing (fail-closed).
 */
export function extractTemplateData(insight: {
  insightType: InsightType;
  title: string;
  details: Record<string, unknown>;
  trackerDomain?: string | null;
  confidence: number;
}): TemplateMapping | null {
  const details = insight.details;

  switch (insight.insightType) {
    case 'DOMAIN_IMPROVEMENT': {
      const domain = parseDomainFromTitle(insight.title);
      if (!domain) return null;

      const scoreBefore = details.scoreBefore as number | undefined;
      const scoreAfter = details.scoreAfter as number | undefined;
      if (scoreBefore == null || scoreAfter == null) return null;

      const trackersRemoved = Array.isArray(details.trackersRemoved)
        ? details.trackersRemoved.length
        : (details.trackersRemoved as number) ?? 0;
      const fingerprintingStopped = details.fingerprintingStopped as boolean ?? false;

      return {
        templateId: 'most_improved',
        data: {
          domain,
          delta: scoreAfter - scoreBefore,
          trackersRemoved,
          fingerprintingStopped,
        },
      };
    }

    case 'DOMAIN_REGRESSION': {
      const domain = parseDomainFromTitle(insight.title);
      if (!domain) return null;

      const scoreBefore = details.scoreBefore as number | undefined;
      const scoreAfter = details.scoreAfter as number | undefined;
      if (scoreBefore == null || scoreAfter == null) return null;

      const trackersAdded = Array.isArray(details.trackersAdded)
        ? details.trackersAdded.length
        : (details.trackersAdded as number) ?? 0;
      const fingerprintingStarted = details.fingerprintingStarted as boolean ?? false;

      return {
        templateId: 'unexpected_regression',
        data: {
          domain,
          delta: Math.abs(scoreBefore - scoreAfter),
          trackersAdded,
          fingerprintingStarted,
          category: details.category as string | undefined,
        },
      };
    }

    case 'CATEGORY_TREND': {
      const category = parseCategoryFromTitle(insight.title);
      if (!category) return null;

      return {
        templateId: 'category_shift',
        data: {
          category,
          domainsImproving: details.domainsImproving as number ?? 0,
          domainsDeclining: details.domainsDeclining as number ?? 0,
        },
      };
    }

    case 'TRACKER_SURGE': {
      const tracker = insight.trackerDomain;
      if (!tracker) return null;

      const netChange = details.netChange as number;
      const domainCount = details.domainCount as number;
      if (netChange == null) return null;

      // Fail-closed on division by zero
      if (!domainCount || domainCount === 0) return null;

      const percent = Math.round((netChange / domainCount) * 100);

      return {
        templateId: 'tracker_surge',
        data: {
          tracker,
          percent,
          count: netChange,
        },
      };
    }

    case 'TRACKER_DECLINE': {
      const tracker = insight.trackerDomain;
      if (!tracker) return null;

      const netChange = details.netChange as number;
      if (netChange == null) return null;

      return {
        templateId: 'tracker_decline',
        data: {
          tracker,
          count: Math.abs(netChange),
        },
      };
    }

    case 'FINGERPRINTING_SHIFT': {
      const started = details.started as number;
      const stopped = details.stopped as number;
      if (started == null || stopped == null) return null;

      return {
        templateId: 'fingerprinting_trend',
        data: { started, stopped },
      };
    }

    case 'ANOMALY': {
      // Map to early_warning template — requires predictedChange which
      // insight details typically don't contain, causing natural errors
      const category = details.category as string | undefined;
      const count = details.count as number | undefined;
      const predictedChange = details.predictedChange as number | undefined;

      return {
        templateId: 'early_warning',
        data: {
          category: category ?? 'unknown',
          count: count ?? 0,
          predictedChange,
        },
      };
    }

    case 'WEEKLY_SUMMARY':
      // Weekly summaries have their own narrative pipeline
      return null;

    default:
      return null;
  }
}

// ============================================================
// TITLE PARSING HELPERS
// ============================================================

/**
 * Parse domain name from insight titles like:
 * "example.com improved privacy score by 15 points"
 * "example.com privacy score dropped by 10 points"
 */
export function parseDomainFromTitle(title: string): string | null {
  // Domain is always the first word in our title format
  const match = title.match(/^([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)/);
  return match?.[1] ?? null;
}

/**
 * Parse category name from insight titles like:
 * "Streaming privacy improved by 5.2%"
 * "eCommerce privacy declined by 3.1%"
 */
export function parseCategoryFromTitle(title: string): string | null {
  // Category is the first word(s) before " privacy"
  const match = title.match(/^(.+?)\s+privacy\s+/i);
  return match?.[1] ?? null;
}

// ============================================================
// BATCH PROCESSING
// ============================================================

export interface NarrativeProcessingResult {
  attempted: number;
  approved: number;
  blocked: number;
  errored: number;
  skipped: number;
}

/**
 * Process narratives for all publishable insights that haven't been processed yet.
 * Idempotent: only touches insights where narrativeStatus IS NULL.
 * Fail-closed: any error → narrativeStatus: 'error'.
 */
export async function processInsightNarratives(
  prisma: PrismaClient,
  _periodStart: Date,
): Promise<NarrativeProcessingResult> {
  const result: NarrativeProcessingResult = {
    attempted: 0,
    approved: 0,
    blocked: 0,
    errored: 0,
    skipped: 0,
  };

  // Find publishable insights without narrative processing
  const insights = await prisma.insight.findMany({
    where: {
      isPublishable: true,
      narrativeStatus: null,
    },
    select: {
      id: true,
      insightType: true,
      title: true,
      details: true,
      trackerDomain: true,
      confidence: true,
    },
  });

  for (const insight of insights) {
    result.attempted++;

    try {
      const details = (insight.details ?? {}) as Record<string, unknown>;
      const mapping = extractTemplateData({
        insightType: insight.insightType,
        title: insight.title,
        details,
        trackerDomain: insight.trackerDomain,
        confidence: insight.confidence,
      });

      // Skip types that don't need narratives (WEEKLY_SUMMARY)
      if (mapping === null) {
        await prisma.insight.update({
          where: { id: insight.id },
          data: {
            narrativeStatus: insight.insightType === 'WEEKLY_SUMMARY' ? 'skipped' : 'error',
            narrativeScope: 'INSIGHT',
          },
        });
        if (insight.insightType === 'WEEKLY_SUMMARY') {
          result.skipped++;
        } else {
          // Missing data → fail-closed
          result.errored++;
        }
        continue;
      }

      // Generate narrative with hedge validation
      const narrativeResult = generateNarrativeWithValidation(
        mapping.templateId,
        mapping.data,
      );

      if (narrativeResult.blocked) {
        await prisma.insight.update({
          where: { id: insight.id },
          data: {
            narrative: null,
            narrativeStatus: 'blocked',
            narrativeScope: 'INSIGHT',
          },
        });
        result.blocked++;
      } else {
        await prisma.insight.update({
          where: { id: insight.id },
          data: {
            narrative: narrativeResult.narrative,
            narrativeStatus: 'approved',
            narrativeScope: 'INSIGHT',
          },
        });
        result.approved++;
      }
    } catch {
      // Fail-closed: any exception → error status
      await prisma.insight.update({
        where: { id: insight.id },
        data: {
          narrativeStatus: 'error',
          narrativeScope: 'INSIGHT',
        },
      });
      result.errored++;
    }
  }

  return result;
}
