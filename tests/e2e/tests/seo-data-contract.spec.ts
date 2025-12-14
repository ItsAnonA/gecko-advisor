/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { expect, test } from '@playwright/test';

/**
 * SEO Data Contract Tests
 *
 * Verifies sitemap and data endpoints meet performance and reliability contracts:
 * 1. Response time under ceiling
 * 2. Output size under ceiling
 * 3. Never 500s even with flaky backend (return empty, not crash)
 */

// Thresholds
const THRESHOLDS = {
  // Response time ceilings (ms)
  sitemapIndex: 2000, // 2 seconds for sitemap index
  sitemapChunk: 5000, // 5 seconds for sitemap chunks (may hit DB)
  robotsTxt: 500, // 500ms for static robots.txt
  privacyPolicy: 10000, // 10 seconds for SSR page (includes data fetch)

  // Output size ceilings (bytes)
  sitemapIndexMax: 100 * 1024, // 100KB for sitemap index
  sitemapChunkMax: 5 * 1024 * 1024, // 5MB per sitemap chunk (Google limit is 50MB)
  robotsTxtMax: 10 * 1024, // 10KB for robots.txt
  privacyPolicyMax: 500 * 1024, // 500KB for HTML page

  // Minimum output sizes (to detect empty responses)
  sitemapIndexMin: 100, // At least 100 bytes
  robotsTxtMin: 50, // At least 50 bytes
};

