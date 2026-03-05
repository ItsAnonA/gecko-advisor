/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Tier 1c Sitemap — Full Quality Tier + Categories + Comparisons
 *
 * Contains: remaining quality-tier domains (scanCount >= 3),
 * category pages, and first 50 curated comparison pages.
 *
 * Submit after >50% of Tier 1a+1b domain pages show as "indexed".
 *
 * ~2,395 pages. Running total: ~3,407 pages.
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;
export const dynamic = 'force-dynamic';

function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

export async function GET() {
  const enabled = process.env.SITEMAP_TIER_1C === 'true';
  if (!enabled) {
    return new Response('Not Found', { status: 404 });
  }

  // Fetch remaining quality-tier domains
  let domains: Array<{ domain: string; lastScannedAt?: string }> = [];
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/domains/sitemap-tier?tier=1c&limit=3000`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      domains = data.domains || [];
    }
  } catch (error) {
    console.error('Tier 1c sitemap: failed to fetch domains:', error);
  }

  // Fetch categories
  let categories: Array<{ slug: string }> = [];
  try {
    const res = await fetch(`${getApiInternalUrl()}/api/v2/categories`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      categories = data.categories || data || [];
    }
  } catch (error) {
    console.error('Tier 1c sitemap: failed to fetch categories:', error);
  }

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${categories
  .map(
    (c) => `  <url>
    <loc>${BASE_URL}/privacy-benchmarks/${c.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
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
