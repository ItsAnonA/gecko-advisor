/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * SEO Metadata Builders
 *
 * Generates titles, descriptions, and other metadata for SSR pages.
 */

import type { ScanDataForGating } from './index-gating.js';

export const SEO_CONSTANTS: {
  readonly SITE_NAME: string;
  readonly BASE_URL: string;
  readonly DEFAULT_DESCRIPTION: string;
  readonly TITLE_SUFFIX: string;
} = {
  SITE_NAME: 'Gecko Advisor',
  BASE_URL: 'https://geckoadvisor.com',
  DEFAULT_DESCRIPTION:
    'Analyze any website for trackers, cookies, and security issues. Free privacy scoring with detailed reports.',
  TITLE_SUFFIX: 'Gecko Advisor',
};

/**
 * Extended scan data with additional fields needed for metadata.
 */
export interface ScanDataForMetadata extends ScanDataForGating {
  score?: number | null;
  label?: string | null;
  trackerCount?: number;
  thirdPartyCount?: number;
  cookieCount?: number;
  tlsGrade?: string;
  finishedAt?: string | Date | null;
}

/**
 * Generates the H1 heading for a report page.
 * Format varies based on score availability.
 *
 * @param domain - Normalized domain
 * @param score - Privacy score (0-100) or undefined
 * @returns H1 heading string
 */
export function getPageHeading(domain: string, score?: number | null): string {
  if (typeof score === 'number' && score >= 0 && score <= 100) {
    return `${domain} Privacy Score: ${score}/100`;
  }
  return `Privacy Analysis: ${domain}`;
}

/**
 * Generates the page title for a report page.
 *
 * @param domain - Normalized domain
 * @param score - Privacy score or undefined
 * @returns Title string (will be suffixed with " | Gecko Advisor" by layout)
 */
export function getPageTitle(domain: string, score?: number | null): string {
  if (typeof score === 'number' && score >= 0 && score <= 100) {
    return `${domain} Privacy Score: ${score}/100`;
  }
  return `${domain} Privacy Report`;
}

/**
 * Builds meta description based on scan data and tier.
 * Description length optimized for Google (155-160 chars).
 *
 * @param scanData - Scan data object
 * @param domain - Normalized domain
 * @returns Meta description string
 */
export function buildMetaDescription(
  scanData: ScanDataForMetadata | null | undefined,
  domain: string
): string {
  // No data - generic description
  if (!scanData) {
    return `Analyze ${domain} for privacy concerns. Check for trackers, cookies, and security issues with Gecko Advisor's free scanner.`;
  }

  const score = scanData.score;

  // Build description based on available data
  if (typeof score === 'number') {
    const riskLevel = getScoreRiskLevel(score);
    const trackerPart = buildTrackerDescriptionPart(scanData);
    const thirdPartyPart = buildThirdPartyDescriptionPart(scanData);

    // Compose description (aim for ~155 chars)
    let desc = `${domain} has a privacy score of ${score}/100 (${riskLevel}).`;

    if (trackerPart) {
      desc += ` ${trackerPart}`;
    }
    if (thirdPartyPart && desc.length < 120) {
      desc += ` ${thirdPartyPart}`;
    }

    // Truncate if too long
    if (desc.length > 155) {
      desc = desc.substring(0, 152) + '...';
    }

    return desc;
  }

  // Fallback for missing score
  return `Privacy analysis for ${domain}. Check trackers, cookies, security headers, and third-party connections with Gecko Advisor.`;
}

/**
 * Gets human-readable risk level from score.
 */
function getScoreRiskLevel(score: number): string {
  if (score >= 80) return 'Low Risk';
  if (score >= 50) return 'Moderate Risk';
  return 'High Risk';
}

/**
 * Builds tracker portion of description.
 */
function buildTrackerDescriptionPart(scanData: ScanDataForMetadata): string {
  const count = scanData.trackerCount;
  if (typeof count !== 'number') return '';

  if (count === 0) {
    return 'No trackers detected.';
  }
  return `${count} tracker${count === 1 ? '' : 's'} found.`;
}

/**
 * Builds third-party portion of description.
 */
function buildThirdPartyDescriptionPart(scanData: ScanDataForMetadata): string {
  const count = scanData.thirdPartyCount;
  if (typeof count !== 'number') return '';

  if (count === 0) {
    return 'No third-party connections.';
  }
  return `${count} third-party connection${count === 1 ? '' : 's'}.`;
}

/**
 * Builds canonical URL for a domain report.
 *
 * @param domain - Normalized domain
 * @param baseUrl - Base URL (defaults to production)
 * @returns Full canonical URL
 */
export function buildCanonicalUrl(domain: string, baseUrl = SEO_CONSTANTS.BASE_URL): string {
  return `${baseUrl}/privacy-report/${domain}`;
}

/**
 * Builds Open Graph metadata for a domain report.
 *
 * @param scanData - Scan data
 * @param domain - Normalized domain
 * @param baseUrl - Base URL
 * @returns Open Graph metadata object
 */
export function buildOpenGraphData(
  scanData: ScanDataForMetadata | null | undefined,
  domain: string,
  baseUrl = SEO_CONSTANTS.BASE_URL
): {
  title: string;
  description: string;
  url: string;
  siteName: string;
  type: 'article' | 'website';
} {
  return {
    title: `${domain} Privacy Analysis | ${SEO_CONSTANTS.SITE_NAME}`,
    description: buildMetaDescription(scanData, domain),
    url: buildCanonicalUrl(domain, baseUrl),
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'article',
  };
}

/**
 * Formats a date for display in scan freshness.
 *
 * @param date - Date to format
 * @returns Human-readable date string
 */
export function formatScanDate(date: Date | string | null | undefined): string {
  if (!date) return 'Unknown date';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Unknown date';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Gets freshness text for a scan.
 *
 * @param date - Scan date
 * @returns Freshness indicator text
 */
export function getScanFreshnessText(date: Date | string | null | undefined): string {
  if (!date) return 'Scan date unknown';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Scan date unknown';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Scanned today';
  if (diffDays === 1) return 'Scanned yesterday';
  if (diffDays < 7) return `Scanned ${diffDays} days ago`;
  if (diffDays < 30) return `Scanned ${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `Scanned ${Math.floor(diffDays / 30)} months ago`;

  return `Scanned on ${formatScanDate(d)}`;
}
