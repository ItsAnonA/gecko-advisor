/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { normalizeHostname } from './seo/normalize.js';
import { etldPlusOne } from './utils.js';

/**
 * Normalize a URL or hostname to its effective registrable domain (eTLD+1).
 *
 * This is the canonical domain normalization used by the backend, worker, and
 * scripts. It strips protocol, www, paths, query params, fragments, and ports,
 * then reduces to the registrable domain via {@link etldPlusOne}.
 *
 * Examples:
 *   - "https://www.example.com/path" -> "example.com"
 *   - "subdomain.example.co.uk" -> "example.co.uk"
 *   - "example.com" -> "example.com"
 *   - "com.br" -> "" (bare TLD, invalid)
 *   - "" -> ""
 *   - null / undefined -> ""
 *
 * @param input - Raw URL, hostname, or domain string
 * @returns The registrable domain (eTLD+1), or empty string for invalid inputs
 */
export function normalizeDomain(input: string | null | undefined): string {
  // normalizeHostname handles: null/undefined, trim, lowercase, protocol
  // stripping, www removal, path/query/fragment/port stripping, trailing
  // dots, punycode conversion, and length validation.
  const hostname = normalizeHostname(input);
  if (!hostname) {
    return '';
  }

  // Reduce to registrable domain (eTLD+1).
  // Returns null for bare TLDs like "com.br" or "co.uk".
  const registrable = etldPlusOne(hostname);
  if (registrable) {
    return registrable;
  }

  // Fallback: some valid domains (e.g. httpbin.org) are listed in the
  // Public Suffix List itself, causing psl.get() to return null even though
  // they are real, resolvable hostnames. If the hostname has at least one
  // dot it is likely a valid domain, not a bare TLD like "com".
  if (hostname.includes('.')) {
    return hostname;
  }

  return '';
}
