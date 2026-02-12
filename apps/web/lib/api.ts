/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * API Client for Next.js SSR
 *
 * Uses direct fetch to backend API (no rewrites).
 * React cache() dedupes fetches within the same render.
 */

import { cache } from 'react';
import {
  normalizeHostname as normalizeDomain,
  isValidDomain,
  getIndexTier,
  isBlockedDomain,
  type IndexTier,
  type ScanDataForMetadata,
} from '@gecko-advisor/shared';
import { buildReportSEO } from './seo';

// API URLs - MUST be set per environment
// Default to 5001 for local dev (5000 is taken by macOS Control Center on newer Macs)
// IMPORTANT: Use getter function to ensure env var is read at RUNTIME, not build time
// Next.js standalone builds bake top-level constants at build time
function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

/**
 * Category info returned with report data
 */
export interface CategoryInfo {
  slug: string;
  name: string;
}

/**
 * Report data structure returned by getReportForDomain
 */
export interface ReportData {
  scan: {
    id: string;
    slug: string;
    input: string;
    normalizedInput: string | null;
    status: string;
    score: number | null;
    label: string | null;
    progress?: number;
    summary?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  // Phase 2B: Category classification
  category?: CategoryInfo | null;
  evidence: Array<{
    id: string;
    kind: string;
    severity: number;
    title: string;
    details: unknown;
  }>;
  issues: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    summary?: string | null;
    howToFix?: string | null;
    whyItMatters?: string | null;
    references?: Array<{ label?: string; url: string }>;
  }>;
  topFixes?: Array<{
    id: string;
    key: string;
    title: string;
    category: string;
    severity: string;
    whyItMatters: string | null;
    howToFix: string | null;
    references: Array<{ label?: string; url: string }>;
  }>;
  meta?: {
    dataSharing?: string;
    domain?: string;
    trackerCount?: number;
    thirdPartyCount?: number;
    cookieCount?: number;
    tlsGrade?: string;
    // Market Analysis - SEO Content Enrichment
    benchmarks?: {
      percentile: number;
      comparedToAverage: number;
      trackerComparison: 'below' | 'average' | 'above';
      cookieComparison: 'below' | 'average' | 'above';
    };
    trackerInsights?: {
      uniqueTrackers: number;
      commonTrackers: string[];
      rarityScore: number;
    };
    globalBenchmarks?: {
      totalDomains: number;
      averageScore: number;
      medianScore: number;
      averageTrackerCount: number;
      averageCookieCount: number;
    };
    // Scoring algorithm penalty breakdown
    penalties?: {
      tracking: number;
      security: number;
      thirdParty: number;
      cookies: number;
      compliance: number;
    };
    // TLS bonus points
    bonuses?: number;
    // Category context for SEO (Phase 4)
    categoryContext?: {
      categorySlug: string;
      categoryName: string;
      categoryPercentile: number;
      categoryAvgScore: number;
      categoryAvgTrackers: number;
      positionLabel: string;
      comparisonText: string;
      sampleSize: number;
    };
    // Related domains for internal linking (Phase 5)
    relatedDomains?: Array<{
      domain: string;
      score: number;
      categoryName?: string;
    }>;
  };
}

/**
 * Processed report data for SSR pages.
 * If no scan exists for a domain, getReportForDomain() returns null (not this object).
 */
export interface ProcessedReportData {
  data: ReportData;
  tier: IndexTier;
  heading: string;
  description: string;
  domain: string;
  scanData: ScanDataForMetadata;
}

/**
 * Fetches and processes report data ONCE per request.
 * Uses React cache() to dedupe within the same render.
 *
 * Use this in BOTH generateMetadata() and the page component.
 */
