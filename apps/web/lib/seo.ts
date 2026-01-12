/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Phase 2A: CTR Optimization with Title/Description Variants
 *
 * FIX #4: Multiple title/description variants per condition
 * to avoid template patterns that Google penalizes.
 *
 * Uses deterministic hash-based selection so each domain
 * consistently gets the same variant (no random titles).
 */

export interface ScanDataForSEO {
  score: number | null;
  trackerCount: number;
  cookieCount: number;
  hasFingerprinting: boolean;
  domain: string;
}

/**
 * Simple hash function for deterministic variant selection.
 * Same domain always produces same hash.
 */
function hashDomain(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    const char = domain.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// TITLE VARIANTS - Different patterns to avoid template spam
// ============================================================================

type TitleGenerator = (d: ScanDataForSEO) => string;

const TITLE_VARIANTS: Record<string, TitleGenerator[]> = {
  critical: [
    (d) => `${d.domain} Privacy Alert: Score ${d.score}/100 - Major Issues Found`,
    (d) => `Is ${d.domain} Safe? Privacy Score ${d.score}/100 (Critical)`,
    (d) => `${d.domain}: ${d.score}/100 Privacy Score - Serious Concerns`,
    (d) => `Privacy Check: ${d.domain} Scores ${d.score}/100 - Problems Detected`,
    (d) => `${d.domain} Privacy Report - Score ${d.score}/100, Critical Issues`,
  ],
  fingerprinting: [
    (d) => `${d.domain} Uses Fingerprinting - Privacy Score ${d.score}/100`,
    (d) => `Fingerprinting Detected on ${d.domain} (Score: ${d.score})`,
    (d) => `Is ${d.domain} Tracking You? Fingerprinting Found`,
    (d) => `${d.domain}: Fingerprinting Active - What It Tracks`,
    (d) => `Warning: ${d.domain} Fingerprints Your Browser (${d.score}/100)`,
  ],
  highTrackers: [
    (d) => `${d.domain} Has ${d.trackerCount} Trackers - Privacy Score ${d.score}`,
    (d) => `${d.trackerCount} Trackers Found on ${d.domain} - Full Analysis`,
    (d) => `Who's Tracking You on ${d.domain}? ${d.trackerCount} Trackers Found`,
    (d) => `${d.domain} Privacy: ${d.trackerCount} Trackers Detected`,
    (d) => `Privacy Check: ${d.domain} Runs ${d.trackerCount} Trackers`,
  ],
  good: [
    (d) => `${d.domain} Privacy Score: ${d.score}/100 - Above Average`,
    (d) => `Is ${d.domain} Private? Score ${d.score}/100 (Good)`,
    (d) => `${d.domain}: Privacy Score ${d.score}/100 - Better Than Most`,
    (d) => `Privacy Analysis: ${d.domain} Scores ${d.score}/100`,
    (d) => `${d.domain} Privacy Report - ${d.score}/100, ${d.trackerCount} Trackers`,
  ],
  default: [
    (d) => `${d.domain} Privacy Score: ${d.score}/100 - Full Report`,
    (d) => `Is ${d.domain} Safe? Privacy Analysis & Score`,
    (d) => `${d.domain}: Privacy Score ${d.score}, ${d.trackerCount} Trackers`,
    (d) => `Privacy Check: ${d.domain} - Score ${d.score}/100`,
    (d) => `${d.domain} Privacy Report - Trackers, Cookies & Score`,
  ],
  noScore: [
    (d) => `${d.domain} Privacy Analysis - Free Scan`,
    (d) => `Check ${d.domain} Privacy - Instant Results`,
    (d) => `${d.domain}: Privacy Report Available`,
    (d) => `Privacy Scan: ${d.domain} - Get Your Report`,
    (d) => `Analyze ${d.domain} Privacy - Free Scanner`,
  ],
};

/**
 * Generates a unique report title based on findings.
 * Uses hash-based variant selection for consistency.
 */
export function generateReportTitle(data: ScanDataForSEO): string {
  const { score, trackerCount, hasFingerprinting, domain } = data;
  const hash = hashDomain(domain);

  let variants: TitleGenerator[];

  // Select variant category based on findings
  if (score === null) {
    variants = TITLE_VARIANTS.noScore;
  } else if (score < 30) {
    variants = TITLE_VARIANTS.critical;
  } else if (hasFingerprinting) {
    variants = TITLE_VARIANTS.fingerprinting;
  } else if (trackerCount > 15) {
    variants = TITLE_VARIANTS.highTrackers;
  } else if (score > 80) {
    variants = TITLE_VARIANTS.good;
  } else {
    variants = TITLE_VARIANTS.default;
  }

  // Deterministically select variant based on domain hash
  const variantIndex = hash % variants.length;
  return variants[variantIndex](data);
}

// ============================================================================
// DESCRIPTION VARIANTS - Varied meta descriptions
// ============================================================================

type DescriptionGenerator = (d: ScanDataForSEO) => string;

const DESCRIPTION_VARIANTS: Record<string, DescriptionGenerator[]> = {
  critical: [
    (d) =>
      `${d.domain} scores ${d.score}/100 for privacy. ${d.trackerCount} trackers detected. See what data is being collected and how to protect yourself.`,
    (d) =>
      `Privacy alert: ${d.domain} has serious issues (score: ${d.score}). We found ${d.trackerCount} trackers. Free instant analysis.`,
    (d) =>
      `Is ${d.domain} safe? Our scan found ${d.trackerCount} trackers and scored it ${d.score}/100. Full breakdown inside.`,
  ],
  fingerprinting: [
    (d) =>
      `${d.domain} uses browser fingerprinting to track visitors. Privacy score: ${d.score}/100. Learn what this means for you.`,
    (d) =>
      `Warning: ${d.domain} fingerprints your browser. Score ${d.score}/100, ${d.trackerCount} trackers. See the full analysis.`,
    (d) =>
      `Fingerprinting detected on ${d.domain}. This site can track you even in incognito mode. Score: ${d.score}/100.`,
  ],
  highTrackers: [
    (d) =>
      `${d.domain} loads ${d.trackerCount} trackers from third parties. Privacy score: ${d.score}/100. See who's watching.`,
    (d) =>
      `We found ${d.trackerCount} trackers on ${d.domain}. Score: ${d.score}/100. Full privacy report available.`,
    (d) =>
      `${d.trackerCount} trackers detected on ${d.domain}. Find out what they collect. Privacy score: ${d.score}/100.`,
  ],
  good: [
    (d) =>
      `${d.domain} scores ${d.score}/100 for privacy - better than most sites. ${d.trackerCount} trackers found. Full report.`,
    (d) =>
      `Good news: ${d.domain} has above-average privacy (${d.score}/100). See the complete analysis.`,
    (d) =>
      `${d.domain} privacy check: Score ${d.score}/100, ${d.trackerCount} trackers. Detailed breakdown available.`,
  ],
  default: [
    (d) =>
      `Free privacy analysis of ${d.domain}. Score: ${d.score}/100, ${d.trackerCount} trackers detected. No signup required.`,
    (d) =>
      `How private is ${d.domain}? Our scan found ${d.trackerCount} trackers. Privacy score: ${d.score}/100. Full report.`,
    (d) =>
      `${d.domain} privacy report: ${d.score}/100 score, ${d.trackerCount} trackers, cookies analyzed. Instant free scan.`,
  ],
  noScore: [
    (d) =>
      `Analyze ${d.domain} for privacy concerns. Check for trackers, cookies, and security issues with Gecko Advisor's free scanner.`,
    (d) =>
      `Get a free privacy report for ${d.domain}. Instant analysis of trackers, cookies, and security. No account needed.`,
    (d) =>
      `Scan ${d.domain} for privacy issues. Free instant analysis shows trackers, cookies, and security concerns.`,
  ],
};

/**
 * Generates a unique meta description based on findings.
 * Truncated to 155 chars for Google.
 */
export function generateReportDescription(data: ScanDataForSEO): string {
  const { score, trackerCount, hasFingerprinting, domain } = data;
  const hash = hashDomain(domain);

  let variants: DescriptionGenerator[];

  // Select variant category based on findings
  if (score === null) {
    variants = DESCRIPTION_VARIANTS.noScore;
  } else if (score < 40) {
    variants = DESCRIPTION_VARIANTS.critical;
  } else if (hasFingerprinting) {
    variants = DESCRIPTION_VARIANTS.fingerprinting;
  } else if (trackerCount > 15) {
    variants = DESCRIPTION_VARIANTS.highTrackers;
  } else if (score > 80) {
    variants = DESCRIPTION_VARIANTS.good;
  } else {
    variants = DESCRIPTION_VARIANTS.default;
  }

  const variantIndex = hash % variants.length;
  let description = variants[variantIndex](data);

  // Truncate to 155 chars for optimal Google display
  if (description.length > 155) {
    description = description.substring(0, 152) + '...';
  }

  return description;
}

// ============================================================================
// HEADING VARIANTS - H1 variations
// ============================================================================

/**
 * Generates page heading (H1) with slight variations.
 */
export function generateReportHeading(data: ScanDataForSEO): string {
  const { score, domain } = data;
  const hash = hashDomain(domain);

  if (score === null) {
    const variants = [
      `Privacy Analysis: ${domain}`,
      `${domain} Privacy Report`,
      `Privacy Scan: ${domain}`,
    ];
    return variants[hash % variants.length];
  }

  const variants = [
    `${domain} Privacy Score: ${score}/100`,
    `Privacy Score for ${domain}: ${score}/100`,
    `${domain}: ${score}/100 Privacy Rating`,
  ];

  return variants[hash % variants.length];
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Builds complete SEO metadata for a report page.
 */
export function buildReportSEO(
  domain: string,
  score: number | null,
  trackerCount: number = 0,
  cookieCount: number = 0,
  hasFingerprinting: boolean = false
): {
  title: string;
  description: string;
  heading: string;
} {
  const data: ScanDataForSEO = {
    domain,
    score,
    trackerCount,
    cookieCount,
    hasFingerprinting,
  };

  return {
    title: generateReportTitle(data),
    description: generateReportDescription(data),
    heading: generateReportHeading(data),
  };
}
