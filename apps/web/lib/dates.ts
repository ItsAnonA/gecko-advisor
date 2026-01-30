/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Date formatting utilities for freshness signals
 *
 * Provides human-readable date formatting and freshness indicators
 * for scan timestamps across the application.
 */

/**
 * Format a date as a readable string (e.g., "January 15, 2025")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date as relative time (e.g., "3 days ago", "2 weeks ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 14) {
    return '1 week ago';
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks ago`;
  } else if (diffDays < 60) {
    return '1 month ago';
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
}

/**
 * Check if a date is older than a specified number of days
 */
export function isOlderThan(date: Date | string, days: number): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

/**
 * Freshness thresholds in days
 */
const FRESHNESS_THRESHOLDS = {
  FRESH: 7,      // < 7 days = fresh
  RECENT: 30,    // < 30 days = recent
  STALE: 90,     // < 90 days = stale
  // > 90 days = outdated
};

/**
 * Freshness label with color and rescan CTA indicator
 */
export interface FreshnessInfo {
  label: string;
  color: 'emerald' | 'sky' | 'amber' | 'red';
  showRescanCTA: boolean;
}

/**
 * Get freshness label based on scan age
 *
 * @param date - The scan date
 * @returns Freshness info with label, color, and whether to show rescan CTA
 */
export function getFreshnessLabel(date: Date | string): FreshnessInfo {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < FRESHNESS_THRESHOLDS.FRESH) {
    return {
      label: 'Fresh',
      color: 'emerald',
      showRescanCTA: false,
    };
  } else if (diffDays < FRESHNESS_THRESHOLDS.RECENT) {
    return {
      label: 'Recent',
      color: 'sky',
      showRescanCTA: false,
    };
  } else if (diffDays < FRESHNESS_THRESHOLDS.STALE) {
    return {
      label: 'May be outdated',
      color: 'amber',
      showRescanCTA: true,
    };
  } else {
    return {
      label: 'Outdated',
      color: 'red',
      showRescanCTA: true,
    };
  }
}

/**
 * Format date for display with freshness context
 * Returns both the formatted date and relative time
 */
export function formatDateWithFreshness(date: Date | string): {
  formatted: string;
  relative: string;
  freshness: FreshnessInfo;
} {
  return {
    formatted: formatDate(date),
    relative: formatRelativeTime(date),
    freshness: getFreshnessLabel(date),
  };
}
