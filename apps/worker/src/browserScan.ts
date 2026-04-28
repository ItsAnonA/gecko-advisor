// SPDX-License-Identifier: MIT
import type { Browser, Page, HTTPRequest } from 'puppeteer';
import type { Prisma } from '@prisma/client';
import { etldPlusOne } from '@gecko-advisor/shared';
import type { Lists } from './lists.js';
import { logger } from './logger.js';

/**
 * Evidence data structure matching scanner.ts EvidenceData.
 * Duplicated here to avoid circular imports.
 */
type EvidenceData = {
  scanId: string;
  kind: 'tracker' | 'thirdparty' | 'cookie' | 'fingerprint';
  severity: number;
  title: string;
  details: Prisma.InputJsonValue;
};

/** Collected network request info */
interface NetworkRequest {
  url: string;
  hostname: string;
  root: string;
  resourceType: string;
}

/** Options for browser scan */
export interface BrowserScanOptions {
  /** Scan ID for evidence records */
  scanId: string;
  /** URL to scan */
  url: string;
  /** eTLD+1 of the site being scanned */
  siteRoot: string;
  /** Privacy lists (EasyPrivacy, WhoTracks.me) */
  lists: Lists;
  /** Tracker roots already found by static scan (for dedup) */
  knownTrackers: Set<string>;
  /** Third-party hostnames already found by static scan (for dedup) */
  knownThirdParties: Set<string>;
  /** Total timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/** Result from browser scan */
export interface BrowserScanResult {
  evidence: EvidenceData[];
  /** Number of network requests observed */
  networkRequestCount: number;
  /** Number of unique third-party domains observed */
  thirdPartyCount: number;
  /** Whether the scan completed successfully */
  success: boolean;
  /** Error message if scan failed */
  error?: string;
}

/**
 * Launch a headless Chromium browser instance using Puppeteer's bundled Chromium.
 * Returns null if launch fails (logged at error level — browser scan silently
 * failing would corrupt tracker detection across the dataset).
 */
async function launchBrowser(): Promise<Browser | null> {
  try {
    const puppeteer = await import('puppeteer');
    // Use chrome-headless-shell (Chromium's lightweight headless binary).
    // The full Chrome binary's crashpad_handler subprocess fails to start in
    // our container environment ("--database is required" followed by
    // Trace/breakpoint trap), regardless of launch flags. chrome-headless-shell
    // uses a different IPC mechanism and launches cleanly.
    const browser = await puppeteer.default.launch({
      headless: 'shell',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        // Memory limits for container environments
        '--js-flags=--max-old-space-size=256',
      ],
    });
    return browser;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to launch Chromium — browser scan unavailable'
    );
    return null;
  }
}

/**
 * Perform a browser-based scan of a URL to detect JS-loaded trackers,
 * third-party requests, and cookies that the static HTTP fetch misses.
 *
 * This function is safe to call even if Chromium is not available —
 * it returns a failed result with empty evidence.
 *
 * Hard-timeout protection: an outer Promise.race wraps the entire scan.
 * If the inner work exceeds `hardTimeoutMs` (2× timeoutMs by default),
 * we SIGKILL the Chromium process and resolve with error="HARD_TIMEOUT".
 * This prevents the 17-minute zombie scans observed during Tier-A
 * backfill validation (2026-04-27).
 */
export async function browserScan(options: BrowserScanOptions): Promise<BrowserScanResult> {
  const innerTimeoutMs = options.timeoutMs ?? 30_000;
  const hardTimeoutMs = innerTimeoutMs * 2;
  // Shared mutable state so the hard-timeout handler can SIGKILL the
  // Chromium process even if the inner scan is wedged.
  const state: { browser: Browser | null } = { browser: null };

  const hardTimeoutPromise = new Promise<BrowserScanResult>((resolve) => {
    const timer = setTimeout(() => {
      logger.error(
        { scanId: options.scanId, url: options.url, hardTimeoutMs },
        'Browser scan exceeded hard timeout — SIGKILL Chromium',
      );
      try {
        const proc = state.browser?.process();
        proc?.kill('SIGKILL');
      } catch {
        // Best-effort kill
      }
      resolve({
        evidence: [],
        networkRequestCount: 0,
        thirdPartyCount: 0,
        success: false,
        error: 'HARD_TIMEOUT',
      });
    }, hardTimeoutMs);
    timer.unref?.();
  });

  return Promise.race([runBrowserScan(options, state), hardTimeoutPromise]);
}

