/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Category Hub Page (Phase 2B)
 *
 * Shows privacy benchmarks for a specific category:
 * - Stats grid (avg score, trackers, fingerprinting rate)
 * - Score distribution
 * - Best in class (top 10)
 * - Worst in class (bottom 10)
 * - Sample comparisons (UX only, NOT SEO)
 * - Links to individual reports
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { SampleComparisonsSection } from '@/components/ui/SampleComparisonsSection';

interface Props {
  params: Promise<{ category: string }>;
}

interface Benchmarks {
  avgScore: number;
  medianScore: number;
  avgTrackers: number;
  avgCookies: number;
  fingerprintingRate: number;
  sampleSize: number;
  scorePercentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  topDomains?: string[];
  worstDomains?: string[];
}

interface SampleComparison {
  id: string;
  domainA: string;
  domainB: string;
  label: string;
  description?: string;
}

interface CategoryData {
  slug: string;
  name: string;
  description: string;
  benchmarks: Benchmarks | null;
  topDomains: Array<{
    domain: string;
    score: number;
    trackers: number;
  }>;
  worstDomains: Array<{
    domain: string;
    score: number;
    trackers: number;
  }>;
  // Sample comparisons (UX only, NOT SEO)
  sampleComparisons?: SampleComparison[];
}

// Revalidate every hour
export const revalidate = 3600;

async function getCategoryData(slug: string): Promise<CategoryData | null> {
  try {
    const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/v2/categories/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const data = await getCategoryData(slug);

  if (!data) {
    return { title: 'Category Not Found' };
  }

  const title = `${data.name} Privacy Benchmarks | ${SEO_CONSTANTS.SITE_NAME}`;
  const description = data.benchmarks
    ? `Privacy analysis of ${data.benchmarks.sampleSize.toLocaleString()}+ ${data.name.toLowerCase()} websites. Average privacy score: ${data.benchmarks.avgScore}/100. See best and worst performers.`
    : `Privacy benchmarks for ${data.name.toLowerCase()} websites.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-benchmarks/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-benchmarks/${slug}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
    },
  };
}

export default async function CategoryHubPage({ params }: Props) {
  const { category: slug } = await params;
  const data = await getCategoryData(slug);

  if (!data || !data.benchmarks) {
    notFound();
  }

  const benchmarks = data.benchmarks;

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-sky-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/privacy-benchmarks" className="hover:text-sky-600">
          Privacy Benchmarks
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{data.name}</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {data.name} Privacy Benchmarks
        </h1>
        <p className="text-lg text-gray-600">
          Privacy analysis across{' '}
          <strong>{benchmarks.sampleSize.toLocaleString()}</strong>{' '}
          {data.name.toLowerCase()} websites.
        </p>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Average Score" value={`${benchmarks.avgScore}/100`} />
        <StatCard label="Avg Trackers" value={benchmarks.avgTrackers.toFixed(1)} />
        <StatCard label="Avg Cookies" value={benchmarks.avgCookies.toFixed(1)} />
        <StatCard
          label="Use Fingerprinting"
          value={`${benchmarks.fingerprintingRate}%`}
        />
      </section>

      {/* Score Distribution */}
      <section className="bg-gray-50 rounded-xl p-6 mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Score Distribution
        </h2>
        <div className="flex items-center justify-between gap-4">
          <PercentileBar percentiles={benchmarks.scorePercentiles} />
        </div>
        <div className="flex justify-between text-sm text-gray-500 mt-4">
          <span>Bottom 10%: {benchmarks.scorePercentiles.p10}</span>
          <span>Median: {benchmarks.scorePercentiles.p50}</span>
          <span>Top 10%: {benchmarks.scorePercentiles.p90}</span>
        </div>
      </section>

      {/* Best in Class */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          Best Privacy — Top 10 {data.name} Sites
        </h2>
        <DomainList domains={data.topDomains} />
      </section>

      {/* Worst in Class */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          Worst Privacy — Bottom 10 {data.name} Sites
        </h2>
        <DomainList domains={data.worstDomains} />
      </section>

      {/* Sample Comparisons (UX only, NOT SEO) */}
      {data.sampleComparisons && data.sampleComparisons.length > 0 && (
        <SampleComparisonsSection
          samples={data.sampleComparisons}
          categoryName={data.name}
        />
      )}

      {/* CTA */}
      <section className="bg-sky-50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Check any website&apos;s privacy
        </h2>
        <p className="text-gray-600 mb-6">
          Free, instant analysis. No signup required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors"
          >
            Scan a Website
          </Link>
          <Link
            href="/privacy-benchmarks"
            className="inline-block px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:border-sky-300 transition-colors"
          >
            View All Categories
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function PercentileBar({
  percentiles,
}: {
  percentiles: { p10: number; p25: number; p50: number; p75: number; p90: number };
}) {
  return (
    <div className="flex-1 h-8 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg relative">
      {/* P10 marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-600"
        style={{ left: `${percentiles.p10}%` }}
        title={`P10: ${percentiles.p10}`}
      />
      {/* P50 marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-yellow-600"
        style={{ left: `${percentiles.p50}%` }}
        title={`P50: ${percentiles.p50}`}
      />
      {/* P90 marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-green-600"
        style={{ left: `${percentiles.p90}%` }}
        title={`P90: ${percentiles.p90}`}
      />
    </div>
  );
}

function DomainList({
  domains,
}: {
  domains: Array<{ domain: string; score: number; trackers: number }>;
}) {
  if (!domains || domains.length === 0) {
    return (
      <p className="text-gray-500 text-sm italic">No domains available yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {domains.map((d, i) => (
        <Link
          key={d.domain}
          href={`/privacy-report/${d.domain}`}
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-sky-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-gray-400 w-6 text-sm">{i + 1}.</span>
            <span className="font-medium text-gray-900">{d.domain}</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-500">{d.trackers} trackers</span>
            <span className={`font-semibold ${getScoreColor(d.score)}`}>
              {d.score}/100
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function getScoreColor(score: number | null): string {
  if (!score) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}
