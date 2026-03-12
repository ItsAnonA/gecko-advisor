/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Answers Sitemap (Phase C1)
 *
 * Lists all curated answer pages.
 * Gated behind SITEMAP_PHASE_C=true env var.
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;

export const dynamic = 'force-dynamic';

function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

export async function GET() {
  let answers: Array<{ slug: string }> = [];

  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/answers`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      answers = data.answers || [];
    }
  } catch (error) {
    console.error('Answers sitemap: failed to fetch:', error);
  }

  const now = new Date().toISOString();

  const urls = answers.map(
    (a) => `  <url>
    <loc>${BASE_URL}/answers/${a.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
  );

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
