/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * NextActions - Post-report engagement component
 *
 * Phase 2A: Internal linking + user engagement
 *
 * FIX #5: NO compare pages yet - only links to EXISTING reports
 * Compare pages will be added in Phase 2B.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  currentDomain: string;
  score: number | null;
  relatedDomains?: Array<{ domain: string; score?: number }>;
}

export function NextActions({ currentDomain, score, relatedDomains = [] }: Props) {
  const router = useRouter();
  const [inputUrl, setInputUrl] = useState('');

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    // Normalize: strip protocol and path
    const domain = inputUrl
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    if (domain) {
      router.push(`/privacy-report/${domain}`);
    }
  };

  const showProtectionTips = score !== null && score < 60;

  return (
    <section className="bg-zinc-50 rounded-xl p-6 my-8 border border-zinc-200">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Explore Further</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* FIX #5: Link to EXISTING reports, not /compare pages */}
        {relatedDomains.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-zinc-200 shadow-sm">
            <h3 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Similar Sites Analyzed
            </h3>
            <p className="text-sm text-zinc-600 mb-3">See privacy reports for related websites:</p>
            <div className="space-y-2">
              {relatedDomains.slice(0, 4).map(({ domain, score: relatedScore }) => (
                <Link
                  key={domain}
                  href={`/privacy-report/${domain}`}
                  className="flex items-center justify-between text-sm text-advisor-600 hover:text-advisor-800 hover:bg-advisor-50 rounded px-2 py-1.5 transition-colors"
                >
                  <span>{domain}</span>
                  {relatedScore !== undefined && (
                    <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                      {relatedScore}/100
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Protection tips for low scores */}
        {showProtectionTips && (
          <div className="bg-white rounded-lg p-4 border border-zinc-200 shadow-sm">
            <h3 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Protect Yourself
            </h3>
            <p className="text-sm text-zinc-600 mb-3">This site has privacy concerns. Stay safe:</p>
            <ul className="text-sm text-zinc-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Use a tracker blocker like uBlock Origin</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Enable strict tracking protection in your browser</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Consider using a privacy-focused browser</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>Clear cookies after visiting this site</span>
              </li>
            </ul>
          </div>
        )}

        {/* Browse all reports */}
        <div className="bg-white rounded-lg p-4 border border-zinc-200 shadow-sm">
          <h3 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Browse Reports
          </h3>
          <p className="text-sm text-zinc-600 mb-3">
            Explore our database of privacy analyses:
          </p>
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 text-sm text-advisor-600 hover:text-advisor-800 font-medium"
          >
            View all reports
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Scan another site */}
        <div className="bg-white rounded-lg p-4 border border-zinc-200 shadow-sm">
          <h3 className="font-medium text-zinc-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Check Another Site
          </h3>
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="example.com"
              className="flex-1 text-sm px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-advisor-500 focus:border-advisor-500 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-advisor-600 text-white text-sm font-medium rounded-lg hover:bg-advisor-700 transition-colors"
            >
              Scan
            </button>
          </form>
        </div>
      </div>

      {/* Back to scanner link */}
      <div className="mt-4 pt-4 border-t border-zinc-200 text-center">
        <Link
          href="/"
          className="text-sm text-advisor-600 hover:text-advisor-800 hover:underline"
        >
          ← Back to Privacy Scanner
        </Link>
      </div>
    </section>
  );
}

export default NextActions;
