// SPDX-License-Identifier: MIT
import type { Prisma, PrismaClient } from '@prisma/client';
import { load as loadHtml } from 'cheerio';
import { normalizeUrl, etldPlusOne, buildReportPayload, buildReportStorageKey } from '@gecko-advisor/shared';
import { getLists } from './lists.js';
import { logger } from './logger.js';
import { objectStorage } from './objectStorage.js';
import { config } from './config.js';
import { ProgressThrottle } from './utils/progressThrottle.js';
import { browserScan } from './browserScan.js';

// Standard bot User-Agent with info URL for site operators
const BOT_USER_AGENT = 'Mozilla/5.0 (compatible; GeckoAdvisorBot/1.0; +https://geckoadvisor.com/bot)';

/**
 * Error codes for scan failures.
 * Stored in Scan.meta for observability and retry decisions.
 */
export type ScanErrorCode =
  | 'SITE_UNREACHABLE'   // No pages could be fetched at all
  | 'TIMEOUT'            // Fetch timed out (AbortError)
  | 'DNS_FAILURE'        // Domain doesn't resolve (ENOTFOUND, EAI_AGAIN)
  | 'CONNECTION_REFUSED' // Server refused connection (ECONNREFUSED)
  | 'SSL_ERROR'          // TLS/SSL handshake failure
  | 'BLOCKED'            // HTTP 403 on all pages
  | 'RATE_LIMITED'       // HTTP 429 on all pages
  | 'SERVER_ERROR';      // HTTP 5xx on all pages

/** Classify a fetch error into a ScanErrorCode */
function classifyFetchError(error: unknown): ScanErrorCode {
  if (!(error instanceof Error)) return 'SITE_UNREACHABLE';
  const msg = error.message.toLowerCase();
  const cause = (error as { cause?: { code?: string } }).cause?.code?.toLowerCase() ?? '';

  if (error.name === 'AbortError' || msg.includes('abort')) return 'TIMEOUT';
  if (cause.includes('enotfound') || cause.includes('eai_again') || msg.includes('enotfound')) return 'DNS_FAILURE';
  if (cause.includes('econnrefused') || msg.includes('econnrefused')) return 'CONNECTION_REFUSED';
  if (cause.includes('econnreset') || msg.includes('econnreset')) return 'SITE_UNREACHABLE';
  if (msg.includes('ssl') || msg.includes('tls') || msg.includes('cert')) return 'SSL_ERROR';
  return 'SITE_UNREACHABLE';
}

/**
 * Sanitizes HTML content to prevent XSS attacks by removing dangerous elements and attributes.
 */
function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Limit HTML size to prevent DoS attacks
  if (html.length > 1_000_000) { // 1MB limit
    html = html.substring(0, 1_000_000);
  }

  // Remove dangerous script tags and their content
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>/gi, '');

  // Remove dangerous attributes that can execute JavaScript
  html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ''); // onclick, onload, etc.
  html = html.replace(/\s+javascript\s*:/gi, '');
  html = html.replace(/\s+data\s*:/gi, '');
  html = html.replace(/\s+vbscript\s*:/gi, '');

  // Remove potentially dangerous tags
  html = html.replace(/<(iframe|embed|object|applet|meta|base)[^>]*>/gi, '');
  html = html.replace(/<\/(iframe|embed|object|applet|meta|base)>/gi, '');

  return html;
}

/**
 * Validates and sanitizes URLs to prevent SSRF and other URL-based attacks.
 */
function sanitizeUrl(url: string, baseUrl?: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim and limit length
  url = url.trim();
  if (url.length === 0 || url.length > 2048) {
    return null;
  }

  try {
    let resolvedUrl: URL;

    // Try to resolve relative URLs
    if (baseUrl) {
      resolvedUrl = new URL(url, baseUrl);
    } else {
      resolvedUrl = new URL(url);
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(resolvedUrl.protocol)) {
      return null;
    }

    // Prevent access to private networks
    const hostname = resolvedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.2') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.') ||
        hostname.startsWith('169.254.')) {
      return null;
    }

    return resolvedUrl.href;
  } catch {
    return null;
  }
}

const SECURITY_HEADERS = [
  'content-security-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'permissions-policy',
] as const;

type ThirdPartyEvidence = {
  scanId: string;
  hostname: string;
  root: string;
  fingerprinting: boolean;
};

