/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { buildReportPayload, labelForScore, isBlockedDomain } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { logger } from "../logger.js";
import { findLatestScanForDomain, normalizeDomain } from "../services/domainService.js";

export const ssrDomainRouter = Router();

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
 * Get TLS grade from evidence
 */
function getTlsGrade(evidence: Array<{ kind: string; details: unknown }>): string {
  const tlsEvidence = evidence.find(e => e.kind === 'tls');
  if (tlsEvidence && typeof tlsEvidence.details === 'object' && tlsEvidence.details) {
    const details = tlsEvidence.details as Record<string, unknown>;
    if (typeof details.grade === 'string') {
      return details.grade;
    }
  }
  return 'Unknown';
}

/**
 * Count trackers and third-party resources from evidence
 */
function countEvidenceByKind(evidence: Array<{ kind: string; details: unknown }>) {
  const trackerDomains = new Set<string>();
  const thirdPartyDomains = new Set<string>();

  for (const e of evidence) {
    const details = e.details as Record<string, unknown> | null;
    const domain = details?.domain as string | undefined;

    if (e.kind === 'tracker' && domain) {
      trackerDomains.add(domain);
    } else if (e.kind === 'thirdparty' && domain) {
      thirdPartyDomains.add(domain);
    }
  }

  return {
    trackerCount: trackerDomains.size,
    thirdPartyCount: thirdPartyDomains.size,
    cookieCount: evidence.filter(e => e.kind === 'cookie').length,
  };
}

/**
 * Generate the privacy report HTML page
 */
