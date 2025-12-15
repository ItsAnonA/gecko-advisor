/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import type { ReportResponse } from '@gecko-advisor/shared';

type EvidenceItem = ReportResponse['evidence'][number];

export type TabId = 'overview' | 'tracking' | 'security' | 'cookies' | 'details';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count: number;
  hasIssues: boolean;
  severityMax: number;
}

export interface ReportTabsProps {
  /** Currently active tab */
  activeTab: TabId;
  /** Callback when tab changes */
  onTabChange: (tab: TabId) => void;
  /** Evidence items for counting */
  evidence: EvidenceItem[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * ReportTabs - Horizontal tab navigation for report sections
 *
 * Features:
 * - Badge counts for each category
 * - Severity-based color coding on badges
 * - Keyboard navigation (arrow keys)
 * - Mobile responsive (scrollable)
 * - WCAG AA accessible
 */
const ReportTabs = React.memo(function ReportTabs({
  activeTab,
  onTabChange,
  evidence,
  className = ''
}: ReportTabsProps) {
  const tabsRef = React.useRef<HTMLDivElement>(null);

  // Categorize evidence
  const counts = React.useMemo(() => {
    const tracking = evidence.filter(e =>
      e.kind === 'tracker' || e.kind === 'thirdparty' || e.kind === 'fingerprint'
    );
    const security = evidence.filter(e =>
      e.kind === 'tls' || e.kind === 'header' || e.kind === 'insecure' || e.kind === 'mixed-content'
    );
    const cookies = evidence.filter(e => e.kind === 'cookie');

    const getMaxSeverity = (items: EvidenceItem[]) =>
      items.length > 0 ? Math.max(...items.map(i => i.severity)) : 0;

    return {
      tracking: { count: tracking.length, max: getMaxSeverity(tracking) },
      security: { count: security.length, max: getMaxSeverity(security) },
      cookies: { count: cookies.length, max: getMaxSeverity(cookies) },
      total: evidence.length
    };
  }, [evidence]);

  // Tab configurations
  const tabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      count: 0,
      hasIssues: false,
      severityMax: 0
    },
    {
      id: 'tracking',
      label: "Who's Watching",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      count: counts.tracking.count,
      hasIssues: counts.tracking.count > 0,
      severityMax: counts.tracking.max
    },
    {
      id: 'security',
      label: 'Vulnerabilities',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      count: counts.security.count,
      hasIssues: counts.security.count > 0,
      severityMax: counts.security.max
    },
    {
      id: 'cookies',
      label: 'Cookie Exposure',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: counts.cookies.count,
      hasIssues: counts.cookies.count > 0,
      severityMax: counts.cookies.max
    },
    {
      id: 'details',
      label: 'Full Report',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      count: counts.total,
      hasIssues: counts.total > 0,
      severityMax: Math.max(counts.tracking.max, counts.security.max, counts.cookies.max)
    }
  ];

  // Keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    let newIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const newTab = tabs[newIndex];
    if (newTab) onTabChange(newTab.id);
  }, [activeTab, onTabChange, tabs]);

  // Get badge style based on severity
  const getBadgeStyle = (severityMax: number, count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-500';
    if (severityMax >= 4) return 'bg-red-100 text-red-700';
    if (severityMax === 3) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  return (
    <div
      ref={tabsRef}
      className={`border-b border-gray-200 ${className}`}
      role="tablist"
      aria-label="Report sections"
      onKeyDown={handleKeyDown}
    >
      <div className="flex overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap
                border-b-2 transition-colors focus:outline-none focus-visible:ring-2
                focus-visible:ring-emerald-500 focus-visible:ring-inset
                ${isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-gray-300'
                }
              `}
            >
              <span className={isActive ? 'text-emerald-600' : 'text-zinc-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 text-xs font-semibold rounded-full ${getBadgeStyle(tab.severityMax, tab.count)}`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default ReportTabs;
