/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Domain Comparison Page (SSR)
 *
 * Compares two domains' privacy practices side by side.
 * Uses ISR with 1-hour revalidation.
 */

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { normalizeHostname as normalizeDomain, SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchComparison, type DomainComparison } from '@/lib/api';

interface Props {
  params: Promise<{ domainA: string; domainB: string }>;
}

// Revalidate every hour
export const revalidate = 3600;

/**
 * High-demand comparison pairs pre-generated for crawl discovery.
 * These target real search queries like "google vs bing privacy".
 */
const TOP_COMPARISON_PAIRS = [
  ['google.com', 'duckduckgo.com'],
  ['google.com', 'bing.com'],
  ['facebook.com', 'reddit.com'],
  ['amazon.com', 'walmart.com'],
  ['youtube.com', 'vimeo.com'],
  ['twitter.com', 'reddit.com'],
  ['netflix.com', 'disneyplus.com'],
  ['zoom.us', 'meet.google.com'],
  ['gmail.com', 'proton.me'],
  ['github.com', 'gitlab.com'],
];

export async function generateStaticParams() {
  return TOP_COMPARISON_PAIRS.map(([a, b]) => ({
    domainA: a,
    domainB: b,
  }));
}

// Server-side fetch for comparison
async function getComparison(domainA: string, domainB: string): Promise<DomainComparison | null> {
  try {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const response = await fetch(
      `${apiUrl}/api/v2/compare/${encodeURIComponent(domainA)}/${encodeURIComponent(domainB)}`,
      { next: { revalidate: 3600 } }
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

  const title = `${domainA} vs ${domainB} Privacy Comparison`;
  const description = `Compare privacy practices between ${domainA} (score: ${comparison.domainA.score}) and ${domainB} (score: ${comparison.domainB.score}). ${comparison.summary}`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
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

export default async function ComparePage({ params }: Props) {
  const { domainA: encodedA, domainB: encodedB } = await params;
  const domainA = normalizeDomain(decodeURIComponent(encodedA)) || decodeURIComponent(encodedA);
  const domainB = normalizeDomain(decodeURIComponent(encodedB)) || decodeURIComponent(encodedB);

  const comparison = await getComparison(domainA, domainB);

  if (!comparison) {
    notFound();
  }

  const { domainA: a, domainB: b, differences, winner, summary, commonTrackers, uniqueToA, uniqueToB } = comparison;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-900">Home</Link>
          <span className="mx-2">/</span>
          <span>Compare</span>
          <span className="mx-2">/</span>
          <span className="text-zinc-900">{domainA} vs {domainB}</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
            Privacy Comparison
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
            <h2 className="text-lg font-semibold text-zinc-900">Key Differences</h2>
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

        {/* Editorial Analysis */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 md:p-8 mb-12">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">
            {domainA} vs {domainB}: Privacy Analysis
          </h2>
          <div className="prose prose-zinc prose-sm max-w-none">
            <p>
              {winner === 'A'
                ? `${domainA} scores higher with a privacy score of ${a.score}/100 compared to ${domainB}'s ${b.score}/100.`
                : winner === 'B'
                ? `${domainB} scores higher with a privacy score of ${b.score}/100 compared to ${domainA}'s ${a.score}/100.`
                : `Both domains have comparable privacy scores: ${domainA} at ${a.score}/100 and ${domainB} at ${b.score}/100.`
              }
              {' '}The score difference of {Math.abs(a.score - b.score)} points reflects measurable differences in tracker deployment, cookie practices, and security configuration.
            </p>

            <h3>Tracker Comparison</h3>
            <p>
              {domainA} deploys {a.trackerCount} {a.trackerCount === 1 ? 'tracker' : 'trackers'} while {domainB} deploys {b.trackerCount}.
              {commonTrackers.length > 0
                ? ` They share ${commonTrackers.length} common ${commonTrackers.length === 1 ? 'tracker' : 'trackers'}, suggesting similar advertising or analytics infrastructure.`
                : ' They share no common trackers, indicating different technology choices.'
              }
              {uniqueToA.length > 0 && ` ${domainA} uses ${uniqueToA.length} ${uniqueToA.length === 1 ? 'tracker' : 'trackers'} not found on ${domainB}.`}
              {uniqueToB.length > 0 && ` ${domainB} uses ${uniqueToB.length} ${uniqueToB.length === 1 ? 'tracker' : 'trackers'} not found on ${domainA}.`}
            </p>

            <h3>Cookie and Third-Party Behavior</h3>
            <p>
              {domainA} sets {a.cookieCount} {a.cookieCount === 1 ? 'cookie' : 'cookies'} and connects to {a.thirdPartyCount} third {a.thirdPartyCount === 1 ? 'party' : 'parties'}, while {domainB} sets {b.cookieCount} {b.cookieCount === 1 ? 'cookie' : 'cookies'} and connects to {b.thirdPartyCount} third {b.thirdPartyCount === 1 ? 'party' : 'parties'}.
              {(a.hasFingerprinting || b.hasFingerprinting) && (
                a.hasFingerprinting && b.hasFingerprinting
                  ? ' Both domains use browser fingerprinting techniques, which can track visitors without cookies.'
                  : a.hasFingerprinting
                  ? ` ${domainA} uses browser fingerprinting, while ${domainB} does not — a significant privacy difference.`
                  : ` ${domainB} uses browser fingerprinting, while ${domainA} does not — a significant privacy difference.`
              )}
            </p>

            <h3>Which Is More Private?</h3>
            <p>
              {winner === 'A'
                ? `Based on our analysis, ${domainA} demonstrates better privacy practices than ${domainB}. It uses fewer tracking technologies and provides a more privacy-respecting experience for visitors.`
                : winner === 'B'
                ? `Based on our analysis, ${domainB} demonstrates better privacy practices than ${domainA}. It uses fewer tracking technologies and provides a more privacy-respecting experience for visitors.`
                : `Both domains show comparable privacy practices. Neither has a clear advantage in our assessment, though individual metrics may differ.`
              }
              {' '}View the full reports for detailed evidence and recommendations.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 md:p-8 mb-12">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2">
                <span className="font-medium text-zinc-900">Is {winner === 'A' ? domainA : winner === 'B' ? domainB : domainA} more private than {winner === 'A' ? domainB : winner === 'B' ? domainA : domainB}?</span>
                <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <p className="text-sm text-zinc-600 pb-2">
                {winner === 'tie'
                  ? `Both domains have comparable privacy scores. ${domainA} scores ${a.score}/100 and ${domainB} scores ${b.score}/100.`
                  : `${winner === 'A' ? domainA : domainB} has a better privacy score (${winner === 'A' ? a.score : b.score}/100 vs ${winner === 'A' ? b.score : a.score}/100), deploying fewer trackers and demonstrating better privacy practices.`
                }
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2">
                <span className="font-medium text-zinc-900">How many trackers does {domainA} use compared to {domainB}?</span>
                <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <p className="text-sm text-zinc-600 pb-2">
                {domainA} uses {a.trackerCount} {a.trackerCount === 1 ? 'tracker' : 'trackers'} and {domainB} uses {b.trackerCount}. They share {commonTrackers.length} common {commonTrackers.length === 1 ? 'tracker' : 'trackers'}.
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-2">
                <span className="font-medium text-zinc-900">Does {domainA} or {domainB} use fingerprinting?</span>
                <svg className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <p className="text-sm text-zinc-600 pb-2">
                {a.hasFingerprinting && b.hasFingerprinting
                  ? `Both ${domainA} and ${domainB} use browser fingerprinting techniques to track visitors.`
                  : a.hasFingerprinting
                  ? `${domainA} uses fingerprinting while ${domainB} does not.`
                  : b.hasFingerprinting
                  ? `${domainB} uses fingerprinting while ${domainA} does not.`
                  : `Neither ${domainA} nor ${domainB} was detected using browser fingerprinting.`
                }
              </p>
            </details>
          </div>
        </div>

        {/* Cross-links */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Link
            href={`/privacy-report/${a.domain}`}
            className="block p-5 bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-zinc-900 mb-1">Full {domainA} Report</h3>
            <p className="text-sm text-zinc-500">Detailed privacy analysis with evidence and recommendations.</p>
          </Link>
          <Link
            href={`/privacy-report/${b.domain}`}
            className="block p-5 bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <h3 className="font-semibold text-zinc-900 mb-1">Full {domainB} Report</h3>
            <p className="text-sm text-zinc-500">Detailed privacy analysis with evidence and recommendations.</p>
          </Link>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-xl border border-zinc-200 p-8">
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">
            Compare any two domains
          </h3>
          <p className="text-zinc-600 mb-6">
            Get a free privacy comparison for any websites in seconds.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Scan a Website
            </Link>
            <Link
              href="/api-access"
              className="inline-flex items-center px-6 py-3 border border-zinc-200 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              API Access
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
