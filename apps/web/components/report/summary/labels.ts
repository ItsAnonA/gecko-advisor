/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Returns a frequency label based on how common a pattern is across scanned sites.
 *
 * @param rate - The rate (0-1) of sites exhibiting this pattern
 * @returns 'Common' | 'Unusual' | null
 */
export function getFrequencyLabel(rate: number): 'Common' | 'Unusual' | null {
  if (rate >= 0.50) return 'Common';
  if (rate < 0.20) return 'Unusual';
  return null;
}

/**
 * Returns an effort label based on estimated fix time and developer requirement.
 *
 * @param minutes - Estimated minutes to fix
 * @param needsDev - Whether a developer is required
 * @returns Human-readable effort label
 */
export function getEffortLabel(minutes: number, needsDev: boolean): string {
  if (minutes <= 15 && !needsDev) return 'Quick fix';
  if (needsDev) return 'Needs developer';
  return 'Moderate effort';
}

/**
 * Returns a severity label based on the score.
 *
 * @param score - The privacy score (0-100)
 * @returns Severity classification
 */
export function getSeverityLabel(score: number): 'excellent' | 'good' | 'moderate' | 'poor' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'poor';
  return 'critical';
}

/**
 * Returns a risk level label based on tracker count and third-party connections.
 *
 * @param trackerCount - Number of trackers detected
 * @param thirdPartyCount - Number of third-party connections
 * @returns Risk level classification
 */
export function getRiskLevel(trackerCount: number, thirdPartyCount: number): 'low' | 'medium' | 'high' {
  if (trackerCount === 0 && thirdPartyCount < 3) return 'low';
  if (trackerCount > 5 || thirdPartyCount > 15) return 'high';
  return 'medium';
}

/**
 * Returns whether the site has ad trackers based on evidence.
 *
 * @param evidence - Array of evidence items
 * @returns Whether ad trackers were detected
 */
export function hasAdTrackers(evidence: Array<{ kind: string; details: unknown }>): boolean {
  return evidence.some(e => {
    if (e.kind !== 'tracker') return false;
    const details = e.details as { category?: string } | null;
    return details?.category === 'advertising';
  });
}
