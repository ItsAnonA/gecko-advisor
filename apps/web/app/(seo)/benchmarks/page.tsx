/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Benchmarks Page (SSR)
 *
 * Shows global privacy statistics across all scanned domains.
 * Uses ISR with 5-minute revalidation.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import type { BenchmarksResponse } from '@/lib/api';

// Revalidate every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Website Privacy Benchmarks',
  description: 'Explore global privacy statistics for websites. See how sites compare in terms of trackers, cookies, and security across the web.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/benchmarks`,
  },
  openGraph: {
    title: 'Website Privacy Benchmarks',
    description: 'Explore global privacy statistics for websites. See how sites compare in terms of trackers, cookies, and security across the web.',
    url: `${SEO_CONSTANTS.BASE_URL}/benchmarks`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

// Server-side fetch for benchmarks
async function getBenchmarks(): Promise<BenchmarksResponse | null> {
  try {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const response = await fetch(`${apiUrl}/api/v2/benchmarks`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch benchmarks:', error);
    return null;
  }
}

/**
 * Score distribution bar chart
 */
function ScoreDistributionChart({ distribution }: { distribution: BenchmarksResponse['scoreDistribution'] }) {
  const maxPercentage = Math.max(...distribution.map((d) => d.percentage), 1);

  return (
    <div className="space-y-3">
      {distribution.map((bucket) => (
        <div key={bucket.bucket} className="flex items-center gap-4">
          <div className="w-20 text-sm text-zinc-600">{bucket.bucket}</div>
          <div className="flex-1">
            <div className="h-8 bg-zinc-100 rounded-lg overflow-hidden">
              <div
                className={`h-full rounded-lg transition-all duration-500 ${
                  bucket.bucket.startsWith('81') ? 'bg-emerald-500' :
                  bucket.bucket.startsWith('61') ? 'bg-emerald-400' :
                  bucket.bucket.startsWith('41') ? 'bg-amber-400' :
                  bucket.bucket.startsWith('21') ? 'bg-orange-400' :
                  'bg-red-400'
                }`}
                style={{ width: `${(bucket.percentage / maxPercentage) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-24 text-right">
            <span className="font-semibold text-zinc-900">{bucket.percentage}%</span>
            <span className="text-xs text-zinc-500 ml-1">({bucket.count.toLocaleString()})</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({ label, value, sublabel, color = 'zinc' }: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'zinc' | 'emerald' | 'amber' | 'red';
}) {
  const colorClasses = {
    zinc: 'bg-zinc-50 border-zinc-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  };

  const textClasses = {
    zinc: 'text-zinc-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };

  return (
    <div className={`rounded-xl border ${colorClasses[color]} p-6`}>
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${textClasses[color]} tabular-nums`}>{value}</p>
      {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
    </div>
  );
}

export default async function BenchmarksPage() {
  const benchmarks = await getBenchmarks();

  if (!benchmarks) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">
            Benchmarks Unavailable
          </h1>
          <p className="text-zinc-600 mb-6">
            Unable to load benchmark data. Please try again later.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  const {
    totalDomainsScanned,
    scoreDistribution,
    averageScore,
    averageTrackerCount,
    averageCookieCount,
    prevalence,
  } = benchmarks;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">Benchmarks</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
            Web Privacy Benchmarks
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            See how websites across the internet compare in terms of privacy and tracking.
            Based on {totalDomainsScanned.toLocaleString()} scanned domains.
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard
            label="Domains Scanned"
            value={totalDomainsScanned.toLocaleString()}
            sublabel="and counting"
          />
          <StatCard
            label="Average Score"
            value={averageScore.toFixed(0)}
            sublabel="out of 100"
            color={averageScore >= 70 ? 'emerald' : averageScore >= 40 ? 'amber' : 'red'}
          />
          <StatCard
            label="Avg. Trackers"
            value={averageTrackerCount.toFixed(1)}
            sublabel="per site"
          />
          <StatCard
            label="Avg. Cookies"
            value={averageCookieCount.toFixed(1)}
            sublabel="per site"
          />
        </div>

        {/* Score Distribution */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 mb-12">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Score Distribution</h2>
          <ScoreDistributionChart distribution={scoreDistribution} />
          <p className="mt-4 text-sm text-zinc-500">
            Distribution of privacy scores across all scanned websites. Higher scores indicate better privacy practices.
          </p>
        </div>

        {/* Prevalence Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Privacy Concerns</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span className="text-zinc-700">Use Fingerprinting</span>
                </div>
                <span className="font-semibold text-zinc-900">{prevalence.fingerprintingRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-zinc-700">Have Excessive Trackers</span>
                </div>
                <span className="font-semibold text-zinc-900">{prevalence.excessiveTrackerRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-zinc-700">Heavy Ad Tracking</span>
                </div>
                <span className="font-semibold text-zinc-900">{prevalence.highAdRatioRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-zinc-700">No HTTPS</span>
                </div>
                <span className="font-semibold text-zinc-900">{prevalence.httpOnlyRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">What This Means</h2>
            <div className="space-y-4 text-sm text-zinc-600">
              <p>
                <strong className="text-zinc-900">Fingerprinting</strong> allows websites to identify you
                even if you clear cookies or use private browsing. Only {prevalence.fingerprintingRate}%
                of sites use this invasive technique.
              </p>
              <p>
                <strong className="text-zinc-900">Excessive trackers</strong> means having 2x or more
                the average number of tracking scripts. These sites collect significantly more data
                about your browsing.
              </p>
              <p>
                <strong className="text-zinc-900">HTTPS</strong> is essential for secure browsing.
                Sites without it expose your data to anyone on the network.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-xl border border-zinc-200 p-8">
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">
            How does your favorite site compare?
          </h3>
          <p className="text-zinc-600 mb-6">
            Get a free privacy report for any website in seconds.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Scan a Website
          </Link>
        </div>
      </div>
    </main>
  );
}
