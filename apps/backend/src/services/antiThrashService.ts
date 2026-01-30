/**
 * ANTI-THRASH SERVICE
 *
 * Prevents tier oscillation through:
 * - Cooldowns between tier changes
 * - Maximum tier changes per window (EVENT-BASED, not counters)
 * - Promotion confidence scoring with ANTI-SPIKE GUARDS
 * - Demotion protections with HYSTERESIS
 *
 * DIE Final Hardening:
 * - Fix 1: Anti-spike guards (min impressions, entropy, CTR)
 * - Fix 2: Hysteresis thresholds
 * - Fix 8: Event-based tier change counting
 *
 * @module antiThrashService
 */

import type { PrismaClient } from '@prisma/client';
import { ANTI_THRASH, HYSTERESIS, PROMOTION_GUARDS } from '../config/tier-config.js';

export interface ThrashCheckResult {
  canChangeTier: boolean;
  reason?: string;
  cooldownRemainingDays?: number;
}

export interface PromotionConfidenceResult {
  confidence: number;
  penalties: string[];
  eligible: boolean;
}

// ============================================================
// FIX 8: EVENT-BASED TIER CHANGE COUNTING
// ============================================================

/**
 * Count tier changes from actual TierPromotion events.
 * More accurate than decayed counters.
 */
export async function getTierChangeCount(
  prisma: PrismaClient,
  domainId: string,
  windowDays: number
): Promise<number> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const count = await prisma.tierPromotion.count({
    where: {
      domainId,
      createdAt: { gte: windowStart },
    },
  });

  return count;
}

/**
 * Check if domain can change tiers (promotion or demotion).
 * Uses EVENT-BASED counting, not decayed counters.
 */
export async function canChangeTier(
  prisma: PrismaClient,
  domainId: string
): Promise<ThrashCheckResult> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { lastTierChangedAt: true },
  });

  if (!domain) {
    return { canChangeTier: false, reason: 'Domain not found' };
  }

  // Check cooldown from last change
  if (domain.lastTierChangedAt) {
    const daysSinceChange = Math.floor(
      (Date.now() - domain.lastTierChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceChange < ANTI_THRASH.minDaysBetweenTierMoves) {
      return {
        canChangeTier: false,
        reason: `Cooldown: ${daysSinceChange}d since last change (need ${ANTI_THRASH.minDaysBetweenTierMoves}d)`,
        cooldownRemainingDays: ANTI_THRASH.minDaysBetweenTierMoves - daysSinceChange,
      };
    }
  }

  // Check tier change frequency FROM EVENTS (not counters)
  const changesIn90d = await getTierChangeCount(prisma, domainId, 90);

  if (changesIn90d >= ANTI_THRASH.maxTierChanges90d) {
    return {
      canChangeTier: false,
      reason: `Max changes: ${changesIn90d}/${ANTI_THRASH.maxTierChanges90d} in 90d`,
    };
  }

  return { canChangeTier: true };
}

// ============================================================
// FIX 1: PROMOTION CONFIDENCE WITH ANTI-SPIKE GUARDS
// ============================================================

/**
 * Calculate promotion confidence with anti-spike guards.
 * Prevents viral junk from polluting Tier A.
 *
 * Anti-spike guards:
 * 1. Minimum sustained impressions (200 over 4 weeks)
 * 2. GSC entropy check (no 80%+ from single query)
 * 3. CTR sanity check (no absurd CTR on low impressions)
 */
