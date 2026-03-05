/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Privacy Index — Flagship Link Magnet Page (Phase B2)
 *
 * The single most important page for link acquisition.
 * Designed for journalists, researchers, and bloggers to cite.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchPrivacyIndexData } from '@/lib/api';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  CategoryScoreChart,
  ScoreDistributionChart,
  TrackerPrevalenceChart,
} from '@/components/seo/PrivacyIndexCharts';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchPrivacyIndexData();
  const count = data?.globalStats.totalDomains.toLocaleString() || '40,000+';
  const avgScore = data?.globalStats.avgPrivacyScore.toFixed(1) || '84';

  return {
    title: `Website Privacy Index: Global Tracker & Cookie Statistics | ${SEO_CONSTANTS.SITE_NAME}`,
    description: `Analysis of ${count} websites. Average privacy score: ${avgScore}/100. Average trackers: ${data?.globalStats.avgTrackerCount.toFixed(1) || '0.1'}. Updated daily.`,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-index` },
    openGraph: {
      title: 'Website Privacy Index: The State of Website Privacy',
      description: `Comprehensive analysis of ${count} websites. Global average privacy score: ${avgScore}/100.`,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-index`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function PrivacyIndexPage() {
  const data = await fetchPrivacyIndexData();
  if (!data) notFound();

  const { globalStats, categoryBreakdown, scoreDistribution, topTrackers } = data;
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'GeckoAdvisor Website Privacy Index',
    description: `Privacy analysis of ${globalStats.totalDomains.toLocaleString()} websites including tracker detection, cookie analysis, and security header evaluation.`,
    url: `${SEO_CONSTANTS.BASE_URL}/privacy-index`,
    creator: { '@type': 'Organization', name: 'Gecko Advisor' },
    temporalCoverage: `2025/..`,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Privacy Score', value: globalStats.avgPrivacyScore },
      { '@type': 'PropertyValue', name: 'Average Trackers', value: globalStats.avgTrackerCount },
      { '@type': 'PropertyValue', name: 'Average Cookies', value: globalStats.avgCookieCount },
    ],
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />

      <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-zinc-500">
            <li><Link href="/" className="hover:text-advisor-600">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-700 font-medium">Privacy Index</li>
          </ol>
        </nav>

        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
          GeckoAdvisor Privacy Index: The State of Website Privacy
        </h1>
        <p className="text-lg text-zinc-600 mb-2 max-w-3xl leading-relaxed">
          A data-driven overview of privacy practices across {globalStats.totalDomains.toLocaleString()} websites,
          measuring third-party trackers, cookies, fingerprinting, and security headers.
        </p>
        <p className="text-sm text-zinc-500 mb-8">
          Last updated: {lastUpdated}. Based on {globalStats.totalFindings.toLocaleString()} total findings.
        </p>

        {/* Global Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <StatCard label="Domains Scanned" value={globalStats.totalDomains.toLocaleString()} />
          <StatCard label="Total Findings" value={globalStats.totalFindings.toLocaleString()} />
          <StatCard label="Avg Privacy Score" value={`${globalStats.avgPrivacyScore.toFixed(1)}/100`} />
          <StatCard label="Median Score" value={String(globalStats.medianPrivacyScore)} />
          <StatCard label="Avg Trackers" value={globalStats.avgTrackerCount.toFixed(1)} />
          <StatCard label="Avg Cookies" value={globalStats.avgCookieCount.toFixed(1)} />
        </div>

        {/* Score Distribution */}
        {scoreDistribution.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Privacy Score Distribution</h2>
            <p className="text-sm text-zinc-600 mb-4">
              How {globalStats.totalDomains.toLocaleString()} domains are distributed across score ranges.
            </p>
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <ScoreDistributionChart data={scoreDistribution} />
            </div>
          </section>
        )}

        {/* Category Comparison */}
        {categoryBreakdown.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Privacy Score by Category</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Average privacy scores across {categoryBreakdown.length} industry categories.
              The global average is {globalStats.avgPrivacyScore.toFixed(1)}.
            </p>
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <CategoryScoreChart data={categoryBreakdown} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {categoryBreakdown.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/privacy-benchmarks/${cat.slug}`}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm"
                >
                  <span className="font-medium text-zinc-900">{cat.name}</span>
                  <span className="block text-xs text-zinc-500">{cat.domainCount} domains</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tracker Prevalence */}
        {topTrackers.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Most Prevalent Trackers</h2>
            <p className="text-sm text-zinc-600 mb-4">
              The most common third-party trackers across all scanned domains.
            </p>
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <TrackerPrevalenceChart data={topTrackers} />
            </div>
          </section>
        )}

        {/* Category Highlights */}
        {categoryBreakdown.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Category Highlights</h2>
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => {
                const diff = cat.avgScore - globalStats.avgPrivacyScore;
                const direction = diff >= 0 ? 'above' : 'below';
                return (
                  <div key={cat.slug} className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <p className="text-sm text-zinc-700">
                      <Link href={`/privacy-benchmarks/${cat.slug}`} className="font-semibold text-advisor-600 hover:text-advisor-700">
                        {cat.name}
                      </Link>
                      {' '}domains average a privacy score of {cat.avgScore.toFixed(1)} ({Math.abs(diff).toFixed(1)} points {direction} the
                      global average) with {cat.avgTrackers.toFixed(1)} trackers per domain.
                      Based on {cat.domainCount} analyzed domains.
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Methodology */}
        <section className="mb-12 p-6 bg-zinc-50 border border-zinc-200 rounded-xl">
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">Methodology & Limitations</h2>
          <p className="text-sm text-zinc-600 leading-relaxed mb-3">
            Gecko Advisor scans websites using an automated browser that detects third-party trackers,
            cookies, fingerprinting scripts, and security headers. Privacy scores are calculated
            deterministically based on observed data. Only domains with 2 or more scans are included
            in aggregate statistics.
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mb-4">
            Limitations: Scans capture a snapshot at the time of analysis and may not reflect
            region-specific or consent-dependent behavior. Scores describe observed data and
            do not constitute a safety assessment.
          </p>
          <div className="flex gap-4">
            <Link href="/methodology" className="text-sm text-advisor-600 hover:text-advisor-700">
              Full methodology →
            </Link>
            <Link href="/transparency-reports" className="text-sm text-advisor-600 hover:text-advisor-700">
              Transparency reports →
            </Link>
          </div>
        </section>

        {/* Cite This Page */}
        <section className="mb-12 p-6 bg-advisor-50 border border-advisor-200 rounded-xl">
          <h2 className="text-lg font-semibold text-advisor-900 mb-2">Cite This Page</h2>
          <p className="text-sm text-advisor-700 mb-3">
            Researchers, journalists, and bloggers are welcome to reference this data with attribution.
          </p>
          <div className="bg-white rounded-lg p-3 border border-advisor-200">
            <code className="text-xs text-zinc-700 break-all">
              Gecko Advisor. &quot;Website Privacy Index: Global Tracker &amp; Cookie Statistics.&quot;
              GeckoAdvisor.com, {lastUpdated}. {SEO_CONSTANTS.BASE_URL}/privacy-index
            </code>
          </div>
        </section>

        {/* Related Pages */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Explore Rankings</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/most-tracked-websites" className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600">
              Most Tracked Websites
            </Link>
            <Link href="/websites-with-highest-privacy-score" className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600">
              Highest Privacy Scores
            </Link>
            <Link href="/websites-with-most-cookies" className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600">
              Most Cookies
            </Link>
            <Link href="/top-100-websites-privacy" className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600">
              Top 100 Privacy
            </Link>
            <Link href="/least-private-websites" className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600">
              Least Private Websites
            </Link>
            <Link href="/check-domain-risk" className="p-3 bg-advisor-50 border border-advisor-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-700">
              Check Any Domain →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-xl text-center">
      <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
