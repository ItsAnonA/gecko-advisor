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

  // === SOCIAL PATTERNS ===
  { pattern: /social/i, category: 'social', confidence: 0.6, description: 'Contains "social"' },
  { pattern: /community/i, category: 'social', confidence: 0.4, description: 'Contains "community"' },
  { pattern: /forum/i, category: 'social', confidence: 0.5, description: 'Contains "forum"' },
  { pattern: /chat/i, category: 'social', confidence: 0.4, description: 'Contains "chat"' },
  { pattern: /connect/i, category: 'social', confidence: 0.3, description: 'Contains "connect"' },
  { pattern: /network/i, category: 'social', confidence: 0.3, description: 'Contains "network"' },
  { pattern: /share/i, category: 'social', confidence: 0.3, description: 'Contains "share"' },
  { pattern: /messenger/i, category: 'social', confidence: 0.5, description: 'Contains "messenger"' },
  { pattern: /dating/i, category: 'social', confidence: 0.6, description: 'Contains "dating"' },
  { pattern: /meet/i, category: 'social', confidence: 0.3, description: 'Contains "meet"' },

  // === FINANCE PATTERNS ===
  { pattern: /bank/i, category: 'finance', confidence: 0.7, description: 'Contains "bank"' },
  { pattern: /finance/i, category: 'finance', confidence: 0.6, description: 'Contains "finance"' },
  { pattern: /invest/i, category: 'finance', confidence: 0.5, description: 'Contains "invest"' },
  { pattern: /trading/i, category: 'finance', confidence: 0.6, description: 'Contains "trading"' },
  { pattern: /stock/i, category: 'finance', confidence: 0.5, description: 'Contains "stock"' },
  { pattern: /crypto/i, category: 'finance', confidence: 0.6, description: 'Contains "crypto"' },
  { pattern: /coin$/i, category: 'finance', confidence: 0.5, description: 'Ends with "coin"' },
  { pattern: /wallet/i, category: 'finance', confidence: 0.4, description: 'Contains "wallet"' },
  { pattern: /credit/i, category: 'finance', confidence: 0.5, description: 'Contains "credit"' },
  { pattern: /loan/i, category: 'finance', confidence: 0.5, description: 'Contains "loan"' },
  { pattern: /mortgage/i, category: 'finance', confidence: 0.6, description: 'Contains "mortgage"' },
  { pattern: /insurance/i, category: 'finance', confidence: 0.6, description: 'Contains "insurance"' },
  { pattern: /capital/i, category: 'finance', confidence: 0.4, description: 'Contains "capital"' },
  { pattern: /wealth/i, category: 'finance', confidence: 0.5, description: 'Contains "wealth"' },

  // === HEALTHCARE PATTERNS ===
  { pattern: /health/i, category: 'healthcare', confidence: 0.6, description: 'Contains "health"' },
  { pattern: /hospital/i, category: 'healthcare', confidence: 0.7, description: 'Contains "hospital"' },
  { pattern: /medical/i, category: 'healthcare', confidence: 0.6, description: 'Contains "medical"' },
  { pattern: /clinic/i, category: 'healthcare', confidence: 0.6, description: 'Contains "clinic"' },
  { pattern: /doctor/i, category: 'healthcare', confidence: 0.5, description: 'Contains "doctor"' },
  { pattern: /pharma/i, category: 'healthcare', confidence: 0.6, description: 'Contains "pharma"' },
  { pattern: /medicine/i, category: 'healthcare', confidence: 0.5, description: 'Contains "medicine"' },
  { pattern: /therapy/i, category: 'healthcare', confidence: 0.5, description: 'Contains "therapy"' },
  { pattern: /wellness/i, category: 'healthcare', confidence: 0.4, description: 'Contains "wellness"' },
  { pattern: /fitness/i, category: 'healthcare', confidence: 0.4, description: 'Contains "fitness"' },
  { pattern: /care$/i, category: 'healthcare', confidence: 0.4, description: 'Ends with "care"' },
  { pattern: /rx/i, category: 'healthcare', confidence: 0.4, description: 'Contains "rx"' },
  { pattern: /med$/i, category: 'healthcare', confidence: 0.4, description: 'Ends with "med"' },

  // === EDUCATION PATTERNS ===
  { pattern: /\.edu$/i, category: 'education', confidence: 0.8, description: 'Uses .edu TLD' },
  { pattern: /\.edu\./i, category: 'education', confidence: 0.7, description: 'Contains .edu.' },
  { pattern: /\.ac\./i, category: 'education', confidence: 0.7, description: 'Contains .ac. (academic)' },
  { pattern: /university/i, category: 'education', confidence: 0.7, description: 'Contains "university"' },
  { pattern: /college/i, category: 'education', confidence: 0.6, description: 'Contains "college"' },
  { pattern: /school/i, category: 'education', confidence: 0.5, description: 'Contains "school"' },
  { pattern: /learn/i, category: 'education', confidence: 0.5, description: 'Contains "learn"' },
  { pattern: /course/i, category: 'education', confidence: 0.5, description: 'Contains "course"' },
  { pattern: /academy/i, category: 'education', confidence: 0.6, description: 'Contains "academy"' },
  { pattern: /tutor/i, category: 'education', confidence: 0.5, description: 'Contains "tutor"' },
  { pattern: /study/i, category: 'education', confidence: 0.4, description: 'Contains "study"' },
  { pattern: /training/i, category: 'education', confidence: 0.4, description: 'Contains "training"' },
  { pattern: /class/i, category: 'education', confidence: 0.3, description: 'Contains "class"' },
  { pattern: /edu$/i, category: 'education', confidence: 0.4, description: 'Ends with "edu"' },

  // === TRAVEL PATTERNS ===
  { pattern: /travel/i, category: 'travel', confidence: 0.7, description: 'Contains "travel"' },
  { pattern: /hotel/i, category: 'travel', confidence: 0.7, description: 'Contains "hotel"' },
  { pattern: /flight/i, category: 'travel', confidence: 0.6, description: 'Contains "flight"' },
  { pattern: /airline/i, category: 'travel', confidence: 0.7, description: 'Contains "airline"' },
  { pattern: /booking/i, category: 'travel', confidence: 0.5, description: 'Contains "booking"' },
  { pattern: /vacation/i, category: 'travel', confidence: 0.6, description: 'Contains "vacation"' },
  { pattern: /resort/i, category: 'travel', confidence: 0.6, description: 'Contains "resort"' },
  { pattern: /cruise/i, category: 'travel', confidence: 0.6, description: 'Contains "cruise"' },
  { pattern: /tour/i, category: 'travel', confidence: 0.4, description: 'Contains "tour"' },
  { pattern: /trip/i, category: 'travel', confidence: 0.4, description: 'Contains "trip"' },
  { pattern: /air$/i, category: 'travel', confidence: 0.5, description: 'Ends with "air"' },
  { pattern: /airways/i, category: 'travel', confidence: 0.7, description: 'Contains "airways"' },
  { pattern: /rentals/i, category: 'travel', confidence: 0.4, description: 'Contains "rentals"' },
  { pattern: /hostel/i, category: 'travel', confidence: 0.6, description: 'Contains "hostel"' },

  // === GAMING PATTERNS ===
  { pattern: /game/i, category: 'gaming', confidence: 0.6, description: 'Contains "game"' },
  { pattern: /gaming/i, category: 'gaming', confidence: 0.7, description: 'Contains "gaming"' },
  { pattern: /games$/i, category: 'gaming', confidence: 0.7, description: 'Ends with "games"' },
  { pattern: /esport/i, category: 'gaming', confidence: 0.7, description: 'Contains "esport"' },
  { pattern: /gamer/i, category: 'gaming', confidence: 0.6, description: 'Contains "gamer"' },
  { pattern: /guild/i, category: 'gaming', confidence: 0.5, description: 'Contains "guild"' },
  { pattern: /quest/i, category: 'gaming', confidence: 0.4, description: 'Contains "quest"' },
  { pattern: /rpg/i, category: 'gaming', confidence: 0.5, description: 'Contains "rpg"' },
  { pattern: /mmo/i, category: 'gaming', confidence: 0.5, description: 'Contains "mmo"' },
  { pattern: /arcade/i, category: 'gaming', confidence: 0.5, description: 'Contains "arcade"' },
  { pattern: /casino/i, category: 'gaming', confidence: 0.5, description: 'Contains "casino"' },
  { pattern: /poker/i, category: 'gaming', confidence: 0.5, description: 'Contains "poker"' },
  { pattern: /bet/i, category: 'gaming', confidence: 0.4, description: 'Contains "bet"' },
  { pattern: /slot/i, category: 'gaming', confidence: 0.4, description: 'Contains "slot"' },
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
