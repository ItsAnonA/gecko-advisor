// SPDX-License-Identifier: MIT
/**
 * Privacy Scoring Algorithm v2.0
 *
 * Category-based penalty structure with caps to ensure predictable, fair scoring.
 * No single category can dominate the score beyond its designated cap.
 *
 * Category Caps & Rationales:
 * | Category    | Cap | Rationale                                           |
 * |-------------|-----|-----------------------------------------------------|
 * | Tracking    | 50  | Core mission; privacy abuse should tank scores      |
 * | Security    | 45  | Critical but secondary to privacy focus             |
 * | Third-party | 15  | Architectural complexity, not abuse                 |
 * | Cookies     | 10  | Important but secondary signal                      |
 * | Compliance  | 5   | Weak signal (anyone can add a policy link)          |
 */

import type { PrismaClient, Evidence } from "@prisma/client";
import type { ScoreResult, ScoreLabel } from "@gecko-advisor/shared";
import { labelForScore } from "@gecko-advisor/shared";
import { isFirstParty } from './utils/firstPartyDetection.js';
import { parse } from 'tldts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

const coerceDetail = <T extends object>(value: unknown): T =>
  (typeof value === 'object' && value !== null ? (value as T) : ({} as T));

const isString = (value: unknown): value is string => typeof value === 'string';

type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const severityWeight: Record<IssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

interface TrackerDetail {
  domain?: string;
  fingerprinting?: boolean;
}

interface ThirdPartyDetail {
  domain?: string;
}

interface HeaderDetail {
  name?: string;
}

interface TLSDetail {
  grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

interface InsecureDetail {
  url?: string;
  resourceType?: 'resource' | 'link';
}

interface IssueInput {
  key: string;
  severity: IssueSeverity;
  category: string;
  title: string;
  summary?: string;
  howToFix?: string;
  whyItMatters?: string;
  references?: { label?: string; url: string }[];
  sortWeight?: number;
}

/**
 * Category-based penalty breakdown for transparency and predictability.
 * Each category has a maximum cap to prevent any single area from dominating.
 */
export interface PenaltyBreakdown {
  tracking: number;      // Max 50 - actual privacy abuse (trackers, fingerprinting)
  security: number;      // Max 45 - TLS, headers, mixed content, HTTP-only
  thirdParty: number;    // Max 15 - architectural complexity (NOT tracking)
  cookies: number;       // Max 10 - insecure cookie flags
  compliance: number;    // Max 5  - missing privacy policy
}

/**
 * Scan confidence indicator to help users understand result reliability.
 */
export interface ScanConfidence {
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface ComputedScanResult extends ScoreResult {
  summary: string;
  issues: IssueInput[];
  meta: Record<string, unknown>;
  penalties?: PenaltyBreakdown;
  confidence?: ScanConfidence;
}

// ============================================================================
// EVIDENCE DEDUPLICATION
// ============================================================================

/**
 * Creates a unique key for each evidence entry to prevent counting
 * the same violation multiple times across different pages.
 */
function getEvidenceKey(ev: Evidence): string {
  const details = ev.details as Record<string, unknown>;

  switch (ev.kind) {
    case 'header':
      return `header:${details.name}`;
    case 'thirdparty':
      return `thirdparty:${details.domain}`;
    case 'tracker':
      return `tracker:${details.domain}`;
    case 'insecure':
      return `insecure:${details.url}`;
    case 'cookie':
      return `cookie:${details.name}`;
    case 'fingerprint':
      return `fingerprint`;
    case 'policy':
      return `policy:found`;
    case 'tls':
      return `tls:grade`;
    default:
      return `${ev.kind}:${ev.id}`;
  }
}

function deduplicateEvidence(evidence: Evidence[]): Evidence[] {
  const uniqueMap = new Map<string, Evidence>();
  for (const ev of evidence) {
    const key = getEvidenceKey(ev);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, ev);
    }
  }
  return Array.from(uniqueMap.values());
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRootDomain(scan: { input: string; normalizedInput?: string | null }): string {
  const input = scan.normalizedInput || scan.input;
  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const parsed = parse(url.hostname);
    return parsed.domain || url.hostname;
  } catch {
    const parsed = parse(input);
    return parsed.domain || input;
  }
}

