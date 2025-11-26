/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import type { ReportResponse } from '@gecko-advisor/shared';

type EvidenceItem = ReportResponse['evidence'][number];

export interface PrivacyStatusCardProps {
  /** Privacy score from 0-100 */
  score: number;
  /** Score label (Safe, Caution, High Risk) */
  label?: string | null;
  /** All evidence items for counting */
  evidence: EvidenceItem[];
  /** Domain being scanned */
  domain: string;
  /** Callback when user wants to see issues */
  onViewIssues?: () => void;
}

/**
 * PrivacyStatusCard - Instant comprehension component
 *
 * Design Goal: User understands privacy status in 5-10 seconds
 * without reading detailed text.
 *
 * Features:
 * - Large traffic light indicator (visual, not text-based)
 * - 3-count summary: Critical / Warnings / Info
 * - One-line status message
 * - "What this means" for non-technical users
 * - WCAG AA accessible with aria-labels
 * - Color-blind safe with icons + patterns
 */
const PrivacyStatusCard = React.memo(function PrivacyStatusCard({
  score,
  label: _label,
  evidence,
  domain,
  onViewIssues
}: PrivacyStatusCardProps) {
  // Count issues by severity
  const counts = React.useMemo(() => {
    const critical = evidence.filter(e => e.severity >= 4).length;
    const warnings = evidence.filter(e => e.severity === 3).length;
    const info = evidence.filter(e => e.severity <= 2).length;
    return { critical, warnings, info, total: evidence.length };
  }, [evidence]);

  // Determine status level from score
  const status = React.useMemo(() => {
    if (score >= 70) {
      return {
        level: 'safe' as const,
        icon: (
          <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="30" className="fill-emerald-100 stroke-emerald-500" strokeWidth="2" />
            <path d="M20 32l8 8 16-16" className="stroke-emerald-600" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        headline: 'This site respects your privacy',
        description: 'Low data collection detected. Your information appears to be handled responsibly.',
        bgClass: 'bg-gradient-to-br from-emerald-50 to-green-50',
        borderClass: 'border-emerald-200',
        textClass: 'text-emerald-800',
        accentClass: 'text-emerald-600'
      };
    }
    if (score >= 40) {
      return {
        level: 'caution' as const,
        icon: (
          <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="30" className="fill-amber-100 stroke-amber-500" strokeWidth="2" />
            <path d="M32 20v16M32 44v2" className="stroke-amber-600" strokeWidth="4" strokeLinecap="round" />
          </svg>
        ),
        headline: 'Some privacy concerns found',
        description: 'This site collects some data. Review the findings below to understand what is tracked.',
        bgClass: 'bg-gradient-to-br from-amber-50 to-yellow-50',
        borderClass: 'border-amber-200',
        textClass: 'text-amber-800',
        accentClass: 'text-amber-600'
      };
    }
    return {
      level: 'danger' as const,
      icon: (
        <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="30" className="fill-red-100 stroke-red-500" strokeWidth="2" />
          <path d="M24 24l16 16M40 24l-16 16" className="stroke-red-600" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ),
      headline: 'Significant privacy risks detected',
      description: 'This site has extensive tracking or security issues. Consider using privacy tools.',
      bgClass: 'bg-gradient-to-br from-red-50 to-rose-50',
      borderClass: 'border-red-200',
      textClass: 'text-red-800',
      accentClass: 'text-red-600'
    };
  }, [score]);

  return (
    <div
      className={`rounded-2xl border-2 ${status.borderClass} ${status.bgClass} p-6 shadow-soft-md`}
      role="region"
      aria-label={`Privacy status for ${domain}: ${status.headline}`}
    >
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Traffic Light Icon */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {status.icon}
        </div>

        {/* Status Content */}
        <div className="flex-1 text-center md:text-left">
          <h2 className={`text-xl md:text-2xl font-bold ${status.textClass} mb-2`}>
            {status.headline}
          </h2>
          <p className="text-zinc-600 mb-4 text-sm md:text-base">
            {status.description}
          </p>

          {/* Issue Counters - Visual Summary */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
            {/* Critical Issues */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                counts.critical > 0
                  ? 'bg-red-100 border border-red-200'
                  : 'bg-gray-100 border border-gray-200'
              }`}
              title={`${counts.critical} critical issue${counts.critical !== 1 ? 's' : ''}`}
            >
              <svg className={`w-5 h-5 ${counts.critical > 0 ? 'text-red-600' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className={`font-bold ${counts.critical > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                {counts.critical}
              </span>
              <span className={`text-sm ${counts.critical > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                Critical
              </span>
            </div>

            {/* Warnings */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                counts.warnings > 0
                  ? 'bg-amber-100 border border-amber-200'
                  : 'bg-gray-100 border border-gray-200'
              }`}
              title={`${counts.warnings} warning${counts.warnings !== 1 ? 's' : ''}`}
            >
              <svg className={`w-5 h-5 ${counts.warnings > 0 ? 'text-amber-600' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className={`font-bold ${counts.warnings > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                {counts.warnings}
              </span>
              <span className={`text-sm ${counts.warnings > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                Warnings
              </span>
            </div>

            {/* Info */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200`}
              title={`${counts.info} informational note${counts.info !== 1 ? 's' : ''}`}
            >
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-bold text-gray-600">
                {counts.info}
              </span>
              <span className="text-sm text-gray-500">
                Info
              </span>
            </div>
          </div>

          {/* Action Button */}
          {counts.total > 0 && onViewIssues && (
            <button
              onClick={onViewIssues}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                status.level === 'safe'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
                  : status.level === 'caution'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
                  : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
              }`}
            >
              <span>View {counts.total} Finding{counts.total !== 1 ? 's' : ''}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {counts.total === 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No Issues Found</span>
            </div>
          )}
        </div>
      </div>

      {/* What This Means - For Non-Technical Users */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-2 list-none">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          What does this mean for me?
        </summary>
        <div className="mt-3 pl-6 text-sm text-zinc-600 space-y-2">
          {status.level === 'safe' && (
            <>
              <p>This website appears to respect your privacy. It has minimal tracking and follows security best practices.</p>
              <p><strong>You can:</strong> Browse this site without major privacy concerns.</p>
            </>
          )}
          {status.level === 'caution' && (
            <>
              <p>This website uses some tracking technologies. Your browsing behavior may be collected and shared with third parties.</p>
              <p><strong>Consider:</strong> Using a privacy-focused browser extension or enabling "Do Not Track" in your browser settings.</p>
            </>
          )}
          {status.level === 'danger' && (
            <>
              <p>This website has significant privacy issues. It may extensively track your activity and share data with many third parties.</p>
              <p><strong>Recommended:</strong> Use a VPN, privacy browser extensions, or avoid sharing personal information on this site.</p>
            </>
          )}
        </div>
      </details>
    </div>
  );
});

export default PrivacyStatusCard;
