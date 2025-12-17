/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Next.js Middleware
 *
 * Handles redirect routes with proper X-Robots-Tag headers.
 * This ensures search engines don't index redirect URLs.
 *
 * IMPORTANT: For redirect responses, X-Robots-Tag HTTP header is required
 * because the browser follows the redirect before seeing any HTML/meta tags.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pattern for legacy short slugs (8 alphanumeric chars at root)
const SHORT_SLUG_PATTERN = /^\/([a-zA-Z0-9]{8})$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ==========================================================================
  // 1. Legacy short slug redirect: /ePpVg5Ab → /r/ePpVg5Ab
  // ==========================================================================
  const shortSlugMatch = pathname.match(SHORT_SLUG_PATTERN);
  if (shortSlugMatch) {
    const slug = shortSlugMatch[1];
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match short slugs at root (8 alphanumeric chars)
    '/:path((?:[a-zA-Z0-9]{8}))',
    // Match /privacy-policy exactly (not /privacy-policy/[domain])
    '/privacy-policy',
  ],
};
