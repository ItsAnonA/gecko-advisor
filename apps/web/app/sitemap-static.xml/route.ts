/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Static Sitemap Route Handler
 *
 * Contains static pages and blog posts.
 */

import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchBlogPosts } from '@/lib/api';

const BASE_URL = SEO_CONSTANTS.BASE_URL;

interface SitemapPage {
  loc: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}

const staticPages: SitemapPage[] = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/reports', priority: '0.9', changefreq: 'daily' },
  { loc: '/changes', priority: '0.8', changefreq: 'daily' },
  { loc: '/privacy-benchmarks', priority: '0.9', changefreq: 'daily' },
  { loc: '/privacy-scanner', priority: '0.8', changefreq: 'weekly' },
  { loc: '/methodology', priority: '0.7', changefreq: 'monthly' },
  { loc: '/faq', priority: '0.6', changefreq: 'weekly' },
  { loc: '/about', priority: '0.5', changefreq: 'monthly' },
  { loc: '/roadmap', priority: '0.5', changefreq: 'weekly' },
  { loc: '/security', priority: '0.5', changefreq: 'monthly' },
  { loc: '/legal', priority: '0.3', changefreq: 'monthly' },
  { loc: '/blog', priority: '0.7', changefreq: 'daily' },
  { loc: '/api-access', priority: '0.9', changefreq: 'weekly' },
  { loc: '/check-domain-risk', priority: '0.9', changefreq: 'weekly' },
  { loc: '/vendor-domain-due-diligence', priority: '0.8', changefreq: 'monthly' },
  { loc: '/domain-privacy-risk', priority: '0.8', changefreq: 'monthly' },
  { loc: '/how-to-evaluate-domain-security', priority: '0.8', changefreq: 'monthly' },
];

export async function GET() {
  // Fetch blog posts for dynamic blog URLs
  let blogPages: SitemapPage[] = [];
  try {
    const data = await fetchBlogPosts(1, 100);
    if (data?.items) {
      blogPages = data.items.map((post) => ({
        loc: `/blog/${post.slug}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: post.publishedAt || undefined,
      }));
    }
  } catch {
    // Blog fetch failed -- static pages still get indexed
  }

  const allPages = [...staticPages, ...blogPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${
      page.lastmod
        ? `\n    <lastmod>${new Date(page.lastmod).toISOString()}</lastmod>`
        : ''
    }
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
