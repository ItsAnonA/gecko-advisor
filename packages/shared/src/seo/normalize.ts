/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * SEO Domain Normalization Utilities
 *
 * Handles domain normalization and validation for SEO pages.
 * Used by Next.js SSR routes for canonical URL generation.
 */

/**
 * Normalizes a domain for consistent URL usage.
 * - Converts to lowercase
 * - Removes www. prefix
 * - Removes trailing dots
 * - Trims whitespace
 *
 * @param input - Raw domain input
 * @returns Normalized domain or null if invalid
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  let domain = input.trim().toLowerCase();

  // Remove protocol if present
  domain = domain.replace(/^(https?:\/\/)/i, '');

  // Remove www. prefix
  domain = domain.replace(/^www\./i, '');

  // Remove path, query, fragment
  const pathParts = domain.split('/');
  domain = pathParts[0] ?? domain;
  const queryParts = domain.split('?');
  domain = queryParts[0] ?? domain;
  const fragmentParts = domain.split('#');
  domain = fragmentParts[0] ?? domain;

  // Remove port
  const portParts = domain.split(':');
  domain = portParts[0] ?? domain;

  // Remove trailing dots
  domain = domain.replace(/\.+$/, '');

  // Validate result
  if (!domain || domain.length === 0 || domain.length > 253) {
    return null;
  }

  return domain;
}

/**
 * Validates a domain has proper format for SEO indexing.
 * - Must have at least one dot (TLD)
 * - TLD must be at least 2 characters
 * - Only alphanumeric characters, dots, and hyphens
 * - Cannot start or end with hyphen/dot in labels
 *
 * @param domain - Domain to validate (should be pre-normalized)
 * @returns true if domain is valid for indexing
 */
export function isValidDomain(domain: string | null | undefined): domain is string {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Basic format check
  if (!/^[a-z0-9.-]+$/i.test(domain)) {
    return false;
  }

  // Must have at least one dot
  const parts = domain.split('.');
  if (parts.length < 2) {
    return false;
  }

  // TLD must be at least 2 characters
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2) {
    return false;
  }

  // Each label must be valid
  for (const part of parts) {
    if (!part || part.length === 0) {
      return false; // Empty label (e.g., "example..com")
    }
    if (part.startsWith('-') || part.endsWith('-')) {
      return false; // Label starts/ends with hyphen
    }
    if (part.length > 63) {
      return false; // Label too long
    }
  }

  // Check for private/local domains that shouldn't be indexed
  const firstPart = parts[0];
  if (
    domain === 'localhost' ||
    firstPart === 'localhost' ||
    domain.includes('.local') ||
    domain.includes('.test') ||
    domain.includes('.example') ||
    domain.includes('.invalid')
  ) {
    return false;
  }

  return true;
}

/**
 * Extracts the registrable domain (eTLD+1) from a hostname.
 * Handles common compound TLDs like .co.uk
 *
 * @param hostname - Full hostname
 * @returns eTLD+1 or the original hostname
 */
export function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;

  // Handle common compound TLDs
  const lastTwo = parts.slice(-2).join('.');
  const compoundTLDs = [
    'co.uk',
    'org.uk',
    'me.uk',
    'ac.uk',
    'gov.uk',
    'co.jp',
    'co.nz',
    'co.za',
    'com.au',
    'org.au',
    'com.br',
  ];

  if (compoundTLDs.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}