export async function calculatePromotionConfidence(
  prisma: PrismaClient,
  domainId: string
): Promise<PromotionConfidenceResult> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      gscClicksWeek1: true,
      gscClicksWeek2: true,
      gscClicksWeek3: true,
      gscClicksWeek4: true,
      gscImpressionsWeek1: true,
      gscImpressionsWeek2: true,
      gscImpressionsWeek3: true,
      gscImpressionsWeek4: true,
      gscTopQueryShare: true,
      trancoRank: true,
      historicalPeakScore: true,
      categoryId: true,
      tierScore: true,
    },
  });

  if (!domain) {
    return { confidence: 0, penalties: ['domain_not_found'], eligible: false };
  }

  const penalties: string[] = [];
  const guards = PROMOTION_GUARDS;
  const weights = ANTI_THRASH.promotion.weights;

  // Calculate total impressions
  const totalImpressions =
    (domain.gscImpressionsWeek1 || 0) +
    (domain.gscImpressionsWeek2 || 0) +
    (domain.gscImpressionsWeek3 || 0) +
    (domain.gscImpressionsWeek4 || 0);

  const totalClicks =
    (domain.gscClicksWeek1 || 0) +
    (domain.gscClicksWeek2 || 0) +
    (domain.gscClicksWeek3 || 0) +
    (domain.gscClicksWeek4 || 0);

  // ============================================================
  // ANTI-SPIKE GUARD 1: Minimum sustained impressions
  // ============================================================
  if (totalImpressions < guards.minTotalImpressions4Weeks) {
    return {
      confidence: 0,
      penalties: [`insufficient_impressions_${totalImpressions}/${guards.minTotalImpressions4Weeks}`],
      eligible: false,
    };
  }

  // ============================================================
  // ANTI-SPIKE GUARD 2: GSC entropy check
  // ============================================================
  let entropyPenalty = 0;
  if (domain.gscTopQueryShare && domain.gscTopQueryShare > guards.maxSingleQueryShare) {
    entropyPenalty = guards.entropyPenalty;
    penalties.push(`low_query_entropy_${(domain.gscTopQueryShare * 100).toFixed(0)}%`);
  }

  // ============================================================
  // ANTI-SPIKE GUARD 3: CTR sanity check
  // ============================================================
  let ctrPenalty = 0;
  if (totalImpressions >= guards.minImpressionsForCTRCheck) {
    const ctr = totalClicks / totalImpressions;
    if (ctr > guards.maxReasonableCTR) {
      ctrPenalty = guards.ctrPenalty;
      penalties.push(`suspicious_ctr_${(ctr * 100).toFixed(1)}%`);
    }
  }

  // ============================================================
  // BASE CONFIDENCE CALCULATION
  // ============================================================
  let confidence = 0;

  // GSC clicks consistency (40%)
  const weeklyClicks = [
    domain.gscClicksWeek1 || 0,
    domain.gscClicksWeek2 || 0,
    domain.gscClicksWeek3 || 0,
    domain.gscClicksWeek4 || 0,
  ];
  const weeksWithClicks = weeklyClicks.filter((c) => c > 0).length;
  confidence += (weeksWithClicks / 4) * weights.gscClicksConsistency;

  // Tranco presence (20%)
  if (domain.trancoRank && domain.trancoRank <= 100000) {
    confidence += weights.trancoPresence;
  } else if (domain.trancoRank && domain.trancoRank <= 500000) {
    confidence += weights.trancoPresence * 0.5;
  }

  // Category leader (20%)
  if (domain.categoryId) {
    const rank = await prisma.domain.count({
      where: {
        categoryId: domain.categoryId,
        tierScore: { gt: domain.tierScore || 0 },
      },
    });
    if (rank < 10) {
      confidence += weights.categoryLeader;
    } else if (rank < 50) {
      confidence += weights.categoryLeader * 0.5;
    }
  }

  // Historical score (20%)
  if (domain.historicalPeakScore && domain.historicalPeakScore >= 80) {
    confidence += weights.historicalScore;
  } else if (domain.historicalPeakScore && domain.historicalPeakScore >= 60) {
    confidence += weights.historicalScore * 0.5;
  }

  // ============================================================
  // APPLY PENALTIES
  // ============================================================
  confidence = Math.max(0, confidence - entropyPenalty - ctrPenalty);

  return {
    confidence: Math.min(confidence, 1.0),
    penalties,
    eligible: penalties.filter((p) => p.startsWith('insufficient')).length === 0,
  };
}

// ============================================================
// FIX 2: HYSTERESIS-AWARE PROMOTION/DEMOTION
// ============================================================

/**
 * Check if domain can be promoted with HYSTERESIS threshold.
 * Requires HIGH confidence (>= 0.70) for promotion.
 */
export async function canPromote(
  prisma: PrismaClient,
  domainId: string
): Promise<ThrashCheckResult> {
  // Basic thrash check (cooldown, max changes)
  const thrashCheck = await canChangeTier(prisma, domainId);
  if (!thrashCheck.canChangeTier) {
    return thrashCheck;
  }

  // Confidence check with PROMOTION threshold
  const { confidence, penalties, eligible } = await calculatePromotionConfidence(prisma, domainId);

  if (!eligible) {
    return {
      canChangeTier: false,
      reason: `Not eligible: ${penalties.join(', ')}`,
    };
  }

  if (confidence < HYSTERESIS.promotionConfidenceThreshold) {
    return {
      canChangeTier: false,
      reason: `Confidence ${(confidence * 100).toFixed(0)}% < ${HYSTERESIS.promotionConfidenceThreshold * 100}% threshold`,
    };
  }

  // Check weeks with clicks
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      gscClicksWeek1: true,
      gscClicksWeek2: true,
      gscClicksWeek3: true,
      gscClicksWeek4: true,
    },
  });

  const weeksWithClicks = [
    domain?.gscClicksWeek1,
    domain?.gscClicksWeek2,
    domain?.gscClicksWeek3,
    domain?.gscClicksWeek4,
  ].filter((c) => c && c > 0).length;

  if (weeksWithClicks < ANTI_THRASH.promotion.minWeeksWithClicks) {
    return {
      canChangeTier: false,
      reason: `Signal not sustained (${weeksWithClicks}/${ANTI_THRASH.promotion.minWeeksWithClicks} weeks with clicks)`,
    };
  }

  return { canChangeTier: true };
}

