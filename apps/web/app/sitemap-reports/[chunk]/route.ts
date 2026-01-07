/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Chunked Report Sitemap Route Handler
 *
 * Generates sitemap chunks with up to 10k domain report URLs each.
 * Only includes indexable domains (score >= 40, status 'done').
 */

import { fetchIndexableDomains } from '@/lib/api';
import { SEO_CONSTANTS, normalizeDomain } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;
const URLS_PER_CHUNK = 10000;

interface Props {
  params: Promise<{ chunk: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { chunk: chunkParam } = await params;
  const chunk = parseInt(chunkParam, 10);

  if (isNaN(chunk) || chunk < 1) {
    return new Response('Not Found', { status: 404 });
  }

  const offset = (chunk - 1) * URLS_PER_CHUNK;

  // Fetch indexable domains from backend (already filtered)
  let domains: Array<{ domain: string; scannedAt?: string }> = [];
  try {
    domains = await fetchIndexableDomains(offset, URLS_PER_CHUNK);
  } catch (error) {
    console.error('Sitemap fetch error:', error);
    // Return empty sitemap on error (don't crash)
  }

  // Build URL entries with normalized domains
  const entries = domains
    .map((d) => {
      const domain = normalizeDomain(d.domain);
      if (!domain) return null;

      // Validate date if present
      let lastmod = '';
      if (d.scannedAt) {
        const date = new Date(d.scannedAt);
        if (!isNaN(date.getTime())) {
          lastmod = date.toISOString();
        }
      }

      return { domain, lastmod };
    })
    .filter((e): e is { domain: string; lastmod: string } => e !== null);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${BASE_URL}/privacy-report/${e.domain}</loc>
${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ''}    <changefreq>weekly</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
