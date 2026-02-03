/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
// eslint-disable-next-line @typescript-eslint/no-require-imports
const psl = require('psl') as { get: (hostname: string) => string | null };
import type { ScoreLabel } from './types.js';
/**
 * Safely normalizes a URL input with proper validation to prevent SSRF attacks.
 * Only allows http and https protocols and validates hostname format.
 */
export function normalizeUrl(input: string): URL {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid URL input: must be a non-empty string');
  }

  // Trim and validate basic format
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0 || trimmedInput.length > 2048) {
    throw new Error('Invalid URL input: empty or too long');
  }

  // Prevent dangerous protocols by checking for common bypass patterns
  const lowerInput = trimmedInput.toLowerCase();
  if (lowerInput.includes('javascript:') || lowerInput.includes('data:') ||
      lowerInput.includes('file:') || lowerInput.includes('ftp:') ||
      lowerInput.includes('mailto:') || lowerInput.includes('tel:')) {
    throw new Error('Invalid URL: dangerous protocol detected');
  }

  let url: URL;

  // First try to parse as-is
  try {
    url = new URL(trimmedInput);
  } catch {
    // Only if parsing fails, try adding HTTPS prefix and fall back to HTTP if needed
    // But first validate the input doesn't contain protocol separators that could be bypassed
    if (trimmedInput.includes('://') || trimmedInput.startsWith('//')) {
      throw new Error('Invalid URL format');
    }

    try {
      url = new URL(`https://${trimmedInput}`);
    } catch {
      try {
        url = new URL(`http://${trimmedInput}`);
      } catch {
        throw new Error('Invalid URL format');
      }
    }
  }

  // Strict protocol validation
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Invalid protocol: only http and https are allowed');
  }

  // Validate hostname format and prevent dangerous patterns
  if (!url.hostname || url.hostname.length === 0) {
    throw new Error('Invalid hostname: empty hostname not allowed');
  }

  // Prevent localhost and private network access for security
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') ||
      hostname.includes('..')) {
    throw new Error('Invalid hostname: private networks not allowed');
  }

  // Basic hostname format validation
  if (!/^[a-z0-9.-]+$/i.test(hostname) || hostname.includes('..')) {
    throw new Error('Invalid hostname format');
  }

  // Validate proper domain format with TLD
  // Must have: at least one dot, something before and after the dot, TLD at least 2 chars
  // Rejects: "example", "example.", ".com", "test.", "google."
  const parts = hostname.split('.');
  const tld = parts[parts.length - 1];
  const firstPart = parts[0];

  if (parts.length < 2 || !tld || tld.length < 2 || !firstPart || firstPart.length === 0) {
    throw new Error('Invalid hostname: must include a valid domain extension (e.g., .com, .org)');
  }

  // Normalize the URL
  url.hash = '';
  url.hostname = hostname;

  // Normalize default ports
  if ((url.protocol === 'http:' && url.port === '80') ||
      (url.protocol === 'https:' && url.port === '443')) {
    url.port = '';
  }

  // Ensure pathname exists
  if (!url.pathname || url.pathname === '') {
    url.pathname = '/';
  }

  return url;
}

/**
 * Extract the registrable domain (eTLD+1) from a hostname using the Public Suffix List.
 *
 * Examples:
 *   - "www.example.com" → "example.com"
 *   - "sub.example.co.uk" → "example.co.uk"
 *   - "site.com.br" → "site.com.br"
 *   - "com.br" → null (bare TLD, invalid)
 *   - "example.com" → "example.com"
 *
 * @param hostname - The hostname to parse (must NOT include protocol, port, or path)
 * @returns The registrable domain (eTLD+1), or null if the input is invalid or a bare TLD
 */
export function etldPlusOne(hostname: string): string | null {
  if (!hostname || typeof hostname !== 'string') {
    return null;
  }

  // Normalize: lowercase and remove any trailing dots
  const normalized = hostname.toLowerCase().trim().replace(/\.+$/, '');

  if (!normalized || normalized.length === 0) {
    return null;
  }

  // Use psl.get() which returns the registrable domain or null
  // psl.get() returns null for:
  // - Bare TLDs (e.g., "com", "co.uk", "com.br")
  // - Invalid domains
  // - Listed public suffixes without a registrable part
  const domain = psl.get(normalized);

  // psl.get() returns null for bare TLDs and invalid inputs
  if (!domain) {
    return null;
  }

  return domain;
}

export function labelForScore(score: number): ScoreLabel {
  if (score >= 80) return 'Low Privacy Risk';
  if (score >= 60) return 'Moderate Privacy Risk';
  if (score >= 40) return 'High Privacy Risk';
  return 'Critical Privacy Risk';
}

export function issueSeverityWeight(severity: 'info' | 'low' | 'medium' | 'high' | 'critical'): number {
  switch (severity) {
    case 'critical':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    default:
      return 1;
  }
}

