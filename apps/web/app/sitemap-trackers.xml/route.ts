/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Tracker Sitemap (Phase C2)
 *
 * Lists all tracker pages for search engine crawling.
 * Gated behind SITEMAP_PHASE_C=true env var.
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;

export const dynamic = 'force-dynamic';

function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

interface TrackerEntry {
  slug: string;
  name: string;
  domainCount: number;
}

export async function GET() {
  let trackers: TrackerEntry[] = [];

  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/trackers?limit=500`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      trackers = data.trackers || [];
    }
  } catch (error) {
    console.error('Tracker sitemap: failed to fetch trackers:', error);
  }

  const now = new Date().toISOString();

  const urls = [
    // Index page
    `  <url>
    <loc>${BASE_URL}/trackers</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    // Individual tracker pages
    ...trackers.map(
      (t) => `  <url>
    <loc>${BASE_URL}/trackers/${t.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
