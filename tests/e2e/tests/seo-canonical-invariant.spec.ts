/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { expect, test } from '@playwright/test';

/**
 * Canonical Invariant Tests
 *
 * For any domain form (unicode, punycode, uppercase, www), verify:
 * 1. Response is either 308 redirect → canonical OR 200 with canonical tag
 * 2. Canonical tag equals normalized form
 * 3. Sitemap emits the same normalized form
 *
 * This ensures search engines see ONE canonical URL per domain.
 */

// Test domains with various forms that should all resolve to the same canonical
const CANONICAL_TEST_CASES = [
  {
    description: 'uppercase domain',
    variants: ['GOOGLE.COM', 'Google.Com', 'GOOGLE.com'],
    canonical: 'google.com',
  },
  {
    description: 'www prefix',
    variants: ['www.google.com', 'WWW.google.com', 'www.GOOGLE.COM'],
    canonical: 'google.com',
  },
  {
    description: 'protocol prefix',
    variants: ['https://google.com', 'http://google.com'],
    canonical: 'google.com',
  },
  {
    description: 'trailing slash/path',
    variants: ['google.com/', 'google.com/path'],
    canonical: 'google.com',
  },
  // Note: Unicode/punycode tests require actual IDN domains in the database
  // {
  //   description: 'unicode domain',
  //   variants: ['münchen.de', 'MÜNCHEN.DE'],
  //   canonical: 'xn--mnchen-3ya.de', // punycode form
  // },
];

test.describe('Canonical Invariant', () => {
  for (const testCase of CANONICAL_TEST_CASES) {
    test.describe(testCase.description, () => {
      for (const variant of testCase.variants) {
        test(`${variant} → ${testCase.canonical}`, async ({ request }) => {
          const response = await request.get(`/privacy-policy/${variant}`, {
            maxRedirects: 0,
          });

          const status = response.status();

          // Case 1: Redirect to canonical (308 Permanent Redirect)
          if (status === 308 || status === 307 || status === 301 || status === 302) {
            const location = response.headers()['location'];
            expect(location).toBeDefined();

            // Location should contain the canonical domain
            expect(location?.toLowerCase()).toContain(testCase.canonical.toLowerCase());

            // Follow the redirect and verify final page
            const finalResponse = await request.get(`/privacy-policy/${variant}`);

            if (finalResponse.status() === 200) {
              const html = await finalResponse.text();
              verifyCanonicalTag(html, testCase.canonical);
            }
            return;
          }

          // Case 2: Direct 200 with canonical tag
          if (status === 200) {
            const html = await response.text();
            verifyCanonicalTag(html, testCase.canonical);
            return;
          }

          // Case 3: 404 means domain not in database (skip)
          if (status === 404) {
            test.skip(true, `Domain ${testCase.canonical} not in database`);
            return;
          }

          // Unexpected status
          expect.soft(status, `Unexpected status for ${variant}`).toBeLessThan(500);
        });
      }
    });
  }

  test.describe('Sitemap Canonical Consistency', () => {
    test('sitemap URLs match canonical form', async ({ request }) => {
      const sitemapResponse = await request.get('/sitemap.xml');

      if (sitemapResponse.status() !== 200) {
        test.skip(true, 'Sitemap not accessible');
        return;
      }

      const xml = await sitemapResponse.text();

      // Extract all privacy-policy URLs from sitemap
      const urlMatches = xml.match(/<loc>[^<]*\/privacy-policy\/[^<]+<\/loc>/g) || [];

      for (const locTag of urlMatches.slice(0, 10)) {
        // Check first 10
        const url = locTag.replace(/<\/?loc>/g, '');
        const domain = url.split('/privacy-policy/')[1];

        if (!domain) continue;

        // Verify domain is normalized:
        // - lowercase
        // - no www prefix
        // - no protocol (just domain)
        // - ASCII only (punycode for IDN)
        expect(domain).toBe(domain.toLowerCase());
        expect(domain).not.toMatch(/^www\./i);
        expect(domain).not.toMatch(/^https?:\/\//i);
        expect(domain).toMatch(/^[a-z0-9.-]+$/); // ASCII only

        // Fetch the page and verify canonical matches sitemap URL
        const pageResponse = await request.get(`/privacy-policy/${domain}`);

        if (pageResponse.status() === 200) {
          const html = await pageResponse.text();
          const canonicalMatch = html.match(
            /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i
          );

          if (canonicalMatch) {
            const canonicalUrl = canonicalMatch[1];
            // Canonical should contain the exact domain from sitemap
            expect(canonicalUrl).toContain(`/privacy-policy/${domain}`);
          }
        }
      }
    });
  });
});

/**
 * Helper to verify canonical tag in HTML
 */
function verifyCanonicalTag(html: string, expectedDomain: string): void {
  // Extract canonical link
  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i
  );

  expect(canonicalMatch, 'Canonical tag should exist').toBeTruthy();

  if (canonicalMatch) {
    const canonicalUrl = canonicalMatch[1];

    // Canonical should:
    // 1. Be absolute URL
    expect(canonicalUrl).toMatch(/^https?:\/\//);

    // 2. Contain /privacy-policy/
    expect(canonicalUrl).toContain('/privacy-policy/');

    // 3. Use normalized domain (lowercase, no www)
    const canonicalDomain = canonicalUrl.split('/privacy-policy/')[1]?.split(/[?#]/)[0];
    expect(canonicalDomain?.toLowerCase()).toBe(expectedDomain.toLowerCase());
  }
}
