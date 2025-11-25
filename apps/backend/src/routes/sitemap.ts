/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { prisma } from "../prisma.js";
import { logger } from "../logger.js";

export const sitemapRouter = Router();

const BASE_URL = 'https://geckoadvisor.com';
const REPORTS_PER_SITEMAP = 5000; // Google's recommended limit is 50,000 URLs per sitemap

/**
 * Static pages for the sitemap
 */
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/faq', changefreq: 'monthly', priority: '0.8' },
  { path: '/docs', changefreq: 'weekly', priority: '0.7' },
  { path: '/reports', changefreq: 'hourly', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/roadmap', changefreq: 'monthly', priority: '0.6' },
  { path: '/security', changefreq: 'monthly', priority: '0.6' },
  { path: '/legal', changefreq: 'monthly', priority: '0.5' },
  { path: '/compare', changefreq: 'weekly', priority: '0.6' },
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
    // Count total completed public scans
    const totalReports = await prisma.scan.count({
      where: {
        status: 'done',
        isPublic: true,
      },
    });

    // Count total blog posts (using status enum instead of isPublished)
    const totalBlogPosts = await prisma.blogPost.count({
      where: {
        status: 'PUBLISHED',
      },
    }).catch(() => 0); // If blog model doesn't exist, return 0

    const sitemapCount = Math.ceil(totalReports / REPORTS_PER_SITEMAP);
    const now = formatDate(new Date());

    let xml = xmlIndexHeader();

    // Static pages sitemap
    xml += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;

    // Report sitemaps (paginated)
    for (let i = 0; i < sitemapCount; i++) {
      xml += `
  <sitemap>
    <loc>${BASE_URL}/sitemap-reports-${i + 1}.xml</loc>
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
 * Reports sitemap (paginated)
 * GET /sitemap-reports-:page.xml
 */
sitemapRouter.get('/sitemap-reports-:page.xml', async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10) || 1;
    const skip = (page - 1) * REPORTS_PER_SITEMAP;

    const scans = await prisma.scan.findMany({
      where: {
        status: 'done',
        isPublic: true,
      },
      select: {
        slug: true,
        updatedAt: true,
        score: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: REPORTS_PER_SITEMAP,
    });

    if (scans.length === 0) {
      return res.status(404).send('Sitemap page not found');
    }

    let xml = xmlHeader();

    for (const scan of scans) {
      // Higher priority for high-scoring sites (more interesting for users)
      const priority = scan.score && scan.score >= 70 ? '0.7' : '0.6';

      xml += `
  <url>
    <loc>${BASE_URL}/r/${scan.slug}</loc>
    <lastmod>${formatDate(scan.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }

    xml += `\n${xmlFooter()}`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    logger.error({ error, page: req.params.page }, 'Error generating reports sitemap');
    res.status(500).send('Error generating sitemap');
  }
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
    const [totalScans, publicScans, blogPosts] = await Promise.all([
      prisma.scan.count({ where: { status: 'done' } }),
      prisma.scan.count({ where: { status: 'done', isPublic: true } }),
      prisma.blogPost.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    ]);

    res.json({
      indexablePages: STATIC_PAGES.length + publicScans + blogPosts,
      staticPages: STATIC_PAGES.length,
      reportPages: publicScans,
      blogPages: blogPosts,
      totalScans,
      sitemapSegments: Math.ceil(publicScans / REPORTS_PER_SITEMAP),
    });
  } catch (error) {
    logger.error({ error }, 'Error generating SEO stats');
    res.status(500).json({ error: 'Failed to generate SEO stats' });
  }
});
