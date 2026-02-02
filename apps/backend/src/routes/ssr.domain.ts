/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { isBlockedDomain, isSearchBot } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { logger } from "../logger.js";
import { normalizeDomain } from "../services/domainService.js";
import { generateSSRReportHTML } from "../services/ssrReportService.js";
import { reportCircuitBreaker } from "../middleware/circuitBreaker.js";
import { generatePlaceholderHTML } from "../templates/placeholder.js";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../cache.js";
import { cacheMetrics } from "../monitoring/cacheMetrics.js";

export const ssrDomainRouter = Router();

/**
 * Escape HTML entities to prevent XSS (minimal helper for 404 page)
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
 * Generate 404 page for domain not found
 */
function generate404Html(domain: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Report Not Found | Gecko Advisor</title>
  <meta name="robots" content="noindex">
  <meta name="description" content="No privacy report found for ${escapeHtml(domain)}. Scan it now with Gecko Advisor.">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_500x500.png">
  <style>
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
      padding: 20px;
    }
    h1 { font-size: 2rem; margin-bottom: 10px; }
    p { color: #94a3b8; margin-bottom: 20px; }
    .cta {
      display: inline-block;
      background: #2ecc71;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
    .back { color: #2ecc71; margin-top: 20px; display: block; }
  </style>
</head>
<body>
  <div>
    <h1>No Report Found</h1>
    <p>We haven't scanned <strong>${escapeHtml(domain)}</strong> yet.</p>
    <a href="/?url=${encodeURIComponent('https://' + domain)}" class="cta">Scan ${escapeHtml(domain)} Now</a>
    <a href="/" class="back">&larr; Back to Home</a>
  </div>
</body>
</html>`;
}

/**
 * 301 Redirect: /privacy-policy/:domain → /privacy-report/:domain
 *
 * Preserves SEO equity from:
 * - External backlinks
 * - Cached search results
 * - Browser bookmarks
 * - Social media shares
 *
 * Keep active for at least 1 year after migration.
 *
 * NOTE: X-Robots-Tag reinforces de-indexing of old URL pattern.
 */
ssrDomainRouter.get(['/privacy-policy/:domain', '/api/ssr/privacy-policy/:domain'], (req, res) => {
  const domain = req.params.domain || '';

  // If domain is empty, redirect to home
  if (!domain) {
    res.setHeader('X-Robots-Tag', 'noindex');
    res.redirect(301, '/');
    return;
  }

  const newPath = `/privacy-report/${encodeURIComponent(domain)}`;

  // Log for monitoring redirect volume
  logger.info({ oldUrl: req.originalUrl, newPath }, 'Redirecting old URL to new path');

  // X-Robots-Tag tells search engines to de-index this old URL pattern
  res.setHeader('X-Robots-Tag', 'noindex');

  // 301 = permanent redirect (tells search engines to update their index)
  res.redirect(301, newPath);
});

/**
 * Catch-all for any /privacy-policy sub-paths
 */
ssrDomainRouter.get('/privacy-policy/:domain/*', (req, res) => {
  const domain = req.params.domain || '';

  // X-Robots-Tag tells search engines to de-index this old URL pattern
  res.setHeader('X-Robots-Tag', 'noindex');

  if (!domain) {
    res.redirect(301, '/');
    return;
  }

  res.redirect(301, `/privacy-report/${encodeURIComponent(domain)}`);
});

/**
 * SSR route for privacy-report domain pages with cache-first architecture
 * GET /privacy-report/:domain (primary canonical URL)
 * GET /api/ssr/privacy-report/:domain (legacy/explicit SSR endpoint)
 *
 * CRITICAL SEO REQUIREMENTS:
 * - Cache-first for ALL users (no bot-specific paths - avoids cloaking)
 * - Never return 5xx to bots (placeholder fallback with noindex)
 * - Circuit breaker wraps FULL pipeline (DB + aggregation + template)
 * - Queue background job on cache miss (TODO: Task 5)
 *
 * Flow:
 * 1. Check Redis cache → HIT: return cached HTML (200)
 * 2. MISS: Execute with circuit breaker
 *    a. SUCCESS: Cache + return HTML (200)
 *    b. FAIL: Queue job + return placeholder (200 + noindex)
 * 3. NEVER return 5xx to bots
 */
ssrDomainRouter.get(['/privacy-report/:domain', '/api/ssr/privacy-report/:domain'], async (req, res) => {
  const rawDomain = req.params.domain;
  const userAgent = req.get('User-Agent') || 'unknown';
  const isBot = isSearchBot(userAgent);

  // Track for metrics (TODO: Task 9)
  const startTime = Date.now();

  try {
    // Validate domain parameter
    if (!rawDomain) {
      res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generate404Html('unknown'));
      return;
    }

    const domain = normalizeDomain(rawDomain);

    if (!domain || domain.length < 3) {
      res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generate404Html(rawDomain));
      return;
    }

    // Return 410 Gone for blocked domains (adult content)
    // This helps Google de-index these pages faster
    if (isBlockedDomain(domain)) {
      logger.info({ domain, isBot, userAgent: userAgent.substring(0, 50) }, 'SSR blocked domain - returning 410 Gone');
      res.status(410).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Removed | Gecko Advisor</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_500x500.png">
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; text-align: center;">
  <div>
    <h1>Report Removed</h1>
    <p>This report has been permanently removed due to content policy.</p>
    <a href="/" style="color: #2ecc71;">Return to Home</a>
  </div>
</body>
</html>`);
      return;
    }

    // STEP 1: Check Redis cache (cache-first for ALL users)
    const cacheKey = CACHE_KEYS.SSR_REPORT_HTML(domain);
    const cachedHtml = await CacheService.get<string>(cacheKey);

    if (cachedHtml) {
      const duration = Date.now() - startTime;

      // Record cache hit metrics
      cacheMetrics.recordHit(isBot);

      logger.info(
        {
          domain,
          isBot,
          cacheHit: true,
          duration,
          userAgent: userAgent.substring(0, 50),
        },
        'SSR cache hit - serving cached report'
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1hr browser, 24hr CDN
      res.setHeader('X-Cache', 'HIT');
      res.send(cachedHtml);
      return;
    }

    // STEP 2: Cache miss - execute with circuit breaker
    const html = await reportCircuitBreaker.execute(
      async () => {
        // Generate report HTML (wraps full pipeline)
        const generated = await generateSSRReportHTML(domain);

        if (!generated) {
          // No scan found - return 404 with noindex
          logger.info({ domain, isBot }, 'SSR domain not found (no scan)');
          throw new Error('SCAN_NOT_FOUND');
        }

        return generated;
      },
      () => {
        // Fallback: return placeholder HTML (200 + noindex)
        // This prevents 5xx errors for bots
        logger.warn(
          {
            domain,
            isBot,
            circuitBreakerState: reportCircuitBreaker.getState().state,
          },
          'Circuit breaker fallback - serving placeholder'
        );

        return generatePlaceholderHTML(domain);
      }
    );

    const duration = Date.now() - startTime;

    // Check if this is a placeholder or real report
    const isPlaceholder = html.includes('noindex');

    if (!isPlaceholder) {
      // STEP 3a: Real report generated - cache it
      await CacheService.set(cacheKey, html, CACHE_TTL.SSR_REPORT_HTML);

      // Record cache miss metrics
      cacheMetrics.recordMiss(isBot);

      logger.info(
        {
          domain,
          isBot,
          cacheHit: false,
          cached: true,
          duration,
          userAgent: userAgent.substring(0, 50),
        },
        'SSR cache miss - report generated and cached'
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1hr browser, 24hr CDN
      res.setHeader('X-Cache', 'MISS');
      res.send(html);
    } else {
      // STEP 3b: Placeholder served (circuit breaker fallback or no scan)
      // Note: Background job queueing will be implemented in Task 6 (cache pre-warming)
      // For now, placeholders are served immediately without queuing background generation

      // Record placeholder metrics
      cacheMetrics.recordPlaceholder(isBot);

      logger.info(
        {
          domain,
          isBot,
          cacheHit: false,
          placeholder: true,
          duration,
          userAgent: userAgent.substring(0, 50),
        },
        'SSR placeholder served (no scan or circuit open)'
      );

      // CRITICAL: Return 200 (not 404/5xx) to prevent bot-triggered errors
      res.status(200);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate'); // Don't cache placeholders
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Placeholder', 'true');
      res.send(html);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle scan not found error (404, not 5xx)
    if (error instanceof Error && error.message === 'SCAN_NOT_FOUND') {
      logger.info({ domain: rawDomain, isBot, duration }, 'SSR domain 404 - scan not found');
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generate404Html(rawDomain ?? 'unknown'));
      return;
    }

    // CRITICAL: For bots, NEVER return 5xx - use placeholder fallback
    if (isBot) {
      // Record error metrics
      cacheMetrics.recordError(isBot);

      logger.error(
        {
          error,
          domain: rawDomain,
          isBot,
          duration,
          userAgent: userAgent.substring(0, 50),
        },
        'SSR error for bot - serving placeholder to prevent 5xx'
      );

      const placeholderHtml = generatePlaceholderHTML(rawDomain ?? 'unknown');

      res.status(200); // CRITICAL: 200, not 500
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('X-Error-Fallback', 'true');
      res.send(placeholderHtml);
      return;
    }

    // For humans, we can return 500 (they can retry)
    logger.error(
      {
        error,
        domain: rawDomain,
        isBot,
        duration,
        userAgent: userAgent.substring(0, 50),
      },
      'SSR error for human user'
    );

    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('Internal server error. Please try again later.');
  }
});

