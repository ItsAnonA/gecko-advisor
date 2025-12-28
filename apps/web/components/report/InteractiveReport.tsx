/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import Link from 'next/link';
import PremiumScoreDial from './PremiumScoreDial';
import BenchmarkSection from './BenchmarkSection';
import RecommendationsSection from './RecommendationsSection';
import { GradeBadge } from '@/components/ui/GradeBadge';
import type { ReportData } from '@/lib/api';
import { generateShareCopy, getShareUrl, getTwitterShareUrl, getLinkedInShareUrl, copyToClipboard } from '@/lib/shareUtils';

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

// ============================================================================
// Score Breakdown Component - Uses new 5-category penalty system
// ============================================================================
interface PenaltyBreakdown {
  tracking: number;
  security: number;
  thirdParty: number;
  cookies: number;
  compliance: number;
}

interface ScoreBreakdownProps {
  meta?: ReportData['meta'];
  score: number;
}

function ScoreBreakdownSection({ meta, score }: ScoreBreakdownProps) {
  const penalties = meta?.penalties as PenaltyBreakdown | undefined;
  const bonuses = meta?.bonuses as number | undefined;

  // If no penalties data, don't render
  if (!penalties) return null;

  const getSeverity = (penalty: number, maxPenalty: number): 'none' | 'low' | 'medium' | 'high' => {
    if (penalty === 0) return 'none';
    const ratio = penalty / maxPenalty;
    if (ratio < 0.3) return 'low';
    if (ratio < 0.6) return 'medium';
    return 'high';
  };

  const categories = [
    {
      key: 'tracking',
      name: 'Tracking & Analytics',
      penalty: penalties.tracking,
      maxPenalty: 50,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      key: 'security',
      name: 'Security Headers',
      penalty: penalties.security,
      maxPenalty: 45,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      key: 'thirdParty',
      name: 'Third-Party Requests',
      penalty: penalties.thirdParty,
      maxPenalty: 15,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      key: 'cookies',
      name: 'Cookie Security',
      penalty: penalties.cookies,
      maxPenalty: 10,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <circle cx="8" cy="10" r="1.5" fill="currentColor" />
          <circle cx="14" cy="8" r="1" fill="currentColor" />
          <circle cx="10" cy="15" r="1.5" fill="currentColor" />
          <circle cx="15" cy="13" r="1" fill="currentColor" />
        </svg>
      )
    },
    {
      key: 'compliance',
      name: 'Privacy Compliance',
      penalty: penalties.compliance,
      maxPenalty: 5,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  const severityStyles = {
    none: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'None' },
    low: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' },
    high: { bg: 'bg-red-100', text: 'text-red-700', label: 'High' }
  };

  const totalPenalty = Object.values(penalties).reduce((sum, p) => sum + p, 0);
  const bonusPoints = bonuses ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Score Breakdown
        </h3>
        {/* Weight context - explains category prioritization */}
        <p className="text-xs text-gray-500 mt-1">
          Security and tracking issues have higher impact than disclosure-only signals.
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {categories.map((cat) => {
          const severity = getSeverity(cat.penalty, cat.maxPenalty);
          const style = severityStyles[severity];

          return (
            <div key={cat.key} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-500">
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-zinc-800">{cat.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm tabular-nums text-zinc-600 font-medium">
                  {cat.penalty === 0 ? '0' : `-${cat.penalty}`}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            </div>
          );
        })}

        {/* Bonuses row */}
        {bonusPoints > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/50">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-emerald-800">TLS Bonus</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-emerald-700 font-bold">+{bonusPoints}</span>
            </div>
          </div>
        )}

        {/* Total row */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-50">
          <span className="text-sm font-semibold text-zinc-900">Final Score</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              100 - {totalPenalty} + {bonusPoints} =
            </span>
            <span className="text-lg font-bold text-zinc-900">{score}</span>
          </div>
        </div>
      </div>
    </div>
  );
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
  const { scan, evidence, meta, topFixes } = data;
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
      label: 'Security Checks',
      count: securityEvidence.length,
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
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
                <span className="font-mono">{domain}</span> Privacy & Security Signals
              </h1>
              <p className="text-zinc-600 break-all font-mono text-sm mt-1">{scan.input}</p>
            </div>

            <div className="flex justify-center md:justify-start">
              <GradeBadge score={score} size="lg" showLabel={true} />
            </div>

            {/* THE DIFFERENTIATOR - identical everywhere, above the fold */}
            <p className="text-base text-zinc-700 bg-gray-50 border-l-3 border-emerald-500 px-4 py-2 rounded-r-lg" style={{ borderLeftWidth: '3px' }}>
              <strong className="text-zinc-900">What websites actually do, not what they promise.</strong>
              {' '}Gecko Advisor analyzes real network behavior — not privacy policies.
            </p>

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

      {/* Quick Summary - methodology context, not verdict repetition */}
      <section className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Quick Summary
        </h2>
        <p className="text-sm text-slate-700">
          This score reflects publicly observable network behavior measured during a live scan.{' '}
          {evidence.length > 0 ? `${evidence.length} signals analyzed` : 'No significant concerns detected'}
          {trackerCount === 0
            ? ', no tracking scripts detected.'
            : `, ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} identified.`}
        </p>
      </section>

      {/* Key Metrics - with color-score consistency */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          label="Data Sharing Risk"
          value={trackerCount === 0 && thirdPartyCount < 3 ? 'Low' : thirdPartyCount > 10 ? 'High' : 'Medium'}
          detail={`Trackers: ${trackerCount} • Third-party: ${thirdPartyCount} • Cookies: ${cookieCount}`}
          variant={trackerCount === 0 ? 'success' : trackerCount > 5 ? 'danger' : 'warning'}
          score={score}
          severity={trackerCount > 5 ? 'high' : trackerCount > 0 ? 'medium' : 'none'}
        />
        <MetricCard
          label="TLS/HTTPS"
          value={tlsGrade ? 'Valid' : 'Unknown'}
          detail={tlsGrade ? `TLS grade: ${tlsGrade}` : 'Unable to verify'}
          variant={tlsGrade === 'A' || tlsGrade === 'A+' ? 'success' : tlsGrade ? 'warning' : 'neutral'}
          score={score}
          severity={!tlsGrade || tlsGrade === 'F' ? 'high' : tlsGrade === 'D' || tlsGrade === 'C' ? 'medium' : 'low'}
        />
        <MetricCard
          label="Top Trackers"
          value={trackerCount > 0 ? `${trackerCount} found` : 'None detected'}
          variant={trackerCount === 0 ? 'success' : 'warning'}
          score={score}
          severity={trackerCount > 5 ? 'high' : trackerCount > 0 ? 'medium' : 'none'}
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

      {/* Tab Content - ALL panels rendered in DOM for SEO, hidden attribute controls visibility */}
      <div className="mt-6">
        {/* Overview Panel */}
        <div
          role="tabpanel"
          id="tabpanel-overview"
          aria-labelledby="tab-overview"
          hidden={activeTab !== 'overview'}
        >
          <OverviewPanel
            score={score}
            domain={domain}
            trackerCount={trackerCount}
            thirdPartyCount={thirdPartyCount}
            tlsGrade={tlsGrade}
            evidence={evidence}
            seoContent={seoContent}
            meta={meta}
            topFixes={topFixes}
          />
        </div>

        {/* Tracking Panel */}
        <div
          role="tabpanel"
          id="tabpanel-tracking"
          aria-labelledby="tab-tracking"
          hidden={activeTab !== 'tracking'}
        >
          <EvidencePanel evidence={trackingEvidence} title="Tracking & Analytics" emptyMessage="No trackers detected!" tabType="tracking" />
        </div>

        {/* Security Panel */}
        <div
          role="tabpanel"
          id="tabpanel-security"
          aria-labelledby="tab-security"
          hidden={activeTab !== 'security'}
        >
          <EvidencePanel evidence={securityEvidence} title="Security Analysis" emptyMessage="No security issues detected." tabType="security" />
        </div>

        {/* Cookies Panel */}
        <div
          role="tabpanel"
          id="tabpanel-cookies"
          aria-labelledby="tab-cookies"
          hidden={activeTab !== 'cookies'}
        >
          <EvidencePanel evidence={cookieEvidence} title="Cookie Analysis" emptyMessage="No cookie issues detected." tabType="cookies" />
        </div>

        {/* Full Report Panel */}
        <div
          role="tabpanel"
          id="tabpanel-details"
          aria-labelledby="tab-details"
          hidden={activeTab !== 'details'}
        >
          <EvidencePanel evidence={evidence} title="All Technical Details" emptyMessage="No issues detected." tabType="details" />
        </div>
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

      {/* Share Section - with pre-written copy */}
      <ShareSection
        domain={domain}
        score={score}
        trackerCount={trackerCount}
        tlsGrade={tlsGrade}
      />

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

/**
 * MetricCard - Displays a key metric with color-score consistency
 *
 * CRITICAL: High scores (≥80) use neutral colors unless severity is explicitly 'high'
 * This prevents green score + orange elements = score feels fake
 */
function MetricCard({
  label,
  value,
  detail,
  variant = 'neutral',
  score,
  severity
}: {
  label: string;
  value: string;
  detail?: string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
  /** Overall report score - used for color-score consistency */
  score?: number;
  /** Explicit severity override - only 'high' shows warning colors on high-score reports */
  severity?: 'none' | 'low' | 'medium' | 'high';
}) {
  // CRITICAL: Color-score consistency rule
  // High scores (≥80) get neutral colors unless severity is explicitly high
  const effectiveVariant = React.useMemo(() => {
    if (score !== undefined && score >= 80 && severity !== 'high') {
      // High score report - use neutral colors for non-high-severity items
      if (variant === 'warning' || variant === 'danger') {
        return 'neutral';
      }
    }
    return variant;
  }, [score, severity, variant]);

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
    <div className={`rounded-xl border p-4 ${variantStyles[effectiveVariant]}`}>
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-1 ${valueStyles[effectiveVariant]}`}>{value}</div>
      {detail && <div className="text-xs text-zinc-500 mt-1">{detail}</div>}
    </div>
  );
}

/**
 * ShareSection - Displays pre-written share copy with social buttons
 *
 * Features:
 * - Pre-written copy based on score and tracker count
 * - Copy to clipboard functionality
 * - Direct social share links (Twitter/X, LinkedIn)
 */
function ShareSection({
  domain,
  score,
  trackerCount,
  tlsGrade,
}: {
  domain: string;
  score: number;
  trackerCount: number;
  tlsGrade?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const shareParams = { domain, score, trackerCount, tlsGrade };
  const { text } = generateShareCopy(shareParams);
  const url = getShareUrl(domain);
  const fullShareText = `${text} ${url}`;

  const handleCopyText = async () => {
    const success = await copyToClipboard(fullShareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-semibold text-zinc-900">Share this report</h4>

      {/* Pre-written copy preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-zinc-700 italic">&ldquo;{text}&rdquo;</p>
        <button
          onClick={handleCopyText}
          className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy with link
            </>
          )}
        </button>
      </div>

      {/* Social share buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={getTwitterShareUrl(shareParams)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </a>
        <a
          href={getLinkedInShareUrl(domain)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Share on LinkedIn
        </a>
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-zinc-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Copy link
        </button>
      </div>

      {/* Direct link display */}
      <div className="text-xs text-zinc-500 font-mono truncate">
        {url}
      </div>
    </div>
  );
}

// Minimum sample size for showing market comparison - below this, hide entirely
const MIN_SAMPLE_FOR_COMPARISON = 50;

function OverviewPanel({
  score,
  domain,
  trackerCount,
  thirdPartyCount,
  tlsGrade,
  evidence,
  seoContent,
  meta,
  topFixes
}: {
  score: number;
  domain: string;
  trackerCount: number;
  thirdPartyCount: number;
  tlsGrade?: string;
  evidence: ReportData['evidence'];
  seoContent?: React.ReactNode;
  meta?: ReportData['meta'];
  topFixes?: ReportData['topFixes'];
}) {
  // CRITICAL: Only show market comparison when we have enough data (N >= 50)
  // No placeholder, no "coming soon", nothing - just hide entirely
  const totalDomains = meta?.globalBenchmarks?.totalDomains ?? 0;
  const hasBenchmarks = meta?.benchmarks && meta?.globalBenchmarks && totalDomains >= MIN_SAMPLE_FOR_COMPARISON;
  const hasRecommendations = topFixes && topFixes.length > 0;

  return (
    <div className="space-y-6">
      {/* ===== PRIMARY INSIGHTS ROW ===== */}
      {/* Two-column dashboard layout on desktop, stacked on mobile */}
      <div className={`grid gap-6 ${hasBenchmarks && hasRecommendations ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Market Comparison - Left Column */}
        {hasBenchmarks && (
          <div className="min-w-0">
            <BenchmarkSection meta={meta} domain={domain} score={score} />
          </div>
        )}

        {/* Recommended Actions - Right Column */}
        {hasRecommendations && (
          <div className="min-w-0">
            <RecommendationsSection topFixes={topFixes} domain={domain} />
          </div>
        )}
      </div>

      {/* ===== QUICK STATS BAR ===== */}
      {/* Compact horizontal stats strip */}
      <div className="bg-gradient-to-r from-slate-50 to-stone-50 rounded-xl border border-slate-200/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Stat items */}
          <div className="flex flex-wrap items-center gap-6">
            {/* Third-party connections */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Third-Party</div>
                <div className="text-sm font-bold text-zinc-900">{thirdPartyCount} connections</div>
              </div>
            </div>

            {/* TLS Status */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tlsGrade ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                <svg className={`w-4 h-4 ${tlsGrade ? 'text-emerald-600' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium">HTTPS</div>
                <div className="text-sm font-bold text-zinc-900">{tlsGrade ? `Grade ${tlsGrade}` : 'Unknown'}</div>
              </div>
            </div>

            {/* Trackers */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trackerCount === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <svg className={`w-4 h-4 ${trackerCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Trackers</div>
                <div className="text-sm font-bold text-zinc-900">{trackerCount === 0 ? 'None found' : `${trackerCount} detected`}</div>
              </div>
            </div>
          </div>

          {/* Impact summary badge */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
            trackerCount === 0 && thirdPartyCount < 5
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : trackerCount > 5 || thirdPartyCount > 15
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {trackerCount === 0 && thirdPartyCount < 5
              ? '✓ Low Risk'
              : trackerCount > 5 || thirdPartyCount > 15
              ? '⚠ High Risk'
              : '● Moderate Risk'}
          </div>
        </div>
      </div>

      {/* ===== SCORE BREAKDOWN ===== */}
      {/* Penalty category breakdown using new scoring algorithm */}
      <ScoreBreakdownSection meta={meta} score={score} />

      {/* ===== SEO CONTENT ===== */}
      {/* Native details/summary - semantic, accessible, and crawlable */}
      {seoContent && (
        <details className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
          <summary className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-zinc-800">Detailed Analysis Report</span>
            </div>
            <svg
              className="w-4 h-4 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 py-4 border-t border-gray-100">
            {seoContent}
          </div>
        </details>
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