function getRootUrl(scan: { input: string; normalizedInput?: string | null }): string {
  const input = scan.normalizedInput || scan.input;
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }
  return `https://${input}`;
}

// ============================================================================
// CATEGORY PENALTY CALCULATORS
// ============================================================================

/**
 * TRACKING PENALTY (Max 50)
 *
 * Core privacy mission - actual tracking and fingerprinting abuse.
 *
 * Components:
 * - Tracker domains: 5 pts each, capped at 40
 * - Fingerprinting trackers: 5 pts each, capped at 15 (NEW CAP)
 * - Fingerprint signals (3+): flat 5 pts
 *
 * Total capped at 50 points.
 */
function calculateTrackingPenalty(
  evidence: Evidence[],
  fingerprintSignalsCount: number,
  explanations: { evidenceId: string; points: number; reason: string }[]
): number {
  const trackers = evidence.filter((e) => e.kind === 'tracker');
  const uniqueTrackerDomains = new Set(
    trackers.map((e) => coerceDetail<TrackerDetail>(e.details).domain).filter(isString)
  );

  // Base tracker penalty: 5 pts per unique tracker, capped at 40
  const trackerBase = Math.min(uniqueTrackerDomains.size * 5, 40);

  // Fingerprinting tracker addon: 5 pts each, NEW CAP at 15
  const fpTrackers = trackers.filter((e) => coerceDetail<TrackerDetail>(e.details).fingerprinting);
  const fpTrackerAddon = Math.min(fpTrackers.length * 5, 15);

  // Fingerprint signals penalty: 5 pts if 3+ signals detected
  const fingerprintPenalty = fingerprintSignalsCount >= 3 ? 5 : 0;

  // Log explanations
  if (trackerBase > 0) {
    trackers.forEach((e) => explanations.push({
      evidenceId: e.id,
      points: -5,
      reason: 'Tracker domain'
    }));
  }
  if (fpTrackerAddon > 0) {
    explanations.push({
      evidenceId: 'fp-trackers',
      points: -fpTrackerAddon,
      reason: `Fingerprinting trackers (${fpTrackers.length}, capped)`
    });
  }
  if (fingerprintPenalty > 0) {
    explanations.push({
      evidenceId: 'fingerprint-signals',
      points: -5,
      reason: `Fingerprinting heuristics (${fingerprintSignalsCount} signals)`
    });
  }

  // Total tracking penalty capped at 50
  return Math.min(trackerBase + fpTrackerAddon + fingerprintPenalty, 50);
}

/**
 * SECURITY PENALTY (Max 45)
 *
 * TLS configuration, security headers, and mixed content.
 *
 * Components:
 * - HTTP-only site: flat 20 pts (catastrophic)
 * - TLS grade penalty: 0/3/7/12 for A-B/C/D/F
 * - Mixed content: 10 pts each, capped at 20
 * - Missing headers: 3 pts each, capped at 12 (NEW CAP)
 *
 * Total capped at 45 points.
 */
