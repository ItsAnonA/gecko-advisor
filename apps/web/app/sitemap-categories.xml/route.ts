/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Categories Sitemap Route Handler (Phase 2B)
 *
 * Contains category hub pages:
 * - /privacy-benchmarks (index)
 * - /privacy-benchmarks/:slug (individual categories)
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';

const BASE_URL = SEO_CONSTANTS.BASE_URL;
const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';

// Force dynamic generation
export const dynamic = 'force-dynamic';

interface Category {
  slug: string;
}

export async function GET() {
  const now = new Date().toISOString();

  // Fetch categories from API
  let categories: Category[] = [];
  try {
    const response = await fetch(`${API_URL}/api/v2/categories`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const data = await response.json();
      categories = data.categories || [];
    }
  } catch {
    // Continue with empty categories on error
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/privacy-benchmarks</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
${categories
  .map(
    (cat) => `  <url>
    <loc>${BASE_URL}/privacy-benchmarks/${cat.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
