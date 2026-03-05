/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Sitemap Index Route Handler
 *
 * Tiered sitemap strategy (Phase A SEO Architecture):
 * - sitemap-core-a.xml: Tier 1a — always present (~312 pages: static + top 300 quality domains)
 * - sitemap-core-b.xml: Tier 1b — enabled via SITEMAP_TIER_1B=true (~700 quality domains)
 * - sitemap-core-c.xml: Tier 1c — enabled via SITEMAP_TIER_1C=true (~2,395 remaining quality + categories)
 *
 * Old flat chunk sitemaps (sitemap-reports/N) are preserved for backward
 * compatibility but will be deprecated once tiered system is validated.
 *
 * Decision gates between tiers:
 * - 1a → 1b: GSC shows 1a pages being crawled (~1 week)
 * - 1b → 1c: >50% of 1a+1b domain pages indexed
 * - 1c → Tier 2: >80% of quality-tier pages indexed
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;

// Force dynamic generation - sitemap should always reflect current data
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date().toISOString();

  // Build tiered sitemap list
  const sitemaps: Array<{ loc: string }> = [];

  // Tier 1a — always present
  sitemaps.push({ loc: `${BASE_URL}/sitemap-core-a.xml` });

  // Tier 1b — enabled when ready
  if (process.env.SITEMAP_TIER_1B === 'true') {
    sitemaps.push({ loc: `${BASE_URL}/sitemap-core-b.xml` });
  }

  // Tier 1c — enabled when ready
  if (process.env.SITEMAP_TIER_1C === 'true') {
    sitemaps.push({ loc: `${BASE_URL}/sitemap-core-c.xml` });
  }

  // Phase C — Query-first SEO pages
  if (process.env.SITEMAP_PHASE_C === 'true') {
    sitemaps.push({ loc: `${BASE_URL}/sitemap-trackers.xml` });
    sitemaps.push({ loc: `${BASE_URL}/sitemap-answers.xml` });
    sitemaps.push({ loc: `${BASE_URL}/sitemap-similar.xml` });
    sitemaps.push({ loc: `${BASE_URL}/sitemap-research.xml` });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (s) => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