export const getReportForDomain = cache(
  async (rawDomain: string): Promise<ProcessedReportData | null> => {
    const domain = normalizeDomain(rawDomain);

    if (!domain || !isValidDomain(domain)) {
      return null;
    }

    const data = await fetchReportByDomain(domain);

    // No scan found - return null to trigger notFound() in page component
    if (!data) {
      return null;
    }

    // Build scan data for SEO utilities (data is guaranteed non-null here)
    const scanData: ScanDataForMetadata = {
      status: data.scan.status,
      score: data.scan.score,
      progress: data.scan.progress,
      finishedAt: data.scan.finishedAt,
      trackerCount: data.meta?.trackerCount,
      thirdPartyCount: data.meta?.thirdPartyCount,
      cookieCount: data.meta?.cookieCount,
      tlsGrade: data.meta?.tlsGrade,
      domain, // Include domain for blocklist checking
    };

    // Determine index tier - force noindex for blocked domains even without scan data
    let tier = getIndexTier(scanData);
    if (tier !== 'noindex' && isBlockedDomain(domain)) {
      tier = 'noindex';
    }

    // Phase 2A: Use CTR-optimized title/description variants
    // Detect fingerprinting from evidence
    const hasFingerprinting = data?.evidence?.some(
      (e) =>
        e.kind === 'fingerprint'
    ) ?? false;

    const seo = buildReportSEO(
      domain,
      data?.scan.score ?? null,
      data?.meta?.trackerCount ?? 0,
      data?.meta?.cookieCount ?? 0,
      hasFingerprinting
    );

    return { data, tier, heading: seo.heading, description: seo.description, domain, scanData };
  }
);

/**
 * Fetches report by domain from backend API.
 */
async function fetchReportByDomain(domain: string): Promise<ReportData | null> {
  try {
    const res = await fetch(`${getApiInternalUrl()}/api/v2/domain/${encodeURIComponent(domain)}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`API error: ${res.status} for domain ${domain}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error(`Failed to fetch report for ${domain}:`, error);
    return null;
  }
}

/**
 * Fetches report by slug (for redirects).
 */
export async function fetchReportBySlug(
  slug: string
): Promise<{ domain: string } | null> {
  try {
    const res = await fetch(`${getApiInternalUrl()}/api/v2/report/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      return null;
    }

    const data: ReportData = await res.json();
    const domain = data.meta?.domain || data.scan.normalizedInput || data.scan.input;

    // Normalize the domain for redirect
    const normalized = normalizeDomain(domain);
    if (!normalized) return null;

    return { domain: normalized };
  } catch (error) {
    console.error(`Failed to fetch report for slug ${slug}:`, error);
    return null;
  }
}

/**
 * Domain status for smart 404 handling.
 * Used to determine redirect target when report doesn't exist.
 */
export interface DomainStatus {
  exists: boolean;
  hasScan: boolean;
  domain: string;
  category?: { slug: string; name: string } | null;
  slug?: string;
  score?: number;
  label?: string;
  lastScanned?: string;
}

/**
 * Check domain status for smart 404 redirects.
 * Returns info about whether domain exists and its category.
 *
 * Use cases:
 * - exists=true, hasScan=true → Show report
 * - exists=true, hasScan=false, category set → Redirect to category hub
 * - exists=false → True 404
 */
export const checkDomainStatus = cache(async (rawDomain: string): Promise<DomainStatus> => {
  const domain = normalizeDomain(rawDomain);

  if (!domain || !isValidDomain(domain)) {
    return { exists: false, hasScan: false, domain: rawDomain };
  }

  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/domain/${encodeURIComponent(domain)}/exists`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return { exists: false, hasScan: false, domain };
    }

    return res.json();
  } catch (error) {
    console.error(`Failed to check domain status for ${domain}:`, error);
    return { exists: false, hasScan: false, domain };
  }
});

/**
 * Fetches paginated list of reports for the index page.
 */
export async function fetchReports(
  page: number = 1,
  limit: number = 20
): Promise<{
  items: Array<{
    slug: string;
    score: number;
    label: string;
    domain: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
  };
} | null> {
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/reports/all?page=${page}&limit=${limit}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error(`Failed to fetch reports: ${res.status}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return null;
  }
}

/**
 * Blog post structure for list view.
 */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  readTimeMinutes: number | null;
}

/**
 * Fetches paginated list of blog posts.
 * Returns null on error (graceful degradation).
 */
export async function fetchBlogPosts(
  page: number = 1,
  limit: number = 20
): Promise<{
  items: BlogPostSummary[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
} | null> {
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/blog/posts?page=${page}&limit=${limit}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error(`Failed to fetch blog posts: ${res.status}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return null;
  }
}

