/**
 * DOMAIN INTELLIGENCE ENGINE CONFIGURATION
 *
 * All tier, scheduling, and budget decisions flow from this file.
 *
 * Based on volatility analysis: Jan 30, 2026
 * Next reanalysis due: Mar 31, 2026 (60 days)
 *
 * DO NOT change cadence values without new volatility analysis.
 */

// ============================================================
// TIER CONFIGURATION
// ============================================================

export const TIER_CONFIG = {
  A: {
    target: 14, // days - SLA target
    hardMax: 30, // days - never exceed regardless of volatility
    maxCount: 7000, // max domains in tier
    // Starvation prevention: reserve slots for promotions
    promotionReserve: 0.05, // 5% of slots reserved for new promotions
    minPromotionSlots: 50, // Always allow at least 50 new promotions per cycle
  },
  B: {
    target: 30,
    hardMax: 60,
    maxCount: 50000,
    promotionReserve: 0.03,
    minPromotionSlots: 100,
  },
  C: {
    target: 90,
    hardMax: 180,
    maxCount: null, // unlimited (on-demand/discovery)
    promotionReserve: 0,
    minPromotionSlots: 0,
  },
} as const;

export type TierName = keyof typeof TIER_CONFIG;

// ============================================================
// VOLATILITY RULES
// ============================================================

/**
 * VOLATILITY-TRIGGERED EARLY RESCAN
 *
 * ALL criteria must be met for early rescan:
 * - stddev >= threshold (statistical significance)
 * - scans >= minRequired (enough history)
 * - score_range >= minScoreRange (not just noise)
 * - time_span >= minTimeSpanDays (not burst noise)
 */
export const VOLATILITY_RULES = {
  threshold: 4.0, // stddev must exceed this
  minScansRequired: 3, // need enough history
  minScoreRange: 6, // filter measurement noise
  minTimeSpanDays: 14, // scans must span 14+ days (filter burst noise)
  earlyRescanDays: 7, // weekly for high-volatility only
} as const;

/**
 * VOLATILITY REANALYSIS SCHEDULE
 *
 * Re-run every 60 days to validate cadence decisions.
 * System will warn when due.
 */
export const VOLATILITY_ANALYSIS = {
  lastRun: new Date('2026-01-30'),
  intervalDays: 60,
  get nextDue(): Date {
    return new Date(this.lastRun.getTime() + this.intervalDays * 24 * 60 * 60 * 1000);
  },
  get isDue(): boolean {
    return new Date() >= this.nextDue;
  },
} as const;

// ============================================================
// SCAN BUDGET ALLOCATION (Dynamic with Floors)
// ============================================================

/**
 * SCAN BUDGET - DYNAMIC ALLOCATION
 *
 * Base percentages adjusted dynamically based on:
 * - Tier A SLA violations -> steal from Tier B (not new domains)
 * - High error rate -> reduce all proportionally
 * - Queue backup -> throttle new domains temporarily
 *
 * CRITICAL: Exploration floor ensures long-term SEO moat growth
 */
export const SCAN_BUDGET = {
  base: {
    newDomains: 0.5, // 50% for coverage expansion
    tierA: 0.3, // 30% for core freshness
    tierB: 0.15, // 15% for secondary freshness
    anomaly: 0.05, // 5% for volatility-triggered
  },

  // FLOORS - Never go below these (prevents moat erosion)
  floors: {
    newDomains: 0.25, // CRITICAL: Always explore at least 25%
    tierA: 0.2, // Core freshness minimum
  },

  // Dynamic adjustment thresholds
  adjustments: {
    tierASLAThreshold: 85, // If Tier A SLA drops below 85%
    tierASLAStealPercent: 0.1, // Steal 10% from Tier B (not new domains)

    errorRateThreshold: 0.15, // 15% error rate triggers budget reduction (softer than circuit breaker's 20%)
    errorRateReduction: 0.5, // Reduce budget by 50%

    queueDepthThreshold: 100, // Queue depth triggers throttle
    queueThrottlePercent: 0.3, // Reduce new domains by 30%
  },
} as const;

// ============================================================
// CIRCUIT BREAKER (System Protection)
// ============================================================

/**
 * CIRCUIT BREAKER
 *
 * Auto-reduces workload when system is stressed.
 * Includes recovery logic to ramp back up.
 */
export const CIRCUIT_BREAKER = {
  // Thresholds that trigger reduction
  // NOTE: Web crawlers inherently have high error rates (sites block, timeout, captcha).
  // Previous 5% threshold caused permanent triggering. 20% is realistic baseline.
  thresholds: {
    errorRate: 0.20, // 20% error rate (was 5% - too aggressive for web crawling)
    queueDepth: 200, // pending scans (was 100 - too low for burst scheduling)
    avgDuration: 60, // seconds per scan (was 45 - tight for complex sites)
    minSampleSize: 10, // Minimum scans in window before evaluating error rate
  },

  // How much to reduce when triggered
  reductionFactor: 0.5, // Cut budget by 50%

  // Recovery configuration
  recovery: {
    stableMinutes: 30, // Metrics must be stable for 30min before recovery
    rampUpFactor: 0.25, // Restore 25% capacity at a time
    maxRampSteps: 4, // Full recovery in 4 steps (30min each = 2hr total)
    checkIntervalMinutes: 10, // Check metrics every 10 minutes
  },

  // State file for persistence across runs
  stateFile: '/tmp/gecko-circuit-breaker-state.json',

  // P95 soft alert (warning only, does not trigger breaker)
  p95SoftAlertMs: 45_000, // Warn when P95 scan duration exceeds 45s
} as const;

