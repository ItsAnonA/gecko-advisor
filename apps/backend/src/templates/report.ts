/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Report Page Generator
 *
 * Generates full HTML for completed privacy reports.
 *
 * CRITICAL SEO REQUIREMENTS:
 * - MUST include self-referencing <link rel="canonical">
 * - MUST NOT include <meta name="robots" content="noindex">
 * - MUST be fully server-rendered (no client-side data fetching for core content)
 * - MUST include structured data (JSON-LD)
 *
 * Note: This is a simplified server-side template. The full React-based report
 * is still used for the interactive Next.js pages. This template is specifically
 * for cache-warming and bot-serving to ensure zero 5xx errors.
 */

import { escapeHtml } from '../utils/escape.js';
import { minifyHtml } from '../utils/minifyHtml.js';

export interface ReportSummary {
  domain: string;
  score: number;
  label: string;
  trackerCount: number;
  thirdPartyCount: number;
  cookieCount: number;
  tlsGrade: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
  relatedDomains?: Array<{ domain: string; score: number }>;
}

/**
 * Generate full report HTML page.
 *
 * This is a simplified version that meets SEO requirements.
 * The Next.js pages still use the full React component rendering.
 *
 * @param domain - Domain being reported on
 * @param report - Report summary data
 * @param pathPrefix - URL path prefix (default: '/privacy-policy')
 * @returns Fully rendered HTML
 */
export function generateReportHTML(
  domain: string,
  report: ReportSummary,
  pathPrefix = '/privacy-policy'
): string {
  const escapedDomain = escapeHtml(domain);
  const canonicalUrl = `https://geckoadvisor.com${pathPrefix}/${encodeURIComponent(domain)}`;
  const title = `${escapedDomain} Privacy Report - Score: ${report.score}/100 | Gecko Advisor`;
  const description =
    report.summary ||
    `Privacy analysis for ${escapedDomain}. Score: ${report.score}/100 with ${report.trackerCount} trackers, ${report.cookieCount} cookies detected.`;

  // Structured data - Article
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Privacy Report for ${escapedDomain}`,
    description: escapeHtml(description),
    datePublished: report.createdAt,
    dateModified: report.updatedAt,
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      url: 'https://geckoadvisor.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      logo: {
        '@type': 'ImageObject',
        url: 'https://geckoadvisor.com/logo.png',
      },
    },
  };

  // Structured data - Review/Rating
  // Note: Google only supports specific types for itemReviewed (Product, SoftwareApplication, etc.)
  // WebSite is NOT supported - using SoftwareApplication as websites are web applications
  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: escapedDomain,
      url: `https://${escapedDomain}`,
      applicationCategory: 'WebApplication',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: report.score,
      bestRating: 100,
      worstRating: 0,
    },
    author: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
    },
    reviewBody: escapeHtml(description),
    datePublished: report.createdAt,
  };

  // Structured data - Breadcrumbs
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://geckoadvisor.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Privacy Reports',
        item: 'https://geckoadvisor.com/reports',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: escapedDomain,
        item: canonicalUrl,
      },
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <meta name="description" content="${escapeHtml(description)}">
${
    report.score < 40
      ? `
  <!-- Low-quality score: prevent indexing -->
  <meta name="robots" content="noindex, follow">`
      : ''
  }

  <!-- CRITICAL: Self-referencing canonical for SEO -->
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="Gecko Advisor">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">

  <!-- Structured Data (JSON-LD) - Article -->
  <script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
  </script>

  <!-- Structured Data (JSON-LD) - Review -->
  <script type="application/ld+json">
${JSON.stringify(reviewSchema, null, 2)}
  </script>

  <!-- Structured Data (JSON-LD) - Breadcrumbs -->
  <script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f8fafc;
    }
    .header {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    .breadcrumb {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .breadcrumb a {
      color: #0284c7;
      text-decoration: none;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    h1 {
      font-size: 28px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 24px;
    }
    .domain {
      color: #0284c7;
      word-break: break-all;
    }
    .score-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 32px;
      margin-bottom: 24px;
    }
    .score-display {
      text-align: center;
      padding: 24px 0;
    }
    .score-number {
      font-size: 64px;
      font-weight: 700;
      color: ${getScoreColor(report.score)};
      line-height: 1;
    }
    .score-label {
      font-size: 18px;
      font-weight: 600;
      color: #475569;
      margin-top: 8px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .metric {
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: 600;
      color: #0f172a;
    }
    .metric-label {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    .summary {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .cta {
      text-align: center;
      margin-top: 32px;
      padding: 24px;
      background: #f0f9ff;
      border-radius: 12px;
    }
    .cta a {
      display: inline-block;
      background: #0284c7;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
    }
    .cta a:hover {
      background: #0369a1;
    }
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="breadcrumb">
      <a href="/">Home</a> / <a href="/reports">Reports</a> / ${escapedDomain}
    </div>
  </header>

  <div class="container">
    <h1>Privacy Report: <span class="domain">${escapedDomain}</span></h1>

    <div class="score-card">
      <div class="score-display">
        <div class="score-number">${report.score}</div>
        <div class="score-label">${escapeHtml(report.label)}</div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${report.trackerCount}</div>
          <div class="metric-label">Trackers</div>
        </div>
        <div class="metric">
          <div class="metric-value">${report.cookieCount}</div>
          <div class="metric-label">Cookies</div>
        </div>
        <div class="metric">
          <div class="metric-value">${report.thirdPartyCount}</div>
          <div class="metric-label">3rd Parties</div>
        </div>
        ${
          report.tlsGrade
            ? `
        <div class="metric">
          <div class="metric-value">${escapeHtml(report.tlsGrade)}</div>
          <div class="metric-label">TLS Grade</div>
        </div>
        `
            : ''
        }
      </div>
    </div>

    ${
      report.summary
        ? `
    <div class="summary">
      <p>${escapeHtml(report.summary)}</p>
    </div>
    `
        : ''
    }

    <div class="cta">
      <p style="margin-bottom: 16px;">Want to see the full interactive report with detailed analysis?</p>
      <a href="/privacy-report/${encodeURIComponent(domain)}">View Full Report →</a>
    </div>

    ${
      report.relatedDomains && report.relatedDomains.length > 0
        ? `
    <div style="margin-top: 32px; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Similar Privacy Reports</h2>
      <div style="display: grid; gap: 12px;">
        ${report.relatedDomains
          .map(
            (related) => `
        <a href="/privacy-report/${encodeURIComponent(related.domain)}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; text-decoration: none; color: inherit; border: 1px solid #e2e8f0;">
          <span style="color: #0284c7; font-weight: 500;">${escapeHtml(related.domain)}</span>
          <span style="color: ${getScoreColor(related.score)}; font-weight: 600;">${related.score}/100</span>
        </a>`
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p><strong>Gecko Advisor</strong> - Free, Open-Source Privacy Scanner</p>
      <p>No tracking • No signup required • 100% transparent</p>
    </div>
  </div>

  <!-- Note: This is a simplified cached version for bots and pre-warming.
       Visit /privacy-report/${encodeURIComponent(domain)} for the full interactive report. -->
</body>
</html>`;

  // Minify HTML for faster page loads (gzip will further compress)
  return minifyHtml(html);
}

/**
 * Get color for score display (CSS color value)
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'; // green
  if (score >= 50) return '#f59e0b'; // orange
  return '#ef4444'; // red
}