function generatePrivacyReportHtml(
  domain: string,
  scan: {
    slug: string;
    score: number | null;
    label: string | null;
    input: string;
    createdAt: Date;
    finishedAt?: Date | null;
  },
  evidence: Array<{ kind: string; details: unknown }>,
  meta: { dataSharing: string }
): string {
  const score = scan.score ?? 0;
  const label = scan.label ?? labelForScore(score);
  const tlsGrade = getTlsGrade(evidence);
  const { trackerCount, thirdPartyCount, cookieCount } = countEvidenceByKind(evidence);

  const title = `${domain} Privacy Report: Score ${score}/100`;
  const description = `Privacy analysis of ${domain} - ${trackerCount} trackers, Grade ${tlsGrade} TLS, ${thirdPartyCount} third parties. Full privacy breakdown.`;
  const url = `https://geckoadvisor.com/privacy-policy/${domain}`;
  const scanDate = scan.finishedAt?.toISOString() ?? scan.createdAt.toISOString();
  const displayDate = new Date(scanDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine risk color
  let riskColor = '#22c55e'; // green
  let riskBg = '#dcfce7';
  if (score < 50) {
    riskColor = '#ef4444'; // red
    riskBg = '#fee2e2';
  } else if (score < 80) {
    riskColor = '#f59e0b'; // amber
    riskBg = '#fef3c7';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${escapeHtml(title)} | Gecko Advisor</title>
  <meta name="title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(domain)}, privacy report, privacy score, tracker detection, website security, ${escapeHtml(domain)} trackers">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="https://geckoadvisor.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Gecko Advisor">
  <meta property="article:published_time" content="${scanDate}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="https://geckoadvisor.com/og-image.png">
  <meta name="twitter:site" content="@GeckoAdvisor">

  <!-- Structured Data - Review Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "WebSite",
      "name": "${escapeHtml(domain)}",
      "url": "https://${escapeHtml(domain)}"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "${score}",
      "bestRating": "100",
      "worstRating": "0"
    },
    "author": {
      "@type": "Organization",
      "name": "Gecko Advisor",
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
    "datePublished": "${scanDate}",
    "description": "${escapeHtml(description)}",
    "reviewBody": "This privacy scan analyzed ${escapeHtml(domain)} and found ${trackerCount} trackers, ${thirdPartyCount} third-party connections, and ${cookieCount} cookies. The site received a privacy score of ${score}/100 (${escapeHtml(label)})."
  }
  </script>

  <!-- Structured Data - BreadcrumbList -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://geckoadvisor.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Privacy Reports",
        "item": "https://geckoadvisor.com/reports"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "${escapeHtml(domain)} Privacy Report",
        "item": "${url}"
      }
    ]
  }
  </script>

  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon_500x500.png">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 40px 20px;
      color: white;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2ecc71;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 10px;
      color: white;
    }
    .domain-url {
      color: #94a3b8;
      font-size: 1rem;
      word-break: break-all;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .score-section {
      display: flex;
      align-items: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    .score-dial {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: ${riskBg};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 4px solid ${riskColor};
    }
    .score-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: ${riskColor};
    }
    .score-label {
      font-size: 0.875rem;
      color: #6b7280;
    }
    .score-details {
      flex: 1;
      min-width: 200px;
    }
    .risk-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.875rem;
      background: ${riskBg};
      color: ${riskColor};
      margin-bottom: 12px;
    }
    .summary-text {
      font-size: 1.1rem;
      color: #374151;
      line-height: 1.7;
      margin-top: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    .stat-item {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
    }
    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 4px;
    }
    .meta-info {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .cta-section {
      text-align: center;
      padding: 30px;
      background: #f0fdf4;
      border-radius: 12px;
      margin-top: 20px;
    }
    .cta-button {
      display: inline-block;
      background: #2ecc71;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 10px;
    }
    .cta-button:hover {
      background: #27ae60;
    }
    .footer {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      font-size: 0.875rem;
    }
    .footer a {
      color: #2ecc71;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      h1 { font-size: 1.5rem; }
      .score-section { justify-content: center; }
      .score-dial { width: 100px; height: 100px; }
      .score-number { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <a href="/" class="logo">Gecko Advisor</a>
      <h1>${escapeHtml(domain)} Privacy & Security Analysis</h1>
      <p class="domain-url">${escapeHtml(scan.input)}</p>
    </header>

    <main>
      <!-- SEO Summary Section - Crawlable Text -->
      <div class="card">
        <div class="score-section">
          <div class="score-dial">
            <span class="score-number">${score}</span>
            <span class="score-label">/ 100</span>
          </div>
          <div class="score-details">
            <span class="risk-badge">${escapeHtml(label)}</span>
            <p class="summary-text">
              We analyzed <strong>${escapeHtml(domain)}</strong> and found it scores <strong>${score}/100</strong> for privacy.
              The site has <strong>Grade ${escapeHtml(tlsGrade)}</strong> TLS security, <strong>${trackerCount}</strong> trackers detected,
              and <strong>${thirdPartyCount}</strong> third-party connections.
              Data sharing risk is <strong>${escapeHtml(meta.dataSharing)}</strong>.
            </p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${trackerCount}</div>
            <div class="stat-label">Trackers</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${thirdPartyCount}</div>
            <div class="stat-label">Third Parties</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${tlsGrade}</div>
            <div class="stat-label">TLS Grade</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${cookieCount}</div>
            <div class="stat-label">Cookies</div>
          </div>
        </div>

        <div class="meta-info">
          <p>Scanned on ${displayDate} &bull; <a href="/r/${escapeHtml(scan.slug)}">View full interactive report</a></p>
        </div>
      </div>

      <div class="cta-section">
        <h2>Want to scan a different website?</h2>
        <p>Our free privacy scanner analyzes any website in seconds.</p>
        <a href="/" class="cta-button">Scan a Website</a>
      </div>
    </main>

    <footer class="footer">
      <p>&copy; ${new Date().getFullYear()} <a href="/">Gecko Advisor</a> - Free, Open-Source Privacy Scanner</p>
      <p><a href="/about">About</a> &bull; <a href="/docs">Documentation</a> &bull; <a href="/faq">FAQ</a></p>
    </footer>
  </div>
</body>
</html>`;
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
 * SSR route for privacy-policy domain pages
 * GET /privacy-policy/:domain (primary - for redirects and direct access)
 * GET /api/ssr/privacy-policy/:domain (legacy/explicit SSR endpoint)
 *
 * This serves pre-rendered HTML for SEO crawlers.
 */
ssrDomainRouter.get(['/privacy-policy/:domain', '/api/ssr/privacy-policy/:domain'], async (req, res) => {
  try {
    const rawDomain = req.params.domain;

    // Check for undefined/empty domain parameter
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
      logger.info({ domain, userAgent: req.get('User-Agent')?.substring(0, 50) }, 'SSR blocked domain - returning 410 Gone');
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

    // Find the latest scan for this domain
    const scan = await findLatestScanForDomain(prisma, domain);

    if (!scan) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generate404Html(domain));
      logger.info({ domain, userAgent: req.get('User-Agent')?.substring(0, 50) }, 'SSR domain 404');
      return;
    }

    // Build report payload for meta data
    const payload = buildReportPayload(scan, {
      evidence: (scan.evidence ?? []) as Parameters<typeof buildReportPayload>[1]['evidence'],
      issues: (scan.issues ?? []) as Parameters<typeof buildReportPayload>[1]['issues'],
    });

    const html = generatePrivacyReportHtml(
      domain,
      scan,
      scan.evidence as Array<{ kind: string; details: unknown }>,
      payload.meta
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1hr browser, 24hr CDN
    res.send(html);

    logger.info({ domain, score: scan.score, userAgent: req.get('User-Agent')?.substring(0, 50) }, 'SSR domain report served');
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'SSR domain report error');
    res.status(500).send('Internal server error');
  }
});

/**
 * SEO Redirect: /r/:slug → /privacy-policy/:domain
 *
 * Redirects old report URLs to canonical domain-based URLs for SEO.
 * This ensures search engines always index the canonical URL.
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
      // If scan not found, let the frontend handle 404
      return res.redirect(302, `https://geckoadvisor.com/r/${slug}`);
    }

    // Extract domain from scan input
    let domain: string;
    try {
      const url = new URL(scan.input);
      domain = normalizeDomain(url.hostname) || url.hostname;
    } catch {
      domain = scan.input;
    }

    // 301 permanent redirect to canonical URL (via API for SSR)
    logger.info({ slug, domain }, 'SEO redirect /r/:slug -> /privacy-policy/:domain');
    res.redirect(301, `https://api.geckoadvisor.com/privacy-policy/${encodeURIComponent(domain)}`);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error in /r/:slug redirect');
    // On error, let frontend handle it
    res.redirect(302, `https://geckoadvisor.com/r/${req.params.slug}`);
  }
});
