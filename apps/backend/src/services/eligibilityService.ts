/**
 * ELIGIBILITY SERVICE
 *
 * Manages domain scan eligibility based on signals.
 * Zero-signal domains gradually become less eligible to prevent
 * Tier C from drowning exploration budget.
 *
 * DIE Final Hardening:
 * - Fix 3: Suspension safeguards (never suspend if impressions>0)
 *
 * @module eligibilityService
 */

import type { PrismaClient } from '@prisma/client';
import { ELIGIBILITY_DECAY, SUSPENSION_SAFEGUARDS } from '../config/tier-config.js';

export interface EligibilityDecayResult {
  deprioritized: number;
  suspended: number;
  preserved: number;
  suspensionSamples: Array<{ domain: string; reason: string }>;
}

/**
 * Check if domain has any preserving signals.
 * Domains with these signals are protected from decay.
 */
export async function hasPreservingSignals(
  prisma: PrismaClient,
  domainId: string
): Promise<boolean> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      gscClicks: true,
      gscImpressions: true,
      trancoRank: true,
    },
  });

  if (!domain) return false;

  const signals = ELIGIBILITY_DECAY.preservingSignals;

  return (
    (domain.gscClicks || 0) >= signals.gscClicks ||
    (domain.gscImpressions || 0) >= signals.gscImpressions ||
    (domain.trancoRank != null && domain.trancoRank <= signals.trancoRank)
  );
}

/**
 * Calculate days since last meaningful signal.
 */
