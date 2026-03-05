/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Tracker Slug Utilities (Phase C2)
 *
 * Converts tracker names (e.g., "Google Analytics") to URL-safe slugs
 * and back. Used for /trackers/:slug routes.
 */

/**
 * Convert a tracker name to a URL-safe slug.
 * "Google Analytics" → "google-analytics"
 * "Meta Pixel (Facebook)" → "meta-pixel-facebook"
 */
export function slugifyTracker(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()[\]]/g, '') // remove parens/brackets
    .replace(/[^a-z0-9]+/g, '-') // non-alphanum → dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Convert a slug back to a display-friendly title (best-effort).
 * "google-analytics" → "Google Analytics"
 */
export function unslugifyTracker(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
