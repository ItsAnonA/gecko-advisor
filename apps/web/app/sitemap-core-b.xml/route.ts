/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Tier 1b Sitemap — Quality Tier Expansion
 *
 * Contains next 700 quality-tier domains (scanCount >= 3, ordered by scan count).
 * Submit after GSC confirms Tier 1a pages are being crawled.
 *
 * ~700 pages. Running total with 1a: ~1,012 pages.
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;
export const dynamic = 'force-dynamic';

function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

export async function GET() {
  // Check if this tier is enabled
  const enabled = process.env.SITEMAP_TIER_1B === 'true';
  if (!enabled) {
    return new Response('Not Found', { status: 404 });
  }

  let domains: Array<{ domain: string; lastScannedAt?: string }> = [];
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/domains/sitemap-tier?tier=1b&limit=700`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      domains = data.domains || [];
    }
  } catch (error) {
    console.error('Tier 1b sitemap: failed to fetch domains:', error);
  }

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${domains
  .map((d) => {
    const lastmod = d.lastScannedAt ? new Date(d.lastScannedAt).toISOString() : now;
    return `  <url>
    <loc>${BASE_URL}/privacy-report/${d.domain}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
