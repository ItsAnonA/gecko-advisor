/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
// @ts-expect-error - psl package types don't export correctly with ESM
import psl from 'psl';

/**
 * SEO Domain Normalization Utilities
 *
 * Handles domain normalization and validation for SEO pages.
 * Used by Next.js SSR routes for canonical URL generation.
 */

/**
 * Converts unicode domain labels to punycode (ASCII-compatible encoding).
 * Handles IDN domains like münchen.de → xn--mnchen-3ya.de
 *
 * Uses the URL API which handles punycode conversion automatically.
 *
 * @param domain - Domain that may contain unicode characters
 * @returns ASCII-encoded domain using punycode
 */
function toPunycode(domain: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(domain)) {
    // No non-ASCII characters, return as-is
    return domain;
  }

  try {
    // Use URL API which handles punycode conversion automatically
    const url = new URL(`http://${domain}`);
    return url.hostname;
  } catch {
    // If URL parsing fails, return original
    return domain;
  }
}

/**
 * Normalizes a hostname for consistent URL usage.
 * Unlike {@link normalizeDomain} (in domain.ts), this does NOT reduce
 * to eTLD+1 -- subdomains are preserved.
 *
 * - Converts to lowercase
 * - Removes www. prefix
 * - Removes trailing dots
 * - Trims whitespace
 * - Converts unicode/IDN domains to punycode
 *
 * @param input - Raw domain input
 * @returns Normalized hostname or empty string if invalid
 */
export function normalizeHostname(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
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

  // Convert unicode to punycode
  domain = toPunycode(domain);

  // Validate result
  if (!domain || domain.length === 0 || domain.length > 253) {
    return '';
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
  const tldCheck = parts.slice(-2).join('.');
  const singleTld = parts[parts.length - 1];
  const firstPart = parts[0];

  // Reserved TLDs that should never be indexed
  const reservedTLDs = ['local', 'test', 'example', 'invalid', 'localhost'];
  const reservedCompoundTLDs = ['local', 'localhost.localdomain'];

  if (
    domain === 'localhost' ||
    firstPart === 'localhost' ||
    reservedTLDs.includes(singleTld ?? '') ||
    reservedCompoundTLDs.includes(tldCheck)
  ) {
    return false;
  }

  return true;
}

/**
 * Extracts the registrable domain (eTLD+1) from a hostname using the Public Suffix List.
 *
 * @param hostname - Full hostname
 * @returns eTLD+1 or empty string if invalid/bare TLD
 */
export function getRegistrableDomain(hostname: string): string {
  if (!hostname || typeof hostname !== 'string') {
    return '';
  }

  const normalized = hostname.toLowerCase().trim().replace(/\.+$/, '');
  if (!normalized) {
    return '';
  }

  // Use psl.get() which returns the registrable domain or null for bare TLDs
  const domain = psl.get(normalized);
  return domain ?? '';
}

/**
 * Checks if a string is a public suffix (TLD) rather than a registrable domain.
 * Uses the Public Suffix List for accurate detection.
 *
 * Examples:
 *   - "com" → true (single TLD)
 *   - "co.uk" → true (compound TLD)
 *   - "com.br" → true (compound TLD)
 *   - "example.com" → false (registrable domain)
 *   - "google.co.uk" → false (registrable domain)
 *
 * @param domain - Domain string to check
 * @returns true if domain is a public suffix, false if it's a registrable domain
 */
export function isPublicSuffix(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return true; // Invalid input treated as public suffix
  }

  const normalized = domain.toLowerCase().trim().replace(/\.+$/, '');
  if (!normalized) {
    return true;
  }

  // psl.get() returns null for public suffixes (bare TLDs)
  // If it returns a value, the input is a registrable domain
  const registrable = psl.get(normalized);
  return registrable === null;
}

/**
 * Validates a domain is a proper registrable domain suitable for comparison.
 * Must be a real FQDN, not a TLD or public suffix.
 *
 * @param domain - Domain to validate
 * @returns true if valid for comparison, false otherwise
 */
export function isValidComparableDomain(domain: string): boolean {
  // Must pass basic domain validation
  if (!isValidDomain(domain)) {
    return false;
  }

  // Must not be a public suffix
  if (isPublicSuffix(domain)) {
    return false;
  }

  // Additional checks for meaningful domains
  const parts = domain.split('.');
  const firstPart = parts[0];

  // First label (before TLD) must be at least 2 characters
  // This filters out patterns like "a.com" which are technically valid but suspicious
  if (!firstPart || firstPart.length < 2) {
    return false;
  }

  return true;
}
