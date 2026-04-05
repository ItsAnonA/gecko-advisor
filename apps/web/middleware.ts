/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Next.js Middleware
 *
 * Handles:
 * 1. Legacy short slug redirects with X-Robots-Tag headers
 * 2. 410 Gone responses for blocked domains (adult content, piracy)
 *
 * IMPORTANT: For redirect responses, X-Robots-Tag HTTP header is required
 * because the browser follows the redirect before seeing any HTML/meta tags.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isBlockedDomain } from '@gecko-advisor/shared';

// Pattern for legacy short slugs (8 alphanumeric chars at root)
const SHORT_SLUG_PATTERN = /^\/([a-zA-Z0-9]{8})$/;

// ==========================================================================
// 410 Gone patterns for garbage URLs (from GSC 5xx drilldown)
// Only add patterns confirmed in GSC - don't guess
// ==========================================================================
const GONE_PATTERNS = [
  /^\/privacy-policy\/.+/, // legacy spam route with path (not bare /privacy-policy)
  /^\/news(?:\/|$)/,
  /^\/methods(?:\/|$)/,
  /^\/cbfourum(?:\/|$)/,
  /^\/index(?:\/|$)/,
  /^\/list(?:\/|$)/,
  /^\/entry(?:\/|$)/,

  // WordPress / CMS probes (GSC 404 cleanup — 5,633 pages)
  /^\/wp-(?:admin|login|content|includes|json)(?:\/|$)/i,
  /^\/admin(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/cgi-bin(?:\/|$)/,
  /^\/phpmyadmin(?:\/|$)/i,
  /^\/(vendor|node_modules)(?:\/|$)/,

  // Credential / config fishing
  /^\/\.env/,
  /^\/\.git(?:\/|$)/,
  /^\/\.well-known\/(?!acme-challenge|change-password|security\.txt)/,

  // File extensions that should never exist
  /\.php$/i,
  /\.html?$/i,
  /\.aspx?$/i,
  /\.asp$/i,
  /\.jsp$/i,
  /\.cgi$/i,
  /\.xml$/i,
];

// Static pages that happen to be 8 characters - exclude from short slug redirect
const STATIC_PAGES_8_CHARS = new Set(['security', 'checkout', 'settings', 'download', 'features', 'contacts', 'products', 'services', 'register', 'messages', 'feedback', 'archives', 'calendar', 'profiles', 'comments', 'articles', 'research']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==========================================================================
  // 0. 410 Gone for garbage URLs (preserves crawl budget)
  // ==========================================================================
  for (const pattern of GONE_PATTERNS) {
    if (pattern.test(pathname)) {
      const res = new NextResponse(null, { status: 410 });
      res.headers.set('Cache-Control', 'public, max-age=86400'); // Cache 410 for 1 day
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
  }

  // ==========================================================================
  // 1. Legacy short slug: /ePpVg5Ab → rewrite to /r/ePpVg5Ab (internal)
  //    The /r/[slug] route handler does the DB lookup and returns a single
  //    301 redirect to /privacy-report/[domain]. Using rewrite (not redirect)
  //    eliminates the 2-hop chain that was wasting crawl budget.
  // ==========================================================================
  const shortSlugMatch = pathname.match(SHORT_SLUG_PATTERN);
  if (shortSlugMatch) {
    const slug = shortSlugMatch[1];

    // Don't rewrite static pages that happen to be 8 characters
    if (STATIC_PAGES_8_CHARS.has(slug.toLowerCase())) {
      return NextResponse.next();
    }

    const rewriteUrl = new URL(`/r/${slug}`, request.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  // ==========================================================================
  // 2. Privacy policy index redirect: /privacy-policy → /reports
  // ==========================================================================
  if (pathname === '/privacy-policy') {
    const redirectUrl = new URL('/reports', request.url);

    const response = NextResponse.redirect(redirectUrl, 308);
    response.headers.set('X-Robots-Tag', 'noindex');
    return response;
  }

  // ==========================================================================
  // 3. Blocked domain 410 Gone: /privacy-report/[blocked-domain] → 410
  // ==========================================================================
  const privacyPolicyMatch = pathname.match(/^\/privacy-report\/(.+)$/);
  if (privacyPolicyMatch) {
    const domain = decodeURIComponent(privacyPolicyMatch[1]);

    if (isBlockedDomain(domain)) {
      // Return 410 Gone for blocked domains (adult content, piracy sites)
      // This tells search engines the content is permanently removed
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>Report Removed | Gecko Advisor</title>
</head>
<body>
  <h1>Report Removed</h1>
  <p>This report has been permanently removed due to content policy.</p>
</body>
</html>`,
        {
          status: 410,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Robots-Tag': 'noindex, nofollow',
            'Cache-Control': 'public, max-age=86400', // Cache 410 for 1 day
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT static assets, api, sitemap, robots
    '/((?!api/|_next/|favicon|robots\\.txt|sitemap|images/|fonts/).*)',
  ],
};
