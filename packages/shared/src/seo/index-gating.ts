/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { isBlockedDomain } from '../blocklist/index.js';

/**
 * SEO Index Gating Logic
 *
 * Determines indexability tier for scan reports.
 * Controls which pages get indexed by search engines.
 */

/**
 * Index tiers for SEO content:
 * - 'full': Complete scan with all analysis modules - gets full SEO treatment
 * - 'limited': Partial scan (some modules missing) - gets basic SEO
 * - 'noindex': No scan data or failed scan - blocked from indexing
 */
export type IndexTier = 'full' | 'limited' | 'noindex';

/**
 * Minimal scan data interface for index gating.
 * Aligned with ReportResponse.scan from schemas.ts
 */
export interface ScanDataForGating {
  status?: string;
  score?: number | null;
  progress?: number;
  finishedAt?: string | Date | null;
  // Full tier indicators
  trackerCount?: number;
  thirdPartyCount?: number;
  cookieCount?: number;
  tlsGrade?: string;
  // Domain for blocklist checking (optional for backward compatibility)
  domain?: string;
}

/**
 * Determines the index tier for a scan.
 *
 * Full tier requirements (all must be met):
 * - status === 'done'
 * - score is present, numeric, and 0-100
 * - progress === 100
 * - finishedAt is set and valid date
 * - Has tracker/third-party/cookie analysis data
 *
 * Limited tier (any of these):
 * - status === 'done' but missing some analysis
 * - Has score but incomplete data
 *
 * NoIndex tier:
 * - null/undefined scan
 * - status !== 'done'
 * - No score or NaN score
 * - Invalid finishedAt date
 * - Errors or missing data
 *
 * @param scanData - Scan data object (can be null/undefined)
 * @returns Index tier for SEO decisions
 */
export function getIndexTier(scanData: ScanDataForGating | null | undefined): IndexTier {
  // No data = noindex
  if (!scanData) {
    return 'noindex';
  }

  // Blocked domain (adult content) = noindex
  if (scanData.domain && isBlockedDomain(scanData.domain)) {
    return 'noindex';
  }

  // Incomplete scan = noindex
  if (scanData.status !== 'done') {
    return 'noindex';
  }

  // No score = noindex
  if (scanData.score === null || scanData.score === undefined) {
    return 'noindex';
  }

  // NaN score = noindex
  if (Number.isNaN(scanData.score)) {
    return 'noindex';
  }

  // Score out of range = noindex
  if (scanData.score < 0 || scanData.score > 100) {
    return 'noindex';
  }

  // Invalid finishedAt date = noindex (for full tier consideration)
  if (scanData.finishedAt) {
    const finishedDate = new Date(scanData.finishedAt);
    if (Number.isNaN(finishedDate.getTime())) {
      return 'noindex';
    }
  }

  // Check for full analysis data
  const hasTrackerData = typeof scanData.trackerCount === 'number' && !Number.isNaN(scanData.trackerCount);
  const hasThirdPartyData = typeof scanData.thirdPartyCount === 'number' && !Number.isNaN(scanData.thirdPartyCount);
  const hasTlsGrade = typeof scanData.tlsGrade === 'string' && scanData.tlsGrade.length > 0;

  // Full tier requires complete analysis
  if (hasTrackerData && hasThirdPartyData && hasTlsGrade) {
    return 'full';
  }

  // Has score but missing some data = limited
  return 'limited';
}

/**
 * Checks if a scan should be included in sitemaps.
 * Only 'full' tier pages are included - they have sufficient content quality.
 * Limited tier pages have thin content (~200 words) and should not be indexed.
 *
 * @param scanData - Scan data object
 * @returns true if scan should be in sitemap
 */
export function isIndexable(scanData: ScanDataForGating | null | undefined): boolean {
  const tier = getIndexTier(scanData);
  return tier === 'full';
}

/**
 * Gets robots meta directive based on index tier.
 *
 * Only 'full' tier gets indexed - these pages have complete scan data
 * and sufficient content quality (300-600 words).
 *
 * 'limited' and 'noindex' tiers get noindex but follow links.
 *
 * @param tier - Index tier
 * @returns Object for Next.js metadata robots field
 */
export function getRobotsDirective(tier: IndexTier): { index: boolean; follow: boolean } {
  return {
    index: tier === 'full',
    follow: true, // Always follow links even on noindex pages
  };
}
