/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Research Reports Sitemap (Phase D)
 *
 * Lists all research report pages.
 * Gated behind SITEMAP_PHASE_C=true env var (same gate as Phase C).
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;

export const dynamic = 'force-dynamic';

function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

export async function GET() {
  let reports: Array<{ slug: string }> = [];

  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/research`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      reports = data.reports || [];
    }
  } catch (error) {
    console.error('Research sitemap: failed to fetch:', error);
  }

  const now = new Date().toISOString();

  const urls = [
    `  <url>
    <loc>${BASE_URL}/research</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
    ...reports.map(
      (r) => `  <url>
    <loc>${BASE_URL}/research/${r.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
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
