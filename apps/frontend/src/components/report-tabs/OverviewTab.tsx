/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import type { ReportResponse, TopFix } from '@gecko-advisor/shared';
import PrivacyStatusCard from '../PrivacyStatusCard';
import Card from '../Card';

type EvidenceItem = ReportResponse['evidence'][number];

export interface OverviewTabProps {
  /** Privacy score */
  score: number;
  /** Score label */
  label?: string | null;
  /** Domain being scanned */
  domain: string;
  /** All evidence items */
  evidence: EvidenceItem[];
  /** Top fixes to display */
  topFixes: TopFix[];
  /** Data sharing level */
  dataSharingLevel: 'None' | 'Low' | 'Medium' | 'High';
  /** Tracker count */
  trackerCount: number;
  /** Third-party count */
  thirdPartyCount: number;
  /** TLS grade */
  tlsGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Callback to navigate to details */
  onViewDetails: () => void;
}

/**
 * OverviewTab - Summary view of the privacy report
 *
 * Shows:
 * - Privacy Status Card (instant comprehension)
 * - Top 3 issues to fix
 * - Key metrics at a glance
 */
export default function OverviewTab({
  score,
  label,
  domain,
  evidence,
  topFixes,
  dataSharingLevel,
  trackerCount,
  thirdPartyCount,
  tlsGrade,
  onViewDetails
}: OverviewTabProps) {
  // Get top 3 critical/high severity issues
  const topIssues = React.useMemo(() => {
    return evidence
      .filter(e => e.severity >= 3)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3);
  }, [evidence]);

  // Severity to color mapping
  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' };
    if (severity === 3) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' };
    return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' };
  };

  return (
    <div className="space-y-6" role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
      {/* Privacy Status Card - The star of the show */}
      <PrivacyStatusCard
        score={score}
        label={label}
        evidence={evidence}
        domain={domain}
        onViewIssues={onViewDetails}
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Data Sharing"
          value={dataSharingLevel}
          status={dataSharingLevel === 'None' || dataSharingLevel === 'Low' ? 'good' : dataSharingLevel === 'Medium' ? 'warning' : 'bad'}
        />
        <MetricCard
          title="Trackers"
          value={trackerCount.toString()}
          status={trackerCount === 0 ? 'good' : trackerCount <= 3 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="Third Parties"
          value={thirdPartyCount.toString()}
          status={thirdPartyCount <= 5 ? 'good' : thirdPartyCount <= 10 ? 'warning' : 'bad'}
        />
        <MetricCard
          title="TLS Grade"
          value={tlsGrade || 'N/A'}
          status={tlsGrade === 'A' || tlsGrade === 'B' ? 'good' : tlsGrade === 'C' ? 'warning' : 'bad'}
        />
      </div>

      {/* Top Issues to Fix */}
      {topIssues.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Top Issues to Address
          </h3>
          <div className="space-y-3">
            {topIssues.map((issue, idx) => {
              const colors = getSeverityColor(issue.severity);
              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${colors.text} bg-white border ${colors.border}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${colors.text}`}>
                        {issue.title}
                      </p>
                      {/* Show the specific URL/resource for mixed content and insecure issues */}
                      {(issue.kind === 'mixed-content' || issue.kind === 'insecure') && issue.details && (() => {
                        try {
                          const parsed = typeof issue.details === 'string' ? JSON.parse(issue.details) : issue.details;
                          if (parsed?.url) {
                            return (
                              <p className="text-xs font-mono text-zinc-500 mt-1 truncate" title={parsed.url}>
                                {parsed.url}
                                {parsed.resourceType && <span className="ml-2 text-zinc-400">({parsed.resourceType})</span>}
                              </p>
                            );
                          }
                        } catch {
                          // If details is not valid JSON, show it directly if it looks like a URL
                          if (typeof issue.details === 'string' && issue.details.startsWith('http')) {
                            return (
                              <p className="text-xs font-mono text-zinc-500 mt-1 truncate" title={issue.details}>
                                {issue.details}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}
                      <p className="text-sm text-zinc-600 mt-1">
                        {issue.kind === 'tracker' && 'This tracker follows your activity across websites.'}
                        {issue.kind === 'cookie' && 'This cookie may track your behavior.'}
                        {issue.kind === 'thirdparty' && 'This third-party connection may share your data.'}
                        {issue.kind === 'tls' && 'This security issue may expose your data.'}
                        {issue.kind === 'header' && 'This missing security header reduces protection.'}
                        {issue.kind === 'insecure' && 'This insecure resource poses a security risk.'}
                        {issue.kind === 'fingerprint' && 'This fingerprinting technique can identify you.'}
                        {issue.kind === 'mixed-content' && 'Mixed content can be intercepted by attackers.'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {evidence.filter(e => e.severity >= 3).length > 3 && (
            <button
              onClick={onViewDetails}
              className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View all {evidence.filter(e => e.severity >= 3).length} issues
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </Card>
      )}

      {/* Top Fixes from API */}
      {topFixes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recommended Fixes
          </h3>
          <div className="space-y-4">
            {topFixes.slice(0, 3).map((fix) => (
              <div key={fix.id} className="border-l-4 border-emerald-400 pl-4 py-2">
                <p className="font-medium text-zinc-900">{fix.title}</p>
                {fix.howToFix && (
                  <p className="text-sm text-zinc-600 mt-1">{fix.howToFix}</p>
                )}
                {fix.references.length > 0 && fix.references[0] && (
                  <a
                    href={fix.references[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 hover:text-emerald-700 mt-2 inline-flex items-center gap-1"
                  >
                    Learn more
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Issues - Celebration State */}
      {topIssues.length === 0 && evidence.length === 0 && (
        <Card className="p-8 text-center bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-emerald-800 mb-2">
            Excellent Privacy Practices!
          </h3>
          <p className="text-emerald-700">
            This website has no significant privacy concerns. Your data appears to be safe here.
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * MetricCard - Small card for displaying a single metric
 */
interface MetricCardProps {
  title: string;
  value: string;
  status: 'good' | 'warning' | 'bad';
}

function MetricCard({ title, value, status }: MetricCardProps) {
  const statusStyles = {
    good: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    bad: 'bg-red-50 border-red-200 text-red-700'
  };

  const iconStyles = {
    good: (
      <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    bad: (
      <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <div className={`p-4 rounded-xl border metric-interactive ${statusStyles[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium opacity-80">{title}</span>
        {iconStyles[status]}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
