/**
 * Transparency Reports - Fetch Functions & Types
 *
 * ISR revalidation. Graceful null returns for missing data.
 */

import { cache } from 'react';

// ---------- Types ----------

export interface MetricsSnapshotV1 {
  schemaVersion: 'MetricsSnapshotV1';
  accuracy: number | null;
  predictions: number;
  validated: number;
  invalidated: number;
  retractions: number;
  byType: Record<
    string,
    {
      predictions: number;
      validated: number;
      invalidated: number;
      accuracy: number | null;
    }
  >;
  freeze: {
    overallFrozen: boolean;
    frozenTypes: string[];
  };
  dataVintage: string;
  queryTimestamp: string;
  scoringVersion: string;
  calibrationVersion: string;
}

export type TransparencyReportStatus = 'DRAFT' | 'PUBLISHED' | 'UPDATED';

export interface TransparencyReportSummary {
  id: string;
  slug: string;
  title: string;
  status: TransparencyReportStatus;
  scheduledFor: string;
  publishedAt: string | null;
  autoPublished: boolean;
  keyFinding: string | null;
  revisionNote: string | null;
  quotables: string[];
  createdAt: string;
}

export interface TransparencyReport extends TransparencyReportSummary {
  metricsSnapshot: MetricsSnapshotV1;
  content: string;
  methodologySnapshot: unknown;
  updatedAt: string;
}

// ---------- Fetch ----------

function getApiUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

/**
 * Fetch all transparency reports for archive page.
 * ISR: revalidate every 60 seconds.
 */
export const getAllTransparencyReports = cache(
  async (): Promise<TransparencyReportSummary[]> => {
    try {
      const res = await fetch(`${getApiUrl()}/api/v2/transparency/reports`, {
        next: { revalidate: 60 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.items ?? [];
    } catch {
      return [];
    }
  },
);

/**
 * Fetch a single transparency report by slug.
 * ISR: revalidate every 60 seconds.
 */
export const getTransparencyReport = cache(
  async (slug: string): Promise<TransparencyReport | null> => {
    try {
      const res = await fetch(
        `${getApiUrl()}/api/v2/transparency/reports/${encodeURIComponent(slug)}`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
);

// ---------- Helpers ----------

/** Fixed start month for archive generation */
const ARCHIVE_START_YEAR = 2026;
const ARCHIVE_START_MONTH = 2; // February 2026

/**
 * Generate deterministic month list from fixed start (2026-02) to current month.
 * Each month entry is a slug like "2026-02", "2026-03", etc.
 */
export function generateMonthList(): string[] {
  const now = new Date();
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth() + 1; // 1-indexed

  const months: string[] = [];
  let year = ARCHIVE_START_YEAR;
  let month = ARCHIVE_START_MONTH;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

/**
 * Format a slug "2026-02" to display name "February 2026".
 */
export function formatSlugAsMonth(slug: string): string {
  const [yearStr, monthStr] = slug.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
