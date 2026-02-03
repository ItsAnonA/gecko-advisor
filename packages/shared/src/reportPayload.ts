/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { etldPlusOne } from './utils.js';

export type ReportIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const severityRank: Record<ReportIssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export interface ScanEntity {
  id: string;
  input: string;
  normalizedInput?: string | null;
  slug?: string | null;
  status: string;
  score?: number | null;
  label?: string | null;
  summary?: string | null;
  meta?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  finishedAt?: Date | null;
  [key: string]: unknown;
}

export interface IssueEntity {
  id: string;
  scanId: string;
  key: string | null;
  severity: ReportIssueSeverity | string;
  category: string;
  title: string;
  summary: string | null;
  howToFix: string | null;
  whyItMatters: string | null;
  references: unknown;
  sortWeight: number | null;
  createdAt?: Date;
}

export interface EvidenceEntity {
  id: string;
  scanId: string;
  kind: string;
  severity: number;
  title: string;
  details: unknown;
  createdAt?: Date;
}

export interface ReportTopFix {
  id: string;
  key: string;
  title: string;
  category: string;
  severity: ReportIssueSeverity | string;
  whyItMatters: string | null;
  howToFix: string | null;
  references: Array<{ label?: string; url: string }>;
}

export interface ReportIssue {
  id: string;
  key: string;
  category: string;
  severity: ReportIssueSeverity | string;
  title: string;
  summary: string | null;
  howToFix: string | null;
  whyItMatters: string | null;
  references: Array<{ label?: string; url: string }>;
  sortWeight: number | null;
}

export interface ReportEvidence {
  id: string;
  scanId: string;
  kind: string;
  severity: number;
  title: string;
  details: unknown;
  createdAt?: Date;
}

/**
 * Benchmark comparison data for SEO content enrichment
 */
export interface BenchmarkComparison {
  percentile: number; // 0-100, "better than X%"
  comparedToAverage: number; // +/- points vs average score
  trackerComparison: 'below' | 'average' | 'above';
  cookieComparison: 'below' | 'average' | 'above';
}

/**
 * Tracker insights for unique content generation
 */
export interface TrackerInsights {
  uniqueTrackers: number;
  commonTrackers: string[]; // Most common trackers found on this site
  rarityScore: number; // 0-100, how unusual the tracker set is
}

/**
 * Global benchmark summary (subset for display)
 */
export interface GlobalBenchmarkSummary {
  totalDomains: number;
  averageScore: number;
  medianScore: number;
  averageTrackerCount: number;
  averageCookieCount: number;
}

/**
 * Category-based penalty breakdown for scoring transparency
 * Each category has a maximum cap to prevent single issues from tanking scores
 */
export interface PenaltyBreakdown {
  tracking: number;      // Max 50 - actual privacy abuse (trackers, fingerprinting)
  security: number;      // Max 45 - TLS, headers, mixed content
  thirdParty: number;    // Max 15 - architecture complexity (NOT tracking)
  cookies: number;       // Max 10 - insecure cookie flags
  compliance: number;    // Max 5  - missing privacy policy
}

/**
 * Scan confidence indicator - helps users understand score reliability
 */