type EvidenceData = {
  scanId: string;
  kind: Prisma.EvidenceCreateManyInput['kind'];
  severity: number;
  title: string;
  details: Prisma.InputJsonValue;
};

type FetchResponse = {
  headers: Headers;
  text(): Promise<string>;
};

type FixtureFetch = {
  html: string;
};

const isHeaders = (value: unknown): value is Headers =>
  typeof value === 'object' && value !== null && 'has' in (value as Headers);

function timeoutAbort(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

async function gradeTls(u: URL): Promise<'A+' | 'A' | 'B' | 'C' | 'D' | 'F'> {
  if (u.protocol !== 'https:') return 'F';

  try {
    const tls = await import('node:tls');
    const { Socket } = await import('node:net');

    const result = await new Promise<{ protocol: string; authorized: boolean }>((resolve, reject) => {
      const socket = new Socket();
      socket.setTimeout(5_000);

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('TLS connection timed out'));
      });

      const tlsSocket = tls.connect(
        {
          host: u.hostname,
          port: Number(u.port) || 443,
          socket,
          servername: u.hostname,
          rejectUnauthorized: false, // We check authorization separately
        },
        () => {
          const protocol = tlsSocket.getProtocol() ?? 'unknown';
          const authorized = tlsSocket.authorized;
          tlsSocket.destroy();
          resolve({ protocol, authorized });
        }
      );

      tlsSocket.on('error', (err) => {
        tlsSocket.destroy();
        reject(err);
      });

      socket.connect({ host: u.hostname, port: Number(u.port) || 443 });
    });

    // Grade based on protocol version and certificate validity
    // F: No TLS or invalid cert
    // D: TLS 1.0/1.1 (deprecated)
    // C: TLS 1.2 with invalid cert
    // B: TLS 1.2 with valid cert
    // A: TLS 1.3 with valid cert OR TLS 1.2 with valid cert (baseline good)
    // A+: Handled by caller if HSTS is also present

    if (!result.authorized) {
      // Invalid/expired/self-signed certificate
      if (result.protocol === 'TLSv1.3') return 'C';
      return 'D';
    }

    if (result.protocol === 'TLSv1' || result.protocol === 'TLSv1.1') {
      return 'D'; // Deprecated protocols
    }

    if (result.protocol === 'TLSv1.3') {
      return 'A'; // Best protocol + valid cert (A+ requires HSTS, checked later)
    }

    // TLSv1.2 + valid cert
    return 'B';
  } catch {
    // TLS check failed - return B as a safe default (site is HTTPS but we couldn't probe details)
    return 'B';
  }
}

async function loadFixture(hostname: string): Promise<FixtureFetch | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const slug = hostname.split('.')[0] ?? 'example';
    const file = path.resolve(process.cwd(), 'tests', 'fixtures', slug, 'index.html');
    const html = await readFile(file, 'utf8');
    return { html };
  } catch {
    return null;
  }
}

/** Result from fetchPage with error classification */
type FetchResult =
  | { ok: true; response: FetchResponse; status: number }
  | { ok: false; errorCode: ScanErrorCode; status?: number };

async function fetchPage(curr: string, hostname: string, timeoutMs: number): Promise<FetchResult> {
  if (process.env.USE_FIXTURES === '1' && hostname.endsWith('.test')) {
    const fixture = await loadFixture(hostname);
    if (!fixture) return { ok: false, errorCode: 'SITE_UNREACHABLE' };
    const headers = new Headers({ 'content-type': 'text/html' });
    return { ok: true, response: { headers, text: async () => fixture.html } satisfies FetchResponse, status: 200 };
  }

  try {
    const response = await fetch(curr, {
      redirect: 'follow',
      headers: { 'user-agent': BOT_USER_AGENT },
      signal: timeoutAbort(timeoutMs),
    });

    // Classify HTTP status errors
    if (response.status === 403) return { ok: false, errorCode: 'BLOCKED', status: 403 };
    if (response.status === 429) return { ok: false, errorCode: 'RATE_LIMITED', status: 429 };
    if (response.status >= 500) return { ok: false, errorCode: 'SERVER_ERROR', status: response.status };
    // Treat other 4xx (except 404) as unreachable for this page
    if (response.status >= 400) return { ok: false, errorCode: 'SITE_UNREACHABLE', status: response.status };

    return { ok: true, response: response as FetchResponse, status: response.status };
  } catch (error) {
    return { ok: false, errorCode: classifyFetchError(error) };
  }
}

