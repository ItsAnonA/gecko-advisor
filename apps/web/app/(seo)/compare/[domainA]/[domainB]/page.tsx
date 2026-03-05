/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Domain Comparison Page (SSR) - Phase A5 SEO Activation
 *
 * Compares two domains' privacy practices side by side.
 * Uses ISR with 1-hour revalidation.
 *
 * SEO features:
 * - Curated-only indexing (non-curated pairs get noindex)
 * - Verdict-free comparison summary for snippets
 * - Schema.org BreadcrumbList + WebPage JSON-LD
 * - Related comparison internal links
 * - Individual report links
 */

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { normalizeHostname as normalizeDomain, SEO_CONSTANTS } from '@gecko-advisor/shared';
import { type DomainComparison } from '@/lib/api';
import { JsonLd } from '@/components/seo/JsonLd';
import { getDomainDisplayName } from '@/lib/generateDomainNarrative';
import {
  comparisonPairs,
  getComparisonPairsForDomain,
  getOtherDomain,
} from '@/data/comparison-pairs';

interface Props {
  params: Promise<{ domainA: string; domainB: string }>;
}

// Revalidate every hour
export const revalidate = 3600;

/**
 * Check if a pair is in the curated comparison list (order-insensitive).
 */
function isCuratedPair(domainA: string, domainB: string): boolean {
  return comparisonPairs.some(
    (p) =>
      (p.domainA === domainA && p.domainB === domainB) ||
      (p.domainA === domainB && p.domainB === domainA),
  );
}

