/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import type { ReportData } from '@/lib/api';

type TopFix = NonNullable<ReportData['topFixes']>[number];

interface RecommendationsSectionProps {
  topFixes: TopFix[];
  domain: string;
}

/**
 * RecommendationsSection - Displays actionable remediation recommendations
 *
 * Shows top 3 issues with severity >= medium, including:
 * - Issue title and category
 * - Why it matters (explanation)
 * - How to fix (actionable steps)
 * - Reference links
 */
export default function RecommendationsSection({ topFixes, domain }: RecommendationsSectionProps) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!topFixes || topFixes.length === 0) {
    return null;
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800 border-red-200',
          icon: 'text-red-600',
          accent: 'border-l-red-500',
          label: 'Critical'
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: 'text-orange-600',
          accent: 'border-l-orange-500',
          label: 'High Priority'
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: 'text-amber-600',
          accent: 'border-l-amber-500',
          label: 'Medium'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: 'text-blue-600',
          accent: 'border-l-blue-500',
          label: 'Info'
        };
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'tracking':
        return {
          icon: (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
          label: 'Tracking'
        };
      case 'security':
        return {
          icon: (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          label: 'Security'
        };
      case 'compliance':
        return {
          icon: (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          label: 'Compliance'
        };
      default:
        return {
          icon: (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: category.charAt(0).toUpperCase() + category.slice(1)
        };
    }
  };

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-50/40 to-white p-6 transition-all duration-500 h-full flex flex-col ${mounted ? 'opacity-100' : 'opacity-0'}`}
      aria-labelledby="recommendations-heading"
    >
      {/* Header - matches BenchmarkSection style */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 id="recommendations-heading" className="text-base font-semibold text-zinc-900">
            Recommended Actions
          </h3>
          <p className="text-xs text-zinc-500">
            Top {topFixes.length} prioritized fix{topFixes.length !== 1 ? 'es' : ''} for {domain}
          </p>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3 flex-1">
        {topFixes.map((fix, index) => {
          const severityConfig = getSeverityConfig(fix.severity);
          const categoryConfig = getCategoryConfig(fix.category);
          const isExpanded = expandedItems.has(fix.id);

          return (
            <div
              key={fix.id}
              className={`rounded-lg border ${severityConfig.border} ${severityConfig.bg} border-l-4 ${severityConfig.accent} overflow-hidden transition-all duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header */}
              <button
                onClick={() => toggleExpanded(fix.id)}
                className="w-full p-3 text-left flex items-start gap-3 hover:bg-white/50 transition-colors"
                aria-expanded={isExpanded}
                aria-controls={`fix-content-${fix.id}`}
              >
                {/* Priority Number */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full ${severityConfig.badge} border flex items-center justify-center font-bold text-xs`}>
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${severityConfig.icon}`}>
                      <span className="w-3.5 h-3.5">{categoryConfig.icon}</span>
                      {categoryConfig.label}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${severityConfig.badge}`}>
                      {severityConfig.label}
                    </span>
                  </div>
                  <h4 className="font-semibold text-zinc-900 text-sm leading-tight">
                    {fix.title}
                  </h4>
                  {fix.whyItMatters && !isExpanded && (
                    <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">
                      {fix.whyItMatters}
                    </p>
                  )}
                </div>

                {/* Expand Icon */}
                <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-white/80 border border-stone-200 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div
                  id={`fix-content-${fix.id}`}
                  className="border-t border-stone-200/60 bg-white/60 p-4 space-y-4"
                >
                  {/* Why It Matters */}
                  {fix.whyItMatters && (
                    <div>
                      <h5 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Why This Matters
                      </h5>
                      <p className="text-sm text-zinc-700 leading-relaxed">
                        {fix.whyItMatters}
                      </p>
                    </div>
                  )}

                  {/* How To Fix */}
                  {fix.howToFix && (
                    <div>
                      <h5 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How to Fix
                      </h5>
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                        <p className="text-sm text-zinc-700 leading-relaxed">
                          {fix.howToFix}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* References */}
                  {fix.references && fix.references.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Learn More
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {fix.references.map((ref, refIndex) => (
                          <a
                            key={refIndex}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-stone-200 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {ref.label || 'Documentation'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SEO-friendly summary text */}
      <div className="mt-6 pt-4 border-t border-stone-200/60">
        <p className="text-xs text-zinc-600 leading-relaxed">
          These recommendations are based on Gecko Advisor&apos;s automated analysis of {domain}.
          Addressing these {topFixes.length} issue{topFixes.length !== 1 ? 's' : ''} can improve the site&apos;s privacy score and user trust.
          {topFixes.some(f => f.category === 'tracking') && ' Reducing trackers decreases data exposure to third parties.'}
          {topFixes.some(f => f.category === 'security') && ' Security improvements protect users from potential attacks.'}
        </p>
      </div>
    </section>
  );
}
