/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * HTML Escape Utility
 *
 * Prevents XSS attacks by escaping HTML special characters.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters to prevent XSS.
 *
 * @param text - Text to escape
 * @returns Escaped text safe for HTML insertion
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}
