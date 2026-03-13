/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Websites with Most Cookies - Authority Anchor Page
 *
 * Warm amber tones. Shows which websites set the most cookies.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { fetchRankings, gradeBg, buildRankingsJsonLd, type CategoryBreakdown, type FreshnessStats } from '@/lib/rankings';

export const metadata: Metadata = {
  title: '100 Websites with the Most Cookies (2026) — Cookie Rankings',
  description:
    'Which websites set the most cookies? See the top 100 websites ranked by cookie count. First-party and third-party cookie analysis from automated privacy scans.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/websites-with-most-cookies`,
  },
  openGraph: {
    title: '100 Websites with the Most Cookies (2026) — Cookie Rankings',
    description:
      'Which websites set the most cookies? Top 100 ranked by cookie count.',
    url: `${SEO_CONSTANTS.BASE_URL}/websites-with-most-cookies`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'article',
  },
};

export const revalidate = 3600;

export default async function MostCookiesPage() {
  const data = await fetchRankings('most-cookies');

  return (
    <>
      {data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildRankingsJsonLd(data, `${SEO_CONSTANTS.BASE_URL}/websites-with-most-cookies`)
            ),
          }}
        />
      )}

      <div className="min-h-screen">
        {/* Warm Hero */}
        <section className="bg-gradient-to-b from-amber-950 via-amber-900 to-amber-950 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Privacy Rankings', href: '/privacy-index' },
                { label: 'Most Cookies' },
              ]}
            />

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-sm font-medium mb-6 border border-amber-500/25">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                </svg>
                Cookie Analysis
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Websites with the Most Cookies
              </h1>
              <p className="text-xl text-amber-200 max-w-2xl mb-10">
                The 100 domains setting the highest number of cookies during a single page load.
                Includes both first-party and third-party cookies.
              </p>

              {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CookieStatBlock label="Domains Analyzed" value={data.totalDomains.toLocaleString()} />
                  <CookieStatBlock label="Avg Cookies" value={data.stats.averageCookies.toFixed(1)} accent />
                  <CookieStatBlock label="Avg Score" value={`${data.stats.averageScore}/100`} />
                  <CookieStatBlock label="Avg Trackers" value={data.stats.averageTrackers.toFixed(1)} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Rankings Table */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Top 100 by Cookie Count
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            Cookies detected on initial page load. Click any domain for a full report.
          </p>

          {data && data.rankings.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Domain</div>
                <div className="col-span-2 text-right">Cookies</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right">Grade</div>
              </div>

              {data.rankings.map((entry) => (
                <Link
                  key={entry.domain}
                  href={`/privacy-report/${entry.domain}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-0 hover:bg-amber-50/50 transition-colors"
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
                    <span className="text-sm font-semibold text-amber-700">
                      {entry.cookies}
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-sm text-gray-600">
                    {entry.score}/100
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
              Understanding Cookie Usage: What These Numbers Mean
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              Cookies are small data files stored in your browser when you visit a website. While some
              cookies are essential for website functionality (session management, preferences), many
              serve advertising and tracking purposes. The websites on this list set an unusually high
              number of cookies on the first page load, before any user interaction or consent.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              First-Party vs Third-Party Cookies
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              First-party cookies are set by the domain you&apos;re visiting and typically handle session
              state and preferences. Third-party cookies are set by external domains (advertisers,
              analytics providers, social networks) and enable cross-site tracking. The most concerning
              entries on this list tend to have a high ratio of third-party to first-party cookies,
              indicating extensive data sharing with external entities.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              GDPR and Cookie Consent
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Under the ePrivacy Directive and GDPR, non-essential cookies require informed user consent
              before being set. Websites that set dozens of cookies before showing a consent banner are
              likely non-compliant. For vendor risk teams, this is a measurable indicator of a
              vendor&apos;s regulatory compliance posture. Our scanner detects cookies set during the
              initial page load, which represents the pre-consent state most users experience.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Cookie Lifetime and Persistence
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Beyond count, cookie lifetime matters. Some tracking cookies persist for years, maintaining
              a persistent identifier across browsing sessions. Session cookies expire when the browser
              closes and are generally less concerning. Our detailed domain reports break down cookie
              purposes and lifetimes, giving compliance teams the full picture of a vendor&apos;s
              cookie practices.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Using Cookie Data for Vendor Assessment
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              A high cookie count on a vendor&apos;s website suggests they either monetize user data through
              advertising or lack the engineering discipline to manage their cookie footprint. Both
              scenarios are relevant for vendor due diligence. Our Domain Intelligence API provides
              cookie analysis data programmatically, enabling integration into your vendor risk scoring
              models and automated compliance monitoring workflows.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              How We Count Cookies
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Gecko Advisor counts cookies by loading each website in a clean headless browser session
              with no prior browsing history or cookies. We record all cookies set during the initial
              page load and categorize them by domain (first-party vs third-party), purpose (essential,
              analytics, advertising), and lifetime (session vs persistent). This methodology captures
              the default cookie behavior a new visitor would experience.
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
              question="Which websites set the most cookies?"
              answer="The websites at the top of this list set the highest number of cookies during a single page load. Heavy cookie use is common among ad-supported media sites, large e-commerce platforms, and social networks that share data with extensive advertising partner networks."
            />
            <FaqItem
              question="How many cookies does the average website set?"
              answer={data ? `Among the top 100 in our dataset, the average is ${data.stats.averageCookies.toFixed(1)} cookies. The broader web average is typically 10-30 cookies per site, though many privacy-focused sites set fewer than 5.` : 'The average website sets 10-30 cookies. Privacy-focused sites often set fewer than 5, while ad-supported sites can set 50 or more.'}
            />
            <FaqItem
              question="Are all cookies bad for privacy?"
              answer="No. Essential cookies (session management, security tokens, user preferences) are necessary for website functionality. The concern is with third-party tracking cookies that enable cross-site profiling, and persistent cookies with multi-year lifetimes that maintain long-term user identification."
            />
            <FaqItem
              question="Do websites need consent to set cookies?"
              answer="Under the ePrivacy Directive and GDPR, non-essential cookies require informed user consent before being set. Websites that set tracking cookies before showing a consent banner are likely non-compliant. Our scanner detects cookies set during initial page load, before any user interaction."
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
              href="/least-private-websites"
              title="Least Private Websites"
              description="Domains with the lowest scores"
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
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              How many cookies does your vendor set?
            </h2>
            <p className="text-gray-600 mb-6">
              Instant cookie analysis. Free, no signup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Scan a Website
              </Link>
              <Link
                href="/domain-intelligence-api"
                className="inline-block px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:border-amber-300 transition-colors"
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

function CookieStatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent ? 'text-amber-300' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-sm text-amber-300/50 mt-1">{label}</div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl border bg-amber-50/30 border-amber-200/50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
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
      <h2 className="text-xl font-bold text-gray-900 mb-2">Most Cookies by Category</h2>
      <p className="text-sm text-gray-500 mb-6">Which industries set the most cookies on visitors.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {top.map((cat) => (
          <Link
            key={cat.slug}
            href={`/privacy-benchmarks/${cat.slug}`}
            className="block p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-soft transition-all bg-white"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900 text-sm">{cat.category}</span>
              <span className="text-xs text-gray-400">{cat.count} domains</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${(cat.count / maxCount) * 100}%` }} />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Avg score: <span className="font-medium text-gray-700">{cat.avgScore}/100</span>
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
