/**
 * Domain Pattern Classification (Confidence: 0.85)
 *
 * Pattern-based classification using regex rules.
 * Multiple weak signals combine to reach confidence threshold.
 * NO AI/LLM - deterministic pattern matching only.
 */

interface PatternRule {
  pattern: RegExp;
  category: string;
  confidence: number;
  description?: string;
}

/**
 * Domain patterns with associated confidence scores.
 * Individual patterns have low confidence (0.3-0.7).
 * Multiple matches combine to reach threshold (0.85).
 */
export const DOMAIN_PATTERNS: PatternRule[] = [
  // === STREAMING PATTERNS ===
  { pattern: /stream/i, category: 'streaming', confidence: 0.6, description: 'Contains "stream"' },
  { pattern: /watch/i, category: 'streaming', confidence: 0.5, description: 'Contains "watch"' },
  { pattern: /movie/i, category: 'streaming', confidence: 0.5, description: 'Contains "movie"' },
  { pattern: /video/i, category: 'streaming', confidence: 0.4, description: 'Contains "video"' },
  { pattern: /tube$/i, category: 'streaming', confidence: 0.6, description: 'Ends with "tube"' },
  { pattern: /flix/i, category: 'streaming', confidence: 0.7, description: 'Contains "flix"' },
  { pattern: /\.tv$/i, category: 'streaming', confidence: 0.5, description: 'Uses .tv TLD' },
  { pattern: /play/i, category: 'streaming', confidence: 0.3, description: 'Contains "play"' },
  { pattern: /live/i, category: 'streaming', confidence: 0.3, description: 'Contains "live"' },
  { pattern: /music/i, category: 'streaming', confidence: 0.4, description: 'Contains "music"' },
  { pattern: /podcast/i, category: 'streaming', confidence: 0.5, description: 'Contains "podcast"' },
  { pattern: /radio/i, category: 'streaming', confidence: 0.4, description: 'Contains "radio"' },

  // === ECOMMERCE PATTERNS ===
  { pattern: /shop/i, category: 'ecommerce', confidence: 0.6, description: 'Contains "shop"' },
  { pattern: /store/i, category: 'ecommerce', confidence: 0.5, description: 'Contains "store"' },
  { pattern: /buy/i, category: 'ecommerce', confidence: 0.4, description: 'Contains "buy"' },
  { pattern: /deal/i, category: 'ecommerce', confidence: 0.4, description: 'Contains "deal"' },
  { pattern: /mart$/i, category: 'ecommerce', confidence: 0.6, description: 'Ends with "mart"' },
  { pattern: /\.shop$/i, category: 'ecommerce', confidence: 0.7, description: 'Uses .shop TLD' },
  { pattern: /\.store$/i, category: 'ecommerce', confidence: 0.7, description: 'Uses .store TLD' },
  { pattern: /market/i, category: 'ecommerce', confidence: 0.4, description: 'Contains "market"' },
  { pattern: /cart/i, category: 'ecommerce', confidence: 0.4, description: 'Contains "cart"' },
  { pattern: /outlet/i, category: 'ecommerce', confidence: 0.5, description: 'Contains "outlet"' },
  { pattern: /sale/i, category: 'ecommerce', confidence: 0.3, description: 'Contains "sale"' },
  { pattern: /price/i, category: 'ecommerce', confidence: 0.3, description: 'Contains "price"' },
  { pattern: /retail/i, category: 'ecommerce', confidence: 0.5, description: 'Contains "retail"' },

  // === SAAS PATTERNS ===
  { pattern: /\.io$/i, category: 'saas', confidence: 0.4, description: 'Uses .io TLD' },
  { pattern: /\.app$/i, category: 'saas', confidence: 0.5, description: 'Uses .app TLD' },
  { pattern: /\.ai$/i, category: 'saas', confidence: 0.5, description: 'Uses .ai TLD' },
  { pattern: /\.dev$/i, category: 'saas', confidence: 0.5, description: 'Uses .dev TLD' },
  { pattern: /^app\./i, category: 'saas', confidence: 0.6, description: 'Starts with "app."' },
  { pattern: /dashboard/i, category: 'saas', confidence: 0.5, description: 'Contains "dashboard"' },
  { pattern: /cloud/i, category: 'saas', confidence: 0.4, description: 'Contains "cloud"' },
  { pattern: /^api\./i, category: 'saas', confidence: 0.5, description: 'Starts with "api."' },
  { pattern: /platform/i, category: 'saas', confidence: 0.4, description: 'Contains "platform"' },
  { pattern: /software/i, category: 'saas', confidence: 0.4, description: 'Contains "software"' },
  { pattern: /tool/i, category: 'saas', confidence: 0.3, description: 'Contains "tool"' },
  { pattern: /crm/i, category: 'saas', confidence: 0.5, description: 'Contains "crm"' },
  { pattern: /erp/i, category: 'saas', confidence: 0.5, description: 'Contains "erp"' },
  { pattern: /analytics/i, category: 'saas', confidence: 0.5, description: 'Contains "analytics"' },
  { pattern: /automation/i, category: 'saas', confidence: 0.4, description: 'Contains "automation"' },

  // === NEWS PATTERNS ===
  { pattern: /news/i, category: 'news', confidence: 0.6, description: 'Contains "news"' },
  { pattern: /times$/i, category: 'news', confidence: 0.5, description: 'Ends with "times"' },
  { pattern: /post$/i, category: 'news', confidence: 0.4, description: 'Ends with "post"' },
  { pattern: /journal/i, category: 'news', confidence: 0.5, description: 'Contains "journal"' },
  { pattern: /gazette/i, category: 'news', confidence: 0.6, description: 'Contains "gazette"' },
  { pattern: /herald/i, category: 'news', confidence: 0.6, description: 'Contains "herald"' },
  { pattern: /tribune/i, category: 'news', confidence: 0.6, description: 'Contains "tribune"' },
  { pattern: /daily/i, category: 'news', confidence: 0.4, description: 'Contains "daily"' },
  { pattern: /chronicle/i, category: 'news', confidence: 0.6, description: 'Contains "chronicle"' },
  { pattern: /press/i, category: 'news', confidence: 0.4, description: 'Contains "press"' },
  { pattern: /media/i, category: 'news', confidence: 0.3, description: 'Contains "media"' },
  { pattern: /blog/i, category: 'news', confidence: 0.4, description: 'Contains "blog"' },
  { pattern: /report/i, category: 'news', confidence: 0.3, description: 'Contains "report"' },
];

