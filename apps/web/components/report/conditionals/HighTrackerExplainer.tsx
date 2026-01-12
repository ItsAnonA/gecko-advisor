/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * HighTrackerExplainer - Conditional SEO block
 *
 * Displayed when a site has many trackers (>10).
 * Provides context about tracker ecosystem and data collection.
 */

import React from 'react';

interface Props {
  domain: string;
  trackerCount: number;
  trackerNames?: string[];
}

export function HighTrackerExplainer({ domain, trackerCount, trackerNames = [] }: Props) {
  // Categorize trackers if we have names
  const categories = {
    advertising: trackerNames.filter((t) =>
      /google.*ads|facebook.*pixel|doubleclick|criteo|taboola|outbrain/i.test(t)
    ),
    analytics: trackerNames.filter((t) =>
      /analytics|mixpanel|segment|amplitude|hotjar|mouseflow/i.test(t)
    ),
    social: trackerNames.filter((t) =>
      /facebook|twitter|linkedin|pinterest|tiktok/i.test(t)
    ),
  };

  const hasAdvertising = categories.advertising.length > 0;
  const hasAnalytics = categories.analytics.length > 0;
  const hasSocial = categories.social.length > 0;

  return (
    <section
      className="bg-red-50 border border-red-200 rounded-lg p-5 my-6"
      aria-labelledby="tracker-explainer-heading"
    >
      <h3
        id="tracker-explainer-heading"
        className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        {domain} Uses {trackerCount} Trackers
      </h3>

      <div className="space-y-4 text-red-800">
        <p>
          This website loads <strong>{trackerCount} third-party trackers</strong>, which is{' '}
          {trackerCount > 20 ? 'significantly ' : ''}above average. Each tracker collects data
          about your browsing behavior and may share it with other companies.
        </p>

        <div className="bg-red-100 rounded p-4">
          <h4 className="font-medium text-red-900 mb-2">What are trackers collecting?</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Pages you visit and time spent on each</li>
            <li>Links and buttons you click</li>
            <li>Items you view or add to cart</li>
            <li>Your location (often from IP address)</li>
            <li>Device and browser information</li>
            <li>Other sites you&apos;ve visited (cross-site tracking)</li>
          </ul>
        </div>

        {(hasAdvertising || hasAnalytics || hasSocial) && (
          <div>
            <h4 className="font-medium text-red-900 mb-2">Tracker categories detected:</h4>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              {hasAdvertising && (
                <div className="bg-white/50 rounded p-3">
                  <span className="font-medium">Advertising</span>
                  <p className="text-xs text-red-600 mt-1">
                    Used to show targeted ads based on your browsing
                  </p>
                </div>
              )}
              {hasAnalytics && (
                <div className="bg-white/50 rounded p-3">
                  <span className="font-medium">Analytics</span>
                  <p className="text-xs text-red-600 mt-1">
                    Tracks how you interact with the website
                  </p>
                </div>
              )}
              {hasSocial && (
                <div className="bg-white/50 rounded p-3">
                  <span className="font-medium">Social Media</span>
                  <p className="text-xs text-red-600 mt-1">
                    Connects your visit to social media profiles
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white/50 rounded p-4 mt-4">
          <h4 className="font-medium text-red-900 mb-2">How to reduce tracking:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Install uBlock Origin or similar tracker blocker</li>
            <li>Enable strict tracking protection in your browser</li>
            <li>Use a privacy-focused browser like Firefox or Brave</li>
            <li>Consider a VPN to mask your IP address</li>
            <li>Regularly clear cookies and browsing data</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