function calculateSecurityPenalty(
  evidence: Evidence[],
  rootUrl: string,
  explanations: { evidenceId: string; points: number; reason: string }[]
): { penalty: number; isHttpOnly: boolean } {
  // Check for HTTP-only site
  const isHttpOnly = rootUrl.startsWith('http://');

  let totalPenalty = 0;

  if (isHttpOnly) {
    // HTTP-only is catastrophic - apply hard penalty
    totalPenalty += 20;
    explanations.push({
      evidenceId: 'http-only',
      points: -20,
      reason: 'Site does not use HTTPS'
    });
  }

  // TLS grade penalty
  const tlsEntries = evidence.filter((e) => e.kind === 'tls');
  const [tlsRecord] = tlsEntries;
  let tlsGrade: TLSDetail['grade'] | undefined;

  if (tlsRecord) {
    tlsGrade = coerceDetail<TLSDetail>(tlsRecord.details).grade ?? 'A';
    let tlsPenalty = 0;
    if (tlsGrade === 'C') tlsPenalty = 3;
    else if (tlsGrade === 'D') tlsPenalty = 7;
    else if (tlsGrade === 'F') tlsPenalty = 12;

    if (tlsPenalty > 0) {
      totalPenalty += tlsPenalty;
      explanations.push({
        evidenceId: tlsRecord.id,
        points: -tlsPenalty,
        reason: `TLS grade ${tlsGrade}`
      });
    }
  }

  // Mixed content penalty (only for HTTPS sites)
  if (!isHttpOnly) {
    const insecure = evidence.filter((e) => {
      if (e.kind !== 'insecure') return false;
      const details = coerceDetail<InsecureDetail>(e.details);
      // Skip links - they are NOT mixed content
      if (details.resourceType === 'link') return false;
      const url = details.url;
      return url && url !== 'null' && url !== '' && url.startsWith('http://');
    });

    const mixedContentPenalty = Math.min(insecure.length * 10, 20);
    if (mixedContentPenalty > 0) {
      totalPenalty += mixedContentPenalty;
      insecure.forEach((e) => explanations.push({
        evidenceId: e.id,
        points: -10,
        reason: 'Mixed content (HTTP resource on HTTPS page)'
      }));
    }
  }

  // Missing headers penalty: 3 pts each, NEW CAP at 12
  const headersMissing = evidence
    .filter((e) => e.kind === 'header')
    .map((e) => coerceDetail<HeaderDetail>(e.details).name)
    .filter(isString);

  const headerPenalty = Math.min(headersMissing.length * 3, 12);
  if (headerPenalty > 0) {
    totalPenalty += headerPenalty;
    evidence
      .filter((e) => e.kind === 'header')
      .forEach((e) => explanations.push({
        evidenceId: e.id,
        points: -3,
        reason: 'Missing security header'
      }));
  }

  // Total security penalty capped at 45
  return {
    penalty: Math.min(totalPenalty, 45),
    isHttpOnly
  };
}

/**
 * THIRD-PARTY PENALTY (Max 15)
 *
 * Architectural complexity from external requests - SEPARATE from tracking.
 * Third-party domains are not inherently malicious; they represent
 * data exposure to external services.
 *
 * Components:
 * - Third-party domains: 2 pts each, capped at 15 (reduced from 20)
 *
 * First-party CDNs are filtered out before counting.
 */
function calculateThirdPartyPenalty(
  evidence: Evidence[],
  rootDomain: string,
  explanations: { evidenceId: string; points: number; reason: string }[]
): number {
  const thirdParty = evidence.filter((e) => e.kind === 'thirdparty');
  const thirdPartyDomains = thirdParty
    .map((e) => coerceDetail<ThirdPartyDetail>(e.details).domain)
    .filter(isString);

  // Filter out first-party CDNs and infrastructure
  const actualThirdParty = thirdPartyDomains.filter((domain) =>
    !isFirstParty(domain, rootDomain)
  );

  const uniqueThird = new Set(actualThirdParty);
  const penalty = Math.min(uniqueThird.size * 2, 15);

  if (penalty > 0) {
    thirdParty
      .filter((e) => {
        const domain = coerceDetail<ThirdPartyDetail>(e.details).domain;
        return domain && !isFirstParty(domain, rootDomain);
      })
      .forEach((e) => explanations.push({
        evidenceId: e.id,
        points: -2,
        reason: 'Third-party request'
      }));
  }

  return penalty;
}

/**
 * COOKIES PENALTY (Max 10)
 *
 * Cookies missing Secure/SameSite flags.
 *
 * Components:
 * - Insecure cookies: 2 pts each, capped at 10
 */
function calculateCookiePenalty(
  evidence: Evidence[],
  explanations: { evidenceId: string; points: number; reason: string }[]
): number {
  const cookieIssues = evidence.filter((e) => e.kind === 'cookie');
  const penalty = Math.min(cookieIssues.length * 2, 10);

  if (penalty > 0) {
    cookieIssues.forEach((e) => explanations.push({
      evidenceId: e.id,
      points: -2,
      reason: 'Cookie missing Secure/SameSite flags'
    }));
  }

  return penalty;
}

/**
 * COMPLIANCE PENALTY (Max 5)
 *
 * Missing privacy policy - PENALTY ONLY, no bonus.
 * Policy presence is a weak signal since anyone can add a link.
 */
function calculateCompliancePenalty(
  evidence: Evidence[],
  explanations: { evidenceId: string; points: number; reason: string }[]
): { penalty: number; policyFound: boolean } {
  const policyEntries = evidence.filter((e) => e.kind === 'policy');
  const policyFound = policyEntries.length > 0;

  if (!policyFound) {
    explanations.push({
      evidenceId: 'missing-policy',
      points: -5,
      reason: 'No privacy policy found'
    });
    return { penalty: 5, policyFound: false };
  }

  return { penalty: 0, policyFound: true };
}

