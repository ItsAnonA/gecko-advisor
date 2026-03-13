/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Least Private Websites - Authority Anchor Page
 *
 * Warning/alert aesthetic. Highlights the worst privacy offenders
 * with the lowest privacy scores.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { fetchRankings, gradeBg, buildRankingsJsonLd, type CategoryBreakdown, type FreshnessStats } from '@/lib/rankings';

export const metadata: Metadata = {
  title: '100 Least Private Websites (2026) — Privacy Risk Rankings',
  description:
    'Which websites have the worst privacy practices? See the bottom 100 websites ranked by privacy score. Evidence-based analysis of tracking, cookies, and security headers.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/least-private-websites`,
  },
  openGraph: {
    title: '100 Least Private Websites (2026) — Privacy Risk Rankings',
    description:
      'Which websites have the worst privacy practices? Bottom 100 ranked by privacy score.',
    url: `${SEO_CONSTANTS.BASE_URL}/least-private-websites`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'article',
  },
};

export const revalidate = 3600;

export default async function LeastPrivateWebsitesPage() {
  const data = await fetchRankings('least-private');

  return (
    <>
      {data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildRankingsJsonLd(data, `${SEO_CONSTANTS.BASE_URL}/least-private-websites`)
            ),
          }}
        />
      )}

      <div className="min-h-screen">
        {/* Warning Hero */}
        <section className="bg-gradient-to-b from-red-950 via-red-900 to-red-950 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Privacy Rankings', href: '/privacy-index' },
                { label: 'Least Private Websites' },
              ]}
            />

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-sm font-medium mb-6 border border-amber-500/25">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Privacy Warning
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Least Private Websites
              </h1>
              <p className="text-xl text-red-200 max-w-2xl mb-10">
                The 100 domains with the lowest privacy scores. These websites demonstrate
                the poorest privacy practices across our monitored dataset.
              </p>

              {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <WarnStatBlock label="Domains Analyzed" value={data.totalDomains.toLocaleString()} />
                  <WarnStatBlock label="Avg Score" value={`${data.stats.averageScore}/100`} danger />
                  <WarnStatBlock label="Avg Trackers" value={data.stats.averageTrackers.toFixed(1)} />
                  <WarnStatBlock label="Avg Cookies" value={data.stats.averageCookies.toFixed(1)} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Rankings Table */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bottom 100 by Privacy Score
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            Lower scores indicate more privacy issues. Click any domain for a full report.
          </p>

          {data && data.rankings.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Domain</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right">Trackers</div>
                <div className="col-span-2 text-right">Grade</div>
              </div>

              {data.rankings.map((entry) => (
                <Link
                  key={entry.domain}
                  href={`/privacy-report/${entry.domain}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-0 hover:bg-red-50/50 transition-colors"
                >
                  <div className="col-span-1 text-sm text-gray-400 font-mono">
                    {entry.rank}
                  </div>
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <Image
                      src={`https://www.google.com/s2/favicons?domain=${entry.domain}&sz=32`}
                      alt=""
                      width={16}
                      height={16}
                      className="w-4 h-4 rounded flex-shrink-0"
                      unoptimized
                    />
                    <span className="font-medium text-gray-900 truncate text-sm">
                      {entry.domain}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-red-600">
                      {entry.score}/100
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-sm text-gray-600">
                    {entry.trackers}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${gradeBg(entry.grade)}`}>
                      {entry.grade}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <p className="text-gray-500">Rankings data is being calculated. Check back soon.</p>
            </div>
          )}
        </section>

        {/* Dataset Freshness Signal */}
        {data?.freshness && <FreshnessBar freshness={data.freshness} />}

        {/* Category Insights */}
        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <CategoryInsights categories={data.categoryBreakdown} />
        )}

        {/* Editorial Content */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <article className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What Makes a Website &ldquo;Least Private&rdquo;?
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              A low privacy score indicates multiple compounding issues: excessive third-party tracking,
              missing security headers, lack of HTTPS enforcement, browser fingerprinting, and
              irresponsible cookie practices. The websites on this list score poorly across most or all
              of these categories, making them the highest-risk domains in our dataset.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              The Compliance Risk of Low-Privacy Vendors
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              For compliance officers and vendor risk teams, a domain appearing on this list is a red
              flag. Under regulations like GDPR Article 28, data controllers must only engage processors
              that provide &ldquo;sufficient guarantees&rdquo; regarding data protection. A vendor whose own
              website fails basic privacy checks may lack the organizational maturity for adequate
              data processing safeguards.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              SOC 2 and ISO 27001 auditors increasingly examine vendor web properties as part of their
              assessment. A website with a failing privacy grade suggests gaps in the vendor&apos;s security
              posture that may extend beyond their public-facing properties into their infrastructure
              and data handling practices.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              How Privacy Scores Are Calculated
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Gecko Advisor calculates privacy scores on a 0-100 scale by analyzing five categories:
              tracking scripts (up to -50 points), security headers (up to -45 points), third-party
              connections (up to -15 points), cookie practices (up to -10 points), and compliance
              signals (up to -5 points). Each deduction is evidence-based, meaning every point lost
              corresponds to a specific, verifiable finding.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Interpreting These Rankings
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              These rankings reflect a point-in-time snapshot. Websites can improve their scores by
              removing unnecessary trackers, implementing security headers like Content Security Policy
              and HSTS, and adopting privacy-respecting analytics. We rescan domains regularly, and
              significant improvements are reflected in updated scores. Our change detection system
              tracks score movements so you can monitor whether a vendor is improving or declining.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Actionable Steps for Risk Teams
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              If a vendor in your supply chain appears on this list, consider requesting their data
              processing agreement, reviewing their subprocessor disclosures, and conducting a deeper
              technical assessment. Our Domain Intelligence API provides programmatic access to these
              scores for integration into your vendor risk management workflows, enabling automated
              monitoring of vendor privacy posture over time.
            </p>
          </article>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="Which websites have the worst privacy?"
              answer="The websites at the bottom of our privacy rankings fail across multiple categories: excessive tracking, missing security headers, no HTTPS enforcement, browser fingerprinting, and irresponsible cookie practices. They represent the highest privacy risk in our monitored dataset."
            />
            <FaqItem
              question="What does a failing privacy score mean?"
              answer="A score below 60 (grade D or F) indicates serious privacy deficiencies. These sites typically deploy 10+ third-party trackers, lack basic security headers like Content Security Policy, and may use browser fingerprinting to identify users without consent."
            />
            <FaqItem
              question="Should I avoid websites with low privacy scores?"
              answer="Low scores indicate higher data exposure risk. For personal browsing, consider using privacy tools like ad blockers. For business vendor assessments, a low privacy score should trigger deeper due diligence into the vendor's data processing practices and security posture."
            />
            <FaqItem
              question="Can websites improve their privacy score?"
              answer="Yes. Common improvements include removing unnecessary trackers, implementing Content Security Policy and HSTS headers, switching to privacy-respecting analytics, and reducing third-party cookie use. Our change detection system tracks score improvements over time."
            />
          </div>
        </section>

        {/* Cross-links */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">More Privacy Rankings</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <CrossLink
              href="/most-tracked-websites"
              title="Most Tracked Websites"
              description="Domains with the most trackers"
            />
            <CrossLink
              href="/websites-with-most-cookies"
              title="Most Cookies"
              description="Domains that set the most cookies"
            />
            <CrossLink
              href="/privacy-index"
              title="Privacy Index"
              description="Top-rated domains for privacy"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Is your vendor on this list?
            </h2>
            <p className="text-gray-600 mb-6">
              Scan any domain instantly. Free privacy analysis with no signup.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Scan a Website
              </Link>
              <Link
                href="/api-access"
                className="inline-block px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:border-red-300 transition-colors"
              >
                API Access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function WarnStatBlock({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`text-2xl font-bold ${danger ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-sm text-red-300/60 mt-1">{label}</div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border border-gray-200 rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between p-5 cursor-pointer bg-white hover:bg-gray-50 transition-colors">
        <h3 className="font-semibold text-gray-900 text-left pr-4">{question}</h3>
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 pb-5 text-gray-600 leading-relaxed">
        {answer}
      </div>
    </details>
  );
}

function FreshnessBar({ freshness }: { freshness: FreshnessStats }) {
  const updated = new Date(freshness.lastScanDate);
  const dateStr = updated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl border bg-red-50/30 border-red-200/50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span>Updated <strong className="text-gray-900">{dateStr}</strong> from automated privacy scans</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
          <span><strong className="text-gray-800">{freshness.totalDomainsInDb.toLocaleString()}</strong> domains</span>
          <span><strong className="text-gray-800">{freshness.totalTrackersDetected.toLocaleString()}</strong> trackers detected</span>
          <span><strong className="text-gray-800">{freshness.totalCookiesDetected.toLocaleString()}</strong> cookies analyzed</span>
        </div>
      </div>
    </section>
  );
}

function CategoryInsights({ categories }: { categories: CategoryBreakdown[] }) {
  const top = categories.slice(0, 8);
  const maxCount = Math.max(...top.map((c) => c.count));
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Worst Privacy by Category</h2>
      <p className="text-sm text-gray-500 mb-6">Which industries are most represented among the lowest-scoring domains.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {top.map((cat) => (
          <Link
            key={cat.slug}
            href={`/privacy-benchmarks/${cat.slug}`}
            className="block p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-soft transition-all bg-white"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900 text-sm">{cat.category}</span>
              <span className="text-xs text-gray-400">{cat.count} domains</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${(cat.count / maxCount) * 100}%` }} />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Avg score: <span className="font-medium text-red-600">{cat.avgScore}/100</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CrossLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-soft transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