function collectHeaderIssues(
  scanId: string,
  headers: Headers,
): EvidenceData[] {
  const evidence: EvidenceData[] = [];
  for (const name of SECURITY_HEADERS) {
    if (!headers.has(name)) {
      evidence.push({
        scanId,
        kind: 'header',
        severity: 2,
        title: `Missing header: ${name}`,
        details: { name },
      });
    }
  }
  return evidence;
}

function collectCookieIssues(
  scanId: string,
  headers: Headers,
): EvidenceData[] {
  const evidence: EvidenceData[] = [];
  const cookies = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    const lower = cookie.toLowerCase();
    if (!lower.includes('secure') || !lower.includes('samesite')) {
      evidence.push({
        scanId,
        kind: 'cookie',
        severity: 2,
        title: 'Cookie missing Secure/SameSite',
        details: { cookie },
      });
    }
  }
  return evidence;
}

function createThirdPartyEvidence(
  evidence: ThirdPartyEvidence,
): EvidenceData {
  const { scanId, hostname, root, fingerprinting } = evidence;
  return {
    scanId,
    kind: 'thirdparty',
    severity: 2,
    title: `Third-party request: ${hostname}`,
    details: { domain: hostname, root, fingerprinting },
  };
}

function createTrackerEvidence(
  evidence: ThirdPartyEvidence,
): EvidenceData {
  const { scanId, root, fingerprinting } = evidence;
  return {
    scanId,
    kind: 'tracker',
    severity: 3,
    title: `Tracker matched: ${root}`,
    details: { domain: root, fingerprinting },
  };
}