// ============================================================================
// BONUSES (Minimal)
// ============================================================================

/**
 * BONUSES - Simplified
 *
 * Only TLS bonuses remain:
 * - A+: +3 points
 * - A:  +2 points
 *
 * REMOVED:
 * - "No trackers" bonus (+5) - unnecessary, zero trackers already avoids penalty
 * - "Policy found" bonus (+3) - removed to fix double-counting
 */
function calculateBonuses(
  evidence: Evidence[],
  isHttpOnly: boolean,
  explanations: { evidenceId: string; points: number; reason: string }[]
): number {
  // No bonuses for HTTP-only sites
  if (isHttpOnly) return 0;

  const tlsEntries = evidence.filter((e) => e.kind === 'tls');
  const [tlsRecord] = tlsEntries;

  if (!tlsRecord) return 0;

  const tlsGrade = coerceDetail<TLSDetail>(tlsRecord.details).grade ?? 'A';

  if (tlsGrade === 'A+') {
    explanations.push({
      evidenceId: tlsRecord.id,
      points: +3,
      reason: 'TLS Grade A+ (excellent)'
    });
    return 3;
  }

  if (tlsGrade === 'A') {
    explanations.push({
      evidenceId: tlsRecord.id,
      points: +2,
      reason: 'TLS Grade A (strong)'
    });
    return 2;
  }

  return 0;
}

// ============================================================================
// SCAN CONFIDENCE ASSESSMENT
// ============================================================================

/**
 * Assesses scan confidence based on coverage and success metrics.
 * Helps users understand when to trust the score.
 */
function assessConfidence(meta: {
  pagesScanned?: number;
  tlsScanFailed?: boolean;
  crawlErrors?: number;
  duration?: number;
  blockedByRobots?: boolean;
}): ScanConfidence {
  const reasons: string[] = [];

  if (meta.pagesScanned !== undefined && meta.pagesScanned < 3) {
    reasons.push('Limited page coverage');
  }

  if (meta.tlsScanFailed) {
    reasons.push('TLS assessment incomplete');
  }

  if (meta.crawlErrors !== undefined && meta.crawlErrors > 5) {
    reasons.push('Multiple crawl failures');
  }

  if (meta.duration !== undefined && meta.duration < 5000) {
    reasons.push('Scan completed unusually fast');
  }

  if (meta.blockedByRobots) {
    reasons.push('Robots.txt blocked some pages');
  }

  let level: 'high' | 'medium' | 'low';
  if (reasons.length === 0) {
    level = 'high';
  } else if (reasons.length <= 2) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { level, reasons };
}

// ============================================================================
// ISSUE GENERATION
// ============================================================================

