/**
 * Credibility Service (Phase 3C Final)
 *
 * Enforces epistemic honesty, hedge language, retraction discipline,
 * and topic diversity to maintain credibility as an authority.
 *
 * Authority isn't claimed. It's granted by others after repeated
 * exposure to uncertainty handled well.
 */

import type { PrismaClient, InsightType } from '@prisma/client';

// ============================================================
// 1. HEDGE LANGUAGE ENFORCEMENT
// ============================================================

/**
 * Forbidden causal language patterns that overstate certainty.
 * These must be mechanically enforced, not optional.
 */
export const FORBIDDEN_CAUSAL_LANGUAGE = [
  /\bcaused by\b/i,
  /\bresult of\b/i,
  /\bdue to\b/i,
  /\bbecause of\b/i,
  /\bdirectly led to\b/i,
  /\bproves that\b/i,
  /\bconfirms that\b/i,
  /\bdefinitely\b/i,
  /\bcertainly\b/i,
  /\bwithout doubt\b/i,
  /\bundeniably\b/i,
];

/**
 * Recommended hedge words based on confidence level.
 */
export const HEDGE_WORDS: Record<'high' | 'medium' | 'low', string[]> = {
  high: ['indicates', 'suggests strongly', 'appears to show'],
  medium: ['may indicate', 'possibly suggests', 'could be related to'],
  low: ['might suggest', 'early signals indicate', 'preliminary data shows'],
};

export interface HedgeValidationResult {
  valid: boolean;
  violations: string[];
  suggestions: string[];
}

/**
 * Enforce hedge language in narratives.
 * Throws if forbidden patterns are detected.
 */
export function enforceHedgeLanguage(narrative: string): string {
  const violations: string[] = [];

  for (const pattern of FORBIDDEN_CAUSAL_LANGUAGE) {
    if (pattern.test(narrative)) {
      const match = narrative.match(pattern);
      violations.push(match?.[0] ?? pattern.source);
    }
  }

  if (violations.length > 0) {
    throw new Error(`Forbidden causal language detected: ${violations.join(', ')}`);
  }

  return narrative;
}

/**
 * Validate hedge language without throwing.
 * Returns validation result with suggestions.
 */
