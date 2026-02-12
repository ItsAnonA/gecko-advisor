/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import Link from 'next/link';
import type { UnusualFinding } from '@/lib/api';

/**
 * Severity configuration for styling
 */
const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    title: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-700',
  },
} as const;

/**
 * Icons for different finding types
 */
const FINDING_ICONS: Record<string, React.ReactNode> = {
  fingerprinting: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  ),
  excessive_trackers: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  high_ad_ratio: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  http_only: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  poor_tls: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  no_privacy_policy: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  long_term_cookies: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
      <circle cx="14" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
    </svg>
  ),
};

/**
 * Default icon for unknown types
 */
const DEFAULT_ICON = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface InterpretationCardProps {
  finding: UnusualFinding;
  onLearnMore?: () => void;
}

/**
 * InterpretationCard - Shows an unusual finding with severity styling
 */
export default function InterpretationCard({ finding, onLearnMore }: InterpretationCardProps) {
  const styles = SEVERITY_STYLES[finding.severity];
  const icon = FINDING_ICONS[finding.type] || DEFAULT_ICON;

  return (
    <div
      className={`rounded-lg border ${styles.border} ${styles.bg} p-4 transition-shadow hover:shadow-md`}
      role="alert"
      aria-label={`${finding.severity} finding: ${finding.title}`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with title and severity badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-semibold ${styles.title}`}>
              {finding.title}
            </h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge} capitalize`}>
              {finding.severity}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-700 mb-2">
            {finding.description}
          </p>

          {/* Prevalence info */}
          <p className="text-xs text-zinc-500 mb-2">
            {finding.prevalenceLabel}
          </p>

          {/* Learn more link */}
          {finding.learnMoreSlug && (
            <Link
              href={`/learn/${finding.learnMoreSlug}`}
              onClick={onLearnMore}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
            >
              Learn more
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * InterpretationCardList - Shows multiple unusual findings
 */
interface InterpretationCardListProps {
  findings: UnusualFinding[];
  maxVisible?: number;
  onLearnMore?: (type: string) => void;
}

export function InterpretationCardList({ findings, maxVisible = 3, onLearnMore }: InterpretationCardListProps) {
  const [showAll, setShowAll] = React.useState(false);

  if (findings.length === 0) {
    return null;
  }

  const visibleFindings = showAll ? findings : findings.slice(0, maxVisible);
  const hiddenCount = findings.length - maxVisible;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-900">Notable Findings</h3>
      <div className="space-y-2">
        {visibleFindings.map((finding, index) => (
          <InterpretationCard
            key={`${finding.type}-${index}`}
            finding={finding}
            onLearnMore={() => onLearnMore?.(finding.type)}
          />
        ))}
      </div>

      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors rounded focus-visible:ring-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Show {hiddenCount} more finding{hiddenCount === 1 ? '' : 's'}
        </button>
      )}

      {showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(false)}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors rounded focus-visible:ring-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Show less
        </button>
      )}
    </div>
  );
}
