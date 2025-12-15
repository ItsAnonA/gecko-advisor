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
  normalizeDomain,
  isValidDomain,
  getIndexTier,
  getPageHeading,
  buildMetaDescription,
  type IndexTier,
  type ScanDataForMetadata,
} from '@gecko-advisor/shared';

// API URLs - MUST be set per environment
const API_INTERNAL = process.env.API_INTERNAL_URL || 'http://localhost:5000';

if (!API_INTERNAL && typeof window === 'undefined') {
  console.warn('API_INTERNAL_URL not set - using localhost fallback');
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
  }>;
  meta?: {
    dataSharing?: string;
    domain?: string;
    trackerCount?: number;
    thirdPartyCount?: number;
    cookieCount?: number;
    tlsGrade?: string;
  };
}

/**
 * Processed report data for SSR pages
 */
export interface ProcessedReportData {
  data: ReportData | null;
  tier: IndexTier;
  heading: string;
  description: string;
  domain: string;
  scanData: ScanDataForMetadata | null;
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

    // Build scan data for SEO utilities
    const scanData: ScanDataForMetadata | null = data
      ? {
          status: data.scan.status,
          score: data.scan.score,
          progress: data.scan.progress,
          finishedAt: data.scan.finishedAt,
          trackerCount: data.meta?.trackerCount,
          thirdPartyCount: data.meta?.thirdPartyCount,
          cookieCount: data.meta?.cookieCount,
          tlsGrade: data.meta?.tlsGrade,
        }
      : null;

    const tier = getIndexTier(scanData);
    const heading = getPageHeading(domain, data?.scan.score);
    const description = buildMetaDescription(scanData, domain);

    return { data, tier, heading, description, domain, scanData };
  }
);

/**
 * Fetches report by domain from backend API.
 */
async function fetchReportByDomain(domain: string): Promise<ReportData | null> {
  try {
    const res = await fetch(`${API_INTERNAL}/api/v2/domain/${encodeURIComponent(domain)}`, {
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
    const res = await fetch(`${API_INTERNAL}/api/v2/report/${slug}`, {
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
      `${API_INTERNAL}/api/v2/reports?page=${page}&limit=${limit}`,
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
 * Fetches count of indexable domains for sitemap.
 */
export async function fetchIndexableDomainCount(): Promise<number> {
  try {
    const res = await fetch(`${API_INTERNAL}/api/v2/domains/indexable-count`, {
      next: { revalidate: 3600 },
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
      `${API_INTERNAL}/api/v2/domains/indexable?offset=${offset}&limit=${limit}`,
      { next: { revalidate: 3600 } }
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
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start scan');
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