export async function daysSinceLastSignal(
  prisma: PrismaClient,
  domainId: string
): Promise<number> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      lastScannedAt: true,
      gscLastUpdated: true,
      createdAt: true,
    },
  });

  if (!domain) return Infinity;

  const dates = [domain.lastScannedAt, domain.gscLastUpdated, domain.createdAt].filter(
    Boolean
  ) as Date[];

  if (dates.length === 0) return Infinity;

  const mostRecent = new Date(Math.max(...dates.map((d) => d.getTime())));

  return Math.floor((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================
// FIX 3: SUSPENSION SAFEGUARDS
// ============================================================

/**
 * Apply eligibility decay to zero-signal domains with SAFEGUARDS.
 * Run weekly to prevent Tier C from overwhelming exploration budget.
 *
 * Safeguards (Fix 3) - NEVER suspend if:
 * - In Tranco top 1M
 * - Has ANY impressions (not just clicks)
 * - Is category top 50
 * - Has tier score >= 60
 *
 * Two-stage decay:
 * 1. 180 days: Deprioritize (reduce rescan priority to 20)
 * 2. 365 days: Suspend (set eligibleForScan = false)
 */
export async function applyEligibilityDecay(
  prisma: PrismaClient
): Promise<EligibilityDecayResult> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              ELIGIBILITY DECAY (With Safeguards)             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  let deprioritized = 0;
  let suspended = 0;
  let preserved = 0;
  const suspensionSamples: Array<{ domain: string; reason: string }> = [];

  // Get Tier C domains (decay only applies to lowest tier)
  const tierCDomains = await prisma.domain.findMany({
    where: {
      indexTier: 'C',
      eligibleForScan: true,
    },
    select: {
      id: true,
      domain: true,
      trancoRank: true,
      gscImpressions: true,
      gscClicks: true,
      tierScore: true,
      categoryId: true,
      lastScannedAt: true,
      createdAt: true,
    },
  });

  console.log(`\nProcessing ${tierCDomains.length} Tier C domains...`);

  for (const domain of tierCDomains) {
    // ============================================================
    // SUSPENSION SAFEGUARDS (Fix 3)
    // ============================================================
    const safeguards = SUSPENSION_SAFEGUARDS.protectIf;

    // Safeguard 1: In Tranco top 1M
    if (safeguards.inTrancoTop1M && domain.trancoRank && domain.trancoRank <= 1000000) {
      preserved++;
      continue;
    }

    // Safeguard 2: Has ANY impressions (not just clicks)
    if (safeguards.hasAnyImpressions && (domain.gscImpressions || 0) > 0) {
      preserved++;
      continue;
    }

    // Safeguard 3: Category top 50
    if (safeguards.isCategoryTop50 && domain.categoryId) {
      const rank = await prisma.domain.count({
        where: {
          categoryId: domain.categoryId,
          tierScore: { gt: domain.tierScore || 0 },
        },
      });
      if (rank < 50) {
        preserved++;
        continue;
      }
    }

    // Safeguard 4: High tier score
    if (safeguards.hasTierScoreAbove && (domain.tierScore || 0) >= safeguards.hasTierScoreAbove) {
      preserved++;
      continue;
    }

    // Check for preserving signals (legacy check)
    if (await hasPreservingSignals(prisma, domain.id)) {
      preserved++;
      continue;
    }

    // Calculate days since last signal
    const lastActivity = domain.lastScannedAt || domain.createdAt;
    const daysSince = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    // Apply decay stages (process in reverse order - most severe first)
    for (const stage of [...ELIGIBILITY_DECAY.stages].reverse()) {
      if (daysSince >= stage.daysZeroSignal) {
        if (stage.action === 'suspend') {
          // Final check: require ZERO signals (not just clicks)
          if ((domain.gscClicks || 0) > 0 || (domain.gscImpressions || 0) > 0) {
            preserved++;
            break;
          }

          await prisma.domain.update({
            where: { id: domain.id },
            data: {
              eligibleForScan: false,
              eligibilityReason: `zero_signal_${daysSince}d`,
              eligibilityTaggedAt: new Date(),
            },
          });

          suspended++;

          // Log sample for review
          if (suspensionSamples.length < SUSPENSION_SAFEGUARDS.logTopSuspensions) {
            suspensionSamples.push({
              domain: domain.domain,
              reason: `zero_signal_${daysSince}d`,
            });
          }
          break;
        } else if (stage.action === 'deprioritize') {
          await prisma.domain.update({
            where: { id: domain.id },
            data: {
              rescanPriority: stage.priority,
              eligibilityReason: `deprioritized_${daysSince}d`,
            },
          });
          deprioritized++;
          break;
        }
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Preserved (safeguards): ${preserved}`);
  console.log(`  Deprioritized (180+ days): ${deprioritized}`);
  console.log(`  Suspended (365+ days): ${suspended}`);
  console.log('');
  console.log('  Sample suspensions (review these):');
  suspensionSamples.slice(0, 10).forEach((s) => {
    console.log(`    - ${s.domain}: ${s.reason}`);
  });

  return { deprioritized, suspended, preserved, suspensionSamples };
}

/**
 * Reactivate a suspended domain when it shows signals.
 * Called when GSC data is updated or user requests a scan.
 */
export async function reactivateDomain(
  prisma: PrismaClient,
  domainId: string,
  reason: 'gsc_clicks' | 'gsc_impressions' | 'manual_request'
): Promise<boolean> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { eligibleForScan: true, domain: true },
  });

  if (!domain || domain.eligibleForScan) {
    return false; // Already active or not found
  }

  await prisma.domain.update({
    where: { id: domainId },
    data: {
      eligibleForScan: true,
      eligibilityReason: null,
      eligibilityTaggedAt: null,
      rescanPriority: 50, // Reset to normal
      // Mark for immediate scan
      scanScheduledAt: new Date(),
    },
  });

  console.log(`Reactivated domain ${domain.domain}: ${reason}`);
  return true;
}

/**
 * Bulk check and reactivate domains based on GSC signals.
 * Call this after GSC data sync.
 */
export async function bulkReactivateFromGSC(prisma: PrismaClient): Promise<number> {
  const reactivation = ELIGIBILITY_DECAY.reactivation;

  // Find suspended domains that now have qualifying signals
  const toReactivate = await prisma.domain.findMany({
    where: {
      eligibleForScan: false,
      OR: [
        { gscClicks: { gte: reactivation.gscClicks } },
        { gscImpressions: { gte: reactivation.gscImpressions } },
      ],
    },
    select: { id: true },
  });

  if (toReactivate.length === 0) {
    return 0;
  }

  const result = await prisma.domain.updateMany({
    where: { id: { in: toReactivate.map((d) => d.id) } },
    data: {
      eligibleForScan: true,
      eligibilityReason: null,
      eligibilityTaggedAt: null,
      rescanPriority: 50,
      scanScheduledAt: new Date(),
    },
  });

  console.log(`Bulk reactivated ${result.count} domains from GSC signals`);
  return result.count;
}

/**
 * Get eligibility statistics for monitoring.
 */
export async function getEligibilityStats(prisma: PrismaClient): Promise<{
  total: number;
  eligible: number;
  suspended: number;
  deprioritized: number;
  byTier: Record<string, { eligible: number; suspended: number }>;
}> {
  const [total, eligible, suspended, deprioritized, byTier] = await Promise.all([
    prisma.domain.count(),
    prisma.domain.count({ where: { eligibleForScan: true } }),
    prisma.domain.count({ where: { eligibleForScan: false } }),
    prisma.domain.count({
      where: { eligibilityReason: { startsWith: 'deprioritized' } },
    }),
    prisma.domain.groupBy({
      by: ['indexTier', 'eligibleForScan'],
      _count: true,
    }),
  ]);

  const tierStats: Record<string, { eligible: number; suspended: number }> = {
    A: { eligible: 0, suspended: 0 },
    B: { eligible: 0, suspended: 0 },
    C: { eligible: 0, suspended: 0 },
  };

  for (const row of byTier) {
    const tier = row.indexTier;
    if (tier && tier in tierStats) {
      const stats = tierStats[tier as keyof typeof tierStats];
      if (stats) {
        if (row.eligibleForScan) {
          stats.eligible = row._count;
        } else {
          stats.suspended = row._count;
        }
      }
    }
  }

  return {
    total,
    eligible,
    suspended,
    deprioritized,
    byTier: tierStats,
  };
}
