/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Sitemap Index Route Handler
 *
 * Generates sitemap index pointing to:
 * - Static sitemap (homepage, reports index)
 * - Chunked report sitemaps (10k URLs each)
 *
 * Uses route handler to avoid collision with native sitemap.ts
 */

import { fetchIndexableDomainCount } from '@/lib/api';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;
const URLS_PER_CHUNK = 10000;

// Force dynamic generation - sitemap should always reflect current data
export const dynamic = 'force-dynamic';

export async function GET() {
  // Count indexable domains only (not total)
  const indexableCount = await fetchIndexableDomainCount();
  const chunkCount = Math.max(1, Math.ceil(indexableCount / URLS_PER_CHUNK));

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
${Array.from(
  { length: chunkCount },
  (_, i) => `  <sitemap>
    <loc>${BASE_URL}/sitemap-reports/${i + 1}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
