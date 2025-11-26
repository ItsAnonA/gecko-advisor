/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { prisma } from "../prisma.js";
import { logger } from "../logger.js";

export const ssrBlogRouter = Router();

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert markdown-like content to basic HTML
 * (Simple conversion for SEO - full markdown parsing happens client-side)
 */
function markdownToHtml(content: string): string {
  return content
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks and paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

/**
 * Generate full HTML page for blog post
 */
function generateBlogHtml(post: {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: Date | null;
  readTimeMinutes: number;
  slug: string;
}): string {
  const title = escapeHtml(post.metaTitle || post.title);
  const description = escapeHtml(post.metaDescription || post.excerpt);
  const url = `https://geckoadvisor.com/blog/${post.slug}`;
  const coverImage = post.coverImage || 'https://geckoadvisor.com/og-image.png';
  const publishedDate = post.publishedAt?.toISOString() || new Date().toISOString();

  // Convert content to HTML
  const htmlContent = markdownToHtml(escapeHtml(post.content));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${title} | Gecko Advisor Blog</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${coverImage}">
  <meta property="og:site_name" content="Gecko Advisor">
  <meta property="article:published_time" content="${publishedDate}">
  <meta property="article:author" content="Privacy Gecko Team">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${coverImage}">
  <meta name="twitter:site" content="@PrivacyGecko">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${title}",
    "description": "${description}",
    "image": "${coverImage}",
    "datePublished": "${publishedDate}",
    "author": {
      "@type": "Organization",
      "name": "Privacy Gecko",
      "url": "https://geckoadvisor.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Gecko Advisor",
      "logo": {
        "@type": "ImageObject",
        "url": "https://geckoadvisor.com/images/GeckoAdvisor_Logo.webp"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${url}"
    }
  }
  </script>

  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_500x500.png">

  <style>
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #1f2937;
      background: #fff;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #111827; }
    h2 { font-size: 1.75rem; margin-top: 2rem; color: #1f2937; }
    h3 { font-size: 1.25rem; margin-top: 1.5rem; color: #374151; }
    p { margin: 1rem 0; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .cover-image { width: 100%; margin-bottom: 2rem; }
    .content { margin-top: 2rem; }
    a { color: #2ecc71; }
    .back-link { display: inline-block; margin-bottom: 1rem; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <a href="/blog" class="back-link">← Back to Blog</a>

  <article>
    <h1>${escapeHtml(post.title)}</h1>
    <div class="meta">
      ${post.readTimeMinutes} min read • ${post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently published'}
    </div>

    ${post.coverImage ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" class="cover-image">` : ''}

    <p><strong>${escapeHtml(post.excerpt)}</strong></p>

    <div class="content">
      <p>${htmlContent}</p>
    </div>
  </article>

  <script>
    // Redirect to SPA for full experience if JavaScript is enabled
    if (window.history && window.history.replaceState) {
      // User has JS - they'll get the full React experience on next navigation
      // Keep them on this page if they came directly (SEO/sharing)
    }
  </script>
</body>
</html>`;
}

/**
 * Generate blog listing page HTML
 */
function generateBlogListHtml(posts: Array<{
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: Date | null;
  readTimeMinutes: number;
}>): string {
  const postsHtml = posts.map(post => `
    <article style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #e5e7eb;">
      <a href="/blog/${escapeHtml(post.slug)}" style="text-decoration: none; color: inherit;">
        ${post.coverImage ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` : ''}
        <h2 style="margin: 0 0 0.5rem 0;">${escapeHtml(post.title)}</h2>
        <p style="color: #6b7280; font-size: 0.875rem; margin: 0 0 0.5rem 0;">
          ${post.readTimeMinutes} min read • ${post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently published'}
        </p>
        <p style="color: #4b5563; margin: 0;">${escapeHtml(post.excerpt)}</p>
      </a>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Blog | Gecko Advisor - Privacy Insights & Guides</title>
  <meta name="description" content="Expert guides on online privacy, tracker detection, and protecting your digital footprint. Learn how websites track you and how to stay safe.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://geckoadvisor.com/blog">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://geckoadvisor.com/blog">
  <meta property="og:title" content="Gecko Advisor Blog - Privacy Insights & Guides">
  <meta property="og:description" content="Expert guides on online privacy, tracker detection, and protecting your digital footprint.">
  <meta property="og:image" content="https://geckoadvisor.com/og-image.png">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Gecko Advisor Blog">
  <meta name="twitter:description" content="Expert guides on online privacy and tracker detection.">

  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_500x500.png">

  <style>
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #1f2937;
      background: #fff;
    }
    h1 { font-size: 2.5rem; margin-bottom: 2rem; color: #111827; }
    a { color: #2ecc71; }
    .home-link { display: inline-block; margin-bottom: 1rem; text-decoration: none; }
  </style>
</head>
<body>
  <a href="/" class="home-link">← Home</a>

  <h1>Privacy Blog</h1>
  <p>Expert guides on online privacy, tracker detection, and protecting your digital footprint.</p>

  <div style="margin-top: 2rem;">
    ${postsHtml}
  </div>
</body>
</html>`;
}

/**
 * SSR route for individual blog posts
 * GET /api/ssr/blog/:slug
 *
 * Note: Cloudflare routes /api/* to backend, so we use /api/ssr/blog/*
 * The nginx config proxies /blog/* requests to these routes.
 */
ssrBlogRouter.get('/api/ssr/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post || post.status !== 'PUBLISHED') {
      // Return 404 with proper meta tags
      res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Blog Post Not Found | Gecko Advisor</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <h1>Blog Post Not Found</h1>
  <p>The blog post you're looking for doesn't exist.</p>
  <a href="/blog">← Back to Blog</a>
</body>
</html>`);
      return;
    }

    const html = generateBlogHtml(post);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1hr browser, 24hr CDN
    res.send(html);

    logger.info({ slug, userAgent: req.get('User-Agent')?.substring(0, 50) }, 'SSR blog post served');
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'SSR blog post error');
    res.status(500).send('Internal server error');
  }
});

/**
 * SSR route for blog listing page
 * GET /api/ssr/blog
 *
 * Note: Cloudflare routes /api/* to backend, so we use /api/ssr/blog
 * The nginx config proxies /blog requests to this route.
 */
ssrBlogRouter.get('/api/ssr/blog', async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        readTimeMinutes: true,
      },
    });

    const html = generateBlogListHtml(posts);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600'); // 30min browser, 1hr CDN
    res.send(html);

    logger.info({ postCount: posts.length, userAgent: req.get('User-Agent')?.substring(0, 50) }, 'SSR blog list served');
  } catch (error) {
    logger.error({ error }, 'SSR blog list error');
    res.status(500).send('Internal server error');
  }
});
