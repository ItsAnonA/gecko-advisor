/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import React from 'react';

interface WhatThisMeansSectionProps {
  domain: string;
  trackerCount: number;
  hasFingerprinting: boolean;
  hasAdsTrackers: boolean;
  cookieCount: number;
}

interface Tip {
  icon: React.ReactNode;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Icons for different tip types
 */
const TipIcons = {
  fingerprint: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  ),
  tracker: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  ad: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  cookie: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <circle cx="8" cy="10" r="1.5" fill="currentColor" />
      <circle cx="14" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

/**
 * Generate actionable tips based on scan findings
 */
function generateTips(props: WhatThisMeansSectionProps): Tip[] {
  const { trackerCount, hasFingerprinting, hasAdsTrackers, cookieCount } = props;
  const tips: Tip[] = [];

  // Fingerprinting is a high-severity finding
  if (hasFingerprinting) {
    tips.push({
      icon: TipIcons.fingerprint,
      title: 'Browser fingerprinting detected',
      description: 'This site may track you even without cookies. Consider using a privacy-focused browser or extension like Firefox with Enhanced Tracking Protection.',
      severity: 'critical',
    });
  }

  // High tracker count
  if (trackerCount > 5) {
    tips.push({
      icon: TipIcons.tracker,
      title: `${trackerCount} tracking scripts found`,
      description: 'Your browsing activity on this site is being monitored by multiple third parties. A tracker blocker like uBlock Origin can help reduce this exposure.',
      severity: 'warning',
    });
  } else if (trackerCount > 0) {
    tips.push({
      icon: TipIcons.tracker,
      title: `${trackerCount} tracking script${trackerCount > 1 ? 's' : ''} found`,
      description: 'Some third-party tracking is present. Most privacy browsers and ad blockers can prevent these from loading.',
      severity: 'info',
    });
  }

  // Advertising trackers
  if (hasAdsTrackers) {
    tips.push({
      icon: TipIcons.ad,
      title: 'Advertising trackers present',
      description: 'This site shares your browsing data with advertising networks, which can track you across the web. Ad blockers can prevent this.',
      severity: 'warning',
    });
  }

  // High cookie count
  if (cookieCount > 10) {
    tips.push({
      icon: TipIcons.cookie,
      title: `${cookieCount} cookies detected`,
      description: 'Many cookies are being set, which may include long-term tracking. Consider clearing cookies regularly or using cookie management tools.',
      severity: 'warning',
    });
  } else if (cookieCount > 5) {
    tips.push({
      icon: TipIcons.cookie,
      title: `${cookieCount} cookies detected`,
      description: 'A moderate number of cookies are in use. Some may be necessary for functionality, while others may be for tracking.',
      severity: 'info',
    });
  }

  return tips.slice(0, 4); // Maximum 4 tips
}

/**
 * WhatThisMeansSection - Shows practical tips based on scan findings
 *
 * This section helps users understand what the scan results mean for them
 * and provides actionable recommendations for improving their privacy.
 *
 * Returns null if there are no significant findings to discuss.
 */
export function WhatThisMeansSection(props: WhatThisMeansSectionProps) {
  const tips = generateTips(props);

  // Don't render if no significant findings
  if (tips.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          What This Means For You
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Practical tips based on what we found
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {tips.map((tip, index) => {
          const severityStyles = {
            info: {
              bg: 'bg-sky-50',
              border: 'border-l-4 border-sky-400',
              iconColor: 'text-sky-600',
            },
            warning: {
              bg: 'bg-amber-50',
              border: 'border-l-4 border-amber-400',
              iconColor: 'text-amber-600',
            },
            critical: {
              bg: 'bg-red-50',
              border: 'border-l-4 border-red-400',
              iconColor: 'text-red-600',
            },
          };

          const style = severityStyles[tip.severity];

          return (
            <div
              key={index}
              className={`p-4 ${style.bg} ${style.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
                  {tip.icon}
                </div>
                <div>
                  <h4 className="font-medium text-zinc-900 text-sm">{tip.title}</h4>
                  <p className="text-sm text-zinc-600 mt-1">{tip.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* General recommendation footer */}
      <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 text-emerald-600 mt-0.5">
            {TipIcons.shield}
          </div>
          <p className="text-sm text-emerald-800">
            <strong>Pro tip:</strong> Using a privacy-focused browser like Firefox or Brave, combined with an ad blocker, can significantly reduce tracking across all websites you visit.
          </p>
        </div>
      </div>
    </section>
  );
}

export default WhatThisMeansSection;
