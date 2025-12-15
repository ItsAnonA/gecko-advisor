/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import Link from 'next/link';
import PremiumScoreDial from './PremiumScoreDial';
import { GradeBadge } from '@/components/ui/GradeBadge';
import type { ReportData } from '@/lib/api';

// ============================================================================
// SVG Icons for evidence types
// ============================================================================
const Icons = {
  chart: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  link: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  fingerprint: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  ),
  cog: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  unlocked: (
    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
  cookie: (
    <svg className="w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
      <circle cx="14" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
    </svg>
  ),
  locked: (
    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  exclamation: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" />
    </svg>
  ),
  bolt: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ============================================================================
// Human-readable labels for technical evidence types
// ============================================================================
const KIND_LABELS: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  tracker: {
    label: 'Tracking Script',
    description: 'Analytics or advertising tracker collecting your browsing data',
    icon: Icons.chart,
  },
  thirdparty: {
    label: 'External Resource',
    description: 'Content loaded from another domain',
    icon: Icons.link,
  },
  fingerprint: {
    label: 'Browser Fingerprinting',
    description: 'Technique to uniquely identify your device without cookies',
    icon: Icons.fingerprint,
  },
  header: {
    label: 'Missing Security Header',
    description: 'Recommended browser protection not configured',
    icon: Icons.cog,
  },
  insecure: {
    label: 'Insecure Connection',
    description: 'Content loaded without encryption (HTTP)',
    icon: Icons.warning,
  },
  'mixed-content': {
    label: 'Mixed Content',
    description: 'HTTP content loaded on HTTPS page',
    icon: Icons.unlocked,
  },
  cookie: {
    label: 'Cookie Issue',
    description: 'Cookie security or privacy concern detected',
    icon: Icons.cookie,
  },
  tls: {
    label: 'TLS/HTTPS',
    description: 'Connection security configuration',
    icon: Icons.locked,
  },
  policy: {
    label: 'Privacy Policy',
    description: 'Legal privacy documentation',
    icon: Icons.document,
  },
};

// ============================================================================
// Evidence grouping for deduplication
// ============================================================================
interface GroupedEvidence {
  key: string;
  title: string;
  kind: string;
  severity: number;
  count: number;
  items: ReportData['evidence'];
  isPositive?: boolean;
}