/**
 * Check if domain can be demoted with HYSTERESIS protection.
 * Requires LOW confidence (<= 0.30) AND zero signals for demotion.
 */
export async function canDemote(
  prisma: PrismaClient,
  domainId: string
): Promise<ThrashCheckResult> {
  // Basic thrash check
  const thrashCheck = await canChangeTier(prisma, domainId);
  if (!thrashCheck.canChangeTier) {
    return thrashCheck;
  }

  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: {
      lastPromotedAt: true,
      gscClicks: true,
      gscImpressions: true,
    },
  });

  if (!domain) {
    return { canChangeTier: false, reason: 'Domain not found' };
  }

  // Don't demote recently promoted
  if (domain.lastPromotedAt) {
    const daysSincePromotion = Math.floor(
      (Date.now() - domain.lastPromotedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePromotion < ANTI_THRASH.demotion.minDaysAfterPromotion) {
      return {
        canChangeTier: false,
        reason: `Recently promoted (${daysSincePromotion}d ago)`,
      };
    }
  }

  // HYSTERESIS: Require zero signals for demotion
  if (HYSTERESIS.demotionRequiresZeroSignals) {
    if ((domain.gscClicks || 0) > 0 || (domain.gscImpressions || 0) >= 10) {
      return {
        canChangeTier: false,
        reason: 'Has GSC signals (hysteresis protection)',
      };
    }
  }

  // Calculate confidence and check DEMOTION threshold
  const { confidence } = await calculatePromotionConfidence(prisma, domainId);

  if (confidence > HYSTERESIS.demotionConfidenceThreshold) {
    return {
      canChangeTier: false,
      reason: `Confidence ${(confidence * 100).toFixed(0)}% > ${HYSTERESIS.demotionConfidenceThreshold * 100}% demotion threshold`,
    };
  }

  return { canChangeTier: true };
}

/**
 * Record a tier change event.
 * This is the SOURCE OF TRUTH for change counting (not counters).
 */
export async function recordTierChange(
  prisma: PrismaClient,
  domainId: string,
  changeType: 'promotion' | 'demotion',
  fromTier: string,
  toTier: string,
  confidence?: number
): Promise<void> {
  const now = new Date();
  const calculatedConfidence =
    confidence ?? (changeType === 'promotion' ? (await calculatePromotionConfidence(prisma, domainId)).confidence : null);

  await prisma.$transaction([
    // Update domain timestamp
    prisma.domain.update({
      where: { id: domainId },
      data: {
        lastTierChangedAt: now,
        ...(changeType === 'promotion' ? { lastPromotedAt: now } : { lastDemotedAt: now }),
        promotionConfidence: calculatedConfidence,
        lastPromotionCheck: now,
      },
    }),

    // Record event (SOURCE OF TRUTH)
    prisma.tierPromotion.create({
      data: {
        domainId,
        fromTier,
        toTier,
        reason: changeType,
        confidence: calculatedConfidence,
      },
    }),
  ]);
}

/**
 * Rotate weekly GSC click and impression data (run weekly).
 * Shifts week1->week2->week3->week4, then week1 is refreshed from GSC.
 */
export async function rotateWeeklyGscData(prisma: PrismaClient): Promise<number> {
  // This is a batch operation - shift all weeks for both clicks and impressions
  const result = await prisma.$executeRaw`
    UPDATE "Domain"
    SET
      "gscClicksWeek4" = "gscClicksWeek3",
      "gscClicksWeek3" = "gscClicksWeek2",
      "gscClicksWeek2" = "gscClicksWeek1",
      "gscClicksWeek1" = 0,
      "gscImpressionsWeek4" = "gscImpressionsWeek3",
      "gscImpressionsWeek3" = "gscImpressionsWeek2",
      "gscImpressionsWeek2" = "gscImpressionsWeek1",
      "gscImpressionsWeek1" = 0,
      "updatedAt" = NOW()
    WHERE "gscClicksWeek1" > 0 OR "gscClicksWeek2" > 0 OR "gscClicksWeek3" > 0
      OR "gscImpressionsWeek1" > 0 OR "gscImpressionsWeek2" > 0 OR "gscImpressionsWeek3" > 0
  `;

  return result;
}

// Legacy alias for backwards compatibility
export const rotateWeeklyGscClicks = rotateWeeklyGscData;