// Server-side fetch for comparison
async function getComparison(domainA: string, domainB: string): Promise<DomainComparison | null> {
  try {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const response = await fetch(
      `${apiUrl}/api/v2/compare/${encodeURIComponent(domainA)}/${encodeURIComponent(domainB)}`,
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch comparison:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domainA: encodedA, domainB: encodedB } = await params;
  const domainA = normalizeDomain(decodeURIComponent(encodedA)) || encodedA;
  const domainB = normalizeDomain(decodeURIComponent(encodedB)) || encodedB;

  const comparison = await getComparison(domainA, domainB);

  if (!comparison) {
    return {
      title: 'Comparison Not Available',
      robots: { index: false, follow: true },
    };
  }

  const displayA = getDomainDisplayName(domainA);
  const displayB = getDomainDisplayName(domainB);
  const curated = isCuratedPair(domainA, domainB);

  const title = `${displayA} vs ${displayB}: Privacy & Tracking Comparison | ${SEO_CONSTANTS.SITE_NAME}`;
  const description = `Compare privacy practices between ${domainA} (score: ${comparison.domainA.score}) and ${domainB} (score: ${comparison.domainB.score}). Trackers, cookies, and security headers analyzed side by side.`;

  return {
    title,
    description,
    robots: { index: curated, follow: true },
    alternates: {
      canonical: `${SEO_CONSTANTS.BASE_URL}/compare/${domainA}/${domainB}`,
    },
    openGraph: {
      title,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/compare/${domainA}/${domainB}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
    },
  };
}

/**
 * Score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-emerald-50 border-emerald-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function getWinnerBadge(winner: 'A' | 'B' | 'tie', isA: boolean): React.ReactNode {
  if (winner === 'tie') {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 rounded-full">
        Tie
      </span>
    );
  }
  if ((winner === 'A' && isA) || (winner === 'B' && !isA)) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
        Better
      </span>
    );
  }
  return null;
}

/**
 * Build related comparison links for a domain, excluding the current pair.
 */
function getRelatedComparisons(
  domain: string,
  excludeA: string,
  excludeB: string,
  limit: number = 5,
): { href: string; label: string }[] {
  const pairs = getComparisonPairsForDomain(domain);
  const links: { href: string; label: string }[] = [];

  for (const pair of pairs) {
    const other = getOtherDomain(pair, domain);
    // Skip the current comparison pair
    if (
      (pair.domainA === excludeA && pair.domainB === excludeB) ||
      (pair.domainA === excludeB && pair.domainB === excludeA)
    ) {
      continue;
    }
    const displayDomain = getDomainDisplayName(domain);
    const displayOther = getDomainDisplayName(other);
    links.push({
      href: `/compare/${pair.domainA}/${pair.domainB}`,
      label: `${displayDomain} vs ${displayOther}`,
    });
    if (links.length >= limit) break;
  }

  return links;
}

export default async function ComparePage({ params }: Props) {
  const { domainA: encodedA, domainB: encodedB } = await params;
  const domainA = normalizeDomain(decodeURIComponent(encodedA)) || decodeURIComponent(encodedA);
  const domainB = normalizeDomain(decodeURIComponent(encodedB)) || decodeURIComponent(encodedB);

  const comparison = await getComparison(domainA, domainB);

  if (!comparison) {
    notFound();
  }

  const { domainA: a, domainB: b, differences, winner, summary, commonTrackers, uniqueToA, uniqueToB } = comparison;

  const displayA = getDomainDisplayName(domainA);
  const displayB = getDomainDisplayName(domainB);

  const relatedA = getRelatedComparisons(domainA, domainA, domainB);
  const relatedB = getRelatedComparisons(domainB, domainA, domainB);

  // JSON-LD: BreadcrumbList
  const breadcrumbSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SEO_CONSTANTS.BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Compare',
        item: `${SEO_CONSTANTS.BASE_URL}/compare`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${displayA} vs ${displayB}`,
        item: `${SEO_CONSTANTS.BASE_URL}/compare/${domainA}/${domainB}`,
      },
    ],
  };

  // JSON-LD: WebPage
  const webPageSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${displayA} vs ${displayB}: Privacy & Tracking Comparison`,
    description: `Side-by-side privacy comparison of ${domainA} and ${domainB}. ${domainA} has a privacy score of ${a.score}. ${domainB} has a privacy score of ${b.score}.`,
    url: `${SEO_CONSTANTS.BASE_URL}/compare/${domainA}/${domainB}`,
    publisher: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      url: SEO_CONSTANTS.BASE_URL,
    },
    about: [
      {
        '@type': 'WebSite',
        name: domainA,
        url: `https://${domainA}`,
      },
      {
        '@type': 'WebSite',
        name: domainB,
        url: `https://${domainB}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />

      <main className="min-h-screen bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Breadcrumb with Schema.org markup */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol
              className="flex flex-wrap items-center gap-2 text-sm text-zinc-500"
              itemScope
              itemType="https://schema.org/BreadcrumbList"
            >
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link href="/" className="hover:text-zinc-900 transition-colors" itemProp="item">
                  <span itemProp="name">Home</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li aria-hidden="true">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span className="text-zinc-500" itemProp="name">Compare</span>
                <meta itemProp="position" content="2" />
              </li>
              <li aria-hidden="true">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span className="text-zinc-700 font-medium" itemProp="name">
                  {displayA} vs {displayB}
                </span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
              {displayA} vs {displayB}: Privacy &amp; Tracking Comparison
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              {summary}
            </p>
          </div>

          {/* Score Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Domain A */}
            <div className={`rounded-xl border p-6 ${getScoreBg(a.score)}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    href={`/privacy-report/${a.domain}`}
                    className="text-xl font-bold text-zinc-900 hover:underline"
                  >
                    {a.domain}
                  </Link>
                  <p className="text-sm text-zinc-500">{a.percentileLabel}</p>
                </div>
                {getWinnerBadge(winner, true)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getScoreColor(a.score)} tabular-nums`}>
                  {a.score}
                </span>
                <span className="text-lg text-zinc-500">{a.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Trackers</p>
                  <p className="font-semibold text-zinc-900">{a.trackerCount}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Cookies</p>
                  <p className="font-semibold text-zinc-900">{a.cookieCount}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Third Parties</p>
                  <p className="font-semibold text-zinc-900">{a.thirdPartyCount}</p>
                </div>
              </div>
              {a.hasFingerprinting && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Uses fingerprinting
                </div>
              )}
            </div>

            {/* Domain B */}
            <div className={`rounded-xl border p-6 ${getScoreBg(b.score)}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    href={`/privacy-report/${b.domain}`}
                    className="text-xl font-bold text-zinc-900 hover:underline"
                  >
                    {b.domain}
                  </Link>
                  <p className="text-sm text-zinc-500">{b.percentileLabel}</p>
                </div>
                {getWinnerBadge(winner, false)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getScoreColor(b.score)} tabular-nums`}>
                  {b.score}
                </span>
                <span className="text-lg text-zinc-500">{b.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Trackers</p>
                  <p className="font-semibold text-zinc-900">{b.trackerCount}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Cookies</p>
                  <p className="font-semibold text-zinc-900">{b.cookieCount}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Third Parties</p>
                  <p className="font-semibold text-zinc-900">{b.thirdPartyCount}</p>
                </div>
              </div>
              {b.hasFingerprinting && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Uses fingerprinting
                </div>
              )}
            </div>
          </div>

          {/* Differences Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-12">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">Metric-by-Metric Differences</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {differences.map((diff) => (
                <div key={diff.metric} className="px-6 py-4 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="font-medium text-zinc-900">{diff.label}</p>
                    <p className="text-xs text-zinc-500">{diff.explanation}</p>
                  </div>
                  <div className={`text-center ${diff.winner === 'A' ? 'font-bold text-emerald-600' : 'text-zinc-700'}`}>
                    {String(diff.valueA)}
                  </div>
                  <div className={`text-center ${diff.winner === 'B' ? 'font-bold text-emerald-600' : 'text-zinc-700'}`}>
                    {String(diff.valueB)}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      diff.significance === 'high' ? 'bg-red-100 text-red-700' :
                      diff.significance === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {diff.significance} impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracker Analysis */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Common Trackers */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="font-semibold text-zinc-900 mb-3">Common Trackers</h3>
              {commonTrackers.length > 0 ? (
                <ul className="text-sm space-y-1 text-zinc-600">
                  {commonTrackers.slice(0, 10).map((tracker) => (
                    <li key={tracker}>{tracker}</li>
                  ))}
                  {commonTrackers.length > 10 && (
                    <li className="text-zinc-400">+{commonTrackers.length - 10} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No common trackers</p>
              )}
            </div>

            {/* Unique to A */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="font-semibold text-zinc-900 mb-3">Only on {a.domain}</h3>
              {uniqueToA.length > 0 ? (
                <ul className="text-sm space-y-1 text-zinc-600">
                  {uniqueToA.slice(0, 10).map((tracker) => (
                    <li key={tracker}>{tracker}</li>
                  ))}
                  {uniqueToA.length > 10 && (
                    <li className="text-zinc-400">+{uniqueToA.length - 10} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No unique trackers</p>
              )}
            </div>

            {/* Unique to B */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="font-semibold text-zinc-900 mb-3">Only on {b.domain}</h3>
              {uniqueToB.length > 0 ? (
                <ul className="text-sm space-y-1 text-zinc-600">
                  {uniqueToB.slice(0, 10).map((tracker) => (
                    <li key={tracker}>{tracker}</li>
                  ))}
                  {uniqueToB.length > 10 && (
                    <li className="text-zinc-400">+{uniqueToB.length - 10} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No unique trackers</p>
              )}
            </div>
          </div>

          {/* SEO: Verdict-free Comparison Summary */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 mb-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Comparison Summary
            </h2>
            <p className="text-zinc-700 leading-relaxed">
              Both domains were scanned by Gecko Advisor.{' '}
              {displayA} ({domainA}) loads {a.trackerCount} {a.trackerCount === 1 ? 'tracker' : 'trackers'} and
              has a privacy score of {a.score}.{' '}
              {displayB} ({domainB}) loads {b.trackerCount} {b.trackerCount === 1 ? 'tracker' : 'trackers'} and
              has a privacy score of {b.score}.
            </p>
          </section>

          {/* SEO: Key Differences (structured numeric deltas) */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 mb-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Key Differences
            </h2>
            <div className="space-y-3 text-zinc-700 leading-relaxed">
              <p>
                {displayA} loads {a.trackerCount} {a.trackerCount === 1 ? 'tracker' : 'trackers'}.{' '}
                {displayB} loads {b.trackerCount} {b.trackerCount === 1 ? 'tracker' : 'trackers'}.{' '}
                Difference: {Math.abs(a.trackerCount - b.trackerCount)} {Math.abs(a.trackerCount - b.trackerCount) === 1 ? 'tracker' : 'trackers'}.
              </p>
              <p>
                {displayA} has a privacy score of {a.score}.{' '}
                {displayB} has a score of {b.score}.{' '}
                Difference: {Math.abs(a.score - b.score)} {Math.abs(a.score - b.score) === 1 ? 'point' : 'points'}.
              </p>
              <p>
                {displayA} sets {a.cookieCount} {a.cookieCount === 1 ? 'cookie' : 'cookies'}.{' '}
                {displayB} sets {b.cookieCount} {b.cookieCount === 1 ? 'cookie' : 'cookies'}.{' '}
                Difference: {Math.abs(a.cookieCount - b.cookieCount)} {Math.abs(a.cookieCount - b.cookieCount) === 1 ? 'cookie' : 'cookies'}.
              </p>
            </div>
          </section>

          {/* SEO: Related Comparisons */}
          {(relatedA.length > 0 || relatedB.length > 0) && (
            <section className="bg-white rounded-xl border border-zinc-200 p-6 mb-12">
              <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                Related Comparisons
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedA.length > 0 && (
                  <div>
                    <h3 className="font-medium text-zinc-800 mb-2">
                      More comparisons with {displayA}
                    </h3>
                    <ul className="space-y-1.5">
                      {relatedA.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="text-sm text-advisor-600 hover:text-advisor-800 hover:underline transition-colors"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {relatedB.length > 0 && (
                  <div>
                    <h3 className="font-medium text-zinc-800 mb-2">
                      More comparisons with {displayB}
                    </h3>
                    <ul className="space-y-1.5">
                      {relatedB.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="text-sm text-advisor-600 hover:text-advisor-800 hover:underline transition-colors"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SEO: Individual Report Links */}
          <section className="bg-white rounded-xl border border-zinc-200 p-6 mb-12">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4">
              Full Privacy Reports
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/privacy-report/${a.domain}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-zinc-800 hover:bg-zinc-50 transition-colors text-sm font-medium"
              >
                Full report: {displayA}
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href={`/privacy-report/${b.domain}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-zinc-800 hover:bg-zinc-50 transition-colors text-sm font-medium"
              >
                Full report: {displayB}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <div className="text-center bg-white rounded-xl border border-zinc-200 p-8">
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">
              Want to scan a different site?
            </h3>
            <p className="text-zinc-600 mb-6">
              Get a free privacy report for any website in seconds.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Scan Another Site
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
