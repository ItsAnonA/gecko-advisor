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

// Static pages that happen to be 8 characters - exclude from short slug redirect
const STATIC_PAGES_8_CHARS = new Set(['security', 'checkout', 'settings', 'download', 'features', 'contacts', 'products', 'services', 'register', 'messages', 'feedback', 'archives', 'calendar', 'profiles', 'comments', 'articles']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==========================================================================
  // 1. Legacy short slug redirect: /ePpVg5Ab → /r/ePpVg5Ab
  // ==========================================================================
  const shortSlugMatch = pathname.match(SHORT_SLUG_PATTERN);
  if (shortSlugMatch) {
    const slug = shortSlugMatch[1];

    // Don't redirect static pages that happen to be 8 characters
    if (STATIC_PAGES_8_CHARS.has(slug.toLowerCase())) {
      return NextResponse.next();
    }

    const redirectUrl = new URL(`/r/${slug}`, request.url);

    const response = NextResponse.redirect(redirectUrl, 308);
    response.headers.set('X-Robots-Tag', 'noindex');
    return response;
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
  // 3. Blocked domain 410 Gone: /privacy-policy/[blocked-domain] → 410
  // ==========================================================================
  const privacyPolicyMatch = pathname.match(/^\/privacy-policy\/(.+)$/);
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
    // Match short slugs at root (8 alphanumeric chars)
    '/:path((?:[a-zA-Z0-9]{8}))',
    // Match /privacy-policy exactly (for redirect to /reports)
    '/privacy-policy',
    // Match /privacy-policy/[domain] (for blocked domain 410 check)
    '/privacy-policy/:domain*',
  ],
};
