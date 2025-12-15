/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import EnhancedScoreDial from '@/components/ui/EnhancedScoreDial';
import GradeBadge from '@/components/ui/GradeBadge';
import ReportTabs, { type TabId } from '@/components/report/ReportTabs';
import EvidenceList, { type EvidenceView } from '@/components/report/EvidenceList';
import ShareBar from '@/components/report/ShareBar';

/**
 * Scan data structure from API
 */
interface ScanData {
  id: string;
  slug: string;
  input: string;
  normalizedInput?: string | null;
  status: string;
  score: number | null;
  label: string | null;
  progress?: number;
  summary?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Evidence item structure from API
 */
interface EvidenceItem {
  id: string;
  scanId?: string;
  kind: string;
  severity: number;
  title: string;
  details: unknown;
  createdAt?: string;
}
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

/**
 * Data sharing level calculation
 */
type DataSharingLevel = 'None' | 'Low' | 'Medium' | 'High';

function computeDataSharingLevel(
  trackerCount: number,
  thirdPartyCount: number,
  cookieIssues: number
): DataSharingLevel {
  const total = trackerCount + thirdPartyCount + cookieIssues;
  if (total === 0) return 'None';
  if (total <= 3) return 'Low';
  if (total <= 10) return 'Medium';
  return 'High';
}

/**
 * Score breakdown calculation
 */
interface BreakdownItem {
  category: string;
  finding: string;
  points: number;
  positive: boolean;
}

function calculateBreakdown(
  scan: ScanData,
  evidence: EvidenceItem[]
): BreakdownItem[] {
  const breakdown: BreakdownItem[] = [
    { category: 'Base Score', finding: 'Starting point', points: 100, positive: true },
  ];

  const trackers = evidence.filter(
    (e) => e.kind === 'tracker' || e.title?.toLowerCase().includes('tracker')
  );
  if (trackers.length > 0) {
    breakdown.push({
      category: 'Trackers',
      finding: `${trackers.length} tracker${trackers.length !== 1 ? 's' : ''} found`,
      points: -Math.min(trackers.length * 5, 30),
      positive: false,
    });
  }

  const tlsEvidence = evidence.find((e) => e.kind === 'tls');
  if (tlsEvidence && tlsEvidence.severity >= 3) {
    breakdown.push({
      category: 'HTTPS/TLS',
      finding: 'TLS configuration issues',
      points: -10,
      positive: false,
    });
  }

  const missingHeaders = evidence.filter((e) => e.kind === 'header' && e.severity >= 3);
  if (missingHeaders.length > 0) {
    breakdown.push({
      category: 'Security Headers',
      finding: `${missingHeaders.length} missing or weak header${missingHeaders.length !== 1 ? 's' : ''}`,
      points: -Math.min(missingHeaders.length * 3, 15),
      positive: false,
    });
  }

  const thirdParty = evidence.filter((e) => e.kind === 'thirdparty');
  if (thirdParty.length > 5) {
    breakdown.push({
      category: 'Third-Party',
      finding: `${thirdParty.length} third-party connections`,
      points: -Math.min((thirdParty.length - 5) * 2, 15),
      positive: false,
    });
  }

  const cookies = evidence.filter((e) => e.kind === 'cookie' && e.severity >= 3);
  if (cookies.length > 0) {
    breakdown.push({
      category: 'Cookies',
      finding: `${cookies.length} cookie issue${cookies.length !== 1 ? 's' : ''}`,
      points: -Math.min(cookies.length * 3, 12),
      positive: false,
    });
  }

  return breakdown;
}

/**
 * Get detail string from evidence details
 */
function getDetailString(details: unknown, key: string): string {
  if (typeof details === 'object' && details !== null) {
    const value = (details as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

/**
 * Get TLS grade from evidence
 */
function getTlsGrade(details: unknown): 'A' | 'B' | 'C' | 'D' | 'F' | undefined {
  if (typeof details === 'object' && details !== null) {
    const grade = (details as Record<string, unknown>).grade;
    if (grade === 'A' || grade === 'B' || grade === 'C' || grade === 'D' || grade === 'F')
      return grade;
  }
  return undefined;
}

/**
 * Generate summary text
 */
function generateSummary(scan: ScanData, evidence: EvidenceItem[]): string {
  const score = scan.score ?? 0;
  const evidenceCount = evidence.length;
  const trackerCount = evidence.filter(
    (e) => e.kind === 'tracker' || e.title?.toLowerCase().includes('tracker')
  ).length;

  if (score >= 90) {
    return `This site has excellent privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected and strong security measures. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 80) {
    return `This site has good privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Some minor improvements possible. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 70) {
    return `This site has fair privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Several areas need attention. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 60) {
    return `This site has concerning privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Many improvements needed. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  }
  return `This site has poor privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Significant privacy risks found. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
}

/**
 * Get display kind label for evidence
 */
function getDisplayKind(kind: string): string {
  const labels: Record<string, string> = {
    tracker: 'Tracker',
    thirdparty: 'Third-Party',
    cookie: 'Cookie',
    header: 'Security Header',
    insecure: 'Security Issue',
    fingerprint: 'Fingerprinting',
    policy: 'Privacy Policy',
    tls: 'TLS/HTTPS',
    'mixed-content': 'Mixed Content',
  };
  return labels[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);
}

export interface ReportPageClientProps {
  scan: ScanData;
  evidence: EvidenceItem[];
  domain: string;
  shareUrl: string;
}

/**
 * ReportPageClient - Interactive client component for privacy reports
 *
 * Features:
 * - Animated score dial with gradient ring
 * - Tab navigation for different evidence categories
 * - Evidence list with severity filtering
 * - Score breakdown table
 * - Share functionality
 */
export default function ReportPageClient({
  scan,
  evidence,
  domain,
  shareUrl,
}: ReportPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Compute derived data
  const trackerDomains = useMemo(() => {
    const domains = new Set<string>();
    evidence
      .filter((item) => item.kind === 'tracker')
      .forEach((item) => {
        const d = getDetailString(item.details, 'domain');
        if (d) domains.add(d);
      });
    return Array.from(domains);
  }, [evidence]);

  const thirdpartyDomains = useMemo(() => {
    const domains = new Set<string>();
    evidence
      .filter((item) => item.kind === 'thirdparty')
      .forEach((item) => {
        const d = getDetailString(item.details, 'domain');
        if (d) domains.add(d);
      });
    return Array.from(domains);
  }, [evidence]);

  const cookieIssues = evidence.filter((item) => item.kind === 'cookie').length;
  const tlsGrade = getTlsGrade(evidence.find((item) => item.kind === 'tls')?.details);

  const dataSharingLevel = useMemo(
    () => computeDataSharingLevel(trackerDomains.length, thirdpartyDomains.length, cookieIssues),
    [trackerDomains.length, thirdpartyDomains.length, cookieIssues]
  );

  const sslStatus = useMemo((): 'Valid' | 'Weak' | 'Invalid' => {
    if (!tlsGrade || tlsGrade === 'F') return 'Invalid';
    if (tlsGrade === 'D' || tlsGrade === 'C') return 'Weak';
    return 'Valid';
  }, [tlsGrade]);

  // Filter evidence based on active tab
  const tabEvidence = useMemo((): EvidenceView[] => {
    let filtered: EvidenceItem[] = [];

    if (activeTab === 'overview' || activeTab === 'details') {
      filtered = evidence;
    } else if (activeTab === 'tracking') {
      filtered = evidence.filter(
        (e) => e.kind === 'tracker' || e.kind === 'thirdparty' || e.kind === 'fingerprint'
      );
    } else if (activeTab === 'security') {
      filtered = evidence.filter(
        (e) =>
          e.kind === 'tls' ||
          e.kind === 'header' ||
          e.kind === 'insecure' ||
          e.kind === 'mixed-content'
      );
    } else if (activeTab === 'cookies') {
      filtered = evidence.filter((e) => e.kind === 'cookie');
    }

    return filtered.map((e) => ({
      ...e,
      domain: getDetailString(e.details, 'domain') || undefined,
      displayKind: getDisplayKind(e.kind),
      url: getDetailString(e.details, 'url') || undefined,
    }));
  }, [evidence, activeTab]);

  // Export JSON handler
  const exportJson = useCallback(() => {
    const payload = {
      scan: {
        id: scan.id,
        input: scan.input,
        score: scan.score,
        label: scan.label,
      },
      exportedAt: new Date().toISOString(),
      evidence: evidence,
      metadata: {
        version: '1.0',
        format: 'gecko-advisor-report',
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `privacy-report-${domain}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [scan, evidence, domain]);

  const score = scan.score ?? 0;
  const breakdown = useMemo(() => calculateBreakdown(scan, evidence), [scan, evidence]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-stone-50 to-white border border-gray-200 rounded-2xl p-8 md:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          {/* Score Dial */}
          <div className="flex flex-col items-center gap-3 mx-auto md:mx-0 md:w-1/4">
            <EnhancedScoreDial score={score} size="lg" label={scan.label ?? undefined} />
          </div>

          {/* Report Information */}
          <div className="flex-1 space-y-5 text-center md:text-left">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
                {domain} Privacy & Security Analysis
              </h1>
              <p className="text-zinc-600 text-base break-all mb-4">{scan.input}</p>
              <div className="flex justify-center md:justify-start">
                <GradeBadge score={score} size="lg" showLabel={true} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-advisor-500 hover:bg-advisor-600 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-advisor-500/50 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Scan Another
              </Link>

              <button
                onClick={() => window.print()}
                className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                title="Print report"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
              </button>

              <button
                onClick={exportJson}
                className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                title="Export as JSON"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-advisor-50 border-2 border-advisor-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-zinc-900 font-semibold text-lg mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Quick Summary
        </h2>
        <p className="text-zinc-600 leading-relaxed">{generateSummary(scan, evidence)}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Data Sharing Risk */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-zinc-500 mb-2">Data Sharing Risk</div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              dataSharingLevel === 'None'
                ? 'bg-privacy-safe-100 text-privacy-safe-700'
                : dataSharingLevel === 'Low'
                  ? 'bg-privacy-safe-50 text-privacy-safe-600'
                  : dataSharingLevel === 'Medium'
                    ? 'bg-privacy-caution-100 text-privacy-caution-700'
                    : 'bg-privacy-danger-100 text-privacy-danger-700'
            }`}
          >
            <span className="text-xl font-semibold">{dataSharingLevel}</span>
          </div>
          <div className="text-xs text-zinc-600 mt-2">
            Trackers: {trackerDomains.length} • Third-party: {thirdpartyDomains.length} • Cookies:{' '}
            {cookieIssues}
          </div>
        </div>

        {/* TLS/HTTPS */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-zinc-500 mb-2">TLS/HTTPS</div>
          <div className="text-2xl font-semibold text-zinc-900">{sslStatus}</div>
          <div className="text-xs text-zinc-600 mt-2">
            {tlsGrade ? `TLS grade: ${tlsGrade}` : 'TLS grade: Not rated'}
          </div>
        </div>

        {/* Top Trackers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-zinc-500 mb-2">Top Trackers</div>
          <div className="text-sm text-zinc-600">
            {trackerDomains.length > 0 ? trackerDomains.slice(0, 2).join(', ') : 'None detected'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <ReportTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        evidence={evidence}
        className="mb-4"
      />

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="min-h-[300px]"
      >
        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Overview shows summary cards and key findings */}
            <div className="bg-stone-50 rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">Key Findings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trackerDomains.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <div className="font-medium text-zinc-900">Trackers Detected</div>
                      <div className="text-sm text-zinc-600">
                        {trackerDomains.length} tracking domain{trackerDomains.length !== 1 && 's'}{' '}
                        found
                      </div>
                    </div>
                  </div>
                )}
                {thirdpartyDomains.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="font-medium text-zinc-900">Third-Party Connections</div>
                      <div className="text-sm text-zinc-600">
                        {thirdpartyDomains.length} external domain
                        {thirdpartyDomains.length !== 1 && 's'}
                      </div>
                    </div>
                  </div>
                )}
                {cookieIssues > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">🍪</span>
                    <div>
                      <div className="font-medium text-zinc-900">Cookie Issues</div>
                      <div className="text-sm text-zinc-600">
                        {cookieIssues} cookie{cookieIssues !== 1 && 's'} with concerns
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <div className="font-medium text-zinc-900">HTTPS Status</div>
                    <div className="text-sm text-zinc-600">
                      {sslStatus} {tlsGrade && `(Grade ${tlsGrade})`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EvidenceList
            items={tabEvidence}
            filter={severityFilter}
            onFilterChange={setSeverityFilter}
          />
        )}
      </div>

      {/* Score Breakdown */}
      <div className="border-t border-gray-200 pt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-zinc-900 hover:text-advisor-600 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-advisor-500 rounded px-1 py-1"
          aria-expanded={showBreakdown}
          aria-controls="score-breakdown"
        >
          <svg
            className={`w-5 h-5 transition-transform ${showBreakdown ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          How was this score calculated?
        </button>

        {showBreakdown && (
          <div
            id="score-breakdown"
            className="mt-4 bg-stone-50 rounded-lg p-6 animate-fade-in border border-gray-200"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-zinc-900">Category</th>
                    <th className="text-left py-2 px-3 font-semibold text-zinc-900">Finding</th>
                    <th className="text-right py-2 px-3 font-semibold text-zinc-900">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3 text-zinc-900">{item.category}</td>
                      <td className="py-2 px-3 text-zinc-600">{item.finding}</td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          item.positive
                            ? 'text-privacy-safe-600'
                            : item.points === 0
                              ? 'text-zinc-600'
                              : 'text-privacy-danger-600'
                        }`}
                      >
                        {item.points > 0 && '+'}
                        {item.points}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td colSpan={2} className="py-3 px-3 text-zinc-900">
                      Final Score
                    </td>
                    <td className="py-3 px-3 text-right text-lg text-zinc-900">{score}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-zinc-600">
              <strong className="text-zinc-900">Note:</strong> This is a simplified breakdown. The
              actual scoring algorithm considers additional factors including privacy policies,
              security headers, and data sharing patterns.
            </p>
          </div>
        )}
      </div>

      {/* Share Bar */}
      <ShareBar url={shareUrl} message={`Privacy report for ${domain} - Score: ${score}/100`} />

      {/* Footer */}
      <footer className="text-xs text-zinc-500 space-y-1 pt-4 border-t border-gray-200">
        <div>
          Sources: EasyPrivacy (server-side; attribution), WhoTracks.me (CC BY 4.0), Public Suffix
          List
        </div>
        <div>
          <Link href={`/reports`} className="text-advisor-600 hover:text-advisor-700 underline">
            Browse all reports
          </Link>
          {' • '}
          <Link href="/" className="text-advisor-600 hover:text-advisor-700 underline">
            Scan another site
          </Link>
        </div>
      </footer>
    </div>
  );
}
