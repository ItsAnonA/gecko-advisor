/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Tier 1a Sitemap — Core Pages (Always Present)
 *
 * Contains: homepage, privacy index, authority pages, guide pages,
 * and top 300 quality-tier domains (scanCount >= 3, ordered by scan count).
 *
 * This is the most conservative tier — only pages with the richest
 * narrative content and most scan history.
 *
 * ~312 pages total.
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;

// Force dynamic — sitemap must reflect current data
export const dynamic = 'force-dynamic';

function getApiInternalUrl(): string {
  return process.env.API_INTERNAL_URL || 'http://localhost:5001';
}

interface DomainEntry {
  domain: string;
  lastScannedAt?: string;
}

export async function GET() {
  // Fetch top 300 quality-tier domains from backend
  let domains: DomainEntry[] = [];
  try {
    const res = await fetch(
      `${getApiInternalUrl()}/api/v2/domains/sitemap-tier?tier=1a&limit=300`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      domains = data.domains || [];
    }
  } catch (error) {
    console.error('Tier 1a sitemap: failed to fetch domains:', error);
  }

  const now = new Date().toISOString();

  // Static high-priority pages
  const staticPages = [
    // Authority pages (highest priority — Google uses sitemap ordering as weak signal)
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/privacy-index', priority: '0.9', changefreq: 'weekly' },
    { loc: '/most-tracked-websites', priority: '0.9', changefreq: 'weekly' },
    { loc: '/least-private-websites', priority: '0.9', changefreq: 'weekly' },
    { loc: '/websites-with-most-cookies', priority: '0.9', changefreq: 'weekly' },
    { loc: '/technologies', priority: '0.9', changefreq: 'weekly' },
    { loc: '/api-access', priority: '0.8', changefreq: 'weekly' },
    { loc: '/research', priority: '0.8', changefreq: 'weekly' },
    { loc: '/transparency-reports', priority: '0.8', changefreq: 'weekly' },
    // Discovery pages
    { loc: '/reports', priority: '0.9', changefreq: 'daily' },
    { loc: '/changes', priority: '0.8', changefreq: 'daily' },
    { loc: '/privacy-benchmarks', priority: '0.9', changefreq: 'daily' },
    { loc: '/privacy-scanner', priority: '0.8', changefreq: 'weekly' },
    { loc: '/methodology', priority: '0.7', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.6', changefreq: 'weekly' },
    { loc: '/about', priority: '0.5', changefreq: 'monthly' },
    // Buyer-intent pages
    { loc: '/check-domain-risk', priority: '0.9', changefreq: 'weekly' },
    { loc: '/vendor-domain-due-diligence', priority: '0.8', changefreq: 'monthly' },
    { loc: '/domain-privacy-risk', priority: '0.8', changefreq: 'monthly' },
    { loc: '/how-to-evaluate-domain-security', priority: '0.8', changefreq: 'monthly' },
    { loc: '/gecko-advisor-vs-securityscorecard', priority: '0.8', changefreq: 'monthly' },
    { loc: '/gecko-advisor-vs-builtwith', priority: '0.8', changefreq: 'monthly' },
    { loc: '/gecko-advisor-vs-mozilla-observatory', priority: '0.8', changefreq: 'monthly' },
    { loc: '/third-party-risk-management-guide', priority: '0.8', changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (p) => `  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
${domains
  .map((d) => {
    const lastmod = d.lastScannedAt
      ? new Date(d.lastScannedAt).toISOString()
      : now;
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
