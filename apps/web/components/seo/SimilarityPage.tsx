/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Similarity Page Component (Phase C3)
 *
 * Shows domains similar to a given domain with privacy comparison.
 */

import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';

interface SharedTracker {
  name: string;
  slug: string;
}

interface SimilarDomain {
  domain: string;
  displayName: string;
  score: number;
  label: string;
  category: string | null;
  categorySlug: string | null;
  similarityScore: number;
  sharedTrackers: SharedTracker[];
  scanCount: number;
}

interface SourceDomain {
  domain: string;
  displayName: string;
  score: number;
  label: string;
  category: string | null;
  categorySlug: string | null;
  trackerCount: number;
}

export interface SimilarityData {
  source: SourceDomain;
  similar: SimilarDomain[];
  totalCandidates: number;
}

function getGradeColor(label: string): string {
  if (label === 'A') return 'text-emerald-600';
  if (label === 'B') return 'text-emerald-500';
  if (label === 'C') return 'text-amber-600';
  if (label === 'D') return 'text-orange-600';
  return 'text-red-600';
}

export function SimilarityPage({ data }: { data: SimilarityData }) {
  const { source, similar } = data;

  // Collect unique shared trackers across all similar domains
  const allSharedTrackers = new Map<string, SharedTracker>();
  for (const d of similar) {
    for (const t of d.sharedTrackers) {
      allSharedTrackers.set(t.slug, t);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Research', href: '/privacy-index' },
          { label: `Sites Like ${source.displayName}` },
        ]}
      />

      {/* H1 */}
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
        Sites Like {source.displayName}: Privacy Comparison
      </h1>

      <p className="text-lg text-zinc-600 mb-8 max-w-3xl leading-relaxed">
        {similar.length} domains similar to {source.displayName} based on category,
        privacy score proximity, and shared trackers. Compare privacy practices
        across alternatives.
      </p>

      {/* Source Domain Card */}
      <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href={`/privacy-report/${source.domain}`}
              className="text-xl font-bold text-advisor-600 hover:underline"
            >
              {source.displayName}
            </Link>
            {source.category && (
              <span className="ml-2 text-sm text-zinc-500">
                <Link href={`/privacy-benchmarks/${source.categorySlug}`} className="hover:text-advisor-600">
                  {source.category}
                </Link>
              </span>
            )}
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-zinc-500">Score </span>
              <span className="font-bold tabular-nums">{source.score}</span>
            </div>
            <div>
              <span className="text-zinc-500">Grade </span>
              <span className={`font-bold ${getGradeColor(source.label)}`}>{source.label}</span>
            </div>
            <div>
              <span className="text-zinc-500">Trackers </span>
              <span className="font-bold tabular-nums">{source.trackerCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Similarity Table */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">
          Similar Domains
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="py-2 pr-4 font-medium text-zinc-500">#</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Domain</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Score</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Grade</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Similarity</th>
                <th className="py-2 pr-4 font-medium text-zinc-500">Category</th>
                <th className="py-2 font-medium text-zinc-500">Compare</th>
              </tr>
            </thead>
            <tbody>
              {similar.map((d, i) => (
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
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-advisor-500 rounded-full"
                          style={{ width: `${d.similarityScore}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 tabular-nums text-xs">{d.similarityScore}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {d.categorySlug ? (
                      <Link href={`/privacy-benchmarks/${d.categorySlug}`} className="hover:text-advisor-600">
                        {d.category}
                      </Link>
                    ) : (
                      d.category || '—'
                    )}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/compare/${source.domain}/${d.domain}`}
                      className="text-xs text-advisor-600 hover:underline"
                    >
                      Compare
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shared Trackers */}
      {allSharedTrackers.size > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Common Trackers Across Similar Sites
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...allSharedTrackers.values()].slice(0, 20).map((t) => (
              <Link
                key={t.slug}
                href={`/technologies/${t.slug}`}
                className="inline-flex items-center px-3 py-1.5 bg-zinc-100 hover:bg-advisor-50 border border-zinc-200 hover:border-advisor-300 rounded-full text-sm transition-colors"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="p-6 bg-advisor-50 border border-advisor-200 rounded-xl text-center">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">
          Check Any Domain&apos;s Privacy
        </h2>
        <p className="text-zinc-600 mb-4">
          Enter a domain to see its full privacy analysis and find similar sites.
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
