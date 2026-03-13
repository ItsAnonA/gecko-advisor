/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Privacy Scanner Authority Page
 *
 * Phase 2A: Category authority page that gives Google context
 * for all the programmatic report pages.
 *
 * This page should:
 * - Explain what the scanner does
 * - Link to popular/high-value reports
 * - Provide educational content
 * - Build trust and authority
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';

export const metadata: Metadata = {
  title: 'Free Website Privacy Scanner | Check Any Site for Trackers',
  description:
    'Scan any website for trackers, cookies, fingerprinting, and security issues. Free instant privacy analysis with detailed reports. No account required.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-scanner`,
  },
  openGraph: {
    title: 'Free Website Privacy Scanner | Check Any Site for Trackers',
    description:
      'Analyze any website for privacy concerns. Check trackers, cookies, and security headers instantly. 100% free.',
    url: `${SEO_CONSTANTS.BASE_URL}/privacy-scanner`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

// Popular sites to feature (drives internal linking)
const FEATURED_REPORTS = [
  { domain: 'google.com', name: 'Google' },
  { domain: 'facebook.com', name: 'Facebook' },
  { domain: 'amazon.com', name: 'Amazon' },
  { domain: 'youtube.com', name: 'YouTube' },
  { domain: 'twitter.com', name: 'Twitter/X' },
  { domain: 'instagram.com', name: 'Instagram' },
  { domain: 'tiktok.com', name: 'TikTok' },
  { domain: 'netflix.com', name: 'Netflix' },
  { domain: 'reddit.com', name: 'Reddit' },
  { domain: 'linkedin.com', name: 'LinkedIn' },
  { domain: 'wikipedia.org', name: 'Wikipedia' },
  { domain: 'github.com', name: 'GitHub' },
];

export default function PrivacyScannerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
          Free Website Privacy Scanner
        </h1>
        <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-8">
          Check any website for trackers, cookies, fingerprinting, and security issues. Get an
          instant privacy score with detailed analysis. No account required.
        </p>

        {/* CTA - Link to homepage scanner */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-advisor-600 text-white font-semibold rounded-lg hover:bg-advisor-700 transition-colors shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Scan a Website Now
        </Link>
      </section>

      {/* What We Analyze */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">What Our Scanner Checks</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Trackers & Analytics</h3>
            <p className="text-zinc-600">
              We detect advertising trackers, analytics scripts, and data collection services. See
              exactly who is watching your browsing activity.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Cookies</h3>
            <p className="text-zinc-600">
              Analyze first-party and third-party cookies. Understand which cookies are necessary
              and which are used for tracking.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Fingerprinting</h3>
            <p className="text-zinc-600">
              Detect browser fingerprinting techniques including canvas, WebGL, and audio
              fingerprinting that can track you without cookies.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-zinc-200 shadow-sm">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Security Headers</h3>
            <p className="text-zinc-600">
              Check for essential security headers like HTTPS, Content-Security-Policy, and
              X-Frame-Options that protect your data.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">How It Works</h2>
        <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-advisor-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </span>
              <div>
                <h3 className="font-semibold text-zinc-900">Enter a URL</h3>
                <p className="text-zinc-600">
                  Type any website address into our scanner. No account or signup required.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-advisor-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </span>
              <div>
                <h3 className="font-semibold text-zinc-900">We Analyze the Site</h3>
                <p className="text-zinc-600">
                  Our scanner loads the page like a real browser, detecting trackers, cookies, and
                  security issues.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-advisor-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </span>
              <div>
                <h3 className="font-semibold text-zinc-900">Get Your Privacy Score</h3>
                <p className="text-zinc-600">
                  Receive a 0-100 privacy score with detailed breakdown of findings and
                  recommendations.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Popular Reports - Internal Linking */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">Popular Privacy Reports</h2>
        <p className="text-zinc-600 mb-6">
          See how the most-visited websites handle your privacy:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURED_REPORTS.map(({ domain, name }) => (
            <Link
              key={domain}
              href={`/privacy-report/${domain}`}
              className="bg-white rounded-lg p-4 border border-zinc-200 hover:border-advisor-300 hover:shadow-md transition-all text-center"
            >
              <span className="text-sm font-medium text-zinc-900">{name}</span>
              <span className="block text-xs text-zinc-500 mt-1">{domain}</span>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/reports"
            className="text-advisor-600 hover:text-advisor-800 font-medium text-sm"
          >
            View all reports →
          </Link>
        </div>
      </section>

      {/* Why Privacy Matters */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">Why Website Privacy Matters</h2>
        <div className="prose prose-zinc max-w-none">
          <p>
            Every time you visit a website, you may be sharing more information than you realize.
            Trackers can follow you across the internet, building detailed profiles of your
            interests, purchases, and behaviors. This data is often sold to advertisers or used to
            manipulate your online experience.
          </p>
          <p>
            Our privacy scanner helps you understand what&apos;s happening behind the scenes. By
            analyzing trackers, cookies, and security measures, we give you the information you
            need to make informed decisions about which websites to trust with your data.
          </p>
          <h3>What can trackers learn about you?</h3>
          <ul>
            <li>Your browsing history across thousands of websites</li>
            <li>Products you&apos;ve viewed or purchased</li>
            <li>Articles you&apos;ve read and your political leanings</li>
            <li>Your approximate location from your IP address</li>
            <li>Device information and unique identifiers</li>
          </ul>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">
          100% Free, Open Source, No Tracking
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">🆓</div>
            <h3 className="font-semibold text-zinc-900">Free Forever</h3>
            <p className="text-sm text-zinc-600">
              No premium tiers or paywalls. Privacy should be accessible to everyone.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-1">🔓</div>
            <h3 className="font-semibold text-zinc-900">Open Source</h3>
            <p className="text-sm text-zinc-600">
              Our code is public. Audit exactly how we analyze websites.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-1">🛡️</div>
            <h3 className="font-semibold text-zinc-900">No User Tracking</h3>
            <p className="text-sm text-zinc-600">
              We don&apos;t track you. No accounts, no cookies, no data collection.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center mt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-advisor-600 text-white font-semibold rounded-lg hover:bg-advisor-700 transition-colors shadow-lg text-lg"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Scan a Website Now
        </Link>
        <p className="mt-4 text-zinc-500 text-sm">Free, instant results. No signup required.</p>
      </section>
    </div>
  );
}
