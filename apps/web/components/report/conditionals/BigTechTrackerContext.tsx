/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * BigTechTrackerContext - Conditional SEO block
 *
 * Displayed when Google, Facebook, or other big tech trackers are detected.
 * Provides context about what these companies can learn from tracking.
 */

import React from 'react';

interface Props {
  domain: string;
  bigTechTrackers: string[];
}

const TRACKER_INFO: Record<
  string,
  { name: string; color: string; bgColor: string; description: string }
> = {
  google: {
    name: 'Google',
    color: 'text-blue-900',
    bgColor: 'bg-blue-100',
    description:
      'Can link your visit to your Google account, search history, YouTube viewing, and Gmail.',
  },
  facebook: {
    name: 'Facebook/Meta',
    color: 'text-indigo-900',
    bgColor: 'bg-indigo-100',
    description:
      'Can track you even without a Facebook account via shadow profiles built from others\' contact lists.',
  },
  amazon: {
    name: 'Amazon',
    color: 'text-orange-900',
    bgColor: 'bg-orange-100',
    description:
      'Connects your browsing to shopping habits and Alexa usage for targeted advertising.',
  },
  microsoft: {
    name: 'Microsoft',
    color: 'text-cyan-900',
    bgColor: 'bg-cyan-100',
    description:
      'Links activity to Microsoft accounts, LinkedIn profiles, and Windows usage data.',
  },
  tiktok: {
    name: 'TikTok',
    color: 'text-pink-900',
    bgColor: 'bg-pink-100',
    description:
      'Collects extensive device data and builds detailed interest profiles for content targeting.',
  },
  twitter: {
    name: 'Twitter/X',
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
    description:
      'Tracks interests and political views based on who you follow and what you engage with.',
  },
};

function identifyBigTech(trackerNames: string[]): string[] {
  const detected: Set<string> = new Set();

  trackerNames.forEach((tracker) => {
    const lower = tracker.toLowerCase();
    if (
      lower.includes('google') ||
      lower.includes('doubleclick') ||
      lower.includes('youtube')
    ) {
      detected.add('google');
    }
    if (
      lower.includes('facebook') ||
      lower.includes('fb.') ||
      lower.includes('meta') ||
      lower.includes('instagram')
    ) {
      detected.add('facebook');
    }
    if (lower.includes('amazon') || lower.includes('alexa')) {
      detected.add('amazon');
    }
    if (
      lower.includes('microsoft') ||
      lower.includes('bing') ||
      lower.includes('linkedin')
    ) {
      detected.add('microsoft');
    }
    if (lower.includes('tiktok') || lower.includes('bytedance')) {
      detected.add('tiktok');
    }
    if (lower.includes('twitter') || lower.includes('x.com')) {
      detected.add('twitter');
    }
  });

  return Array.from(detected);
}

export function BigTechTrackerContext({ domain, bigTechTrackers }: Props) {
  const detected = identifyBigTech(bigTechTrackers);

  if (detected.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-purple-50 border border-purple-200 rounded-lg p-5 my-6"
      aria-labelledby="bigtech-tracker-heading"
    >
      <h3
        id="bigtech-tracker-heading"
        className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        Big Tech Trackers on {domain}
      </h3>

      <div className="space-y-4 text-purple-800">
        <p>
          This site shares your data with{' '}
          <strong>
            {detected.length} major technology {detected.length === 1 ? 'company' : 'companies'}
          </strong>
          . These companies already have extensive data about billions of users, and tracking from
          this site adds to their profiles.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {detected.map((tech) => {
            const info = TRACKER_INFO[tech];
            if (!info) return null;

            return (
              <div key={tech} className={`${info.bgColor} rounded p-3`}>
                <h4 className={`font-medium ${info.color}`}>{info.name}</h4>
                <p className="text-sm mt-1 opacity-80">{info.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-purple-100 rounded p-4">
          <h4 className="font-medium text-purple-900 mb-2">Why this matters:</h4>
          <p className="text-sm">
            Big tech companies combine data from thousands of websites to build detailed profiles of
            your interests, demographics, political views, and behaviors. This data is used for
            targeted advertising and can be subpoenaed by governments or leaked in data breaches.
          </p>
        </div>

        <div className="bg-white/50 rounded p-4 mt-4">
          <h4 className="font-medium text-purple-900 mb-2">Reduce big tech tracking:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Use browsers with built-in tracking protection (Firefox, Brave)</li>
            <li>Install uBlock Origin to block known tracking domains</li>
            <li>Consider a Pi-hole or DNS-level blocking for network-wide protection</li>
            <li>Use alternative services that don&apos;t track (DuckDuckGo, ProtonMail)</li>
            <li>Log out of big tech accounts when not using their services</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