test.describe('Sitemap Data Contract', () => {
  test.describe('Response Time', () => {
    test('sitemap.xml responds within ceiling', async ({ request }) => {
      const start = Date.now();
      const response = await request.get('/sitemap.xml');
      const duration = Date.now() - start;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.sitemapIndex);

      console.log(`📊 Sitemap index response time: ${duration}ms (limit: ${THRESHOLDS.sitemapIndex}ms)`);
    });

    test('robots.txt responds within ceiling', async ({ request }) => {
      const start = Date.now();
      const response = await request.get('/robots.txt');
      const duration = Date.now() - start;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(THRESHOLDS.robotsTxt);

      console.log(`📊 robots.txt response time: ${duration}ms (limit: ${THRESHOLDS.robotsTxt}ms)`);
    });

    test('privacy policy page responds within ceiling', async ({ request }) => {
      const start = Date.now();
      const response = await request.get('/privacy-policy/google.com');
      const duration = Date.now() - start;

      // 404 is acceptable if domain not in DB
      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        expect(duration).toBeLessThan(THRESHOLDS.privacyPolicy);
        console.log(
          `📊 Privacy policy page response time: ${duration}ms (limit: ${THRESHOLDS.privacyPolicy}ms)`
        );
      }
    });
  });

  test.describe('Output Size', () => {
    test('sitemap.xml size within limits', async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      const body = await response.body();

      expect(response.status()).toBe(200);
      expect(body.length).toBeGreaterThan(THRESHOLDS.sitemapIndexMin);
      expect(body.length).toBeLessThan(THRESHOLDS.sitemapIndexMax);

      console.log(
        `📊 Sitemap index size: ${(body.length / 1024).toFixed(1)}KB (limit: ${THRESHOLDS.sitemapIndexMax / 1024}KB)`
      );
    });

    test('robots.txt size within limits', async ({ request }) => {
      const response = await request.get('/robots.txt');
      const body = await response.body();

      expect(response.status()).toBe(200);
      expect(body.length).toBeGreaterThan(THRESHOLDS.robotsTxtMin);
      expect(body.length).toBeLessThan(THRESHOLDS.robotsTxtMax);

      console.log(
        `📊 robots.txt size: ${body.length} bytes (limit: ${THRESHOLDS.robotsTxtMax} bytes)`
      );
    });

    test('privacy policy page size within limits', async ({ request }) => {
      const response = await request.get('/privacy-policy/google.com');

      if (response.status() === 404) {
        test.skip(true, 'Domain not in database');
        return;
      }

      const body = await response.body();

      expect(body.length).toBeLessThan(THRESHOLDS.privacyPolicyMax);

      console.log(
        `📊 Privacy policy page size: ${(body.length / 1024).toFixed(1)}KB (limit: ${THRESHOLDS.privacyPolicyMax / 1024}KB)`
      );
    });
  });

  test.describe('Graceful Degradation', () => {
    test('sitemap never returns 500', async ({ request }) => {
      // Test multiple sitemap endpoints
      const endpoints = ['/sitemap.xml', '/sitemap-reports-1.xml', '/sitemap-reports-2.xml'];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);

        // Should never 500 - return empty or 404 instead
        expect(response.status()).not.toBe(500);
        expect(response.status()).not.toBe(502);
        expect(response.status()).not.toBe(503);

        // Valid responses are 200 (data) or 404 (no data)
        expect([200, 404]).toContain(response.status());
      }
    });

    test('privacy policy returns 404 for unknown domain (not 500)', async ({ request }) => {
      // Use a clearly invalid domain that won't exist
      const response = await request.get('/privacy-policy/this-domain-definitely-does-not-exist-xyz123.com');

      // Should be 404, not 500
      expect(response.status()).toBe(404);
    });

    test('privacy policy handles malicious input gracefully', async ({ request }) => {
      // Test various edge cases that might cause errors
      const maliciousInputs = [
        '/privacy-policy/<script>alert(1)</script>',
        '/privacy-policy/../../../etc/passwd',
        '/privacy-policy/' + 'a'.repeat(1000), // Very long input
        '/privacy-policy/%00%00%00', // Null bytes
        '/privacy-policy/--invalid--',
      ];

      for (const input of maliciousInputs) {
        const response = await request.get(input);

        // Should never 500
        expect(response.status()).not.toBe(500);

        // Should be 400 (bad request) or 404 (not found)
        expect([400, 404]).toContain(response.status());
      }
    });
  });

  test.describe('Sitemap XML Validity', () => {
    test('sitemap has valid XML structure', async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      const xml = await response.text();

      // Must start with XML declaration or sitemap element
      expect(xml).toMatch(/^(<\?xml|<sitemapindex|<urlset)/);

      // Must have proper closing tags
      if (xml.includes('<sitemapindex')) {
        expect(xml).toContain('</sitemapindex>');
      }
      if (xml.includes('<urlset')) {
        expect(xml).toContain('</urlset>');
      }

      // Must have xmlns attribute
      expect(xml).toContain('xmlns');
    });

    test('sitemap URLs are valid', async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      const xml = await response.text();

      // Extract all loc elements
      const locs = xml.match(/<loc>([^<]+)<\/loc>/g) || [];

      for (const loc of locs) {
        const url = loc.replace(/<\/?loc>/g, '');

        // URL must be absolute
        expect(url).toMatch(/^https?:\/\//);

        // URL must not contain invalid characters
        expect(url).not.toContain(' ');
        expect(url).not.toContain('<');
        expect(url).not.toContain('>');

        // URL must be properly encoded
        expect(url).not.toMatch(/[^\x00-\x7F](?![^&]*;)/); // Non-ASCII must be encoded
      }
    });

    test('sitemap lastmod dates are valid', async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      const xml = await response.text();

      // Extract all lastmod elements
      const lastmods = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];

      for (const lastmod of lastmods) {
        const dateStr = lastmod.replace(/<\/?lastmod>/g, '');

        // Must not be "Invalid Date"
        expect(dateStr).not.toContain('Invalid');

        // Must be valid ISO date
        const date = new Date(dateStr);
        expect(date.toString()).not.toBe('Invalid Date');

        // Must not be in the future
        expect(date.getTime()).toBeLessThanOrEqual(Date.now() + 86400000); // Allow 1 day buffer
      }
    });
  });

  test.describe('Concurrent Request Handling', () => {
    test('handles 10 concurrent sitemap requests', async ({ request }) => {
      const requests = Array(10)
        .fill(null)
        .map(() => request.get('/sitemap.xml'));

      const responses = await Promise.all(requests);

      for (const response of responses) {
        expect(response.status()).toBe(200);
      }
    });

    test('handles 10 concurrent privacy policy requests', async ({ request }) => {
      const domains = [
        'google.com',
        'facebook.com',
        'twitter.com',
        'amazon.com',
        'microsoft.com',
        'apple.com',
        'netflix.com',
        'youtube.com',
        'reddit.com',
        'wikipedia.org',
      ];

      const requests = domains.map((domain) => request.get(`/privacy-policy/${domain}`));

      const responses = await Promise.all(requests);

      for (const response of responses) {
        // Accept 200 or 404 (if domain not in DB), but never 500
        expect([200, 404]).toContain(response.status());
      }
    });
  });
});

test.describe('SEO Endpoint Caching', () => {
  test('sitemap has appropriate cache headers', async ({ request }) => {
    const response = await request.get('/sitemap.xml');

    // Should have cache control headers
    const cacheControl = response.headers()['cache-control'];

    // Sitemap should be cacheable
    if (cacheControl) {
      // Should not be no-store
      expect(cacheControl).not.toContain('no-store');

      // Should have reasonable max-age (at least 1 minute)
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        expect(parseInt(maxAgeMatch[1])).toBeGreaterThan(60);
      }
    }
  });

  test('robots.txt has appropriate cache headers', async ({ request }) => {
    const response = await request.get('/robots.txt');

    const cacheControl = response.headers()['cache-control'];

    // robots.txt should be heavily cached
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        // Should be cached for at least 1 hour
        expect(parseInt(maxAgeMatch[1])).toBeGreaterThan(3600);
      }
    }
  });
});
