/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Robots.txt Configuration (Native Next.js)
 *
 * Uses Next.js native robots.ts file for type-safe robots.txt generation.
 * This generates the robots.txt served by Next.js.
 */

import { MetadataRoute } from 'next';
import { SEO_CONSTANTS } from '@gecko-advisor/shared/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default rules for all crawlers
      {
        userAgent: '*',
        allow: ['/', '/privacy-report/', '/r/', '/blog/', '/reports', '/about'],
        disallow: [
          '/api/',
          '/admin/',
          '/scan/',
          '/dashboard',
          '/reset-password',
          '/settings',
          '/_next/',
          '/ssr',
          // Block crawler artifacts (reduces 404s)
          '/privacy-report/*/_next/',
          '/privacy-report/*/api/',
          '/privacy-report/*/.well-known/',
          '/privacy-report/*/static/',
          '/privacy-report/*/*.js',
          '/privacy-report/*/*.css',
          '/privacy-report/*/*.json',
        ],
      },
      // Block AI training crawlers
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'Google-Extended',
          'anthropic-ai',
          'Claude-Web',
          'Bytespider',
          'Amazonbot',
          'FacebookBot',
          'Applebot-Extended',
          'cohere-ai',
          'PerplexityBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${SEO_CONSTANTS.BASE_URL}/sitemap.xml`,
  };
}