// ============================================================
// LOW-PRIORITY TLDs (Deprioritized, Not Excluded)
// ============================================================

/**
 * LOW-PRIORITY TLDs
 *
 * These TLDs are NOT excluded, just deprioritized:
 * - Still scannable
 * - Lower rescan priority
 * - Can be promoted if Tranco/GSC proves value
 *
 * DO NOT hard-exclude. Some legit startups use these.
 * TLD should be the LAST priority factor, not the first filter.
 */
export const LOW_PRIORITY_TLDS = [
  '.xyz',
  '.top',
  '.work',
  '.click',
  '.loan',
  '.gq',
  '.ml',
  '.cf',
  '.tk',
  '.ga',
  '.buzz',
  '.online',
  '.site',
  '.website',
  '.space',
] as const;

// Domains matching patterns but should NOT be deprioritized
export const WHITELIST: Set<string> = new Set([
  // Add legitimate domains here after review
  // e.g., 'crypto.xyz', 'startup.online'
]);

// ============================================================
// GSC-DRIVEN PROMOTION
// ============================================================

export const PROMOTION_RULES = {
  gscClicksForTierA: 1, // Any clicks -> Tier A
  gscImpressionsForTierB: 50, // 50+ impressions -> Tier B
} as const;

// ============================================================
// DEMOTION RULES (Conservative)
// ============================================================

/**
 * DEMOTION RULES
 *
 * Two-stage approach:
 * 1. Frequency downgrade (keep tier, reduce scan priority)
 * 2. Full demotion (only after extended stagnation)
 *
 * This prevents premature demotion of domains that may grow.
 */
export const DEMOTION_RULES = {
  // Stage 1: Frequency downgrade (not tier change)
  frequencyDowngrade: {
    minMonthsNoTraffic: 2, // 2 months of no GSC traffic
    newPriorityScore: 30, // Reduce from ~80 to 30
    // Domain stays in Tier A but gets scanned less often
  },

  // Stage 2: Full tier demotion (very conservative)
  fullDemotion: {
    minMonthsNoTraffic: 4, // 4 months, not 90 days
    minScansRequired: 5, // Need enough history
    requireNoTrancoRank: true, // Must not be in Tranco top 1M
    protectCategoryLeaders: 10, // Top 10 in category are protected
    protectHighHistoricalScore: 80, // If ever had score >= 80, protect
  },
} as const;

// ============================================================
// TRANCO INTEGRATION
// ============================================================

/**
 * TRANCO INTEGRATION
 *
 * Used for INITIAL tier seeding only.
 * Once GSC signals exist, Tranco weight drops to near-zero.
 *
 * Priority hierarchy:
 * 1. GSC clicks/impressions (override everything)
 * 2. tierScore calculation
 * 3. Tranco rank (cold start fallback)
 * 4. TLD priority (last factor)
 */
export const TRANCO_TIERS = {
  tierAThreshold: 10000, // Top 10K -> Tier A
  tierBThreshold: 100000, // Top 100K -> Tier B
} as const;

// ============================================================
// SLA CONFIGURATION
// ============================================================

export const SLA_TARGETS = {
  A: { target: 90, acceptable: 85, p90MaxDays: 18 }, // 90% within 14d, p90 must be < 18d
  B: { target: 85, acceptable: 80, p90MaxDays: 45 }, // 85% within 30d, p90 must be < 45d
  C: { target: 70, acceptable: 60, p90MaxDays: 120 }, // 70% within 90d, p90 must be < 120d
} as const;

// Convenience export for p90 targets
export const P90_TARGETS = {
  A: SLA_TARGETS.A.p90MaxDays,
  B: SLA_TARGETS.B.p90MaxDays,
  C: SLA_TARGETS.C.p90MaxDays,
} as const;

// ============================================================
// ANTI-THRASH SETTINGS
// ============================================================

/**
 * ANTI-THRASH SYSTEM
 *
 * Prevents tier oscillation by:
 * 1. Cooldowns between tier changes
 * 2. Maximum tier changes per window
 * 3. Promotion confidence requirements
 * 4. Demotion protections
 */
