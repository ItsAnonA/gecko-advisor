/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { prisma } from "../prisma.js";
import { logger } from "../logger.js";
import { getIndexedDomains, countIndexedDomains } from "../services/domainService.js";

export const sitemapRouter = Router();

const BASE_URL = 'https://geckoadvisor.com';
const DOMAINS_PER_SITEMAP = 5000; // Google's recommended limit is 50,000 URLs per sitemap

/**
 * Static pages for the sitemap
 * Only include pages that actually exist and should be indexed
 */
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/reports', changefreq: 'hourly', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  // Note: /about, /faq, /roadmap, /security, /legal pages need to be created
  // before adding them back to the sitemap
];

/**
 * Generate XML sitemap header
 */
function xmlHeader(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
}

/**
 * Generate XML sitemap footer
 */
function xmlFooter(): string {
  return `</urlset>`;
}

/**
 * Generate XML sitemap index header
 */
function xmlIndexHeader(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
}

/**
 * Generate XML sitemap index footer
 */
function xmlIndexFooter(): string {
  return `</sitemapindex>`;
}

/**
 * Format date to ISO format for sitemap
 */
function formatDate(date: Date): string {
  const isoString = date.toISOString();
  return isoString.split('T')[0] ?? isoString.substring(0, 10);
}

/**
 * Main sitemap index - references all sub-sitemaps
 * GET /sitemap.xml
 */
sitemapRouter.get('/sitemap.xml', async (_req, res) => {
  try {
    // Count total indexed domains for /privacy-policy/:domain pages
    const totalDomains = await countIndexedDomains(prisma);

    // Count total blog posts (using status enum instead of isPublished)
    const totalBlogPosts = await prisma.blogPost.count({
      where: {
        status: 'PUBLISHED',
      },
    }).catch(() => 0); // If blog model doesn't exist, return 0

    const sitemapCount = Math.ceil(totalDomains / DOMAINS_PER_SITEMAP) || 1;
    const now = formatDate(new Date());

    let xml = xmlIndexHeader();

    // Static pages sitemap
    // Cloudflare Transform Rule rewrites /sitemap* to /api/sitemap*
    xml += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;

    // Domain sitemaps (paginated) - canonical /privacy-policy/:domain URLs
    for (let i = 0; i < sitemapCount; i++) {
      xml += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-domains-${i + 1}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;
    }

    // Blog sitemap (if posts exist)
    if (totalBlogPosts > 0) {
      xml += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-blog.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;
    }

    xml += `\n${xmlIndexFooter()}`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    logger.error({ error }, 'Error generating sitemap index');
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Static pages sitemap
 * GET /sitemap-static.xml
 */
sitemapRouter.get('/sitemap-static.xml', async (_req, res) => {
  try {
    const now = formatDate(new Date());

    let xml = xmlHeader();

    for (const page of STATIC_PAGES) {
      xml += `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    xml += `\n${xmlFooter()}`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(xml);
  } catch (error) {
    logger.error({ error }, 'Error generating static sitemap');
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Domains sitemap (paginated) - canonical /privacy-policy/:domain URLs
 * GET /sitemap-domains-:page.xml
 */
sitemapRouter.get('/sitemap-domains-:page.xml', async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10) || 1;
    const offset = (page - 1) * DOMAINS_PER_SITEMAP;

    const domains = await getIndexedDomains(prisma, {
      limit: DOMAINS_PER_SITEMAP,
      offset,
    });

    if (domains.length === 0) {
      return res.status(404).send('Sitemap page not found');
    }

    let xml = xmlHeader();

    for (const domain of domains) {
      const lastmod = domain.lastScanned
        ? formatDate(domain.lastScanned)
        : formatDate(new Date());

      // Use canonical /privacy-policy/:domain URLs for SEO
      // These are the user-facing URLs that should be indexed
      xml += `
  <url>
    <loc>${BASE_URL}/privacy-policy/${encodeURIComponent(domain.domain)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    xml += `\n${xmlFooter()}`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    logger.error({ error, page: req.params.page }, 'Error generating domains sitemap');
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Legacy reports sitemap redirect (for backwards compatibility)
 * GET /sitemap-reports-:page.xml -> redirects to domains sitemap
 */
sitemapRouter.get('/sitemap-reports-:page.xml', async (req, res) => {
  const page = req.params.page;
  res.redirect(301, `/sitemap-domains-${page}.xml`);
});

/**
 * Blog posts sitemap
 * GET /sitemap-blog.xml
 */
sitemapRouter.get('/sitemap-blog.xml', async (_req, res) => {
  try {
    // Try to fetch blog posts - handle case where BlogPost model might not exist
    let posts: Array<{ slug: string; updatedAt: Date }> = [];
    try {
      posts = await prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      });
    } catch {
      // BlogPost model might not exist in some deployments
      logger.debug('BlogPost model not available for sitemap');
    }

    let xml = xmlHeader();

    // Blog listing page
    xml += `
  <url>
    <loc>${BASE_URL}/blog</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const post of posts) {
      xml += `
  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${formatDate(post.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    xml += `\n${xmlFooter()}`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    logger.error({ error }, 'Error generating blog sitemap');
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * SEO stats endpoint for monitoring
 * GET /api/seo/stats
 */
sitemapRouter.get('/api/seo/stats', async (_req, res) => {
  try {
    const [totalScans, indexedDomains, blogPosts] = await Promise.all([
      prisma.scan.count({ where: { status: 'done' } }),
      countIndexedDomains(prisma),
      prisma.blogPost.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    ]);

    res.json({
      indexablePages: STATIC_PAGES.length + indexedDomains + blogPosts,
      staticPages: STATIC_PAGES.length,
      domainPages: indexedDomains,
      blogPages: blogPosts,
      totalScans,
      sitemapSegments: Math.ceil(indexedDomains / DOMAINS_PER_SITEMAP) || 1,
    });
  } catch (error) {
    logger.error({ error }, 'Error generating SEO stats');
    res.status(500).json({ error: 'Failed to generate SEO stats' });
  }
});
