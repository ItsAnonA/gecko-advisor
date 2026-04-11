/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Privacy Index - Authority Anchor Page
 *
 * Clean, positive "honor roll" aesthetic. Showcases the top-rated
 * domains for privacy — the best practices leaders.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { FeaturedDomainsSection } from '@/components/seo/FeaturedDomainsSection';
import { fetchRankings, gradeBg, buildRankingsJsonLd, type CategoryBreakdown, type FreshnessStats } from '@/lib/rankings';
import { selectFeaturedDomains } from '@/lib/featuredDomains';

export const metadata: Metadata = {
  title: '100 Most Private Websites (2026) — Privacy Index Rankings',
  description:
    'The top 100 websites with the best privacy practices. Ranked by privacy score based on tracker count, security headers, cookie policy, and fingerprinting detection.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-index`,
  },
  openGraph: {
    title: '100 Most Private Websites (2026) — Privacy Index Rankings',
    description:
      'The top 100 websites with the best privacy practices, ranked by privacy score.',
    url: `${SEO_CONSTANTS.BASE_URL}/privacy-index`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'article',
  },
};

export const revalidate = 3600;

export default async function PrivacyIndexPage() {
  const data = await fetchRankings('privacy-index');
  // Curated featured-tier carved from the top-100 — extremes + brands + clean.
  // Selection bias is intentional: we want Google to see hierarchy, not equality.
  const featured = data ? selectFeaturedDomains(data, 'privacy-index') : [];

  return (
    <>
      {data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildRankingsJsonLd(data, `${SEO_CONSTANTS.BASE_URL}/privacy-index`)
            ),
          }}
        />
      )}

      <div className="min-h-screen">
        {/* Clean Hero */}
        <section className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Privacy Index' },
              ]}
            />

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-300 text-sm font-medium mb-6 border border-emerald-400/25">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Honor Roll
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Privacy Index
              </h1>
              <p className="text-xl text-emerald-200 max-w-2xl mb-10">
                The 100 domains demonstrating the strongest privacy practices. These websites
                lead by example with minimal tracking, strong security, and transparent data handling.
              </p>

              {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <IndexStatBlock label="Domains Analyzed" value={data.totalDomains.toLocaleString()} />
                  <IndexStatBlock label="Avg Score" value={`${data.stats.averageScore}/100`} accent />
                  <IndexStatBlock label="Avg Trackers" value={data.stats.averageTrackers.toFixed(1)} />
                  <IndexStatBlock label="Avg Cookies" value={data.stats.averageCookies.toFixed(1)} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Featured Domains — curated authority concentration above the flat table.
            See lib/featuredDomains.ts for selection logic. */}
        <div className="max-w-5xl mx-auto px-4">
          <FeaturedDomainsSection featured={featured} hubType="privacy-index" />
        </div>

        {/* Rankings Table */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Top 100 by Privacy Score
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            Higher scores indicate better privacy practices. Click any domain for a full report.
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
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-0 hover:bg-emerald-50/50 transition-colors"
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
                    <span className="text-sm font-bold text-emerald-600">
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

        {/* Editorial Content */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <article className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What the Privacy Index Measures
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              The Privacy Index ranks websites by their overall privacy score, a composite metric
              calculated from five categories of evidence: third-party tracking, security headers,
              cookie practices, browser fingerprinting, and HTTPS enforcement. Domains that appear
              at the top of this index have achieved high scores across all categories, demonstrating
              a comprehensive commitment to user privacy.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              What High-Scoring Domains Do Differently
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The best-performing domains share several characteristics: they deploy minimal or zero
              third-party trackers, implement strong Content Security Policy (CSP) headers that prevent
              unauthorized script injection, enforce HTTPS via HSTS headers, avoid browser fingerprinting
              techniques, and set only essential first-party cookies. Many of these domains use
              privacy-respecting analytics alternatives or self-hosted analytics solutions.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Why This Matters for Vendor Selection
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              For procurement and vendor risk teams, this index serves as a shortlist of domains with
              demonstrated privacy maturity. A vendor whose public website scores in the top 100
              likely applies similar rigor to their internal data handling practices. This positive signal
              can streamline due diligence by identifying low-risk vendors early in the evaluation process.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Organizations pursuing privacy-by-design principles can use this index as a benchmark
              for their own web properties. Achieving a top-100 privacy score signals to customers,
              partners, and regulators that your organization takes data protection seriously at every
              level, from infrastructure security to third-party code governance.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              How Scores Are Maintained Over Time
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Privacy is not a one-time achievement. Websites on this index are rescanned regularly,
              and their scores update as their practices change. A domain that adds new trackers or
              removes security headers will see its score decline in subsequent scans. Our stability
              metrics track how consistent a domain&apos;s privacy posture is over time, distinguishing
              between domains that maintain high standards and those with volatile scores.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Methodology and Data Freshness
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Rankings are calculated from Tier A domains, our highest-confidence dataset consisting of
              well-known, actively monitored domains with complete scan data. All scores are based on
              automated scans using a standardized headless browser configuration. The ranking updates
              as new scan data becomes available, typically within 24 hours of a domain being rescanned.
              Our Domain Intelligence API provides programmatic access to these rankings for integration
              into compliance dashboards and vendor management systems.
            </p>
          </article>
        </section>

        {/* FAQ Section — targets long-tail search queries */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="What is a website privacy score?"
              answer="A privacy score is a 0-100 rating that measures how well a website protects visitor privacy. It accounts for third-party trackers, security headers (CSP, HSTS), cookie practices, browser fingerprinting, and HTTPS enforcement. Higher scores indicate fewer privacy risks."
            />
            <FaqItem
              question="Which websites have the best privacy practices?"
              answer="The websites at the top of this index consistently demonstrate minimal tracking, strong security headers, responsible cookie use, and no browser fingerprinting. They typically use privacy-respecting analytics and enforce strict Content Security Policies."
            />
            <FaqItem
              question="How often are privacy scores updated?"
              answer="Domains in our monitored set are rescanned regularly. Score updates typically appear within 24 hours of a rescan. Our change detection system tracks score movements over time, so you can monitor whether a domain is improving or declining."
            />
            <FaqItem
              question="Can I use this data for vendor due diligence?"
              answer="Yes. Many compliance and vendor risk teams use our privacy scores as a first-pass screening tool. Our Domain Intelligence API provides programmatic access for integration into vendor management workflows. A high privacy score is a positive signal of organizational security maturity."
            />
            <FaqItem
              question="What is the average privacy score across all websites?"
              answer={data ? `Across the top 100 domains in our index, the average privacy score is ${data.stats.averageScore}/100. The broader dataset shows significant variation by industry, with privacy-focused tools scoring highest and ad-supported media sites scoring lowest.` : 'Privacy scores vary significantly by industry. Ad-supported media sites typically score lowest, while privacy-focused tools and open-source projects score highest.'}
            />
            <FaqItem
              question="How are trackers detected?"
              answer="Our scanner loads each website in a headless browser and monitors all network requests. Scripts communicating with known tracking domains (identified via community blocklists and our fingerprinting detection engine) are classified as trackers. We distinguish between analytics, advertising, and cross-site profiling scripts."
            />
          </div>
        </section>

        {/* Dataset Freshness Signal */}
        {data?.freshness && <FreshnessBar freshness={data.freshness} accent="emerald" />}

        {/* Category Insights */}
        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <CategoryInsights categories={data.categoryBreakdown} accent="emerald" />
        )}

        {/* Browse Rankings Hub */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse Privacy Rankings</h2>
          <p className="text-gray-500 text-sm mb-6">
            Explore our dataset from different angles. Each ranking highlights a specific dimension of web privacy.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <CrossLink
              href="/most-tracked-websites"
              title="Most Tracked Websites"
              description="Top 100 domains by tracker count. See which sites deploy the most surveillance scripts."
              icon="eye"
            />
            <CrossLink
              href="/least-private-websites"
              title="Least Private Websites"
              description="Bottom 100 by privacy score. The worst offenders for tracking, cookies, and security."
              icon="warning"
            />
            <CrossLink
              href="/websites-with-most-cookies"
              title="Most Cookies"
              description="Top 100 by cookie count. Sites that set the most first-party and third-party cookies."
              icon="cookie"
            />
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <CrossLink
              href="/privacy-benchmarks"
              title="Industry Benchmarks"
              description="Privacy scores averaged by industry category. Compare streaming, SaaS, eCommerce, and more."
              icon="chart"
            />
            <CrossLink
              href="/changes"
              title="Change Feed"
              description="Real-time feed of privacy score changes across all monitored domains."
              icon="feed"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Where does your domain rank?
            </h2>
            <p className="text-gray-600 mb-6">
              Free privacy analysis. See how your site compares.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Scan Your Website
              </Link>
              <Link
                href="/api-access"
                className="inline-block px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
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

function IndexStatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent ? 'text-emerald-300' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-sm text-emerald-300/50 mt-1">{label}</div>
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

function FreshnessBar({ freshness, accent }: { freshness: FreshnessStats; accent: string }) {
  const updated = new Date(freshness.lastScanDate);
  const dateStr = updated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl border bg-${accent}-50/50 border-${accent}-200/50`}>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
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

function CategoryInsights({ categories, accent }: { categories: CategoryBreakdown[]; accent: string }) {
  const top = categories.slice(0, 8);
  const maxCount = Math.max(...top.map((c) => c.count));
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Category Breakdown</h2>
      <p className="text-sm text-gray-500 mb-6">How the top 100 domains are distributed across industries.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {top.map((cat) => (
          <Link
            key={cat.slug}
            href={`/privacy-benchmarks/${cat.slug}`}
            className={`block p-4 rounded-xl border border-gray-200 hover:border-${accent}-300 hover:shadow-soft transition-all bg-white`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900 text-sm">{cat.category}</span>
              <span className="text-xs text-gray-400">{cat.count} domains</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-${accent}-500`}
                style={{ width: `${(cat.count / maxCount) * 100}%` }}
              />
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

function CrossLink({ href, title, description }: { href: string; title: string; description: string; icon?: string }) {
  return (
    <Link
      href={href}
      className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-soft transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
