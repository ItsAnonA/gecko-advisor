/**
 * Domain Classification Module
 *
 * Exports deterministic classification utilities.
 * NO AI/LLM - rules-based only.
 */

export { KNOWN_BRANDS, matchKnownBrand, getKnownBrandCount, getBrandCountByCategory } from './known-brands';
export type { BrandMatchResult } from './known-brands';

export { DOMAIN_PATTERNS, matchPatterns, getPatternsForCategory, debugPatternMatch } from './patterns';
export type { PatternMatchResult } from './patterns';