export interface PatternMatchResult {
  category: string;
  confidence: number;
  matchedPatterns: string[];
}

/**
 * Match domain against pattern rules.
 * Combines multiple weak signals to reach confidence threshold.
 *
 * @param domain - Domain to classify
 * @param minConfidence - Minimum combined confidence (default: 0.85)
 * @returns Category and confidence if threshold met, null otherwise
 */
export function matchPatterns(domain: string, minConfidence = 0.85): PatternMatchResult | null {
  const normalized = domain.toLowerCase();

  // Collect all matching patterns
  const matches: { category: string; confidence: number; description: string }[] = [];

  for (const rule of DOMAIN_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      matches.push({
        category: rule.category,
        confidence: rule.confidence,
        description: rule.description || rule.pattern.toString(),
      });
    }
  }

  if (matches.length === 0) return null;

  // Group by category and sum confidence
  const categoryScores: Record<string, { score: number; patterns: string[] }> = {};

  for (const match of matches) {
    if (!categoryScores[match.category]) {
      categoryScores[match.category] = { score: 0, patterns: [] };
    }
    categoryScores[match.category].score += match.confidence;
    categoryScores[match.category].patterns.push(match.description);
  }

  // Find highest scoring category
  let bestCategory = '';
  let bestScore = 0;
  let bestPatterns: string[] = [];

  for (const [category, data] of Object.entries(categoryScores)) {
    if (data.score > bestScore) {
      bestCategory = category;
      bestScore = data.score;
      bestPatterns = data.patterns;
    }
  }

  // Require minimum combined confidence
  if (bestScore >= minConfidence) {
    return {
      category: bestCategory,
      // Cap at 0.90 to leave room for brand matches at 0.95
      confidence: Math.min(bestScore, 0.9),
      matchedPatterns: bestPatterns,
    };
  }

  // Threshold not met - leave unclassified
  return null;
}

/**
 * Get all patterns for a specific category
 */
export function getPatternsForCategory(category: string): PatternRule[] {
  return DOMAIN_PATTERNS.filter((p) => p.category === category);
}

/**
 * Test a domain against patterns without confidence threshold
 * Useful for debugging/understanding classification
 */
export function debugPatternMatch(domain: string): Record<string, { score: number; patterns: string[] }> {
  const normalized = domain.toLowerCase();
  const categoryScores: Record<string, { score: number; patterns: string[] }> = {};

  for (const rule of DOMAIN_PATTERNS) {
    if (rule.pattern.test(normalized)) {
      if (!categoryScores[rule.category]) {
        categoryScores[rule.category] = { score: 0, patterns: [] };
      }
      categoryScores[rule.category].score += rule.confidence;
      categoryScores[rule.category].patterns.push(rule.description || rule.pattern.toString());
    }
  }

  return categoryScores;
}
