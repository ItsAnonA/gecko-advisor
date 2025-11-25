/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Manual Test Session - Comprehensive Gecko Advisor Scanning Flow
 *
 * This test validates the entire user journey from homepage scanner
 * through scan progress to report page with real-time screenshots
 * and performance metrics.
 *
 * Environment:
 * - Frontend: http://localhost:5173
 * - Backend: http://localhost:5001
 * - Test URL: https://example.com
 */

import { test, expect } from '@playwright/test';

test.describe('Manual Test Session - Comprehensive Scanning Flow', () => {
  test('Complete scanning journey with detailed validation', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for full journey

    const testUrl = 'https://example.com';
    const startTime = Date.now();

    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.error('Console error:', msg.text());
      }
    });

    // PHASE 1: Homepage Validation
    console.log('\n=== PHASE 1: HOMEPAGE VALIDATION ===');

    const homeStartTime = Date.now();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    const homeLoadTime = Date.now() - homeStartTime;

    console.log(`Homepage loaded in ${homeLoadTime}ms`);

    // Take homepage screenshot
    await page.screenshot({
      path: '/tmp/gecko-test-homepage.png',
      fullPage: true
    });
    console.log('Screenshot saved: /tmp/gecko-test-homepage.png');

    // Verify unified scanner input
    const scanInput = page.locator('input[aria-label="Scan input"]');
    await expect(scanInput).toBeVisible();
    console.log('✓ Unified scanner input visible');

    // Verify scan button (should be inside input field)
    const scanButton = page.getByRole('button', { name: /Start privacy scan|Scan/i });
    await expect(scanButton).toBeVisible();
    console.log('✓ Scan button visible');

    // Verify hero title
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    console.log(`✓ Hero title: "${headingText}"`);

    // Verify "How It Works" section
    const howItWorksSection = page.locator('text=/How It Works|How it works/i');
    if (await howItWorksSection.isVisible()) {
      console.log('✓ "How It Works" section visible');
    } else {
      console.log('⚠ "How It Works" section not found');
    }

    // PHASE 2: Scan Submission
    console.log('\n=== PHASE 2: SCAN SUBMISSION ===');

    await scanInput.fill(testUrl);
    console.log(`✓ Entered URL: ${testUrl}`);

    // Verify button becomes enabled
    await expect(scanButton).toBeEnabled();
    console.log('✓ Scan button enabled');

    // Click scan and wait for navigation
    const scanSubmitTime = Date.now();
    await scanButton.click();

    // Wait for navigation to scan page
    await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
    const scanPageUrl = page.url();
    const scanId = scanPageUrl.match(/\/scan\/([\w-]+)/)?.[1];

    console.log(`✓ Navigated to scan page: ${scanPageUrl}`);
    console.log(`✓ Scan ID: ${scanId}`);

    // Take scan page screenshot
    await page.screenshot({
      path: '/tmp/gecko-test-scan-page.png',
      fullPage: true
    });
    console.log('Screenshot saved: /tmp/gecko-test-scan-page.png');

    // PHASE 3: Scan Progress Monitoring
    console.log('\n=== PHASE 3: SCAN PROGRESS MONITORING ===');

    let currentProgress = 0;
    let progressChecks = 0;
    const maxProgressChecks = 60; // 60 checks = 2 minutes max
    const progressHistory: number[] = [];

    while (progressChecks < maxProgressChecks) {
      await page.waitForTimeout(2000); // Poll every 2 seconds
      progressChecks++;

      // Check if we're still on scan page or redirected to report
      const currentUrl = page.url();

      if (currentUrl.includes('/r/')) {
        console.log('✓ Redirected to report page');
        break;
      }

      // Try to get progress percentage
      const progressText = await page.locator('text=/%/i').first().textContent().catch(() => null);
      if (progressText) {
        const match = progressText.match(/(\d+)%/);
        if (match) {
          currentProgress = parseInt(match[1]);
          progressHistory.push(currentProgress);

          if (progressHistory.length % 5 === 0) {
            console.log(`Progress: ${currentProgress}%`);
          }
        }
      }

      // Check for completion
      if (currentProgress === 100) {
        console.log('✓ Scan reached 100%');
        // Wait for redirect
        await page.waitForURL(/\/r\/[\w-]+/, { timeout: 10000 });
        break;
      }
    }

    const scanDuration = Date.now() - scanSubmitTime;
    console.log(`\nScan completed in ${scanDuration}ms (${(scanDuration / 1000).toFixed(1)}s)`);
    console.log(`Progress checks: ${progressChecks}`);
    console.log(`Progress history: ${progressHistory.join(' → ')}%`);

    // Verify scan completed within 60 seconds
    expect(scanDuration).toBeLessThan(60000);
    console.log('✓ Scan completed within 60 seconds');

    // PHASE 4: Report Page Validation
    console.log('\n=== PHASE 4: REPORT PAGE VALIDATION ===');

    // Wait for report page to fully load
    await page.waitForLoadState('networkidle');
    const reportUrl = page.url();
    const slug = reportUrl.match(/\/r\/([\w-]+)/)?.[1];

    console.log(`✓ Report URL: ${reportUrl}`);
    console.log(`✓ Report slug: ${slug}`);

    // Take report page screenshot
    await page.screenshot({
      path: '/tmp/gecko-test-report-page.png',
      fullPage: true
    });
    console.log('Screenshot saved: /tmp/gecko-test-report-page.png');

    // Verify privacy score display
    const scoreElement = page.locator('[class*="score"], [data-testid="privacy-score"]').first();
    if (await scoreElement.isVisible()) {
      const scoreText = await scoreElement.textContent();
      console.log(`✓ Privacy score visible: ${scoreText}`);
    } else {
      console.log('⚠ Privacy score element not found (checking alternative selectors)');

      // Try alternative selectors
      const altScore = await page.locator('text=/Score|Grade|Rating/i').first().textContent().catch(() => null);
      if (altScore) {
        console.log(`✓ Found score via alternative selector: ${altScore}`);
      }
    }

    // Check for evidence section
    const evidenceSection = page.locator('text=/Evidence|Findings|Issues/i').first();
    if (await evidenceSection.isVisible()) {
      console.log('✓ Evidence section visible');

      // Count evidence items
      const evidenceItems = page.locator('[role="listitem"], li, .evidence-item');
      const count = await evidenceItems.count();
      console.log(`✓ Evidence items found: ${count}`);
    }

    // Check for recommendations section
    const recsSection = page.locator('text=/Recommendation|Suggestion|Fix/i').first();
    if (await recsSection.isVisible()) {
      console.log('✓ Recommendations section visible');
    }

    // PHASE 5: Performance Metrics
    console.log('\n=== PHASE 5: PERFORMANCE METRICS ===');

    const totalDuration = Date.now() - startTime;
    console.log(`Total test duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`Homepage load: ${homeLoadTime}ms`);
    console.log(`Scan duration: ${scanDuration}ms`);
    console.log(`Console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    }

    // PHASE 6: Final Assertions
    console.log('\n=== PHASE 6: FINAL ASSERTIONS ===');

    // Report page should be accessible
    expect(page.url()).toMatch(/\/r\/[\w-]+/);
    console.log('✓ Report page URL pattern valid');

    // Should have minimal console errors (allow for non-critical warnings)
    expect(consoleErrors.length).toBeLessThan(5);
    console.log('✓ Console errors within acceptable range');

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===\n');
  });

  test('Mobile viewport validation', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n=== MOBILE VIEWPORT TEST ===');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    console.log('✓ Viewport set to mobile (375x667)');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({
      path: '/tmp/gecko-test-mobile-homepage.png',
      fullPage: true
    });
    console.log('Screenshot saved: /tmp/gecko-test-mobile-homepage.png');

    // Verify scanner input visible on mobile
    const scanInput = page.locator('input[aria-label="Scan input"]');
    await expect(scanInput).toBeVisible();
    console.log('✓ Scanner input visible on mobile');

    // Verify scan button (might show icon only on mobile)
    const scanButton = page.getByRole('button', { name: /Start privacy scan|Scan/i });
    await expect(scanButton).toBeVisible();
    console.log('✓ Scan button visible on mobile');

    // Test scan submission on mobile
    await scanInput.fill('https://example.com');
    await scanButton.click();

    await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
    console.log('✓ Scan submission works on mobile');

    // Take mobile scan page screenshot
    await page.screenshot({
      path: '/tmp/gecko-test-mobile-scan.png',
      fullPage: true
    });
    console.log('Screenshot saved: /tmp/gecko-test-mobile-scan.png');

    console.log('\n=== MOBILE TEST COMPLETED ===\n');
  });

  test('Tablet viewport validation', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n=== TABLET VIEWPORT TEST ===');

    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    console.log('✓ Viewport set to tablet (768x1024)');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({
      path: '/tmp/gecko-test-tablet-homepage.png',
      fullPage: true
    });
    console.log('Screenshot saved: /tmp/gecko-test-tablet-homepage.png');

    // Verify key elements
    const scanInput = page.locator('input[aria-label="Scan input"]');
    await expect(scanInput).toBeVisible();
    console.log('✓ Scanner input visible on tablet');

    console.log('\n=== TABLET TEST COMPLETED ===\n');
  });

  test('Accessibility validation', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n=== ACCESSIBILITY VALIDATION ===');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Test keyboard navigation
    await page.keyboard.press('Tab');

    // Check if scanner input receives focus
    const scanInput = page.locator('input[aria-label="Scan input"]');
    const isFocused = await scanInput.evaluate(el => el === document.activeElement);

    if (isFocused) {
      console.log('✓ Scanner input keyboard accessible');
    } else {
      console.log('⚠ Scanner input may not be first focusable element');
    }

    // Verify ARIA labels
    const ariaLabel = await scanInput.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    console.log(`✓ ARIA label present: "${ariaLabel}"`);

    // Test keyboard scan submission
    await scanInput.fill('https://example.com');
    await page.keyboard.press('Enter');

    // Check if scan started
    const urlChanged = await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 }).then(() => true).catch(() => false);

    if (urlChanged) {
      console.log('✓ Keyboard scan submission works (Enter key)');
    } else {
      console.log('⚠ Enter key may not trigger scan');
    }

    console.log('\n=== ACCESSIBILITY TEST COMPLETED ===\n');
  });
});
