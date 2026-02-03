/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

interface ComparisonParams {
  percentile: number;
  category?: string;
  count: number;
  average: number;
  totalSites: number;
}

/**
 * Generates a comparison sentence based on the domain's percentile ranking.
 * Uses different phrasing based on performance tier.
 *
 * @param params - Comparison parameters
 * @returns A contextual comparison sentence
 */
export function getComparisonSentence(params: ComparisonParams): string {
  const { percentile, category, totalSites } = params;
  const formattedTotal = totalSites.toLocaleString();
  const categoryText = category ? `${category} sites` : 'sites';

  // Top 20% - emphasize excellence
  if (percentile >= 80) {
    const topPercent = 100 - percentile;
    return `Only ${topPercent}% of the ${formattedTotal} sites we've analyzed meet this standard.`;
  }

  // Middle 20-80% - typical performance
  if (percentile >= 20) {
    const betterPercent = 100 - percentile;
    return `This is typical for ${categoryText}, though ${betterPercent}% perform better.`;
  }

  // Bottom 20% - needs improvement
  const worsePercent = 100 - percentile;
  return `This is higher than ${worsePercent}% of ${categoryText}.`;
}

interface IntroParams {
  trackerCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  hasAdTrackers: boolean;
  thirdPartyCount: number;
  domain: string;
}

/**
 * Generates an introduction sentence based on tracking findings.
 * Prioritizes interpretation over raw numbers.
 *
 * @param params - Introduction parameters
 * @returns A contextual intro sentence
 */
export function getIntroSentence(params: IntroParams): string {
  const { trackerCount, riskLevel, hasAdTrackers, thirdPartyCount, domain } = params;

  // No trackers - lead with positive
  if (trackerCount === 0) {
    if (thirdPartyCount <= 1) {
      return `${domain} does not expose visitor data to advertising or analytics networks.`;
    }
    return `${domain} does not load known tracking scripts, though it connects to ${thirdPartyCount} external services.`;
  }

  // High risk with ad trackers - emphasize concern
  if (riskLevel === 'high' && hasAdTrackers) {
    return `We observed ${trackerCount} tracking service${trackerCount > 1 ? 's' : ''} receiving visitor data, including advertising networks.`;
  }

  // Medium/high risk without ads
  if (riskLevel === 'high') {
    return `${domain} connects to ${thirdPartyCount} external services and loads ${trackerCount} tracking script${trackerCount > 1 ? 's' : ''}.`;
  }

  // Medium risk
  return `${domain} shares visitor information with ${trackerCount} third-party service${trackerCount > 1 ? 's' : ''}.`;
}

/**
 * Generates vendor type description based on evidence.
 *
 * @param evidence - Array of evidence items
 * @returns Formatted vendor types string
 */
export function getVendorTypes(evidence: Array<{ kind: string; details: unknown }>): string {
  const categories = new Set<string>();

  for (const e of evidence) {
    if (e.kind === 'tracker') {
      const details = e.details as { category?: string } | null;
      if (details?.category) {
        categories.add(details.category);
      }
    }
  }

  const categoryLabels: Record<string, string> = {
    'advertising': 'advertising networks',
    'analytics': 'analytics services',
    'social': 'social widgets',
    'essential': 'essential services',
    'fingerprinting': 'fingerprinting scripts',
  };

  const types = Array.from(categories)
    .map(cat => categoryLabels[cat] || cat)
    .slice(0, 3);

  if (types.length === 0) return 'third-party services';
  if (types.length === 1) return types[0];
  if (types.length === 2) return `${types[0]} and ${types[1]}`;
  return `${types.slice(0, -1).join(', ')}, and ${types[types.length - 1]}`;
}

/**
 * Formats a percentile for display.
 *
 * @param percentile - The percentile value (0-100)
 * @returns Formatted percentile string
 */
export function formatPercentile(percentile: number): string {
  const rounded = Math.round(percentile);
  if (rounded >= 99) return '99+';
  return String(rounded);
}
