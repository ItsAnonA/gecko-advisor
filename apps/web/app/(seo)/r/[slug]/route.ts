/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Slug Redirect Route Handler
 *
 * Redirects short URLs (/r/:slug) to canonical domain URLs.
 * Uses 308 Permanent Redirect with X-Robots-Tag header for SEO.
 *
 * CRITICAL: X-Robots-Tag header prevents search engines from indexing
 * the redirect URL itself - only the canonical destination should be indexed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchReportBySlug } from '@/lib/api';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json(
      { error: 'Invalid slug' },
      { status: 400 }
    );
  }

  try {
    const report = await fetchReportBySlug(slug);

    if (!report || !report.domain) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Build canonical URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://geckoadvisor.com';
    const canonicalUrl = `${baseUrl}/privacy-policy/${report.domain}`;

    // 301 Permanent Redirect with X-Robots-Tag (standard SEO practice)
    const response = NextResponse.redirect(canonicalUrl, 301);
    response.headers.set('X-Robots-Tag', 'noindex');

    return response;
  } catch (error) {
    console.error('Error fetching report for slug redirect:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
