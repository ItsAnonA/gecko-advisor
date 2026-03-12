/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Answer Page Component (Phase C1)
 *
 * Renders curated answer pages with answer box, data table,
 * related answers, and CTA.
 */

import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';
import { AnswerBox } from './AnswerBox';

interface AnswerContent {
  headline: string;
  paragraphs: string[];
  dataPoints: Array<{ label: string; value: string }>;
  faqItems: Array<{ q: string; a: string }>;
}

interface DomainEntry {
  domain: string;
  displayName: string;
  score: number;
  label: string;
  trackerCount?: number;
  cookieCount?: number;
}

interface TrackerEntry {
  name: string;
  slug: string;
}

interface RelatedAnswer {
  slug: string;
  title: string;
}

export interface AnswerPageData {
  slug: string;
  title: string;
  queryType: string;
  content: AnswerContent;
  relatedAnswers: RelatedAnswer[];
  // Domain-tracking specific
  domain?: string;
  score?: number;
  label?: string;
  trackers?: TrackerEntry[];
  // Category-ranking specific
  category?: string;
  categoryDisplayName?: string;
  domains?: DomainEntry[];
  avgScore?: number;
  // Tracker-usage specific
  trackerName?: string;
  trackerSlug?: string;
  domainCount?: number;
  datasetPercentage?: number;
}

function getGradeColor(label: string): string {
  if (label === 'A') return 'text-emerald-600';
  if (label === 'B') return 'text-emerald-500';
  if (label === 'C') return 'text-amber-600';
  if (label === 'D') return 'text-orange-600';
  return 'text-red-600';
}

export function AnswerPage({ data }: { data: AnswerPageData }) {
  const { content } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Research', href: '/privacy-index' },
          { label: data.title },
        ]}
      />

      {/* H1 */}
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-6">
        {data.title}
      </h1>

      {/* Answer Box (featured snippet target) */}
      <AnswerBox headline={content.headline} dataPoints={content.dataPoints} />

      {/* Content paragraphs */}
      <div className="prose prose-zinc max-w-3xl mb-8">
        {content.paragraphs.map((p, i) => (
          <p key={i} className="text-zinc-700 leading-relaxed mb-3">{p}</p>
        ))}
      </div>

      {/* Data Table */}
      {data.domains && data.domains.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            {data.queryType === 'tracker-usage'
              ? `Domains Using ${data.trackerName}`
              : 'Domain Rankings'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <th className="py-2 pr-4 font-medium text-zinc-500">#</th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">Domain</th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">Score</th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">Grade</th>
                  {data.queryType !== 'tracker-usage' && (
                    <th className="py-2 font-medium text-zinc-500">Trackers</th>
                  )}
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
                    {data.queryType !== 'tracker-usage' && (
                      <td className="py-2 tabular-nums">{d.trackerCount ?? '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tracker links (domain-tracking) */}
      {data.trackers && data.trackers.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Trackers Detected on {data.domain}
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.trackers.map((t) => (
              <Link
                key={t.slug}
                href={`/trackers/${t.slug}`}
                className="inline-flex items-center px-3 py-1.5 bg-zinc-100 hover:bg-advisor-50 border border-zinc-200 hover:border-advisor-300 rounded-full text-sm transition-colors"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tracker cross-link (tracker-usage) */}
      {data.trackerSlug && (
        <section className="mb-8">
          <Link
            href={`/trackers/${data.trackerSlug}`}
            className="text-advisor-600 hover:underline text-sm"
          >
            View full {data.trackerName} tracker page &rarr;
          </Link>
        </section>
      )}

      {/* Category cross-link */}
      {data.category && (
        <section className="mb-8">
          <Link
            href={`/privacy-benchmarks/${data.category}`}
            className="text-advisor-600 hover:underline text-sm"
          >
            View {data.categoryDisplayName} privacy benchmarks &rarr;
          </Link>
        </section>
      )}

      {/* FAQ Section */}
      {content.faqItems.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {content.faqItems.map((faq, i) => (
              <div key={i} className="border border-zinc-200 rounded-lg p-4">
                <h3 className="font-semibold text-zinc-900 mb-2">{faq.q}</h3>
                <p className="text-zinc-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Answers */}
      {data.relatedAnswers.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Related Questions
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.relatedAnswers.map((ra) => (
              <Link
                key={ra.slug}
                href={`/answers/${ra.slug}`}
                className="flex items-center p-3 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors"
              >
                <span className="text-advisor-600 font-medium">{ra.title}</span>
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
          Enter a domain to see its full privacy analysis, including trackers, cookies, and more.
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
