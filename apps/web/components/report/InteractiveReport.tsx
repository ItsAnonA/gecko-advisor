/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import Link from 'next/link';
import EnhancedScoreDial from './EnhancedScoreDial';
import { GradeBadge } from '@/components/ui/GradeBadge';
import type { ReportData } from '@/lib/api';

interface InteractiveReportProps {
  data: ReportData;
  domain: string;
  /** SEO content to embed in the Overview tab (server-rendered) */
  seoContent?: React.ReactNode;
  /** Heading to display (from SEO metadata) */
  heading?: string;
}

type TabId = 'overview' | 'tracking' | 'security' | 'cookies' | 'details';

/**
 * InteractiveReport - Client component for interactive report UI
 *
 * Provides:
 * - Animated score dial
 * - Tab-based navigation
 * - Evidence lists
 * - Share functionality
 * - Print/Export options
 */
export default function InteractiveReport({ data, domain, seoContent, heading }: InteractiveReportProps) {
  const { scan, evidence, meta } = data;
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const score = scan.score ?? 0;

  // Categorize evidence
  const trackingEvidence = evidence.filter(e =>
    e.kind === 'tracker' || e.kind === 'thirdparty' || e.kind === 'fingerprint'
  );
  const securityEvidence = evidence.filter(e =>
    e.kind === 'tls' || e.kind === 'header' || e.kind === 'insecure' || e.kind === 'mixed-content'
  );
  const cookieEvidence = evidence.filter(e => e.kind === 'cookie');

  // Extract stats
  const trackerCount = meta?.trackerCount ?? evidence.filter(e => e.kind === 'tracker').length;
  const thirdPartyCount = meta?.thirdPartyCount ?? evidence.filter(e => e.kind === 'thirdparty').length;
  const cookieCount = meta?.cookieCount ?? cookieEvidence.length;
  const tlsGrade = meta?.tlsGrade;

  // Share handler
  const shareUrl = React.useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: `${domain} Privacy Report` });
        return;
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch {
      alert('Failed to copy link');
    }
  }, [domain]);

  // Export JSON handler
  const exportJson = React.useCallback(() => {
    const payload = {
      scan: { id: scan.id, input: scan.input, score: scan.score, label: scan.label, slug: scan.slug },
      exportedAt: new Date().toISOString(),
      evidence: evidence.map(e => ({ ...e })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-report-${domain}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [evidence, scan, domain]);

  const tabs: { id: TabId; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
    {
      id: 'tracking',
      label: "Who's Watching",
      count: trackingEvidence.length,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    },
    {
      id: 'security',
      label: 'Vulnerabilities',
      count: securityEvidence.length,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    },
    {
      id: 'cookies',
      label: 'Cookie Exposure',
      count: cookieEvidence.length > 0 ? cookieEvidence.length : undefined,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {
      id: 'details',
      label: 'Full Report',
      count: evidence.length,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <header className="bg-gradient-to-br from-stone-50 to-white border border-gray-200 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Score Dial */}
          <div className="flex-shrink-0">
            <EnhancedScoreDial score={score} size="lg" label={scan.label ?? undefined} />
          </div>

          {/* Report Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-zinc-900">
                <span className="font-mono">{domain}</span> Privacy & Security Analysis
              </h1>
              <p className="text-zinc-600 break-all font-mono text-sm mt-1">{scan.input}</p>
            </div>

            <div className="flex justify-center md:justify-start">
              <GradeBadge score={score} size="lg" showLabel={true} />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan Another
              </Link>
              <button
                onClick={() => window.print()}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-zinc-600 transition-colors"
                title="Print report"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button
                onClick={exportJson}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-zinc-600 transition-colors"
                title="Export as JSON"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Summary */}
      <section className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Quick Summary
        </h2>
        <p className="text-sm text-slate-700">
          This site has {score >= 70 ? 'good' : score >= 40 ? 'fair' : 'poor'} privacy practices with{' '}
          {trackerCount} tracker{trackerCount !== 1 ? 's' : ''} detected.{' '}
          {evidence.length > 0 ? `${evidence.length} total findings analyzed.` : 'No significant issues found.'}
        </p>
      </section>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          label="Data Sharing Risk"
          value={trackerCount === 0 && thirdPartyCount < 3 ? 'Low' : thirdPartyCount > 10 ? 'High' : 'Medium'}
          detail={`Trackers: ${trackerCount} • Third-party: ${thirdPartyCount} • Cookies: ${cookieCount}`}
          variant={trackerCount === 0 ? 'success' : trackerCount > 5 ? 'danger' : 'warning'}
        />
        <MetricCard
          label="TLS/HTTPS"
          value={tlsGrade ? 'Valid' : 'Unknown'}
          detail={tlsGrade ? `TLS grade: ${tlsGrade}` : 'Unable to verify'}
          variant={tlsGrade === 'A' ? 'success' : tlsGrade ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Top Trackers"
          value={trackerCount > 0 ? `${trackerCount} found` : 'None detected'}
          variant={trackerCount === 0 ? 'success' : 'warning'}
        />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex overflow-x-auto" role="tablist" aria-label="Report sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-gray-300'}
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewPanel
            score={score}
            domain={domain}
            trackerCount={trackerCount}
            thirdPartyCount={thirdPartyCount}
            tlsGrade={tlsGrade}
            evidence={evidence}
            seoContent={seoContent}
          />
        )}
        {activeTab === 'tracking' && <EvidencePanel evidence={trackingEvidence} title="Tracking & Analytics" emptyMessage="No trackers detected. This is great for privacy!" />}
        {activeTab === 'security' && <EvidencePanel evidence={securityEvidence} title="Security Analysis" emptyMessage="No security issues detected." />}
        {activeTab === 'cookies' && <EvidencePanel evidence={cookieEvidence} title="Cookie Analysis" emptyMessage="No cookie issues detected." />}
        {activeTab === 'details' && <EvidencePanel evidence={evidence} title="All Technical Details" emptyMessage="No issues detected." />}
      </div>

      {/* Score Explanation */}
      <details className="bg-white border border-gray-200 rounded-xl">
        <summary className="px-4 py-3 cursor-pointer font-medium text-zinc-900 flex items-center gap-2 hover:bg-gray-50">
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How was this score calculated?
        </summary>
        <div className="px-4 pb-4 text-sm text-zinc-600 space-y-2">
          <p>Privacy scores are calculated based on:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Number and type of trackers detected</li>
            <li>Third-party connections and data sharing</li>
            <li>Cookie practices and storage duration</li>
            <li>Security headers and TLS configuration</li>
            <li>Fingerprinting scripts and techniques</li>
          </ul>
          <p>Higher scores indicate fewer observable privacy concerns.</p>
        </div>
      </details>

      {/* Share Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-900">Share this report</div>
            <div className="text-xs text-zinc-500 font-mono truncate max-w-xs">
              https://geckoadvisor.com/privacy-policy/{domain}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={shareUrl}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              Share
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://geckoadvisor.com/privacy-policy/${domain}`);
                alert('Link copied!');
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-zinc-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Copy link
            </button>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <footer className="text-xs text-zinc-500 space-y-2">
        <div>Sources: EasyPrivacy (server-side; attribution), WhoTracks.me (CC BY 4.0), Public Suffix List</div>
        <div className="flex flex-wrap gap-3">
          <Link href="/reports" className="text-emerald-600 hover:text-emerald-700 underline">Browse all reports</Link>
          <span>•</span>
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">Scan another site</Link>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function MetricCard({
  label,
  value,
  detail,
  variant = 'neutral'
}: {
  label: string;
  value: string;
  detail?: string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const variantStyles = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
    neutral: 'bg-gray-50 border-gray-200'
  };

  const valueStyles = {
    success: 'text-green-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    neutral: 'text-zinc-700'
  };

  return (
    <div className={`rounded-xl border p-4 ${variantStyles[variant]}`}>
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-1 ${valueStyles[variant]}`}>{value}</div>
      {detail && <div className="text-xs text-zinc-500 mt-1">{detail}</div>}
    </div>
  );
}

function OverviewPanel({
  score,
  domain,
  trackerCount,
  thirdPartyCount,
  tlsGrade,
  evidence,
  seoContent
}: {
  score: number;
  domain: string;
  trackerCount: number;
  thirdPartyCount: number;
  tlsGrade?: string;
  evidence: ReportData['evidence'];
  seoContent?: React.ReactNode;
}) {
  return (
    <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" className="space-y-6">
      {/* SEO Content - Crawlable by search engines */}
      {seoContent && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {seoContent}
        </div>
      )}

      {/* Key Findings */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">Key Findings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
            <span className="text-2xl">🔗</span>
            <div>
              <div className="font-medium text-zinc-900">Third-Party Connections</div>
              <div className="text-sm text-zinc-600">{thirdPartyCount} external domains</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
            <span className="text-2xl">🔒</span>
            <div>
              <div className="font-medium text-zinc-900">HTTPS Status</div>
              <div className="text-sm text-zinc-600">{tlsGrade ? `Valid (Grade ${tlsGrade})` : 'Unknown'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {evidence.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Score Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-zinc-600">Category</th>
                  <th className="text-left py-2 px-3 font-medium text-zinc-600">Issues</th>
                  <th className="text-left py-2 px-3 font-medium text-zinc-600">Impact</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Trackers', count: trackerCount, impact: trackerCount > 5 ? 'High' : trackerCount > 0 ? 'Medium' : 'None' },
                  { name: 'Third-Party', count: thirdPartyCount, impact: thirdPartyCount > 10 ? 'High' : thirdPartyCount > 3 ? 'Medium' : 'Low' },
                  { name: 'Security', count: evidence.filter(e => e.kind === 'header' || e.kind === 'insecure').length, impact: 'Varies' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-zinc-900">{row.name}</td>
                    <td className="py-2 px-3 text-zinc-600">{row.count}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        row.impact === 'High' ? 'bg-red-100 text-red-700' :
                        row.impact === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        row.impact === 'None' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {row.impact}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidencePanel({
  evidence,
  title,
  emptyMessage
}: {
  evidence: ReportData['evidence'];
  title: string;
  emptyMessage: string;
}) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSeverityStyle = (severity: number) => {
    if (severity >= 4) return { bg: 'bg-red-50', border: 'border-l-4 border-red-400', badge: 'bg-red-100 text-red-700', label: 'Critical' };
    if (severity === 3) return { bg: 'bg-amber-50', border: 'border-l-4 border-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'High' };
    if (severity === 2) return { bg: 'bg-yellow-50', border: 'border-l-4 border-yellow-300', badge: 'bg-yellow-100 text-yellow-700', label: 'Medium' };
    return { bg: 'bg-gray-50', border: 'border-l-4 border-gray-300', badge: 'bg-gray-100 text-gray-600', label: 'Low' };
  };

  if (evidence.length === 0) {
    return (
      <div className="text-center py-12 bg-emerald-50 rounded-xl border border-emerald-200">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-semibold text-emerald-800">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
        <span className="text-sm text-zinc-500">{evidence.length} item{evidence.length !== 1 ? 's' : ''}</span>
      </div>
      {evidence.sort((a, b) => b.severity - a.severity).map(item => {
        const style = getSeverityStyle(item.severity);
        const isExpanded = expandedItems.has(item.id);
        const hasDetails = Boolean(item.details && typeof item.details === 'object' && Object.keys(item.details).length > 0);

        return (
          <div key={item.id} className={`${style.bg} ${style.border} rounded-lg p-4`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-zinc-900">{item.title}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.badge}`}>
                {style.label}
              </span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">{item.kind}</div>

            {hasDetails && (
              <>
                <button
                  onClick={() => toggleItem(item.id)}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {isExpanded ? '- Hide details' : '+ Show details'}
                </button>
                {isExpanded && (
                  <pre className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs text-zinc-700 font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(item.details, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
