/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import type { ReportResponse } from '@gecko-advisor/shared';
import Card from '../Card';

type EvidenceItem = ReportResponse['evidence'][number];

export interface CategoryTabProps {
  /** Tab ID for ARIA */
  tabId: string;
  /** Category title */
  title: string;
  /** Category description */
  description: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Filtered evidence items for this category */
  evidence: EvidenceItem[];
  /** Tips for fixing issues in this category */
  tips?: Array<{ text: string; url?: string }>;
  /** Function to sanitize evidence details */
  sanitizeDetails: (details: unknown) => unknown;
}

/**
 * CategoryTab - Displays evidence for a specific category (Tracking, Security, Cookies)
 *
 * Features:
 * - Summary statistics at top
 * - Severity-sorted evidence list
 * - Expandable details per item
 * - Tips section for remediation
 */
export default function CategoryTab({
  tabId,
  title,
  description,
  icon,
  evidence,
  tips,
  sanitizeDetails
}: CategoryTabProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  // Calculate statistics
  const stats = React.useMemo(() => {
    const critical = evidence.filter(e => e.severity >= 4).length;
    const high = evidence.filter(e => e.severity === 3).length;
    const medium = evidence.filter(e => e.severity === 2).length;
    const low = evidence.filter(e => e.severity <= 1).length;
    return { critical, high, medium, low, total: evidence.length };
  }, [evidence]);

  // Sort evidence by severity (highest first)
  const sortedEvidence = React.useMemo(() => {
    return [...evidence].sort((a, b) => b.severity - a.severity);
  }, [evidence]);

  // Toggle item expansion
  const toggleItem = React.useCallback((id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Severity styling
  const getSeverityStyle = (severity: number) => {
    if (severity >= 4) return {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-400',
      badge: 'bg-red-100 text-red-700',
      icon: (
        <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Critical'
    };
    if (severity === 3) return {
      bg: 'bg-amber-50',
      border: 'border-l-4 border-amber-400',
      badge: 'bg-amber-100 text-amber-700',
      icon: (
        <svg className="w-5 h-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      label: 'High'
    };
    if (severity === 2) return {
      bg: 'bg-yellow-50',
      border: 'border-l-4 border-yellow-400',
      badge: 'bg-yellow-100 text-yellow-700',
      icon: (
        <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Medium'
    };
    return {
      bg: 'bg-gray-50',
      border: 'border-l-4 border-gray-300',
      badge: 'bg-gray-100 text-gray-600',
      icon: (
        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      label: 'Low'
    };
  };

  // Safe stringify for details
  const safeStringify = (value: unknown): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className="space-y-6"
    >
      {/* Category Header */}
      <div className="flex items-start gap-4 p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
          <p className="text-zinc-600 mt-1">{description}</p>
        </div>
      </div>

      {/* Statistics Bar */}
      {stats.total > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-zinc-700">Found:</span>
          {stats.critical > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
              {stats.critical} Critical
            </span>
          )}
          {stats.high > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
              {stats.high} High
            </span>
          )}
          {stats.medium > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
              {stats.medium} Medium
            </span>
          )}
          {stats.low > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
              {stats.low} Low
            </span>
          )}
        </div>
      )}

      {/* Evidence List */}
      {sortedEvidence.length > 0 ? (
        <div className="space-y-3">
          {sortedEvidence.map((item) => {
            const style = getSeverityStyle(item.severity);
            const isExpanded = expandedItems.has(item.id);
            const sanitized = sanitizeDetails(item.details);
            const hasDetails = Boolean(sanitized && (
              typeof sanitized === 'string'
                ? (sanitized as string).trim().length > 0
                : Object.keys(sanitized as object).length > 0
            ));

            return (
              <div
                key={item.id}
                className={`${style.bg} ${style.border} rounded-lg p-4 transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-medium text-zinc-900">
                        {item.title}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>

                    {hasDetails && (
                      <>
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded px-1"
                          aria-expanded={isExpanded}
                          aria-controls={`details-${item.id}`}
                        >
                          {isExpanded ? '- Hide details' : '+ Show details'}
                        </button>

                        {isExpanded && (
                          <div
                            id={`details-${item.id}`}
                            className="mt-3 p-3 bg-white rounded border border-gray-200 overflow-x-auto"
                          >
                            <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap">
                              {typeof sanitized === 'string' ? sanitized : safeStringify(sanitized as object)}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-emerald-800 mb-1">
            No issues in this category
          </h3>
          <p className="text-emerald-700 text-sm">
            This website follows best practices for {title.toLowerCase()}.
          </p>
        </Card>
      )}

      {/* Tips Section */}
      {tips && tips.length > 0 && sortedEvidence.length > 0 && (
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            How to Fix
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-emerald-800">
                <span className="text-emerald-600 mt-1">•</span>
                {tip.url ? (
                  <a
                    href={tip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 underline"
                  >
                    {tip.text}
                  </a>
                ) : (
                  <span>{tip.text}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
