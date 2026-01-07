/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Bot Detection Utilities
 *
 * IMPORTANT: Use ONLY for analytics and rate-limiting, NOT for content variation.
 * Serving different content to bots vs humans is considered "cloaking" and
 * violates Google's Webmaster Guidelines.
 *
 * Our architecture serves the same cache-first content to everyone.
 */

const BOT_PATTERNS = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebot', // Facebook
  'ia_archiver', // Alexa
  'linkedinbot',
  'twitterbot',
  'applebot',
  'semrushbot',
  'ahrefsbot',
  'dotbot',
  'mj12bot',
  'seznambot',
  'sogou',
  'exabot',
];

/**
 * Detect if a user agent is a search engine bot.
 *
 * @param userAgent - User-Agent header string
 * @returns true if bot detected, false otherwise
 */
export function isSearchBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
}

/**
 * Get bot name from user agent (for logging/analytics only)
 *
 * @param userAgent - User-Agent header string
 * @returns Bot name or 'unknown' if not a bot
 */
export function getBotName(userAgent: string): string | null {
  const ua = userAgent.toLowerCase();

  for (const pattern of BOT_PATTERNS) {
    if (ua.includes(pattern)) {
      return pattern;
    }
  }

  return null;
}