/** Find the most common error code from fetch attempts */
function getDominantError(errors: ScanErrorCode[]): ScanErrorCode {
  if (errors.length === 0) return 'SITE_UNREACHABLE';
  const counts = new Map<ScanErrorCode, number>();
  for (const e of errors) {
    counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  let best: ScanErrorCode = 'SITE_UNREACHABLE';
  let max = 0;
  for (const [code, count] of counts) {
    if (count > max) { max = count; best = code; }
  }
  return best;
}

/** Human-readable error messages by error code */
function getErrorMessage(code: ScanErrorCode): { summary: string; suggestion: string } {
  switch (code) {
    case 'TIMEOUT':
      return {
        summary: 'Scan timed out. The website took too long to respond.',
        suggestion: 'The site may be experiencing high load. Try again later.',
      };
    case 'DNS_FAILURE':
      return {
        summary: 'Domain not found. The website address could not be resolved.',
        suggestion: 'Please verify the domain name is correct and the website is registered.',
      };
    case 'CONNECTION_REFUSED':
      return {
        summary: 'Connection refused. The website server is not accepting connections.',
        suggestion: 'The site may be down for maintenance. Try again later.',
      };
    case 'SSL_ERROR':
      return {
        summary: 'SSL/TLS error. Could not establish a secure connection.',
        suggestion: 'The site may have an expired or invalid SSL certificate.',
      };
    case 'BLOCKED':
      return {
        summary: 'Access denied. The website is blocking our scanner.',
        suggestion: 'The site restricts automated access. This is common for sites with strict bot protection.',
      };
    case 'RATE_LIMITED':
      return {
        summary: 'Rate limited. The website is throttling our requests.',
        suggestion: 'Try again later when the rate limit resets.',
      };
    case 'SERVER_ERROR':
      return {
        summary: 'Server error. The website returned an internal error.',
        suggestion: 'The site may be experiencing issues. Try again later.',
      };
    default:
      return {
        summary: 'Unable to scan this website. The site may be unavailable or not registered.',
        suggestion: 'Please verify the URL is correct and the website is accessible.',
      };
  }
}

export async function scanSiteJob(
  prisma: PrismaClient,
  scanId: string,
  urlInput: string,
  job?: { updateProgress: (progress: number) => Promise<void> }
) {
  const progressThrottle = new ProgressThrottle();

  const reportProgress = async (value: number) => {
    const tasks: Promise<unknown>[] = [];

    // BullMQ progress updates go to Redis (in-memory) -- always send them
    // so the frontend polling receives real-time updates.
    if (job) {
      tasks.push(
        job.updateProgress(value).catch((error) => {
          logger.debug({ error, scanId, value }, 'Failed to update job progress');
        })
      );
    }

    // Throttle Prisma DB writes to reduce PostgreSQL write amplification.
    // Writes only when progress changed by >=5 points, >=3s elapsed, or at 100%.
    if (progressThrottle.shouldWrite(value)) {
      tasks.push(
        prisma.scan.update({
          where: { id: scanId },
          data: { progress: value },
        }).catch((error) => {
          logger.debug({ error, scanId, value }, 'Failed to persist scan progress');
        })
      );
    }

    await Promise.all(tasks);
  };

  // Initial setup - 10% progress
  await reportProgress(10);

  const u = normalizeUrl(urlInput);
  const origin = u.origin;
  const hostname = u.hostname;
  // etldPlusOne returns null for bare TLDs; fall back to hostname for comparison
  const siteRoot = etldPlusOne(hostname) ?? hostname;

  // Load privacy lists - 20% progress
  await reportProgress(20);
  const lists = await getLists(prisma);

  const visited = new Set<string>();
  const queue: string[] = [u.href];
  const pagesLimit = config.crawlPageLimit;
  const timeBudgetMs = config.crawlTimeBudgetMs;
  const start = Date.now();

  const trackerDomains = new Set(lists.easyprivacy.domains);
  const fpDomains = new Set((lists.whotracks.fingerprinting ?? []).map((domain: string) => domain));

  // Collect all evidence in memory for batch insertion
  const allEvidence: EvidenceData[] = [];
  const seenThirdParties = new Set<string>();
  const seenTrackers = new Set<string>();

  // Track successful page fetches to detect unreachable sites
  let successfulFetches = 0;
  // Track error codes from fetch attempts for classification
  const fetchErrors: ScanErrorCode[] = [];

  // Crawling phase: 30% - 70% progress
  let crawlProgress = 0;

  while (queue.length && visited.size < pagesLimit && Date.now() - start < timeBudgetMs) {
    const curr = queue.shift();
    if (!curr || visited.has(curr)) continue;
    visited.add(curr);

    // Update progress during crawl (30% - 70% range)
    crawlProgress = 30 + Math.floor((visited.size / pagesLimit) * 40);
    await reportProgress(crawlProgress);

    const result = await fetchPage(curr, hostname, config.requestTimeoutMs);
    if (!result.ok) {
      fetchErrors.push(result.errorCode);
      continue;
    }

    successfulFetches++;

    const { headers } = result.response;
    if (!isHeaders(headers)) continue;

    // Collect header and cookie issues
    allEvidence.push(...collectHeaderIssues(scanId, headers));
    allEvidence.push(...collectCookieIssues(scanId, headers));

    if (visited.size === 1) {
      let grade = await gradeTls(u);
      // Upgrade to A+ if TLS is already A and HSTS header is present
      const hasHsts = !!headers.get('strict-transport-security');
      if (grade === 'A' && hasHsts) {
        grade = 'A+';
      }
      allEvidence.push({
        scanId,
        kind: 'tls',
        severity: 1,
        title: `TLS grade ${grade}`,
        details: { grade },
      });
    }

    const rawHtml = await result.response.text();
    const sanitizedHtml = sanitizeHtml(rawHtml);
    const $ = loadHtml(sanitizedHtml);

    const policyAnchor = $('a[href]').toArray().find((anchor) => {
      const text = $(anchor).text();
      const href = $(anchor).attr('href') ?? '';
      return /privacy|policy/i.test(text) || /privacy|policy/i.test(href);
    });

    if (policyAnchor && visited.size === 1) {
      allEvidence.push({
        scanId,
        kind: 'policy',
        severity: 1,
        title: 'Privacy policy link detected',
        details: { href: $(policyAnchor).attr('href') ?? '' },
      });
    }

    // Collect third-party and tracker evidence
    $('script[src],img[src],link[href]').each((_i, element) => {
      const src = $(element).attr('src') ?? $(element).attr('href') ?? '';
      if (!src) return;

      const sanitizedSrc = sanitizeUrl(src, curr);
      if (!sanitizedSrc) return;

      try {
        const resolved = new URL(sanitizedSrc);
        // etldPlusOne returns null for bare TLDs; fall back to hostname
        const root = etldPlusOne(resolved.hostname) ?? resolved.hostname;
        const evidence: ThirdPartyEvidence = {
          scanId,
          hostname: resolved.hostname,
          root,
          fingerprinting: fpDomains.has(root),
        };
        const isThirdParty = root !== siteRoot;

        // Use deduplication to avoid duplicate evidence
        if (isThirdParty && !seenThirdParties.has(resolved.hostname)) {
          seenThirdParties.add(resolved.hostname);
          allEvidence.push(createThirdPartyEvidence(evidence));
        }

        if (trackerDomains.has(root) && !seenTrackers.has(root)) {
          seenTrackers.add(root);
          allEvidence.push(createTrackerEvidence(evidence));
        }
      } catch {
        // ignore invalid URLs
      }
    });

    if (/navigator\.plugins|canvas|getImageData|AudioContext|OfflineAudioContext/i.test(sanitizedHtml)) {
      allEvidence.push({
        scanId,
        kind: 'fingerprint',
        severity: 3,
        title: 'Fingerprinting heuristics detected',
        details: {},
      });
    }

    // Extract actual mixed content URLs for HTTPS pages
    if (u.protocol === 'https:') {
      // Match http:// URLs in src, href, and other resource attributes
      const mixedContentPattern = /(?:src|href|action|data|poster|srcset)\s*=\s*["']?(http:\/\/[^\s"'<>]+)/gi;
      const matches = sanitizedHtml.matchAll(mixedContentPattern);
      const mixedUrls = new Set<string>();

      for (const match of matches) {
        const url = match[1];
        // Skip localhost and internal URLs
        if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
          mixedUrls.add(url);
        }
      }

      // Also check for inline http:// URLs in CSS url() references
      const cssUrlPattern = /url\s*\(\s*["']?(http:\/\/[^\s"')]+)/gi;
      const cssMatches = sanitizedHtml.matchAll(cssUrlPattern);
      for (const match of cssMatches) {
        const url = match[1];
        if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
          mixedUrls.add(url);
        }
      }

      // Create one evidence entry per mixed content URL (with details)
      for (const mixedUrl of mixedUrls) {
        try {
          const parsedUrl = new URL(mixedUrl);
          allEvidence.push({
            scanId,
            kind: 'insecure',
            severity: 3,
            title: 'Mixed content detected',
            details: {
              url: mixedUrl,
              host: parsedUrl.host,
              path: parsedUrl.pathname,
              resourceType: mixedUrl.match(/\.(js|css|img|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)(\?|$)/i)
                ? 'resource'
                : 'link',
            },
          });
        } catch {
          // If URL parsing fails, still record it without details
          allEvidence.push({
            scanId,
            kind: 'insecure',
            severity: 3,
            title: 'Mixed content detected',
            details: { url: mixedUrl },
          });
        }
      }
    }

    $('a[href]').each((_i, anchor) => {
      const href = (anchor as { attribs?: { href?: string } }).attribs?.href;
      if (!href) return;

      const sanitizedHref = sanitizeUrl(href, curr);
      if (!sanitizedHref) return;

      try {
        const resolved = new URL(sanitizedHref);
        if (resolved.origin === origin) queue.push(resolved.href);
      } catch {
        // ignore invalid URLs
      }
    });
  }

  // Check if site was reachable - if no pages fetched, mark as error
  if (successfulFetches === 0) {
    // Determine dominant error code from fetch attempts
    const dominantError = getDominantError(fetchErrors);
    const { summary, suggestion } = getErrorMessage(dominantError);

    logger.warn({ scanId, url: urlInput, errorCode: dominantError, fetchErrors }, 'Site unreachable - no pages could be fetched');
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'error',
        score: null,
        label: null,
        summary,
        meta: {
          error: dominantError,
          errorMessage: summary,
          suggestion,
          fetchErrors, // Preserve all error codes for debugging
        } as Prisma.InputJsonValue,
        finishedAt: new Date(),
        progress: 100,
      },
    });
    return;
  }

  // Batch insert static evidence - 65% progress
  await reportProgress(65);
  if (allEvidence.length > 0) {
    await prisma.evidence.createMany({
      data: allEvidence,
      skipDuplicates: true,
    });
  }

  // Browser scan phase - 65%-80% progress
  // Only runs for established domains (scanCount >= threshold) to detect JS-loaded trackers
  let scanMethod: 'http_fetch' | 'browser' = 'http_fetch';
  if (config.browserScan.enabled) {
    try {
      // Check if this domain qualifies for browser scan
      const domainRecord = await prisma.domain.findUnique({
        where: { domain: siteRoot },
        select: { scanCount: true, indexTier: true },
      }).catch(() => null);

      // Tier A domains always get browser scan (correctness for high-value pages).
      // Other tiers require scanCount >= minScanCount (cost control for long-tail).
      const qualifies =
        domainRecord &&
        (domainRecord.indexTier === 'A' ||
          domainRecord.scanCount >= config.browserScan.minScanCount);

      if (qualifies) {
        await reportProgress(70);
        logger.info(
          { scanId, url: urlInput, siteRoot, scanCount: domainRecord.scanCount, indexTier: domainRecord.indexTier },
          'Running browser scan'
        );

        const browserResult = await browserScan({
          scanId,
          url: u.href,
          siteRoot,
          lists,
          knownTrackers: seenTrackers,
          knownThirdParties: seenThirdParties,
          timeoutMs: config.browserScan.timeoutMs,
        });

        if (browserResult.success && browserResult.evidence.length > 0) {
          scanMethod = 'browser';
          // Insert browser-discovered evidence
          await prisma.evidence.createMany({
            data: browserResult.evidence,
            skipDuplicates: true,
          });
          logger.info(
            {
              scanId,
              newEvidence: browserResult.evidence.length,
              networkRequests: browserResult.networkRequestCount,
              thirdPartyDomains: browserResult.thirdPartyCount,
            },
            'Browser scan added new evidence'
          );
        } else if (!browserResult.success) {
          logger.debug({ scanId, error: browserResult.error }, 'Browser scan failed — using static-only results');
        }
      }
    } catch (browserError) {
      // Browser scan is non-fatal — log and continue with static results
      logger.warn({ scanId, error: browserError }, 'Browser scan error — falling back to static-only results');
    }
  }

  // Scoring phase - 80% progress
  await reportProgress(80);

  const { computeScore } = await import('./scoring.js');
  const result = await computeScore(prisma, scanId);

  // Saving results - 90% progress
  await reportProgress(90);

  await prisma.$transaction(async (tx) => {
    await tx.issue.deleteMany({ where: { scanId } });
    if (result.issues.length) {
      await tx.issue.createMany({
        data: result.issues.map((issue) => ({
          scanId,
          key: issue.key,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          summary: issue.summary,
          howToFix: issue.howToFix,
          whyItMatters: issue.whyItMatters,
          references: issue.references ?? [],
          sortWeight: issue.sortWeight ?? 0,
        })),
      });
    }
    await tx.scan.update({
      where: { id: scanId },
      data: {
        score: result.score,
        label: result.label,
        summary: result.summary,
        meta: { ...(result.meta as Record<string, unknown>), scanMethod } as Prisma.InputJsonValue,
        status: 'done',
        finishedAt: new Date(),
        progress: 100,
      },
    });
  });

  if (objectStorage.isEnabled()) {
    try {
      const enrichedScan = await prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          evidence: { orderBy: { createdAt: 'asc' } },
          issues: { orderBy: [{ sortWeight: 'asc' }, { createdAt: 'asc' }] },
        },
      });

      if (enrichedScan) {
        const payload = buildReportPayload(enrichedScan, {
          evidence: enrichedScan.evidence ?? [],
          issues: enrichedScan.issues ?? [],
        });

        const storageKey = buildReportStorageKey(scanId, {
          prefix: config.objectStorage.reportPrefix ?? 'reports/',
        });

        const stored = await objectStorage.uploadJson(storageKey, payload, {
          metadata: {
            'scan-id': scanId,
            slug: enrichedScan.slug ?? '',
            'stored-at': new Date().toISOString(),
          },
        });

        if (stored) {
          logger.debug({ scanId, storageKey }, 'Archived scan payload to object storage');
        }
      }
    } catch (error) {
      logger.warn({ error, scanId }, 'Failed to archive scan payload to object storage');
    }
  }
}




