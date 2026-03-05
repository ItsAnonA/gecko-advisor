/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Shared Authority Page Component (Phase B SEO)
 *
 * Renders ranked domain tables with stats, category breakdowns,
 * and internal links. Used by all 5 authority page routes.
 */

import Link from 'next/link';
import type { RankedDomain, RankingsResponse } from '@/lib/api';

interface AuthorityPageProps {
  title: string;
  intro: string;
  metricLabel: string;
  metricKey: 'trackerCount' | 'cookieCount' | 'score';
  data: RankingsResponse;
  relatedPages: Array<{ label: string; href: string }>;
}

function getGradeColor(label: string): string {
  if (label === 'A') return 'text-emerald-600';
  if (label === 'B') return 'text-emerald-500';
  if (label === 'C') return 'text-amber-600';
  if (label === 'D') return 'text-orange-600';
  return 'text-red-600';
}

export function AuthorityPage({
  title,
  intro,
  metricLabel,
  metricKey,
  data,
  relatedPages,
}: AuthorityPageProps) {
  const { domains, stats, categoryBreakdown, generatedAt } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li>
            <Link href="/" className="hover:text-advisor-600">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/privacy-index" className="hover:text-advisor-600">Research</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">{title}</li>
        </ol>
      </nav>

      {/* H1 */}
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">{title}</h1>

      {/* Intro */}
      <p className="text-lg text-zinc-600 mb-8 max-w-3xl leading-relaxed">{intro}</p>

      {/* Stats Box */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 p-5 bg-zinc-50 border border-zinc-200 rounded-xl">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Domains Analyzed</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">{stats.totalDomains.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Avg Score</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">{stats.avgScore.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Median Score</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">{stats.medianScore}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Avg Trackers</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">{stats.avgTrackerCount.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Last Updated</p>
          <p className="text-sm font-medium text-zinc-900">
            {new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Ranked Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Domain</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">{metricLabel}</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Score</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700 hidden lg:table-cell">Last Scanned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {domains.map((d: RankedDomain) => (
                <tr key={d.domain} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-500 tabular-nums">{d.rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/privacy-report/${d.domain}`}
                      className="text-advisor-600 hover:text-advisor-700 font-medium"
                    >
                      {d.displayName || d.domain}
                    </Link>
                    <span className="text-zinc-400 text-xs ml-1 hidden sm:inline">{d.domain}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900">
                    {d[metricKey]}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold tabular-nums ${getGradeColor(d.label)}`}>
                      {d.score}
                    </span>
                    <span className="text-zinc-400 text-xs ml-1">{d.label}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {d.categorySlug ? (
                      <Link
                        href={`/privacy-benchmarks/${d.categorySlug}`}
                        className="text-xs text-zinc-500 hover:text-advisor-600"
                      >
                        {d.category}
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500 hidden lg:table-cell tabular-nums">
                    {d.lastScanned
                      ? new Date(d.lastScanned).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            {metricLabel} by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryBreakdown.map((cat) => (
              <Link
                key={cat.slug}
                href={`/privacy-benchmarks/${cat.slug}`}
                className="p-4 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors"
              >
                <p className="font-medium text-zinc-900 text-sm">{cat.category}</p>
                <p className="text-2xl font-bold text-advisor-600 tabular-nums mt-1">
                  {cat.avgValue.toFixed(1)}
                </p>
                <p className="text-xs text-zinc-500">{cat.domainCount} domains</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Methodology */}
      <section className="mb-10 p-5 bg-zinc-50 border border-zinc-200 rounded-xl">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">Methodology</h2>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Rankings are based on automated privacy scans of {stats.totalDomains.toLocaleString()} domains.
          Each domain is scanned for third-party trackers, cookies, fingerprinting scripts, and security headers.
          Only domains with 2 or more scans are included. Data is refreshed daily.
        </p>
        <Link href="/methodology" className="text-sm text-advisor-600 hover:text-advisor-700 mt-2 inline-block">
          Read full methodology →
        </Link>
      </section>

      {/* Internal Links */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Related Rankings</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {relatedPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600"
            >
              {page.label}
            </Link>
          ))}
          <Link
            href="/privacy-index"
            className="p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-600"
          >
            Privacy Index Dashboard
          </Link>
          <Link
            href="/check-domain-risk"
            className="p-3 bg-advisor-50 border border-advisor-200 rounded-lg hover:border-advisor-300 transition-colors text-sm font-medium text-advisor-700"
          >
            Check Any Domain →
          </Link>
        </div>
      </section>
    </div>
  );
}