export interface ScanConfidence {
  level: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface ReportPayload {
  scan: ScanEntity;
  issues: ReportIssue[];
  evidence: ReportEvidence[];
  topFixes: ReportTopFix[];
  meta: {
    dataSharing: 'None' | 'Low' | 'Medium' | 'High';
    domain: string;
    // SEO Index Gating Fields - Required for full tier classification
    trackerCount: number;
    thirdPartyCount: number;
    cookieCount: number;
    tlsGrade?: string;
    // SEO Content Enrichment - Market Analysis Fields
    benchmarks?: BenchmarkComparison;
    trackerInsights?: TrackerInsights;
    globalBenchmarks?: GlobalBenchmarkSummary;
    // Scoring Transparency Fields
    penalties?: PenaltyBreakdown;
    bonuses?: number; // TLS bonus points (up to 10 for A+ grade)
    confidence?: ScanConfidence;
    isHttpOnly?: boolean; // Site serves HTTP only (no HTTPS support)
  };
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function extractDomain(details: unknown): string {
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const record = details as Record<string, unknown>;
    const domain = record.domain;
    if (typeof domain === 'string') return domain;
  }
  return '';
}

export interface BuildReportPayloadOptions {
  evidence: EvidenceEntity[];
  issues: IssueEntity[];
}

export function buildReportPayload(scan: ScanEntity, options: BuildReportPayloadOptions): ReportPayload {
  const issues = options.issues ?? [];
  const evidence = options.evidence ?? [];

  const severityThreshold = severityRank['medium'];

  const topFixes: ReportTopFix[] = issues
    .filter((issue) => severityRank[(issue.severity as ReportIssueSeverity) ?? 'info'] >= severityThreshold)
    .sort((a, b) => {
      const diff = severityRank[(b.severity as ReportIssueSeverity) ?? 'info'] - severityRank[(a.severity as ReportIssueSeverity) ?? 'info'];
      if (diff !== 0) return diff;
      return (a.sortWeight ?? 0) - (b.sortWeight ?? 0);
    })
    .slice(0, 3)
    .map((issue) => ({
      id: issue.id,
      key: issue.key ?? issue.id,
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      whyItMatters: issue.whyItMatters,
      howToFix: issue.howToFix,
      references: asArray<{ label?: string; url: string }>(issue.references),
    }));

  const formattedIssues: ReportIssue[] = issues.map((issue) => ({
    id: issue.id,
    key: issue.key ?? issue.id,
    category: issue.category,
    severity: issue.severity,
    title: issue.title,
    summary: issue.summary,
    howToFix: issue.howToFix,
    whyItMatters: issue.whyItMatters,
    references: asArray<{ label?: string; url: string }>(issue.references),
    sortWeight: issue.sortWeight,
  }));

  const formattedEvidence: ReportEvidence[] = evidence.map((entry) => ({
    id: entry.id,
    scanId: entry.scanId,
    kind: entry.kind,
    severity: entry.severity,
    title: entry.title,
    details: entry.details,
    createdAt: entry.createdAt,
  }));

  const trackerDomains = new Set(
    evidence
      .filter((entry) => entry.kind === 'tracker')
      .map((entry) => extractDomain(entry.details))
      .filter(Boolean)
  );
  const thirdpartyDomains = new Set(
    evidence
      .filter((entry) => entry.kind === 'thirdparty')
      .map((entry) => extractDomain(entry.details))
      .filter(Boolean)
  );
  const cookieCount = evidence.filter((entry) => entry.kind === 'cookie').length;
  const dataSharingIndex = trackerDomains.size * 2 + thirdpartyDomains.size + cookieCount;

  // Extract TLS grade from evidence for SEO index gating
  const tlsEvidence = evidence.find((entry) => entry.kind === 'tls');
  const tlsGrade = tlsEvidence
    ? (tlsEvidence.details as { grade?: string })?.grade
    : undefined;
  let dataSharing: 'None' | 'Low' | 'Medium' | 'High' = 'None';
  if (dataSharingIndex > 8) dataSharing = 'High';
  else if (dataSharingIndex > 3) dataSharing = 'Medium';
  else if (dataSharingIndex > 0) dataSharing = 'Low';

  const domain = (() => {
    try {
      const parsed = new URL(scan.input);
      // etldPlusOne returns null for bare TLDs, fall back to hostname
      return etldPlusOne(parsed.hostname) ?? parsed.hostname;
    } catch {
      return scan.input;
    }
  })();

  // Extract penalties, bonuses, and confidence from scan.meta (set by worker)
  const scanMeta = (scan.meta && typeof scan.meta === 'object') ? scan.meta as Record<string, unknown> : {};
  const penalties = scanMeta.penalties as PenaltyBreakdown | undefined;
  const bonuses = typeof scanMeta.bonuses === 'number' ? scanMeta.bonuses : undefined;
  const confidence = scanMeta.confidence as ScanConfidence | undefined;
  const isHttpOnly = typeof scanMeta.isHttpOnly === 'boolean' ? scanMeta.isHttpOnly : undefined;

  return {
    scan,
    evidence: formattedEvidence,
    issues: formattedIssues,
    topFixes,
    meta: {
      dataSharing,
      domain,
      // SEO Index Gating Fields - Required for full tier classification
      trackerCount: trackerDomains.size,
      thirdPartyCount: thirdpartyDomains.size,
      cookieCount,
      tlsGrade,
      // Scoring Transparency Fields - from worker
      penalties,
      bonuses,
      confidence,
      isHttpOnly,
    },
  };
}
