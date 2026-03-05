/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Tracker Detail Page Component (Phase C2)
 *
 * Displays tracker adoption data, domain table, category breakdown,
 * related trackers, and CTA. Used by /trackers/[slug] route.
 */

import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';

interface TrackerDomain {
  domain: string;
  displayName: string;
  score: number;
  label: string;
  trackerCount: number;
  category: string | null;
  categorySlug: string | null;
  scanCount: number;
}

interface CategoryBreakdown {
  categoryName: string;
  categorySlug: string;
  domainCount: number;
}

interface RelatedTracker {
  slug: string;
  name: string;
  overlap: number;
}

export interface TrackerDetailData {
  slug: string;
  name: string;
  domainCount: number;
  datasetPercentage: number;
  topCategory: { name: string; count: number } | null;
  domains: TrackerDomain[];
  categoryBreakdown: CategoryBreakdown[];
  relatedTrackers: RelatedTracker[];
}

function getGradeColor(label: string): string {
  if (label === 'A') return 'text-emerald-600';
  if (label === 'B') return 'text-emerald-500';
  if (label === 'C') return 'text-amber-600';
  if (label === 'D') return 'text-orange-600';
  return 'text-red-600';
}

export function TrackerPage({ data }: { data: TrackerDetailData }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Research', href: '/privacy-index' },
          { label: 'Trackers', href: '/trackers' },
          { label: data.name },
        ]}
      />

      {/* H1 */}
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
        {data.name}: Website Adoption &amp; Privacy Impact
      </h1>

      <p className="text-lg text-zinc-600 mb-8 max-w-3xl leading-relaxed">
        Based on our dataset, <strong>{data.domainCount.toLocaleString()}</strong> websites
        ({data.datasetPercentage}% of scanned domains) use {data.name}.
        {data.topCategory && (
          <> The most common industry is <strong>{data.topCategory.name}</strong> ({data.topCategory.count} domains).</>
        )}
      </p>

      {/* Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10 p-5 bg-zinc-50 border border-zinc-200 rounded-xl">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Domains Using</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">
            {data.domainCount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">% of Dataset</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">
            {data.datasetPercentage}%
          </p>
        </div>
        {data.topCategory && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Top Category</p>
            <p className="text-2xl font-bold text-zinc-900">{data.topCategory.name}</p>
          </div>
        )}
      </div>

      {/* Domain Table */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">
          Top Domains Using {data.name}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="py-2 pr-4 font-medium text-zinc-500">#</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Domain</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Score</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Grade</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Trackers</th>
                <th className="py-2 font-medium text-zinc-500">Category</th>
              </tr>
            </thead>
            <tbody>
              {data.domains.map((d, i) => (
                <tr key={d.domain} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="py-2 pr-4 text-zinc-400 tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/privacy-report/${d.domain}`}
                      className="text-advisor-600 hover:underline font-medium"
                    >
                      {d.displayName}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{d.score}</td>
                  <td className={`py-2 pr-4 font-semibold ${getGradeColor(d.label)}`}>
                    {d.label}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{d.trackerCount}</td>
                  <td className="py-2 text-zinc-600">
                    {d.categorySlug ? (
                      <Link
                        href={`/privacy-benchmarks/${d.categorySlug}`}
                        className="hover:text-advisor-600"
                      >
                        {d.category}
                      </Link>
                    ) : (
                      d.category || '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Industry Breakdown
          </h2>
          <p className="text-zinc-600 mb-4">
            Which industries use {data.name} most frequently:
          </p>
          <div className="space-y-2">
            {data.categoryBreakdown.map((cat) => {
              const pct = data.domainCount > 0
                ? Math.round((cat.domainCount / data.domainCount) * 100)
                : 0;
              return (
                <div key={cat.categorySlug} className="flex items-center gap-3">
                  <Link
                    href={`/privacy-benchmarks/${cat.categorySlug}`}
                    className="w-40 text-sm text-advisor-600 hover:underline shrink-0"
                  >
                    {cat.categoryName}
                  </Link>
                  <div className="flex-1 h-6 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-advisor-500 rounded-full"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-500 tabular-nums w-20 text-right">
                    {cat.domainCount} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Related Trackers */}
      {data.relatedTrackers.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Commonly Found Together With {data.name}
          </h2>
          <p className="text-zinc-600 mb-4">
            These trackers are most frequently detected alongside {data.name}:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.relatedTrackers.map((rt) => (
              <Link
                key={rt.slug}
                href={`/trackers/${rt.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-advisor-50 border border-zinc-200 hover:border-advisor-300 rounded-full text-sm transition-colors"
              >
                <span>{rt.name}</span>
                <span className="text-zinc-400 text-xs tabular-nums">({rt.overlap})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="p-6 bg-advisor-50 border border-advisor-200 rounded-xl text-center">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          Check if your vendors use {data.name}
        </h2>
        <p className="text-zinc-600 mb-4">
          Enter a domain to see its full privacy analysis, including all detected trackers.
        </p>
        <Link
          href="/check-domain-risk"
          className="inline-block px-6 py-2.5 bg-advisor-600 text-white rounded-lg hover:bg-advisor-700 transition-colors font-medium"
        >
          Check Domain Risk
        </Link>
      </section>
    </div>
  );
}