function generateIssues(
  evidence: Evidence[],
  penalties: PenaltyBreakdown,
  isHttpOnly: boolean,
  rootDomain: string,
  fingerprintSignalsCount: number
): IssueInput[] {
  const issues: IssueInput[] = [];

  // HTTP-only critical issue
  if (isHttpOnly) {
    issues.push({
      key: 'security.no-https',
      severity: 'critical',
      category: 'security',
      title: 'No HTTPS Support',
      summary: 'All data transmitted is vulnerable to interception',
      howToFix: 'Enable HTTPS with a valid TLS certificate. Use Let\'s Encrypt for free certificates.',
      whyItMatters: 'Without HTTPS, attackers can intercept, read, and modify all data between users and this site.',
      references: [
        { label: 'Let\'s Encrypt', url: 'https://letsencrypt.org/' },
        { label: 'Why HTTPS Matters', url: 'https://web.dev/why-https-matters/' }
      ],
      sortWeight: 1,
    });
  }

  // Tracker issues
  const trackers = evidence.filter((e) => e.kind === 'tracker');
  const uniqueTrackerDomains = new Set(
    trackers.map((e) => coerceDetail<TrackerDetail>(e.details).domain).filter(isString)
  );

  if (uniqueTrackerDomains.size > 0) {
    const domains = Array.from(uniqueTrackerDomains).slice(0, 5).join(', ');
    issues.push({
      key: 'tracking.trackers',
      severity: 'high',
      category: 'tracking',
      title: `${uniqueTrackerDomains.size} tracker${uniqueTrackerDomains.size > 1 ? 's' : ''} observed`,
      summary: `Trackers detected: ${domains}${uniqueTrackerDomains.size > 5 ? '…' : ''}`,
      howToFix: 'Review marketing and analytics tags. Remove unnecessary trackers or load them only after explicit consent via a consent management platform.',
      whyItMatters: 'Trackers monitor user behaviour and may violate privacy laws if deployed without consent or disclosures.',
      references: [
        { label: 'Mozilla: Managing tracking scripts', url: 'https://developer.mozilla.org/en-US/docs/Web/Privacy/Tracking_Protection' },
      ],
      sortWeight: 10,
    });
  }

  // Fingerprinting issue
  if (fingerprintSignalsCount >= 3) {
    issues.push({
      key: 'tracking.fingerprinting',
      severity: 'high',
      category: 'tracking',
      title: 'Browser fingerprinting behaviour observed',
      summary: `${fingerprintSignalsCount} fingerprinting signals detected`,
      howToFix: 'Remove or gate fingerprinting scripts. Consider alternatives that rely on consent or anonymized analytics.',
      whyItMatters: 'Fingerprinting scripts combine browser traits to create persistent identifiers that are difficult for users to clear.',
      references: [
        { label: 'EFF: What is fingerprinting?', url: 'https://panopticlick.eff.org/about' },
      ],
      sortWeight: 15,
    });
  }

  // Third-party issue (only if significant)
  const thirdParty = evidence.filter((e) => e.kind === 'thirdparty');
  const actualThirdParty = thirdParty.filter((e) => {
    const domain = coerceDetail<ThirdPartyDetail>(e.details).domain;
    return domain && !isFirstParty(domain, rootDomain);
  });
  const uniqueThird = new Set(actualThirdParty.map((e) => coerceDetail<ThirdPartyDetail>(e.details).domain));

  if (uniqueThird.size > 5) {
    const domains = Array.from(uniqueThird).slice(0, 5).join(', ');
    issues.push({
      key: 'tracking.third-party',
      severity: 'medium',
      category: 'tracking',
      title: `${uniqueThird.size} third-party domains contacted`,
      summary: `Notable domains: ${domains}${uniqueThird.size > 5 ? '…' : ''}`,
      howToFix: 'Audit external requests and remove unused libraries. Where possible, self-host critical assets or route via privacy-preserving CDNs.',
      whyItMatters: 'Each third-party call shares visitor metadata (IP, user agent) with outside companies, which can be used for profiling.',
      references: [
        { label: 'OWASP: Third-Party Requests', url: 'https://owasp.org/www-community/Web_Application_Security_Risk' },
      ],
      sortWeight: 30,
    });
  }

  // Security headers issue
  const headersMissing = evidence
    .filter((e) => e.kind === 'header')
    .map((e) => coerceDetail<HeaderDetail>(e.details).name)
    .filter(isString);

  if (headersMissing.length > 0) {
    issues.push({
      key: 'security.headers',
      severity: 'medium',
      category: 'security',
      title: 'Missing security headers',
      summary: `Add: ${headersMissing.join(', ')}`,
      howToFix: 'Set the recommended HTTP response headers (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) at the proxy or application layer.',
      whyItMatters: 'Security headers harden the site against clickjacking, XSS, and data leakage. Without them browsers cannot enforce modern protections.',
      references: [
        { label: 'MDN: HTTP security headers', url: 'https://developer.mozilla.org/en-US/docs/Web/Security' },
      ],
      sortWeight: 20,
    });
  }

  // Cookie issues
  const cookieIssues = evidence.filter((e) => e.kind === 'cookie');
  if (cookieIssues.length > 0) {
    issues.push({
      key: 'security.cookies',
      severity: 'medium',
      category: 'security',
      title: 'Cookies missing Secure/SameSite flags',
      summary: `${cookieIssues.length} cookie${cookieIssues.length > 1 ? 's' : ''} missing recommended attributes`,
      howToFix: 'Mark cookies with Secure and SameSite=strict or lax, and HttpOnly where appropriate, to prevent interception or CSRF.',
      whyItMatters: 'Without Secure/SameSite, cookies can leak over HTTP or be sent in cross-site requests, enabling session hijacking.',
      references: [
        { label: 'MDN: Set-Cookie', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie' },
      ],
      sortWeight: 35,
    });
  }

  // TLS issues
  const tlsEntries = evidence.filter((e) => e.kind === 'tls');
  const [tlsRecord] = tlsEntries;
  if (tlsRecord) {
    const tlsGrade = coerceDetail<TLSDetail>(tlsRecord.details).grade ?? 'A';
    if (['C', 'D', 'F'].includes(tlsGrade)) {
      issues.push({
        key: 'security.tls',
        severity: tlsGrade === 'F' ? 'high' : 'medium',
        category: 'security',
        title: `TLS configuration graded ${tlsGrade}`,
        howToFix: 'Update the TLS configuration to disable weak protocols/ciphers and enable HSTS. Use modern suites recommended by Mozilla or SSL Labs.',
        whyItMatters: 'Weak TLS grades indicate outdated encryption that attackers can exploit to intercept traffic.',
        references: [
          { label: 'Mozilla TLS Guidelines', url: 'https://wiki.mozilla.org/Security/Server_Side_TLS' },
        ],
        sortWeight: 25,
      });
    }
  }

  // Mixed content issues (only for HTTPS)
  if (!isHttpOnly) {
    const insecure = evidence.filter((e) => {
      if (e.kind !== 'insecure') return false;
      const details = coerceDetail<InsecureDetail>(e.details);
      if (details.resourceType === 'link') return false;
      const url = details.url;
      return url && url !== 'null' && url !== '' && url.startsWith('http://');
    });

    if (insecure.length > 0) {
      issues.push({
        key: 'security.mixed-content',
        severity: 'high',
        category: 'security',
        title: 'Mixed-content detected over HTTPS',
        summary: `${insecure.length} HTTP resource${insecure.length > 1 ? 's' : ''} loaded on HTTPS page`,
        howToFix: 'Serve all assets over HTTPS. Update hard-coded http:// URLs to https:// or relative paths.',
        whyItMatters: 'Loading HTTP assets on HTTPS pages lets attackers tamper with scripts or leak data.',
        references: [
          { label: 'MDN: Mixed Content', url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content' },
        ],
        sortWeight: 18,
      });
    }
  }

  // Compliance issue
  const policyEntries = evidence.filter((e) => e.kind === 'policy');
  if (policyEntries.length === 0) {
    issues.push({
      key: 'compliance.policy',
      severity: 'low',
      category: 'compliance',
      title: 'Privacy policy link not found',
      howToFix: 'Publish a clear privacy policy and link it in the footer or primary navigation.',
      whyItMatters: 'Most privacy laws require transparent disclosure of data collection practices.',
      references: [
        { label: 'Privacy: policy best practices', url: 'https://www.ftc.gov/business-guidance/small-businesses/privacy-security' },
      ],
      sortWeight: 60,
    });
  }

  // Sort by severity then sortWeight
  issues.sort((a, b) => {
    const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return (a.sortWeight ?? 0) - (b.sortWeight ?? 0);
  });

  return issues;
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export async function computeScore(prisma: PrismaClient, scanId: string): Promise<ComputedScanResult> {
  // Fetch all evidence and scan metadata
  const [rawEvidence, scan] = await Promise.all([
    prisma.evidence.findMany({ where: { scanId } }),
    prisma.scan.findUnique({
      where: { id: scanId },
      select: { input: true, normalizedInput: true }
    })
  ]);

  if (!scan) {
    throw new Error(`Scan ${scanId} not found`);
  }

  // Extract root domain and URL
  const rootDomain = getRootDomain(scan);
  const rootUrl = getRootUrl(scan);

  // Count fingerprint signals BEFORE deduplication (important for threshold)
  const fingerprintSignalsCount = rawEvidence.filter((e) => e.kind === 'fingerprint').length;

  // Deduplicate evidence
  const evidence = deduplicateEvidence(rawEvidence);

  // Collect explanations for score breakdown
  const explanations: { evidenceId: string; points: number; reason: string }[] = [];

  // Calculate category penalties
  const trackingPenalty = calculateTrackingPenalty(evidence, fingerprintSignalsCount, explanations);
  const { penalty: securityPenalty, isHttpOnly } = calculateSecurityPenalty(evidence, rootUrl, explanations);
  const thirdPartyPenalty = calculateThirdPartyPenalty(evidence, rootDomain, explanations);
  const cookiePenalty = calculateCookiePenalty(evidence, explanations);
  const { penalty: compliancePenalty, policyFound } = calculateCompliancePenalty(evidence, explanations);

  const penalties: PenaltyBreakdown = {
    tracking: trackingPenalty,
    security: securityPenalty,
    thirdParty: thirdPartyPenalty,
    cookies: cookiePenalty,
    compliance: compliancePenalty,
  };

  // Calculate total penalty
  const totalPenalty = Object.values(penalties).reduce((a, b) => a + b, 0);

  // Calculate bonuses (minimal - only TLS)
  const bonuses = calculateBonuses(evidence, isHttpOnly, explanations);

  // Calculate final score
  const rawScore = 100 - totalPenalty + bonuses;
  const score = Math.max(0, Math.min(100, rawScore));

  // Determine label (HTTP-only override)
  let label: ScoreLabel;
  if (isHttpOnly) {
    label = 'Critical Security Risk';
  } else {
    label = labelForScore(score);
  }

  // Assess scan confidence
  const confidence = assessConfidence({
    // These would come from scan metadata if available
    pagesScanned: undefined,
    tlsScanFailed: undefined,
    crawlErrors: undefined,
    duration: undefined,
    blockedByRobots: undefined,
  });

  // Generate issues
  const issues = generateIssues(evidence, penalties, isHttpOnly, rootDomain, fingerprintSignalsCount);

  // Build summary text
  const summaryParts: string[] = [];

  if (isHttpOnly) {
    summaryParts.push('Site does not use HTTPS');
  }

  const trackers = evidence.filter((e) => e.kind === 'tracker');
  const uniqueTrackerDomains = new Set(
    trackers.map((e) => coerceDetail<TrackerDetail>(e.details).domain).filter(isString)
  );
  if (uniqueTrackerDomains.size > 0) {
    summaryParts.push(`${uniqueTrackerDomains.size} tracker${uniqueTrackerDomains.size > 1 ? 's' : ''} flagged`);
  }

  const headersMissing = evidence
    .filter((e) => e.kind === 'header')
    .map((e) => coerceDetail<HeaderDetail>(e.details).name)
    .filter(isString);
  if (headersMissing.length > 0) {
    summaryParts.push(`${headersMissing.length} security header${headersMissing.length > 1 ? 's' : ''} missing`);
  }

  if (!policyFound) {
    summaryParts.push('No privacy policy detected');
  }

  if (fingerprintSignalsCount >= 3) {
    summaryParts.push('Fingerprinting heuristics present');
  }

  if (summaryParts.length === 0) {
    summaryParts.push('No major privacy risks detected');
  }

  const summary = summaryParts.join('; ');

  // Build meta object
  const thirdParty = evidence.filter((e) => e.kind === 'thirdparty');
  const actualThirdParty = thirdParty.filter((e) => {
    const domain = coerceDetail<ThirdPartyDetail>(e.details).domain;
    return domain && !isFirstParty(domain, rootDomain);
  });
  const uniqueThird = new Set(actualThirdParty.map((e) => coerceDetail<ThirdPartyDetail>(e.details).domain).filter(isString));

  const tlsEntries = evidence.filter((e) => e.kind === 'tls');
  const [tlsRecord] = tlsEntries;
  const tlsGrade = tlsRecord ? coerceDetail<TLSDetail>(tlsRecord.details).grade : undefined;

  const insecure = evidence.filter((e) => {
    if (e.kind !== 'insecure') return false;
    const details = coerceDetail<InsecureDetail>(e.details);
    if (details.resourceType === 'link') return false;
    const url = details.url;
    return url && url !== 'null' && url !== '' && url.startsWith('http://');
  });

  const meta = {
    trackerDomains: Array.from(uniqueTrackerDomains),
    thirdPartyDomains: Array.from(uniqueThird),
    missingHeaders: headersMissing,
    cookieIssues: evidence.filter((e) => e.kind === 'cookie').length,
    policyFound,
    tlsGrade,
    fingerprintDetected: fingerprintSignalsCount >= 3,
    mixedContent: insecure.length > 0,
    isHttpOnly,
    penalties,
    bonuses,
    confidence,
  };

  return {
    score,
    label,
    explanations,
    issues,
    summary,
    meta,
    penalties,
    confidence,
  };
}