/**
 * Fetches a single blog post by slug.
 * Returns null if not found or on error.
 */
export async function fetchBlogPost(slug: string): Promise<{
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  publishedAt: string | null;
  updatedAt: string;
  readTimeMinutes: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
} | null> {
  try {
    const res = await fetch(`${getApiInternalUrl()}/api/v2/blog/posts/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`Failed to fetch blog post: ${res.status}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return null;
  }
}

/**
 * Fetches count of indexable domains for sitemap.
 */
export async function fetchIndexableDomainCount(): Promise<number> {
  try {
    const res = await fetch(`${getApiInternalUrl()}/api/v2/domains/indexable-count`, {
      next: { revalidate: 300 }, // 5 minutes - sitemap should update reasonably quickly
    });

    if (!res.ok) return 0;

    const { count } = await res.json();
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Fetches indexable domains for sitemap (paginated).
 */
export async function fetchIndexableDomains(
  offset: number,
  limit: number
): Promise<Array<{ domain: string; scannedAt?: string }>> {
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/domains/indexable?offset=${offset}&limit=${limit}`,
      { next: { revalidate: 300 } } // 5 minutes - matches count endpoint
    );

    if (!res.ok) return [];

    const { domains } = await res.json();
    return domains || [];
  } catch {
    return [];
  }
}

// ============================================================================
// Client-Side API Functions (for Home page, Scan page)
// ============================================================================

/**
 * Custom error type with HTTP status code
 */
export interface HttpError extends Error {
  status?: number;
}

/**
 * Start a privacy scan for a given URL (client-side)
 */
export interface ScanResponse {
  scanId: string;
  slug: string;
  statusUrl: string;
  resultsUrl: string;
}

/**
 * Rate limit error response from the API
 */
export interface RateLimitErrorResponse {
  type: 'rate_limit_exceeded';
  title: string;
  status: 429;
  detail: string;
  retryAfterSeconds?: number;
  scansUsed?: number;
  scansRemaining?: number;
  resetAt?: string;
}

/**
 * Custom error class that preserves the full API error response
 */
export class ScanError extends Error {
  public readonly status: number;
  public readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = 'ScanError';
    this.status = status;
    this.response = response;
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.status === 429;
  }

  /**
   * Get the rate limit error response if applicable
   */
  getRateLimitError(): RateLimitErrorResponse | null {
    if (!this.isRateLimitError()) return null;
    const res = this.response as Record<string, unknown>;
    if (res?.type === 'rate_limit_exceeded') {
      return this.response as RateLimitErrorResponse;
    }
    return null;
  }
}

export async function startScan(url: string, turnstileToken?: string): Promise<ScanResponse> {
  const response = await fetch('/api/v2/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      ...(turnstileToken && { turnstileToken }),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new ScanError(
      errorBody.detail || 'Failed to start scan',
      response.status,
      errorBody
    );
  }

  return response.json();
}

/**
 * Scan status response (client-side)
 */
export interface ScanStatus {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  slug?: string;
  error?: string;
}

/**
 * Get the status of a scan (client-side)
 */
export async function getScanStatus(scanId: string): Promise<ScanStatus> {
  const response = await fetch(`/api/scan/${scanId}/status`, {
    headers: {
      'Cache-Control': 'no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      const error = new Error('Rate limit exceeded') as HttpError;
      error.status = 429;
      throw error;
    }
    throw new Error('Scan not found');
  }

  return response.json();
}

/**
 * Get recent reports for the homepage (client-side)
 */
export interface RecentReport {
  slug: string;
  score: number;
  label: string;
  domain: string;
  createdAt: string;
  evidenceCount?: number;
}

export interface RecentReportsResponse {
  items: RecentReport[];
}

export async function getRecentReports(): Promise<RecentReportsResponse> {
  const response = await fetch('/api/reports/recent');

  if (!response.ok) {
    throw new Error('Failed to load recent reports');
  }

  return response.json();
}

/**
 * Get stats for the homepage (client-side)
 */
export interface StatsResponse {
  totalScans: number;
}

export async function getStats(): Promise<StatsResponse> {
  const response = await fetch('/api/stats');

  if (!response.ok) {
    throw new Error('Failed to load stats');
  }

  return response.json();
}

// =============================================================================
// Context API - Contextual interpretations for reports
// =============================================================================

/**
 * Unusual finding from context analysis
 */
export interface UnusualFinding {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  prevalence: number;
  prevalenceLabel: string;
  learnMoreSlug?: string;
}

/**
 * Category interpretation
 */
export interface Interpretation {
  category: 'tracking' | 'security' | 'cookies' | 'thirdparty' | 'compliance';
  label: string;
  score: number;
  context: string;
}

/**
 * Prevalence statistics
 */
export interface PrevalenceStats {
  fingerprintingRate: number;
  excessiveTrackerRate: number;
  highAdRatioRate: number;
  httpOnlyRate: number;
}

/**
 * Context data for a domain report
 */
export interface ContextData {
  percentile: number;
  percentileLabel: string;
  positionLabel: string;
  unusualFindings: UnusualFinding[];
  interpretations: Interpretation[];
  prevalenceStats: PrevalenceStats;
}

/**
 * Full context response
 */
export interface ContextResponse {
  domain: string;
  score: number;
  label: string;
  context: ContextData;
}

/**
 * Fetch contextual data for a domain
 */
export async function fetchContext(domain: string): Promise<ContextResponse | null> {
  try {
    const response = await fetch(`/api/v2/context/${encodeURIComponent(domain)}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch context');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching context:', error);
    return null;
  }
}

// =============================================================================
// Comparison API - Domain vs domain comparisons
// =============================================================================

/**
 * Summary of a domain for comparison
 */
export interface DomainSummary {
  domain: string;
  score: number;
  label: string;
  trackerCount: number;
  cookieCount: number;
  thirdPartyCount: number;
  hasFingerprinting: boolean;
  percentile: number;
  percentileLabel: string;
  lastScanned: string;
}

/**
 * Difference between domains
 */
export interface ComparisonDiff {
  metric: string;
  label: string;
  valueA: string | number | boolean;
  valueB: string | number | boolean;
  winner: 'A' | 'B' | 'tie';
  significance: 'low' | 'medium' | 'high';
  explanation: string;
}

/**
 * Full comparison response
 */
export interface DomainComparison {
  domainA: DomainSummary;
  domainB: DomainSummary;
  differences: ComparisonDiff[];
  winner: 'A' | 'B' | 'tie';
  summary: string;
  commonTrackers: string[];
  uniqueToA: string[];
  uniqueToB: string[];
}

/**
 * Compare two domains
 */
export async function fetchComparison(domainA: string, domainB: string): Promise<DomainComparison | null> {
  try {
    const response = await fetch(
      `/api/v2/compare/${encodeURIComponent(domainA)}/${encodeURIComponent(domainB)}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch comparison');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching comparison:', error);
    return null;
  }
}

/**
 * Suggested comparison for a domain
 */
export interface SuggestedComparison {
  domain: string;
  reason: string;
  score?: number;
  label?: string;
}

/**
 * Get suggested domains to compare with
 */
export async function fetchSuggestions(domain: string): Promise<SuggestedComparison[]> {
  try {
    const response = await fetch(`/api/v2/suggestions/${encodeURIComponent(domain)}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

// =============================================================================
// Benchmarks API - Global statistics
// =============================================================================

/**
 * Global benchmarks response
 */
export interface BenchmarksResponse {
  totalDomainsScanned: number;
  scoreDistribution: Array<{ bucket: string; count: number; percentage: number }>;
  averageScore: number;
  averageTrackerCount: number;
  averageCookieCount: number;
  prevalence: PrevalenceStats;
  lastUpdated: string;
}

/**
 * Fetch global benchmarks
 */
export async function fetchBenchmarks(): Promise<BenchmarksResponse | null> {
  try {
    const response = await fetch('/api/v2/benchmarks');

    if (!response.ok) {
      throw new Error('Failed to fetch benchmarks');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    return null;
  }
}

// =============================================================================
// Journey Tracking API - User engagement analytics
// =============================================================================

/**
 * Journey event for tracking
 */
export interface JourneyEvent {
  type: 'page_view' | 'scroll' | 'interaction' | 'search' | 'navigation' | 'tab_switch' | 'expand' | 'share';
  page: string;
  sessionId: string;
  timestamp: number;
  data?: {
    scrollDepth?: number;
    targetPage?: string;
    timeOnPage?: number;
    element?: string;
    searchQuery?: string;
    referrer?: string;
  };
}

/**
 * Track journey events (fire-and-forget)
 * Uses sendBeacon for reliability on page unload
 */
export function trackJourneyEvent(event: JourneyEvent): void {
  try {
    const url = '/api/v2/track/journey';
    const body = JSON.stringify(event);

    // Use sendBeacon if available (more reliable on page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      // Fall back to fetch
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true, // Allow request to complete after page unload
      }).catch(() => {
        // Silently ignore errors - fire-and-forget
      });
    }
  } catch {
    // Silently ignore errors - fire-and-forget
  }
}

/**
 * Track multiple journey events (batch)
 */
export function trackJourneyEvents(events: JourneyEvent[]): void {
  try {
    const url = '/api/v2/track/journey';
    const body = JSON.stringify({ events });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silently ignore
  }
}

// =============================================================================
// Changes API - Domain change history
// =============================================================================

/**
 * Type for change type classification
 */
export type ChangeType = 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';

/**
 * Domain change record
 */
export interface DomainChange {
  id: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  trackerCountBefore: number;
  trackerCountAfter: number;
  trackersAdded: string[];
  trackersRemoved: string[];
  fingerprintingBefore: boolean;
  fingerprintingAfter: boolean;
  fingerprintingChanged: boolean;
  changeType: ChangeType;
  significanceScore: number;
  changeReasons: string[];
  detectedAt: string;
}

/**
 * Recent change with domain info
 */
export interface RecentChange extends DomainChange {
  domain: string;
}

/**
 * Response from domain changes endpoint
 */
export interface DomainChangesResponse {
  domain: string;
  changes: DomainChange[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

/**
 * Response from recent changes endpoint
 */
export interface RecentChangesResponse {
  changes: RecentChange[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

/**
 * Change statistics
 */
export interface ChangeStats {
  period: {
    days: number;
    since: string;
  };
  stats: {
    totalChanges: number;
    domainsWithChanges: number;
    avgScoreDelta: number;
    byType: Record<ChangeType, number>;
  };
}

/**
 * Options for fetching domain changes
 */
export interface FetchChangesOptions {
  limit?: number;
  offset?: number;
  types?: ChangeType[];
  minSignificance?: number;
  revalidate?: number;
}

/**
 * Fetch changes for a specific domain (SSR)
 */
export async function fetchDomainChanges(
  domain: string,
  options: FetchChangesOptions = {}
): Promise<DomainChangesResponse | null> {
  const { limit = 10, offset = 0, types, minSignificance, revalidate = 3600 } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (types && types.length > 0) {
    params.set('types', types.join(','));
  }
  if (minSignificance !== undefined) {
    params.set('minSignificance', String(minSignificance));
  }

  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/changes/domain/${encodeURIComponent(domain)}?${params}`,
      { next: { revalidate } }
    );

    if (!res.ok) {
      if (res.status === 404 || res.status === 410) return null;
      console.error(`Failed to fetch changes for ${domain}: ${res.status}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error(`Error fetching changes for ${domain}:`, error);
    return null;
  }
}

/**
 * Fetch recent changes across all domains (SSR)
 */
export async function fetchRecentChanges(
  options: FetchChangesOptions = {}
): Promise<RecentChangesResponse | null> {
  const { limit = 20, offset = 0, types, minSignificance, revalidate = 300 } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (types && types.length > 0) {
    params.set('types', types.join(','));
  }
  if (minSignificance !== undefined) {
    params.set('minSignificance', String(minSignificance));
  }

  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/changes/recent?${params}`,
      { next: { revalidate } }
    );

    if (!res.ok) {
      console.error(`Failed to fetch recent changes: ${res.status}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching recent changes:', error);
    return null;
  }
}

/**
 * Fetch change statistics (SSR)
 */
export async function fetchChangeStats(
  days: number = 30
): Promise<ChangeStats | null> {
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/changes/stats?days=${days}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error(`Failed to fetch change stats: ${res.status}`);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching change stats:', error);
    return null;
  }
}
