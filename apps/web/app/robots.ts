/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Robots.txt Configuration (Native Next.js)
 *
 * Single source of truth for robots.txt. The static public/robots.txt has been
 * removed to eliminate the dual-source conflict (Issue #8).
 */

import { MetadataRoute } from 'next';
import { SEO_CONSTANTS } from '@gecko-advisor/shared/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default rules for all crawlers
      {
        userAgent: '*',
        allow: [
          '/',
          '/privacy-report/',
          '/blog/',
          '/reports',
          '/about',
          '/privacy-benchmarks/',
          '/changes',
          '/compare/',
          '/privacy-scanner',
          '/methodology',
          '/faq',
          '/roadmap',
        ],
        disallow: [
          // Internal / API endpoints
          '/api/',
          '/admin/',
          '/scan/',
          '/dashboard',
          '/reset-password',
          '/settings',
          '/_next/',
          '/ssr',

          // Legacy redirect-only paths
          '/privacy-policy/',
          '/r/',

          // Crawler artifact blocking (sub-resources under dynamic routes)
          '/privacy-report/*/_next/',
          '/privacy-report/*/api/',
          '/privacy-report/*/.well-known/',
          '/privacy-report/*/static/',
          '/privacy-report/*/*.js',
          '/privacy-report/*/*.css',
          '/privacy-report/*/*.json',
          '/privacy-benchmarks/*/_next/',
          '/privacy-benchmarks/*/api/',
          '/compare/*/_next/',
          '/compare/*/api/',

          // Spam / bot-noise paths
          '/index.php',
          '/cgi-bin/',
          '/wp-admin/',
          '/wp-login.php',

          // Garbage URL patterns
          '/*.html$',
          '/*.php$',
          '/*.aspx$',
          '/*?url=',
          '/*?p=',
        ],
        crawlDelay: 1,
      },
      // Block AI training crawlers
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'Google-Extended',
        disallow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        disallow: '/',
      },
      {
        userAgent: 'Claude-Web',
        disallow: '/',
      },
      {
        userAgent: 'Bytespider',
        disallow: '/',
      },
      {
        userAgent: 'Amazonbot',
        disallow: '/',
      },
      {
        userAgent: 'FacebookBot',
        disallow: '/',
      },
      {
        userAgent: 'Applebot-Extended',
        disallow: '/',
      },
      {
        userAgent: 'cohere-ai',
        disallow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        disallow: '/',
      },
    ],
    sitemap: `${SEO_CONSTANTS.BASE_URL}/sitemap.xml`,
  };
}
