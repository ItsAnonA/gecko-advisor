/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Report Copy Constants
 *
 * Centralized copy for the Reports page using "Exposure" framing language.
 * This creates a more confrontational but factual tone that resonates with users.
 *
 * Language note: Use "Exposure" consistently. Avoid "leak" entirely (implies wrongdoing).
 * "Exposure" is confrontational but factual.
 */

/**
 * Tab labels for the report navigation
 */
export const tabLabels = {
  overview: 'Overview',
  tracking: "Who's Watching",
  security: 'Vulnerabilities',
  cookies: 'Cookie Exposure',
  thirdParty: 'Data Exposure',
  details: 'Full Report',
} as const;

/**
 * Summary messages based on risk level
 */
export const summaryMessages = {
  low: 'Low exposure detected. Minimal privacy concerns found.',
  moderate: 'Moderate exposure detected. Some privacy concerns need attention.',
  high: 'High exposure detected. Significant privacy risks identified.',
  critical: 'Critical exposure detected. Serious privacy risks require action.',
} as const;

/**
 * Category descriptions for tab headers
 */
export const categoryDescriptions = {
  tracking: (domain: string) =>
    `Who ${domain} shares your data with - trackers, fingerprinting scripts, and third-party connections.`,
  security: (domain: string) =>
    `${domain} connection security - TLS/HTTPS configuration, security headers, and potential vulnerabilities.`,
  cookies: (domain: string) =>
    `How ${domain} uses cookies - storage patterns, tracking cookies, and data retention.`,
} as const;

/**
 * Category titles for tab headers
 */
export const categoryTitles = {
  tracking: (domain: string) => `${domain} trackers: what's watching you`,
  security: (domain: string) => `${domain} security analysis`,
  cookies: (domain: string) => `${domain} cookie practices`,
} as const;

/**
 * Action labels
 */
export const actionLabels = {
  viewFindings: (count: number) => `View ${count} Exposure${count !== 1 ? 's' : ''}`,
  viewRecommendations: 'How to Reduce Exposure',
  scanAnother: 'Scan Another',
  fullReport: 'Full Report',
} as const;

/**
 * Risk level labels (for badges and descriptions)
 */
export const riskLabels = {
  low: 'Low Privacy Risk',
  moderate: 'Moderate Privacy Risk',
  high: 'High Privacy Risk',
  critical: 'Critical Privacy Risk',
} as const;

export type RiskLevel = keyof typeof riskLabels;
export type TabId = keyof typeof tabLabels;
