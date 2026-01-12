/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * CriticalPrivacyConcerns - Conditional SEO block
 *
 * Displayed for sites with low privacy scores (<40).
 * Highlights serious privacy issues and provides actionable advice.
 */

import React from 'react';

interface Issue {
  category: string;
  title: string;
  severity: string;
}

interface Props {
  domain: string;
  score: number;
  issues?: Issue[];
}

export function CriticalPrivacyConcerns({ domain, score, issues = [] }: Props) {
  const criticalIssues = issues.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const issueCategories = [...new Set(criticalIssues.map((i) => i.category))];

  return (
    <section
      className="bg-red-100 border-2 border-red-300 rounded-lg p-5 my-6"
      aria-labelledby="critical-concerns-heading"
    >
      <h3
        id="critical-concerns-heading"
        className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Privacy Alert: {domain} Scores {score}/100
      </h3>

      <div className="space-y-4 text-red-900">
        <p className="font-medium">
          This website has significant privacy concerns. A score of {score}/100 indicates that
          visitors&apos; data may be at risk.
        </p>

        <div className="bg-red-200/50 rounded p-4">
          <h4 className="font-medium mb-2">What a low privacy score means:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Your browsing activity is likely being extensively tracked</li>
            <li>Personal data may be shared with multiple third parties</li>
            <li>The site may not follow privacy best practices</li>
            <li>Security measures may be inadequate</li>
          </ul>
        </div>

        {criticalIssues.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">
              Critical issues found ({criticalIssues.length}):
            </h4>
            <ul className="space-y-2">
              {criticalIssues.slice(0, 5).map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-white/50 rounded p-2">
                  <span className="inline-block w-2 h-2 mt-1.5 bg-red-500 rounded-full flex-shrink-0" />
                  <span>
                    <strong className="text-red-900">{issue.title}</strong>
                    <span className="text-red-700"> ({issue.category})</span>
                  </span>
                </li>
              ))}
            </ul>
            {criticalIssues.length > 5 && (
              <p className="text-sm mt-2 text-red-700">
                + {criticalIssues.length - 5} more critical issues
              </p>
            )}
          </div>
        )}

        {issueCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {issueCategories.map((cat) => (
              <span
                key={cat}
                className="px-2 py-1 bg-red-200 rounded text-xs font-medium text-red-800"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="bg-white rounded p-4 mt-4 border border-red-200">
          <h4 className="font-medium text-red-900 mb-2">Recommendations for visitors:</h4>
          <ul className="list-disc list-inside text-sm space-y-1 text-red-800">
            <li>Use a tracker blocker when visiting this site</li>
            <li>Avoid entering personal or sensitive information</li>
            <li>Consider using a VPN for additional privacy</li>
            <li>Check if there are alternative sites with better privacy practices</li>
            <li>Review the site&apos;s privacy policy before sharing data</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