export const ANTI_THRASH = {
  // Minimum days between tier changes for same domain
  minDaysBetweenTierMoves: 30,

  // Maximum tier changes allowed in window
  maxTierChanges90d: 3,

  // Promotion confidence requirements
  promotion: {
    // Need sustained GSC signals, not spike
    minWeeksWithClicks: 2, // At least 2 of last 4 weeks had clicks
    minConfidenceScore: 0.6, // Confidence threshold

    // Confidence calculation weights
    weights: {
      gscClicksConsistency: 0.4, // Consistent clicks across weeks
      trancoPresence: 0.2, // In Tranco list
      categoryLeader: 0.2, // Top N in category
      historicalScore: 0.2, // Had high score historically
    },
  },

  // Demotion cooldowns
  demotion: {
    minDaysAfterPromotion: 60, // Don't demote recently promoted
    protectIfEverHadClicks: true, // If ever had GSC clicks, extra protection
  },
} as const;

// ============================================================
// HYSTERESIS THRESHOLDS (Fix 2: DIE Final Hardening)
// ============================================================

/**
 * HYSTERESIS THRESHOLDS
 *
 * Promotion threshold > demotion threshold prevents oscillation.
 * Domain must clearly qualify for promotion, and clearly fail for demotion.
 * Gap between thresholds (0.70 - 0.30 = 0.40) is the "stable zone"
 */
export const HYSTERESIS = {
  // Promotion requires HIGH confidence
  promotionConfidenceThreshold: 0.7,

  // Demotion requires LOW confidence AND zero signals
  demotionConfidenceThreshold: 0.3,
  demotionRequiresZeroSignals: true,
} as const;

// ============================================================
// PROMOTION ANTI-SPIKE GUARDS (Fix 1: DIE Final Hardening)
// ============================================================

/**
 * Anti-spike guards for promotion confidence.
 * Prevents viral junk from polluting Tier A.
 */
export const PROMOTION_GUARDS = {
  // GSC entropy: if 80%+ clicks from 1 query → suspicious
  maxSingleQueryShare: 0.8,
  entropyPenalty: 0.3,

  // CTR sanity: absurd CTR on low impressions = noise
  maxReasonableCTR: 0.25,
  minImpressionsForCTRCheck: 50,
  ctrPenalty: 0.25,

  // Minimum sustained impressions
  minTotalImpressions4Weeks: 200,
  impressionFloorPenalty: 0.4,
} as const;

// ============================================================
// SUSPENSION SAFEGUARDS (Fix 3: DIE Final Hardening)
// ============================================================

/**
 * Suspension safeguards.
 * Prevents killing future winners.
 */
export const SUSPENSION_SAFEGUARDS = {
  // Never suspend if ANY of these are true
  protectIf: {
    inTrancoTop1M: true,
    hasAnyImpressions: true, // Not just clicks
    isCategoryTop50: true,
    hasTierScoreAbove: 60,
    isInWhitelist: true,
  },

  // Log suspensions for review
  logTopSuspensions: 50,
} as const;

// ============================================================
// ELIGIBILITY DECAY SETTINGS
// ============================================================

/**
 * ELIGIBILITY DECAY
 *
 * Zero-signal domains gradually become less eligible.
 * Prevents Tier C from drowning exploration budget.
 */
export const ELIGIBILITY_DECAY = {
  // After N days with zero signals, reduce eligibility
  zeroSignalDays: 180,

  // Signals that prevent decay
  preservingSignals: {
    gscClicks: 1, // Any clicks preserves
    gscImpressions: 10, // 10+ impressions preserves
    trancoRank: 1000000, // In Tranco top 1M preserves
  },

  // Reactivation signals
  reactivation: {
    gscClicks: 1, // Any click reactivates
    gscImpressions: 20, // 20+ impressions reactivates
    manualRequest: true, // User lookup reactivates
  },

  // Decay stages
  stages: [
    { daysZeroSignal: 180, action: 'deprioritize' as const, priority: 20 },
    { daysZeroSignal: 365, action: 'suspend' as const, eligibleForScan: false },
  ],
} as const;

// ============================================================
// SCAN QUALITY CRITERIA (for volatility calculation)
// ============================================================

/**
 * SCAN QUALITY CRITERIA
 *
 * Quality filters for scans used in volatility calculation.
 * Prevents scanner instability from polluting volatility metrics.
 */
export const SCAN_QUALITY_CRITERIA = {
  // Status must be 'done' (not 'failed', 'timeout', etc.)
  requiredStatus: 'done',

  // Payload completeness (0-1)
  minPayloadCompleteness: 0.8,

  // Duration within normal range
  minDurationSeconds: 5,
  maxDurationSeconds: 120,

  // No major error flags
  excludeErrorCodes: ['timeout', 'blocked', 'captcha', 'geo_block', 'rate_limit'],
} as const;

// ============================================================
// DAILY CAPACITY
// ============================================================

/**
 * Based on current cron setup:
 * - Batch size: 10 domains/batch
 * - Frequency: every minute
 * - Daily: 10 * 60 * 24 = 14,400 scans/day max
 *
 * Use 80% to leave headroom for retries and anomalies
 */
export const DAILY_CAPACITY = {
  maxScans: 14400,
  usablePercent: 0.8,
  get effectiveCapacity(): number {
    return Math.floor(this.maxScans * this.usablePercent);
  },
} as const;
