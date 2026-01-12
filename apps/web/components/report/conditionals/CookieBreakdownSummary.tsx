/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * CookieBreakdownSummary - Conditional SEO block
 *
 * Displayed when a site has many cookies (>15).
 * Explains cookie types and their privacy implications.
 */

import React from 'react';

interface Props {
  domain: string;
  cookieCount: number;
  thirdPartyCookies?: number;
  sessionCookies?: number;
  persistentCookies?: number;
}

export function CookieBreakdownSummary({
  domain,
  cookieCount,
  thirdPartyCookies = 0,
  sessionCookies = 0,
  persistentCookies = 0,
}: Props) {
  const hasThirdParty = thirdPartyCookies > 0;
  const hasPersistent = persistentCookies > 0;

  return (
    <section
      className="bg-orange-50 border border-orange-200 rounded-lg p-5 my-6"
      aria-labelledby="cookie-breakdown-heading"
    >
      <h3
        id="cookie-breakdown-heading"
        className="text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {domain} Sets {cookieCount} Cookies
      </h3>

      <div className="space-y-4 text-orange-800">
        <p>
          This website sets <strong>{cookieCount} cookies</strong> when you visit, which is{' '}
          {cookieCount > 30 ? 'significantly ' : ''}above typical. Cookies can be used for
          legitimate purposes but also for tracking your activity.
        </p>

        {/* Cookie breakdown if we have data */}
        {(thirdPartyCookies > 0 || sessionCookies > 0 || persistentCookies > 0) && (
          <div className="grid gap-3 sm:grid-cols-3">
            {thirdPartyCookies > 0 && (
              <div className="bg-orange-100 rounded p-3 text-center">
                <div className="text-2xl font-bold text-orange-900">{thirdPartyCookies}</div>
                <div className="text-sm font-medium">Third-Party</div>
                <div className="text-xs text-orange-600 mt-1">Set by external services</div>
              </div>
            )}
            {sessionCookies > 0 && (
              <div className="bg-orange-100 rounded p-3 text-center">
                <div className="text-2xl font-bold text-orange-900">{sessionCookies}</div>
                <div className="text-sm font-medium">Session</div>
                <div className="text-xs text-orange-600 mt-1">Cleared when you leave</div>
              </div>
            )}
            {persistentCookies > 0 && (
              <div className="bg-orange-100 rounded p-3 text-center">
                <div className="text-2xl font-bold text-orange-900">{persistentCookies}</div>
                <div className="text-sm font-medium">Persistent</div>
                <div className="text-xs text-orange-600 mt-1">Stored long-term</div>
              </div>
            )}
          </div>
        )}

        <div className="bg-orange-100 rounded p-4">
          <h4 className="font-medium text-orange-900 mb-2">Understanding cookie types:</h4>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="font-medium">First-party cookies</dt>
              <dd className="text-orange-700">
                Set by the website you&apos;re visiting. Often necessary for the site to work
                properly.
              </dd>
            </div>
            {hasThirdParty && (
              <div>
                <dt className="font-medium">Third-party cookies</dt>
                <dd className="text-orange-700">
                  Set by other companies (advertisers, analytics). Used to track you across
                  websites.
                </dd>
              </div>
            )}
            {hasPersistent && (
              <div>
                <dt className="font-medium">Persistent cookies</dt>
                <dd className="text-orange-700">
                  Stay on your device for months or years. Can be used to build long-term profiles.
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white/50 rounded p-4 mt-4">
          <h4 className="font-medium text-orange-900 mb-2">Managing cookies:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Most browsers let you block third-party cookies in settings</li>
            <li>Use private/incognito mode to avoid persistent cookies</li>
            <li>Install a cookie manager extension for fine-grained control</li>
            <li>Clear cookies regularly to remove tracking data</li>
            <li>Look for the site&apos;s cookie consent banner to opt out where available</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
