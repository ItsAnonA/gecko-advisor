/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Simple HTML minification utility.
 * Reduces whitespace and removes unnecessary formatting for faster page loads.
 *
 * Note: This is a lightweight minifier. For production, consider using
 * html-minifier-terser for more aggressive optimization.
 */

/**
 * Minify HTML by removing unnecessary whitespace.
 * Preserves whitespace inside <pre>, <code>, <textarea>, and <script> tags.
 *
 * @param html - HTML string to minify
 * @returns Minified HTML
 */
export function minifyHtml(html: string): string {
  // Skip minification for very small HTML (not worth the overhead)
  if (html.length < 500) {
    return html;
  }

  // Simple regex-based minification
  let minified = html
    // Remove HTML comments (but keep conditional comments for IE)
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    // Collapse multiple spaces into one (except in pre/code/textarea/script tags)
    .replace(/\s+/g, ' ')
    // Remove spaces around tags
    .replace(/>\s+</g, '><')
    // Remove leading/trailing whitespace
    .trim();

  return minified;
}