export function validateHedgeLanguage(narrative: string): HedgeValidationResult {
  const violations: string[] = [];
  const suggestions: string[] = [];

  for (const pattern of FORBIDDEN_CAUSAL_LANGUAGE) {
    if (pattern.test(narrative)) {
      const match = narrative.match(pattern);
      violations.push(match?.[0] ?? pattern.source);

      // Suggest alternatives
      if (/caused by|result of|due to|because of/i.test(pattern.source)) {
        suggestions.push(`Replace "${match?.[0]}" with "appears correlated with" or "may be associated with"`);
      } else if (/proves|confirms/i.test(pattern.source)) {
        suggestions.push(`Replace "${match?.[0]}" with "suggests" or "indicates"`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    suggestions,
  };
}

/**
 * Add appropriate hedge language based on confidence level.
 */
export function addHedgePrefix(
  statement: string,
  confidence: number
): string {
  const level = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';
  const hedges = HEDGE_WORDS[level];
  const hedge = hedges[Math.floor(Math.random() * hedges.length)];

  // Don't double-hedge if already hedged
  const allHedgeWords = [...HEDGE_WORDS.high, ...HEDGE_WORDS.medium, ...HEDGE_WORDS.low];
  const alreadyHedged = allHedgeWords.some((h) => statement.toLowerCase().includes(h));

  if (alreadyHedged) return statement;

  return `Our analysis ${hedge} that ${statement.charAt(0).toLowerCase()}${statement.slice(1)}`;
}

// ============================================================
// 2. RETRACTION TONE GUIDELINES
// ============================================================

export const RETRACTION_TONE = {
  forbidden: [
    "we weren't wrong",
    'reality changed',
    'circumstances evolved',
    'external factors',
    'unforeseen developments',
    'the situation shifted',
    'new information emerged that invalidates',
  ],
  required: [
    'Our analysis', // Own it
    'We predicted', // Direct language
    'This proved', // Acknowledge outcome
  ],
} as const;

export interface RetractionValidationResult {
  valid: boolean;
  forbiddenViolations: string[];
  missingRequired: string[];
  suggestions: string[];
}

/**
 * Validate retraction language meets tone guidelines.
 */
export function validateRetractionTone(retraction: string): RetractionValidationResult {
  const forbiddenViolations: string[] = [];
  const missingRequired: string[] = [];
  const suggestions: string[] = [];

  // Check forbidden language
  for (const phrase of RETRACTION_TONE.forbidden) {
    if (retraction.toLowerCase().includes(phrase.toLowerCase())) {
      forbiddenViolations.push(phrase);
    }
  }

  // Check required language
  for (const phrase of RETRACTION_TONE.required) {
    if (!retraction.toLowerCase().includes(phrase.toLowerCase())) {
      missingRequired.push(phrase);
    }
  }

  // Generate suggestions
  if (forbiddenViolations.length > 0) {
    suggestions.push('Remove defensive or deflecting language. Own the mistake directly.');
  }

  if (missingRequired.includes('Our analysis')) {
    suggestions.push('Start with "Our analysis predicted..." to take ownership.');
  }

  if (missingRequired.includes('This proved')) {
    suggestions.push('Include acknowledgment of the outcome: "This proved [incorrect/partially correct]..."');
  }

  return {
    valid: forbiddenViolations.length === 0 && missingRequired.length === 0,
    forbiddenViolations,
    missingRequired,
    suggestions,
  };
}

/**
 * Generate a properly-toned retraction.
 */
export function generateRetraction(
  originalPrediction: string,
  outcome: 'incorrect' | 'partially_correct' | 'opposite',
  actualResult: string
): string {
  const outcomeText =
    outcome === 'incorrect'
      ? 'incorrect'
      : outcome === 'partially_correct'
        ? 'partially correct'
        : 'contrary to what occurred';

  return `Our analysis predicted ${originalPrediction}. This proved ${outcomeText}. ${actualResult} We have updated our methodology to account for this discrepancy.`;
}

// ============================================================
// 3. TOPIC DIVERSITY GUIDANCE
// ============================================================

/**
 * Soft topic limits to prevent over-representation.
 * If reality is 60% tracker changes, surface 45% not 30%.
 */
export const TOPIC_GUIDANCE = {
  TRACKER_SURGE: { softLimit: 30, hardLimit: 45 },
  TRACKER_DECLINE: { softLimit: 30, hardLimit: 45 },
  DOMAIN_IMPROVEMENT: { softLimit: 25, hardLimit: 40 },
  DOMAIN_REGRESSION: { softLimit: 25, hardLimit: 40 },
  CATEGORY_TREND: { softLimit: 20, hardLimit: 35 },
  FINGERPRINTING_SHIFT: { softLimit: 15, hardLimit: 25 },
  ANOMALY: { softLimit: 10, hardLimit: 20 },
  WEEKLY_SUMMARY: { softLimit: 5, hardLimit: 10 },
} as const;

export interface TopicDistribution {
  type: InsightType;
  count: number;
  percentage: number;
  status: 'healthy' | 'approaching_limit' | 'at_soft_limit' | 'over_hard_limit';
  guidance?: string;
}

/**
 * Analyze topic distribution and provide guidance.
 */
export function analyzeTopicDistribution(
  insights: Array<{ insightType: InsightType }>
): TopicDistribution[] {
  const total = insights.length;
  if (total === 0) return [];

  // Count by type
  const counts = new Map<InsightType, number>();
  for (const insight of insights) {
    counts.set(insight.insightType, (counts.get(insight.insightType) ?? 0) + 1);
  }

  const distribution: TopicDistribution[] = [];

  for (const [type, count] of counts) {
    const percentage = (count / total) * 100;
    const limits = TOPIC_GUIDANCE[type as keyof typeof TOPIC_GUIDANCE];

    let status: TopicDistribution['status'] = 'healthy';
    let guidance: string | undefined;

    if (limits) {
      if (percentage > limits.hardLimit) {
        status = 'over_hard_limit';
        guidance = `${type} at ${percentage.toFixed(1)}% exceeds hard limit of ${limits.hardLimit}%. Consider diversifying insights.`;
      } else if (percentage > limits.softLimit) {
        status = 'at_soft_limit';
        guidance = `${type} at ${percentage.toFixed(1)}% exceeds soft limit of ${limits.softLimit}%. This may be acceptable if reality justifies it.`;
      } else if (percentage > limits.softLimit * 0.8) {
        status = 'approaching_limit';
      }
    }

    distribution.push({
      type,
      count,
      percentage: Math.round(percentage * 10) / 10,
      status,
      guidance,
    });
  }

  return distribution.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Filter insights to respect topic diversity limits.
 * Uses soft enforcement - warns but doesn't strictly block.
 */
export function enforceTopicDiversity<T extends { insightType: InsightType }>(
  insights: T[],
  strictMode: boolean = false
): { insights: T[]; warnings: string[]; dropped: number } {
  const total = insights.length;
  const warnings: string[] = [];
  let dropped = 0;

  if (total === 0) return { insights, warnings, dropped };

  // Group by type
  const byType = new Map<InsightType, T[]>();
  for (const insight of insights) {
    if (!byType.has(insight.insightType)) {
      byType.set(insight.insightType, []);
    }
    byType.get(insight.insightType)!.push(insight);
  }

  const result: T[] = [];

  for (const [type, typeInsights] of byType) {
    const limits = TOPIC_GUIDANCE[type as keyof typeof TOPIC_GUIDANCE];
    const currentPercentage = (typeInsights.length / total) * 100;

    if (limits && currentPercentage > limits.hardLimit && strictMode) {
      // In strict mode, cap at hard limit
      const maxAllowed = Math.ceil((total * limits.hardLimit) / 100);
      result.push(...typeInsights.slice(0, maxAllowed));
      dropped += typeInsights.length - maxAllowed;
      warnings.push(`Capped ${type} from ${typeInsights.length} to ${maxAllowed} insights (hard limit: ${limits.hardLimit}%)`);
    } else if (limits && currentPercentage > limits.softLimit) {
      // Add warning but include all
      result.push(...typeInsights);
      warnings.push(`${type} at ${currentPercentage.toFixed(1)}% exceeds soft limit of ${limits.softLimit}%`);
    } else {
      result.push(...typeInsights);
    }
  }

  return { insights: result, warnings, dropped };
}

// ============================================================
// 4. INSIGHT LIFECYCLE & VALIDITY (High Priority)
// ============================================================

export interface InsightValidity {
  age: number; // Days old
  relevance: 'current' | 'historical' | 'superseded';
  predictiveValidity: 'untested' | 'confirmed' | 'partial' | 'reversed';
  correctness: 'accurate' | 'inaccurate' | 'unknown';
  shouldRetract: boolean;
  shouldSupersede: boolean;
}

/**
 * Assess insight validity based on age and outcome.
 */
export function assessInsightValidity(
  createdAt: Date,
  outcomeConfirmed: boolean | null,
  wasAccurate: boolean | null,
  supersededBy: string | null
): InsightValidity {
  const age = Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000));

  // Determine relevance
  let relevance: InsightValidity['relevance'] = 'current';
  if (supersededBy) {
    relevance = 'superseded';
  } else if (age > 90) {
    relevance = 'historical';
  } else if (age > 30) {
    relevance = outcomeConfirmed ? 'historical' : 'current';
  }

  // Determine predictive validity
  let predictiveValidity: InsightValidity['predictiveValidity'] = 'untested';
  if (outcomeConfirmed === true && wasAccurate === true) {
    predictiveValidity = 'confirmed';
  } else if (outcomeConfirmed === true && wasAccurate === false) {
    predictiveValidity = 'reversed';
  } else if (outcomeConfirmed === true) {
    predictiveValidity = 'partial';
  }

  // Determine correctness
  let correctness: InsightValidity['correctness'] = 'unknown';
  if (wasAccurate === true) {
    correctness = 'accurate';
  } else if (wasAccurate === false) {
    correctness = 'inaccurate';
  }

  return {
    age,
    relevance,
    predictiveValidity,
    correctness,
    shouldRetract: predictiveValidity === 'reversed',
    shouldSupersede: relevance === 'historical' && predictiveValidity === 'untested',
  };
}

// ============================================================
// 5. METHODOLOGY METRICS
// ============================================================

export interface MethodologyMetrics {
  date: string;
  totalInsights: number;
  publishedInsights: number;
  retractions: number;
  avgConfidence: number;
  hedgeCompliance: number; // % of insights with proper hedging
  topicDiversity: TopicDistribution[];
  accuracyRate: number | null; // null if insufficient data
}

/**
 * Calculate methodology metrics for transparency.
 */
export async function calculateMethodologyMetrics(
  prisma: PrismaClient,
  periodDays: number = 7
): Promise<MethodologyMetrics> {
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  // Get recent insights
  const insights = await prisma.insight.findMany({
    where: { createdAt: { gte: periodStart } },
    select: {
      id: true,
      insightType: true,
      title: true,
      summary: true,
      confidence: true,
      isPublishable: true,
    },
  });

  // Count retractions (insights with specific marker in details)
  // For now, use a proxy - insights that were marked as retracted would have low confidence
  const retractions = 0; // Will be populated once retraction tracking is added

  // Calculate average confidence
  const avgConfidence =
    insights.length > 0
      ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
      : 0;

  // Check hedge compliance
  let hedgeCompliant = 0;
  for (const insight of insights) {
    const textToCheck = `${insight.title} ${insight.summary}`;
    const validation = validateHedgeLanguage(textToCheck);
    if (validation.valid) hedgeCompliant++;
  }

  // Topic distribution
  const topicDiversity = analyzeTopicDistribution(insights);

  return {
    date: new Date().toISOString().split('T')[0] ?? '',
    totalInsights: insights.length,
    publishedInsights: insights.filter((i) => i.isPublishable).length,
    retractions,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    hedgeCompliance: insights.length > 0 ? Math.round((hedgeCompliant / insights.length) * 100) : 100,
    topicDiversity,
    accuracyRate: null, // Requires outcome tracking
  };
}

// ============================================================
// 6. CONFIDENCE DISPLAY HELPERS
// ============================================================

/**
 * Get display text for confidence level.
 */
export function getConfidenceDisplay(confidence: number): {
  level: 'high' | 'medium' | 'low';
  label: string;
  color: string;
  caveat: string | null;
} {
  if (confidence >= 0.8) {
    return {
      level: 'high',
      label: 'High Confidence',
      color: 'green',
      caveat: null,
    };
  } else if (confidence >= 0.6) {
    return {
      level: 'medium',
      label: 'Medium Confidence',
      color: 'yellow',
      caveat: 'This assessment has moderate uncertainty. Additional data may change conclusions.',
    };
  } else {
    return {
      level: 'low',
      label: 'Low Confidence',
      color: 'red',
      caveat: 'This is a preliminary assessment with significant uncertainty. Treat as early signal only.',
    };
  }
}

/**
 * Format confidence for display.
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}