/**
 * SEO Redirect: /r/:slug → /privacy-report/:domain
 *
 * Redirects old report URLs to canonical domain-based URLs for SEO.
 * This ensures search engines always index the canonical URL.
 *
 * IMPORTANT: Redirects directly to /privacy-report/ to avoid redirect chain:
 * - Old: /r/:slug → /privacy-policy/:domain → /privacy-report/:domain (BAD - 2 hops)
 * - New: /r/:slug → /privacy-report/:domain (GOOD - 1 hop)
 */
ssrDomainRouter.get('/r/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    // Look up scan by slug to get the domain
    const scan = await prisma.scan.findUnique({
      where: { slug },
      select: { input: true },
    });

    if (!scan) {
      // Return 410 Gone for deleted/expired slugs
      // This tells Google to de-index the URL faster than 404
      logger.info({ slug }, 'SEO redirect /r/:slug - slug not found, returning 410 Gone');
      res.status(410).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Expired | Gecko Advisor</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_500x500.png">
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; text-align: center;">
  <div>
    <h1>Report Expired</h1>
    <p>This report link has expired or been removed.</p>
    <a href="/" style="color: #2ecc71;">Scan a New Website</a>
  </div>
</body>
</html>`);
      return;
    }

    // Extract domain from scan input
    let domain: string;
    try {
      const url = new URL(scan.input);
      domain = normalizeDomain(url.hostname) || url.hostname;
    } catch {
      domain = scan.input;
    }

    // 301 permanent redirect directly to canonical URL (skip /privacy-policy/ intermediate)
    logger.info({ slug, domain }, 'SEO redirect /r/:slug -> /privacy-report/:domain');
    res.redirect(301, `https://geckoadvisor.com/privacy-report/${encodeURIComponent(domain)}`);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error in /r/:slug redirect');
    // Return 410 Gone on error to avoid crawl loops
    res.status(410).setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Report Unavailable | Gecko Advisor</title>
  <meta name="robots" content="noindex">
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; text-align: center;">
  <div>
    <h1>Report Unavailable</h1>
    <p>This report is temporarily unavailable.</p>
    <a href="/" style="color: #2ecc71;">Go to Home</a>
  </div>
</body>
</html>`);
  }
});
