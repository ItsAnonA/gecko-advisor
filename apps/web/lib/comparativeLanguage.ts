/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Comparative Language Utilities
 *
 * Generates restrained, objective comparative text for metrics.
 *
 * RULES:
 * - Sounds objective, avoids legal risk
 * - Makes scores feel earned, not assigned
 * - No absolute claims like "safe" or "respects privacy"
 * - Comparative framing: "fewer than", "above average", etc.
 */

export interface ComparisonContext {
  value: number;
  average: number;
  metric: 'trackers' | 'cookies' | 'thirdParty' | 'score';
}

/**
 * Generates comparative text for a metric
 *
 * Examples:
 * - 0 trackers → "No trackers detected — fewer than most sites"
 * - 3 trackers, avg 5 → "2.0 fewer trackers than average"
 * - Score 90 → "Excellent — above most sites analyzed"
 */
export function getComparativeText({ value, average, metric }: ComparisonContext): string {
  const diff = value - average;

  switch (metric) {
    case 'trackers':
      if (value === 0) return 'No trackers detected — fewer than most sites';
      if (diff < 0) return `${Math.abs(diff).toFixed(1)} fewer trackers than average`;
      if (diff > 0) return `${diff.toFixed(1)} more trackers than typical`;
      return 'Typical tracker count';

    case 'cookies':
      if (value === 0) return 'No cookies detected';
      if (diff < -2) return 'Fewer cookies than most sites';
      if (diff > 2) return 'More cookies than typical';
      return 'Typical cookie usage';

    case 'thirdParty':
      if (value <= 2) return 'Minimal third-party connections';
      if (diff < 0) return 'Fewer external connections than average';
      if (diff > 3) return 'Higher third-party exposure than typical';
      return 'Typical third-party usage';

    case 'score':
      if (value >= 90) return 'Excellent — above most sites analyzed';
      if (value >= 80) return 'Above-average privacy practices';
      if (value >= 60) return 'Typical privacy posture';
      if (value >= 40) return 'Below-average — room for improvement';
      return 'Significant privacy concerns detected';

    default:
      return '';
  }
}

/**
 * Generates comparative text for TLS grade
 */
export function getTlsComparative(grade: string | undefined): string {
  if (!grade) return 'Security configuration analyzed';

  switch (grade) {
    case 'A+':
      return 'Excellent — above-average security configuration';
    case 'A':
      return 'Strong TLS configuration';
    case 'B':
      return 'Adequate security — minor improvements possible';
    case 'C':
      return 'Below-average — security improvements recommended';
    case 'D':
    case 'F':
      return 'Weak security configuration — action needed';
    default:
      return 'Security configuration analyzed';
  }
}

/**
 * Generates a percentile comparison string
 *
 * Only call this when sample size is adequate (N >= 50)
 */
export function getPercentileText(percentile: number, totalDomains: number): string {
  if (percentile >= 90) {
    return `Top 10% of ${totalDomains.toLocaleString()} sites analyzed`;
  }
  if (percentile >= 75) {
    return `Better than ${percentile}% of sites analyzed`;
  }
  if (percentile >= 50) {
    return `Above average — better than ${percentile}% of sites`;
  }
  if (percentile >= 25) {
    return `Below average — ${percentile}th percentile`;
  }
  return `Bottom quartile — ${percentile}th percentile`;
}

/**
 * Generates data sharing risk label
 *
 * Based on tracker + third-party + cookie count
 */
export function getDataSharingRisk(
  trackerCount: number,
  thirdPartyCount: number,
  cookieCount: number
): { level: 'low' | 'medium' | 'high'; text: string } {
  const riskScore = trackerCount * 3 + thirdPartyCount + cookieCount;

  if (trackerCount === 0 && thirdPartyCount < 5) {
    return { level: 'low', text: 'Minimal data exposure detected' };
  }

  if (riskScore <= 10) {
    return { level: 'low', text: 'Low data sharing activity' };
  }

  if (riskScore <= 25 || trackerCount <= 3) {
    return { level: 'medium', text: 'Moderate data sharing activity' };
  }

  return { level: 'high', text: 'Significant data sharing detected' };
}