function groupEvidence(evidence: ReportData['evidence']): GroupedEvidence[] {
  const groups = new Map<string, GroupedEvidence>();

  for (const item of evidence) {
    // Create grouping key based on kind + title
    const groupKey = `${item.kind}:${item.title}`;

    if (groups.has(groupKey)) {
      const group = groups.get(groupKey)!;
      group.count++;
      group.items.push(item);
      // Use highest severity in group
      group.severity = Math.max(group.severity, item.severity);
    } else {
      // Check if this is a positive finding (good TLS grade)
      let isPositive = false;
      if (item.kind === 'tls') {
        const details = item.details as { grade?: string } | null;
        const grade = details?.grade;
        if (grade && ['A+', 'A', 'B'].includes(grade)) {
          isPositive = true;
        }
      }

      groups.set(groupKey, {
        key: groupKey,
        title: item.title,
        kind: item.kind,
        severity: item.severity,
        count: 1,
        items: [item],
        isPositive,
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.severity - a.severity || b.count - a.count
  );
}

// ============================================================================
// Helper to check if TLS evidence is a vulnerability or positive finding
// ============================================================================
function isTlsVulnerability(item: ReportData['evidence'][0]): boolean {
  if (item.kind !== 'tls') return true; // Not TLS, include in normal filtering
  const details = item.details as { grade?: string } | null;
  const grade = details?.grade;
  // TLS is only a vulnerability if grade is poor (C, D, F, or unknown)
  return !grade || !['A+', 'A', 'B'].includes(grade);
}

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
  // Security evidence: exclude good TLS grades (A+, A, B) - they're not vulnerabilities!
  const securityEvidence = evidence.filter(e => {
    if (e.kind === 'tls') {
      return isTlsVulnerability(e); // Only include poor TLS grades
    }
    return e.kind === 'header' || e.kind === 'insecure' || e.kind === 'mixed-content';
  });
  // Positive findings (good TLS grades) - show in overview
  const positiveFindings = evidence.filter(e => {
    if (e.kind === 'tls') {
      return !isTlsVulnerability(e); // Good TLS grades
    }
    return false;
  });
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
            <PremiumScoreDial score={score} size="lg" label={scan.label ?? undefined} />
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
        {activeTab === 'tracking' && <EvidencePanel evidence={trackingEvidence} title="Tracking & Analytics" emptyMessage="No trackers detected!" tabType="tracking" />}
        {activeTab === 'security' && <EvidencePanel evidence={securityEvidence} title="Security Analysis" emptyMessage="No security issues detected." tabType="security" />}
        {activeTab === 'cookies' && <EvidencePanel evidence={cookieEvidence} title="Cookie Analysis" emptyMessage="No cookie issues detected." tabType="cookies" />}
        {activeTab === 'details' && <EvidencePanel evidence={evidence} title="All Technical Details" emptyMessage="No issues detected." tabType="details" />}
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
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-zinc-900">Third-Party Connections</div>
              <div className="text-sm text-zinc-600">{thirdPartyCount} external domains</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
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
  emptyMessage,
  tabType
}: {
  evidence: ReportData['evidence'];
  title: string;
  emptyMessage: string;
  tabType?: 'tracking' | 'security' | 'cookies' | 'details';
}) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

  // Group similar evidence items to reduce visual noise
  const groupedEvidence = React.useMemo(() => groupEvidence(evidence), [evidence]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Improved severity styling with clearer labels
  const getSeverityStyle = (severity: number, isPositive?: boolean) => {
    if (isPositive) {
      return {
        bg: 'bg-emerald-50',
        border: 'border-l-4 border-emerald-400',
        badge: 'bg-emerald-100 text-emerald-700',
        label: 'Good',
        icon: <span className="text-emerald-600">{Icons.check}</span>,
      };
    }
    if (severity >= 4) {
      return {
        bg: 'bg-red-50',
        border: 'border-l-4 border-red-400',
        badge: 'bg-red-100 text-red-700',
        label: 'Action Needed',
        icon: <span className="text-red-600">{Icons.exclamation}</span>,
      };
    }
    if (severity === 3) {
      return {
        bg: 'bg-amber-50',
        border: 'border-l-4 border-amber-400',
        badge: 'bg-amber-100 text-amber-700',
        label: 'Review',
        icon: <span className="text-amber-600">{Icons.bolt}</span>,
      };
    }
    if (severity === 2) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-l-4 border-yellow-300',
        badge: 'bg-yellow-100 text-yellow-700',
        label: 'Moderate',
        icon: <span className="text-yellow-600">{Icons.info}</span>,
      };
    }
    return {
      bg: 'bg-blue-50',
      border: 'border-l-4 border-blue-300',
      badge: 'bg-blue-100 text-blue-700',
      label: 'Info',
      icon: <span className="text-blue-600">{Icons.info}</span>,
    };
  };

  // Tab-specific summary
  const getSummary = () => {
    if (evidence.length === 0) return null;

    const highSeverity = evidence.filter(e => e.severity >= 3).length;
    const kindCounts = evidence.reduce((acc, e) => {
      acc[e.kind] = (acc[e.kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    switch (tabType) {
      case 'tracking':
        return (
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <h4 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
              {Icons.clipboard} Summary
            </h4>
            <p className="text-sm text-zinc-600">
              {kindCounts.tracker ? `${kindCounts.tracker} known tracking service${kindCounts.tracker > 1 ? 's' : ''} detected. ` : ''}
              {kindCounts.thirdparty ? `${kindCounts.thirdparty} external resource${kindCounts.thirdparty > 1 ? 's' : ''} loaded. ` : ''}
              {kindCounts.fingerprint ? `${kindCounts.fingerprint} fingerprinting technique${kindCounts.fingerprint > 1 ? 's' : ''} observed.` : ''}
            </p>
          </div>
        );
      case 'security':
        return (
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <h4 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
              {Icons.shield} Summary
            </h4>
            <p className="text-sm text-zinc-600">
              {highSeverity > 0
                ? `${highSeverity} issue${highSeverity > 1 ? 's' : ''} may need attention. `
                : 'No critical security issues found. '}
              {kindCounts.header ? `${kindCounts.header} missing security header${kindCounts.header > 1 ? 's' : ''}. ` : ''}
              {kindCounts.insecure || kindCounts['mixed-content']
                ? `${(kindCounts.insecure || 0) + (kindCounts['mixed-content'] || 0)} insecure resource${((kindCounts.insecure || 0) + (kindCounts['mixed-content'] || 0)) > 1 ? 's' : ''}.`
                : ''}
            </p>
          </div>
        );
      case 'cookies':
        return (
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <h4 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
              {Icons.cookie} Summary
            </h4>
            <p className="text-sm text-zinc-600">
              {evidence.length} cookie-related finding{evidence.length > 1 ? 's' : ''} detected.
              {highSeverity > 0
                ? ` ${highSeverity} may require review.`
                : ' No significant cookie concerns.'}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (evidence.length === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-emerald-800 text-lg">{emptyMessage}</h3>
        <p className="text-sm text-emerald-600 mt-2 max-w-md mx-auto">
          {tabType === 'tracking' && 'This site does not appear to use known tracking services.'}
          {tabType === 'security' && 'No security vulnerabilities were detected.'}
          {tabType === 'cookies' && 'Cookies are properly configured with security attributes.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
        <span className="text-sm text-zinc-500">
          {groupedEvidence.length} finding{groupedEvidence.length !== 1 ? 's' : ''}
          {evidence.length !== groupedEvidence.length && (
            <span className="text-zinc-400"> ({evidence.length} total)</span>
          )}
        </span>
      </div>

      {/* Tab summary */}
      {getSummary()}

      {/* Grouped evidence items */}
      {groupedEvidence.map(group => {
        const style = getSeverityStyle(group.severity, group.isPositive);
        const isExpanded = expandedGroups.has(group.key);
        const kindLabel = KIND_LABELS[group.kind] || { label: group.kind, description: '', icon: Icons.document };
        const hasDetails = group.items.some(item =>
          item.details && typeof item.details === 'object' && Object.keys(item.details as object).length > 0
        );

        return (
          <div key={group.key} className={`${style.bg} ${style.border} rounded-lg overflow-hidden`}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 text-xl" aria-hidden="true">
                  {kindLabel.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-medium text-zinc-900">{group.title}</h4>
                    <div className="flex items-center gap-2">
                      {group.count > 1 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                          ×{group.count}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">{kindLabel.label}</p>
                  {kindLabel.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{kindLabel.description}</p>
                  )}

                  {/* Show details button */}
                  {hasDetails && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={isExpanded}
                      aria-controls={`details-${group.key}`}
                      className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? '−' : '+'}</span>
                      <span>{isExpanded ? 'Hide details' : `Show details${group.count > 1 ? ` (${group.count} items)` : ''}`}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && hasDetails && (
              <div
                id={`details-${group.key}`}
                className="border-t border-gray-200 bg-white p-4 space-y-3"
              >
                {group.items.map((item, idx) => {
                  const details = item.details as Record<string, unknown> | null;
                  if (!details || Object.keys(details).length === 0) return null;

                  return (
                    <div key={item.id} className="text-sm">
                      {group.count > 1 && (
                        <div className="text-xs font-medium text-zinc-500 mb-1">
                          Instance {idx + 1}
                        </div>
                      )}
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(details).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <dt className="font-medium text-zinc-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </dt>
                            <dd className="text-zinc-800 truncate" title={String(value)}>
                              {String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
