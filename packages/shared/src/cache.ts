/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Cache Key Utilities
 *
 * Provides versioned cache keys for safe schema migrations.
 * When the report structure changes, increment REPORT_SCHEMA_VERSION
 * to invalidate old cache entries without manual purging.
 */

import { normalizeHostname as normalizeUtil } from './seo/normalize.js';

// Increment this when report structure changes to invalidate old cache
export const REPORT_SCHEMA_VERSION = 1;

/**
 * Generate a versioned cache key for a domain report.
 *
 * @param domain - Domain to generate key for
 * @returns Cache key in format: "report:{normalized-domain}:v{version}"
 */
export function reportCacheKey(domain: string): string {
  const normalized = normalizeUtil(domain);
  return `report:${normalized}:v${REPORT_SCHEMA_VERSION}`;
}
