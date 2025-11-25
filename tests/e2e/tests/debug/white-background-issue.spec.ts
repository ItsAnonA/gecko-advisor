/**
 * DEBUG TEST: White Background Issue on Report Page
 * 
 * This test reproduces and documents the reported issue where the report page
 * shows a white background instead of the expected dark video background.
 * 
 * ISSUE SUMMARY:
 * - Homepage: Background video displays correctly
 * - Report page: White/light background overrides video background
 * 
 * Expected: Dark video background with 35% opacity on ALL pages
 * Actual: White background on report page
 */

import { test, expect } from '@playwright/test';

test.describe('Background Video Issue Investigation', () => {
  
  test('should document background rendering on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for comparison
    await page.screenshot({ 
      path: 'test-results/homepage-background.png',
      fullPage: true 
    });
    
    // Check if video element exists
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible({ timeout: 10000 });
    
    // Verify video is playing
    const isPaused = await videoElement.evaluate((video: HTMLVideoElement) => video.paused);
    expect(isPaused).toBe(false);
    
    // Check video opacity
    const videoOpacity = await videoElement.evaluate((video: HTMLVideoElement) => {
      return window.getComputedStyle(video).opacity;
    });
    console.log('Homepage video opacity:', videoOpacity);
    
    // Check body background color
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('Homepage body background:', bodyBgColor);
    
    // Check if dark class is applied
    const htmlClasses = await page.locator('html').getAttribute('class');
    console.log('Homepage HTML classes:', htmlClasses);
    expect(htmlClasses).toContain('dark');
  });
  
  test('should navigate to report page and document background', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find and click "View Report" button from recent scans
    const viewReportLinks = page.getByRole('link', { name: /view report/i });
    const firstLink = viewReportLinks.first();
    
    // Check if recent reports exist
    const hasReports = await viewReportLinks.count() > 0;
    
    if (!hasReports) {
      console.log('No recent reports found - creating new scan');
      
      // Submit a scan
      const urlInput = page.getByLabel(/website url/i);
      await urlInput.fill('https://example.com');
      
      const scanButton = page.getByRole('button', { name: /scan/i });
      await scanButton.click();
      
      // Wait for redirect to scan progress page
      await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
      
      // Wait for scan to complete (redirect to report page)
      await page.waitForURL(/\/r\/[\w-]+/, { timeout: 65000 });
    } else {
      // Click first available report
      await firstLink.click();
      await page.waitForURL(/\/r\/[\w-]+/);
    }
    
    // Now on report page - wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow animations to complete
    
    // Take screenshot for comparison
    await page.screenshot({ 
      path: 'test-results/report-page-background-ISSUE.png',
      fullPage: true 
    });
    
    // Check if video element exists
    const videoElement = page.locator('video');
    const videoExists = await videoElement.count() > 0;
    console.log('Report page - Video element exists:', videoExists);
    
    if (videoExists) {
      const videoVisible = await videoElement.isVisible();
      console.log('Report page - Video visible:', videoVisible);
      
      // Check video opacity
      const videoOpacity = await videoElement.evaluate((video: HTMLVideoElement) => {
        return window.getComputedStyle(video).opacity;
      });
      console.log('Report page - Video opacity:', videoOpacity);
      
      // Check z-index
      const videoZIndex = await videoElement.evaluate((video: HTMLVideoElement) => {
        return window.getComputedStyle(video.parentElement!).zIndex;
      });
      console.log('Report page - Video container z-index:', videoZIndex);
    }
    
    // Check body background color
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('Report page - Body background:', bodyBgColor);
    
    // Check body classes
    const bodyClasses = await page.locator('body').getAttribute('class');
    console.log('Report page - Body classes:', bodyClasses);
    
    // Check HTML classes
    const htmlClasses = await page.locator('html').getAttribute('class');
    console.log('Report page - HTML classes:', htmlClasses);
    expect(htmlClasses).toContain('dark');
    
    // Check if Layout component rendered
    const mainContent = page.locator('main');
    const mainClasses = await mainContent.getAttribute('class');
    console.log('Report page - Main element classes:', mainClasses);
    
    // Get computed background color of main element
    const mainBgColor = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Report page - Main background:', mainBgColor);
    
    // Check if #root has background override
    const rootBgColor = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? window.getComputedStyle(root).backgroundColor : 'N/A';
    });
    console.log('Report page - Root background:', rootBgColor);
    
    // CRITICAL CHECK: Verify body does not have bg-slate-50 class
    const hasBgSlate50 = bodyClasses?.includes('bg-slate-50');
    if (hasBgSlate50) {
      console.error('ISSUE FOUND: body has bg-slate-50 class (light gray background)');
      console.error('This overrides the dark video background!');
    }
    
    // Compare RGB values to detect white/light background
    const rgbMatch = bodyBgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch.map(Number);
      const isLightBackground = r > 200 && g > 200 && b > 200;
      
      if (isLightBackground) {
        console.error('ISSUE CONFIRMED: Body background is light/white');
        console.error(`RGB values: R=${r}, G=${g}, B=${b}`);
        console.error('Expected: Dark background (R,G,B < 50)');
      }
    }
  });
  
  test('should compare background consistency between pages', async ({ page }) => {
    // Visit homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const homepageBodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    const homepageVideoExists = await page.locator('video').count() > 0;
    
    // Navigate to report page (use first available or create scan)
    const viewReportLinks = page.getByRole('link', { name: /view report/i });
    const hasReports = await viewReportLinks.count() > 0;
    
    if (hasReports) {
      await viewReportLinks.first().click();
      await page.waitForURL(/\/r\/[\w-]+/);
    } else {
      // Create scan
      await page.getByLabel(/website url/i).fill('https://example.com');
      await page.getByRole('button', { name: /scan/i }).click();
      await page.waitForURL(/\/scan\/[\w-]+/, { timeout: 10000 });
      await page.waitForURL(/\/r\/[\w-]+/, { timeout: 65000 });
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const reportPageBodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    const reportPageVideoExists = await page.locator('video').count() > 0;
    
    // Compare results
    console.log('=== COMPARISON REPORT ===');
    console.log('Homepage:');
    console.log('  - Body background:', homepageBodyBg);
    console.log('  - Video element exists:', homepageVideoExists);
    console.log('');
    console.log('Report Page:');
    console.log('  - Body background:', reportPageBodyBg);
    console.log('  - Video element exists:', reportPageVideoExists);
    console.log('');
    console.log('Consistency:', homepageBodyBg === reportPageBodyBg ? 'PASS' : 'FAIL');
    
    if (homepageBodyBg !== reportPageBodyBg) {
      console.error('ISSUE: Background color is inconsistent between pages!');
      console.error(`Homepage: ${homepageBodyBg}`);
      console.error(`Report page: ${reportPageBodyBg}`);
    }
    
    // This assertion will fail if backgrounds are different
    // expect(homepageBodyBg).toBe(reportPageBodyBg);
  });
  
  test('should inspect BackgroundVideo component rendering', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check BackgroundVideo component structure
    const videoContainer = page.locator('div').filter({ has: page.locator('video') }).first();
    
    if (await videoContainer.count() > 0) {
      const containerClasses = await videoContainer.getAttribute('class');
      console.log('Video container classes:', containerClasses);
      
      // Check if container has fixed positioning and negative z-index
      const containerStyles = await videoContainer.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          zIndex: styles.zIndex,
          inset: styles.inset,
          top: styles.top,
          left: styles.left,
          right: styles.right,
          bottom: styles.bottom
        };
      });
      console.log('Video container computed styles:', containerStyles);
      
      // Verify expected positioning
      expect(containerStyles.position).toBe('fixed');
      expect(containerStyles.zIndex).toBe('-10');
    }
    
    // Navigate to report page
    const viewReportLinks = page.getByRole('link', { name: /view report/i });
    if (await viewReportLinks.count() > 0) {
      await viewReportLinks.first().click();
      await page.waitForURL(/\/r\/[\w-]+/);
      await page.waitForLoadState('networkidle');
      
      // Check if video container still exists on report page
      const reportVideoContainer = page.locator('div').filter({ has: page.locator('video') }).first();
      const exists = await reportVideoContainer.count() > 0;
      console.log('Report page - Video container exists:', exists);
      
      if (exists) {
        const reportContainerStyles = await reportVideoContainer.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            position: styles.position,
            zIndex: styles.zIndex,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity
          };
        });
        console.log('Report page - Video container styles:', reportContainerStyles);
      }
    }
  });
});

test.describe('Root Cause Analysis', () => {
  
  test('should verify body class issue in index.html', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check body classes on initial load
    const bodyClasses = await page.locator('body').getAttribute('class');
    console.log('Body classes on load:', bodyClasses);
    
    // ISSUE: index.html has <body class="bg-slate-50">
    // This is a light gray Tailwind class that overrides dark background
    if (bodyClasses?.includes('bg-slate-50')) {
      console.error('ROOT CAUSE FOUND:');
      console.error('  File: apps/frontend/index.html (line 57)');
      console.error('  Issue: <body class="bg-slate-50">');
      console.error('  Impact: Light gray background overrides video background');
      console.error('  Fix: Change to <body class="bg-dark-bg"> or remove class entirely');
    }
    
    // Verify dark mode is forced in main.tsx
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');
    
    // Check if styles.css dark mode is applied
    const htmlBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).backgroundColor;
    });
    console.log('HTML background color:', htmlBgColor);
    
    // Expected: Should be #0a0e17 (dark) from styles.css
    // But body.bg-slate-50 overrides this!
  });
});