async function runBrowserScan(
  options: BrowserScanOptions,
  state: { browser: Browser | null },
): Promise<BrowserScanResult> {
  const {
    scanId,
    url,
    siteRoot,
    lists,
    knownTrackers,
    knownThirdParties,
    timeoutMs = 30_000,
  } = options;

  // Union EasyPrivacy + EasyList (AdTech coverage). EasyList is optional
  // during the post-ingestion transition; absent → EasyPrivacy only.
  const trackerDomains = new Set([
    ...lists.easyprivacy.domains,
    ...(lists.easylist?.domains ?? []),
  ]);
  const fpDomains = new Set((lists.whotracks.fingerprinting ?? []).map((d: string) => d));

  const evidence: EvidenceData[] = [];
  const networkRequests: NetworkRequest[] = [];
  const seenTrackers = new Set<string>(knownTrackers);
  const seenThirdParties = new Set<string>(knownThirdParties);

  let page: Page | null = null;

  // Overall timeout guard
  const timeoutPromise = new Promise<'timeout'>((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), timeoutMs);
    timer.unref?.();
  });

  try {
    state.browser = await launchBrowser();
    if (!state.browser) {
      return {
        evidence: [],
        networkRequestCount: 0,
        thirdPartyCount: 0,
        success: false,
        error: 'Chromium not available',
      };
    }

    page = await state.browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Block heavy resources to speed up load and intercept network requests
    await page.setRequestInterception(true);
    page.on('request', (req: HTTPRequest) => {
      const resourceType = req.resourceType();

      // Collect all outgoing requests for third-party analysis
      try {
        const reqUrl = req.url();
        if (reqUrl.startsWith('http')) {
          const parsed = new URL(reqUrl);
          const hostname = parsed.hostname;
          const root = etldPlusOne(hostname) ?? hostname;

          networkRequests.push({
            url: reqUrl,
            hostname,
            root,
            resourceType,
          });
        }
      } catch {
        // Ignore malformed URLs
      }

      // Block images, fonts, media to speed up — we only care about script/xhr/fetch network activity
      if (['image', 'font', 'media'].includes(resourceType)) {
        void req.abort().catch(() => { /* ignore abort errors */ });
      } else {
        void req.continue().catch(() => { /* ignore continue errors */ });
      }
    });

    // Navigate and wait for JS to execute
    const navResult = await Promise.race([
      page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: timeoutMs - 5_000, // Leave 5s buffer for cookie collection
      }).catch((err: Error) => {
        // Navigation errors are common (timeouts, SSL, etc.) — log but don't throw
        logger.debug({ err: err.message, url }, 'Browser navigation error');
        return null;
      }),
      timeoutPromise,
    ]);

    if (navResult === 'timeout') {
      logger.warn({ scanId, url }, 'Browser scan timed out during navigation');
      // Still process whatever network requests we captured before timeout
    }

    // Wait additional 5 seconds for late-loading JS trackers (if we haven't timed out)
    if (navResult !== 'timeout') {
      await Promise.race([
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 5_000);
          timer.unref?.();
        }),
        timeoutPromise,
      ]);
    }

    // Collect cookies from the browser
    const cookies = await page.cookies().catch(() => [] as Awaited<ReturnType<Page['cookies']>>);

    // Process cookies — look for third-party cookies
    for (const cookie of cookies) {
      const cookieDomain = cookie.domain.replace(/^\./, ''); // Remove leading dot
      const cookieRoot = etldPlusOne(cookieDomain) ?? cookieDomain;

      if (cookieRoot !== siteRoot) {
        // Third-party cookie detected via browser
        const cookieKey = `${cookieDomain}:${cookie.name}`;
        if (!seenThirdParties.has(cookieKey)) {
          seenThirdParties.add(cookieKey);
          evidence.push({
            scanId,
            kind: 'cookie',
            severity: 2,
            title: `Third-party cookie: ${cookie.name} (${cookieDomain})`,
            details: {
              name: cookie.name,
              domain: cookieDomain,
              root: cookieRoot,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              sameSite: cookie.sameSite,
              expires: cookie.expires > 0 ? new Date(cookie.expires * 1000).toISOString() : 'session',
              scanMethod: 'browser',
            },
          });
        }
      }
    }

    // Process network requests — find third-parties and trackers
    const uniqueThirdPartyRoots = new Set<string>();

    for (const req of networkRequests) {
      const isThirdParty = req.root !== siteRoot;

      if (isThirdParty) {
        uniqueThirdPartyRoots.add(req.root);

        // Add third-party evidence (deduplicated by hostname)
        if (!seenThirdParties.has(req.hostname)) {
          seenThirdParties.add(req.hostname);
          evidence.push({
            scanId,
            kind: 'thirdparty',
            severity: 2,
            title: `Third-party request: ${req.hostname}`,
            details: {
              domain: req.hostname,
              root: req.root,
              fingerprinting: fpDomains.has(req.root),
              resourceType: req.resourceType,
              scanMethod: 'browser',
            },
          });
        }

        // Add tracker evidence (deduplicated by root domain)
        if (trackerDomains.has(req.root) && !seenTrackers.has(req.root)) {
          seenTrackers.add(req.root);
          evidence.push({
            scanId,
            kind: 'tracker',
            severity: 3,
            title: `Tracker matched: ${req.root}`,
            details: {
              domain: req.root,
              fingerprinting: fpDomains.has(req.root),
              resourceType: req.resourceType,
              scanMethod: 'browser',
            },
          });
        }
      }
    }

    // Check for fingerprinting scripts via JS evaluation
    // The function body runs in the browser context where document/canvas exist.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    try {
      const fpSignals = await page.evaluate(`
        (() => {
          const indicators = [];
          if (document.querySelector('canvas')) indicators.push('canvas_element');
          try {
            const c = document.createElement('canvas');
            if (c.getContext('webgl') || c.getContext('webgl2')) indicators.push('webgl_context');
          } catch {}
          return indicators;
        })()
      `).catch(() => [] as string[]) as string[];

      if (fpSignals.length > 0) {
        evidence.push({
          scanId,
          kind: 'fingerprint',
          severity: 3,
          title: 'Browser fingerprinting signals detected',
          details: {
            signals: fpSignals,
            scanMethod: 'browser',
          },
        });
      }
    } catch {
      // Fingerprint detection is best-effort
    }

    logger.info(
      {
        scanId,
        url,
        networkRequests: networkRequests.length,
        thirdPartyDomains: uniqueThirdPartyRoots.size,
        newEvidence: evidence.length,
      },
      'Browser scan completed'
    );

    return {
      evidence,
      networkRequestCount: networkRequests.length,
      thirdPartyCount: uniqueThirdPartyRoots.size,
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn({ scanId, url, error: errorMsg }, 'Browser scan failed — falling back to static-only results');

    return {
      evidence,
      networkRequestCount: networkRequests.length,
      thirdPartyCount: 0,
      success: false,
      error: errorMsg,
    };
  } finally {
    // Always close browser to prevent zombie Chromium processes.
    // If close hangs, the outer hard-timeout will SIGKILL the process.
    try {
      if (page) await page.close().catch(() => {});
      if (state.browser) await state.browser.close().catch(() => {});
    } catch {
      // Best-effort cleanup
    }
  }
}
