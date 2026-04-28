/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Most Tracked Websites - Authority Anchor Page
 *
 * Dark, data-heavy surveillance aesthetic. Shows which websites
 * deploy the most third-party tracking scripts.
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
  title: '100 Most Tracked Websites (2026) — Tracker Rankings',
  description:
    'Which websites track you the most? See the top 100 websites ranked by number of third-party trackers. Data from automated privacy scans of thousands of domains.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/most-tracked-websites`,
  },
  openGraph: {
    title: '100 Most Tracked Websites (2026) — Tracker Rankings',
    description:
      'Which websites track you the most? See the top 100 websites ranked by number of third-party trackers.',
    url: `${SEO_CONSTANTS.BASE_URL}/most-tracked-websites`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'article',
  },
};

export const revalidate = 3600;

export default async function MostTrackedWebsitesPage() {
  const data = await fetchRankings('most-tracked');
  const featured = data ? selectFeaturedDomains(data, 'most-tracked') : [];

  return (
    <>
      {data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildRankingsJsonLd(data, `${SEO_CONSTANTS.BASE_URL}/most-tracked-websites`)
            ),
          }}
        />
      )}

      <div className="min-h-screen">
        {/* Dark Hero */}
        <section className="bg-gray-950 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Privacy Rankings', href: '/privacy-index' },
                { label: 'Most Tracked Websites' },
              ]}
            />

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm font-medium mb-6 border border-red-500/20">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Surveillance Report
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Most Tracked Websites
              </h1>
              <p className="text-2xl font-semibold text-white max-w-2xl mb-4">
                We measured what websites load before you click anything.
              </p>
              <p className="text-lg text-gray-400 max-w-2xl mb-10">
                We scanned <strong className="text-white">{data?.totalDomains?.toLocaleString() ?? '5,948'}</strong> of the most-trafficked websites in a clean,
                logged-out browser session — no consent click, no scroll, no login — and counted every
                third-party tracker that loads on first paint.
              </p>

              {data && (() => {
                const trackerCounts = data.rankings.map((r) => r.trackers).filter((n): n is number => Number.isFinite(n)).sort((a, b) => a - b);
                const n = trackerCounts.length;
                const max = n > 0 ? trackerCounts[n - 1] : 0;
                const median = n > 0 ? trackerCounts[Math.floor(n / 2)] : 0;
                const p90 = n > 0 ? trackerCounts[Math.floor(0.9 * (n - 1))] : 0;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatBlock label="Domains scanned" value={data.totalDomains.toLocaleString()} />
                    <StatBlock label="Max trackers" value={String(max)} accent />
                    <StatBlock label="Top 10% load" value={`${p90}+`} />
                    <StatBlock label="Median site" value={String(median)} />
                  </div>
                );
              })()}

              <p className="mt-8 text-lg text-gray-300 max-w-2xl">
                The sites at the top of this list aren&apos;t household names. That isn&apos;t a gap in the data.
                It&apos;s the result. The sites that track you the most before you act are not the ones
                you expect — they&apos;re the ones that monetize immediately.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Domains — curated authority concentration above the flat table. */}
        <div className="max-w-5xl mx-auto px-4">
          <FeaturedDomainsSection featured={featured} hubType="most-tracked" />
        </div>

        {/* Rankings Table */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Top 100 by Tracker Count
          </h2>

          {data && data.rankings.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Domain</div>
                <div className="col-span-2 text-right">Trackers</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right">Grade</div>
              </div>

              {/* Rows */}
              {data.rankings.map((entry) => (
                <Link
                  key={entry.domain}
                  href={`/privacy-report/${entry.domain}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
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
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                      {entry.trackers}
                      <svg className="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
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

        {/* Where the sites you recognize fall — pre-empts the "where is Facebook?" perception
            problem. Hardcoded snapshot from 2026-04-28 brand audit; consider wiring to live
            scan data once the brand cohort is stable in the rankings. */}
        <RecognizableBrandsSection />

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
              Understanding Website Tracking: What This Data Means
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              Third-party trackers are scripts loaded from external domains that monitor user behavior
              across the web. When you visit a website, these trackers can record which pages you view,
              how long you stay, what you click, and build a profile of your browsing habits. The websites
              on this list deploy the highest number of such tracking scripts among the domains we analyze.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Why Tracker Count Matters for Vendor Risk
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              For vendor risk and compliance teams, the number of third-party trackers on a domain is a
              proxy for data exposure surface area. Each tracker represents a third-party entity receiving
              user data from that website. When your employees interact with a heavily tracked vendor
              portal, their browsing patterns and potentially sensitive business information may be shared
              with advertising networks, analytics platforms, and data brokers.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Under GDPR, CCPA, and other privacy regulations, organizations can face liability for
              sharing employee or customer data with third parties through vendor integrations. A vendor
              with 30+ trackers represents significantly higher compliance risk than one with 5 trackers,
              regardless of their published privacy policy.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              How we measure tracking
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              This list answers one specific question: how many trackers does a site load before you
              do anything? It does not measure trackers that fire after consent, login, scroll, or any
              user interaction. That is deliberate. Different humans interact with the same page in
              different ways, on different days, with different consent histories. A reproducible
              measurement has to start from a clean state — same browser, same session shape, every
              time.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Every site in this list was measured under the same conditions:
            </p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
              <li>A real Chromium browser (not just an HTTP fetch)</li>
              <li>~30 seconds of page load with no user interaction</li>
              <li>Network requests classified against EasyPrivacy + EasyList (combined ~94,000 tracker domains)</li>
              <li>Identical session shape for every site</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-4">
              This makes the results directly comparable across thousands of sites — something
              interaction-based measurements cannot guarantee. Sites that block automated scanners
              (some do) are flagged in their report rather than silently absent from the dataset.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              How to read the numbers
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              A high tracker count is not proof of hostile intent. It usually reflects an ad-supported
              business model and a less restrictive consent flow. A low tracker count is not a free
              pass either — it can mean strong privacy practices, or it can mean the heavy tracking
              happens after you log in, accept a banner, or hit a paywall.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              What the first-load count gives you: a clean, comparable measurement of what your
              browser is asked to do <em>before you have made any decisions</em>. That signal is not
              the whole story, but it is the one signal on this list that is reproducible across
              every site and every scan.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Common Tracking Technologies Detected
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The most frequently detected trackers across our dataset include advertising pixels from
              major ad networks, social media widgets that enable cross-site profiling, real-time bidding
              scripts that auction user attention to advertisers, and session replay tools that record
              mouse movements and keystrokes. Many websites also deploy canvas fingerprinting and
              WebGL fingerprinting scripts that can identify users without cookies.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Using This Data for Due Diligence
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Before onboarding a new vendor, security teams can use this ranking to quickly assess the
              tracking posture of a vendor&apos;s public-facing properties. A domain appearing in the top 100
              most tracked should trigger deeper investigation into their data processing agreements,
              subprocessor lists, and cookie consent mechanisms. This data is updated continuously as
              our scanner processes new and recurring scans across the monitored domain set.
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
              question="Which websites track users the most?"
              answer="The websites at the top of this list deploy the highest number of third-party tracking scripts. These typically include major media outlets, e-commerce platforms, and social networks that monetize user data through advertising. Tracker counts can range from 20 to over 100 per page load."
            />
            <FaqItem
              question="What counts as a third-party tracker?"
              answer="A third-party tracker is any script loaded from an external domain that monitors user behavior. This includes advertising pixels, analytics beacons, social media widgets, real-time bidding scripts, and fingerprinting code. We identify trackers using community-maintained blocklists and our own detection algorithms."
            />
            <FaqItem
              question="How many trackers does the average website have?"
              answer={data ? `Among the top 100 most-tracked websites in our dataset, the average is ${data.stats.averageTrackers.toFixed(1)} trackers per page. The broader web average is lower, typically 5-15 trackers per site.` : 'The average website deploys 5-15 third-party trackers. The most heavily tracked sites can have 50 or more.'}
            />
            <FaqItem
              question="Can trackers identify me without cookies?"
              answer="Yes. Browser fingerprinting techniques can identify users without cookies by combining device characteristics like screen resolution, installed fonts, WebGL renderer, and audio context. Our scanner detects canvas fingerprinting, WebGL fingerprinting, and audio fingerprinting techniques."
            />
          </div>
        </section>

        {/* Cross-links */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">More Privacy Rankings</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <CrossLink
              href="/least-private-websites"
              title="Least Private Websites"
              description="Domains with the lowest privacy scores"
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
          <div className="bg-gray-950 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Check any domain&apos;s tracking footprint
            </h2>
            <p className="text-gray-400 mb-6">
              Free, instant analysis. No signup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Scan a Website
              </Link>
              <Link
                href="/api-access"
                className="inline-block px-6 py-3 bg-transparent text-white font-semibold rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
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

/**
 * Snapshot of how recognizable brands rank under the pre-interaction
 * measurement model. This is the trust-bridge that pre-empts the
 * "where is Facebook?" reaction to the regional-publisher-heavy top-20.
 *
 * Numbers are from the 2026-04-28 brand audit on prod scans. Counts are
 * stable enough to ship as-is; revisit when the cohort is queryable as
 * a live ranking cut.
 */
const RECOGNIZABLE_BRANDS: { domain: string; trackers: number; reason: string }[] = [
  { domain: 'foxnews.com', trackers: 33, reason: 'ad-supported, no consent gate' },
  { domain: 'cnn.com', trackers: 24, reason: 'ad-supported, US-style banners' },
  { domain: 'washingtonpost.com', trackers: 22, reason: 'ad-supported, soft paywall' },
  { domain: 'buzzfeed.com', trackers: 19, reason: 'ad-supported' },
  { domain: 'target.com', trackers: 12, reason: 'retail with ad inventory' },
  { domain: 'weather.com', trackers: 9, reason: 'ad-supported' },
  { domain: 'microsoft.com', trackers: 8, reason: 'corporate landing' },
  { domain: 'nytimes.com', trackers: 7, reason: 'paywall gate' },
  { domain: 'linkedin.com', trackers: 5, reason: 'login wall' },
  { domain: 'bloomberg.com', trackers: 4, reason: 'strict EU-style consent gate' },
  { domain: 'google.com', trackers: 4, reason: 'minimal SERP shell' },
  { domain: 'youtube.com', trackers: 3, reason: 'logged-out homepage' },
  { domain: 'netflix.com', trackers: 3, reason: 'login wall' },
  { domain: 'yahoo.com', trackers: 3, reason: 'sparse' },
  { domain: 'amazon.com', trackers: 2, reason: 'pre-search shell' },
  { domain: 'x.com', trackers: 2, reason: 'login wall' },
  { domain: 'tiktok.com', trackers: 2, reason: 'login wall' },
  { domain: 'facebook.com', trackers: 1, reason: 'login wall' },
  { domain: 'instagram.com', trackers: 1, reason: 'login wall' },
  { domain: 'apple.com', trackers: 1, reason: 'corporate landing' },
  { domain: 'theguardian.com', trackers: 0, reason: 'consent wall blocks scripts entirely' },
  { domain: 'forbes.com', trackers: 0, reason: 'consent wall' },
];

function RecognizableBrandsSection() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Where the sites you recognize actually fall
      </h2>
      <p className="text-gray-600 mb-6">
        Here&apos;s where the sites you recognize actually fall:
      </p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">Site</div>
          <div className="col-span-2 text-right">Trackers</div>
          <div className="col-span-5">Why</div>
        </div>
        {RECOGNIZABLE_BRANDS.map((b) => (
          <Link
            key={b.domain}
            href={`/privacy-report/${b.domain}`}
            className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <div className="col-span-5 flex items-center gap-2 min-w-0">
              <Image
                src={`https://www.google.com/s2/favicons?domain=${b.domain}&sz=32`}
                alt=""
                width={16}
                height={16}
                className="w-4 h-4 rounded flex-shrink-0"
                unoptimized
              />
              <span className="font-medium text-gray-900 truncate text-sm">{b.domain}</span>
            </div>
            <div className="col-span-2 text-right text-sm font-semibold text-gray-700">
              {b.trackers}
            </div>
            <div className="col-span-5 text-sm text-gray-500 truncate">{b.reason}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 prose prose-gray max-w-none">
        <p className="text-gray-700 leading-relaxed">
          The pattern repeats:
        </p>
        <ul className="text-gray-700 leading-relaxed">
          <li>
            <strong>Login walls</strong> — Facebook, Instagram, X, TikTok, LinkedIn, Reddit show a
            sparse landing screen. The tracking stack fires <em>after</em> authentication, which we
            never trigger.
          </li>
          <li>
            <strong>Consent walls</strong> — The Guardian, Bloomberg, Forbes gate scripts behind a
            cookie banner. Strict EU-style flows mean almost nothing loads until you click
            &ldquo;accept&rdquo;.
          </li>
          <li>
            <strong>Paywalls</strong> — NYT, WSJ render minimal content to unauthenticated
            visitors.
          </li>
          <li>
            <strong>Corporate landing pages</strong> — Apple, Microsoft, Google&apos;s homepage
            prioritise speed and design over ad inventory.
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed">
          Meanwhile, ad-supported regional publishers without strict consent gates load their entire
          ad and tracking stack on first paint. That is how a site you have never heard of can carry
          more trackers than Facebook does pre-login. This is not an artefact of measurement. It is
          a finding.
        </p>
      </div>
    </section>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl border bg-gray-50/80 border-gray-200/80">
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
      <h2 className="text-xl font-bold text-gray-900 mb-2">Top Tracker Categories</h2>
      <p className="text-sm text-gray-500 mb-6">Which industries deploy the most tracking scripts.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {top.map((cat) => (
          <Link
            key={cat.slug}
            href={`/privacy-benchmarks/${cat.slug}`}
            className="block p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-soft transition-all bg-white"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900 text-sm">{cat.category}</span>
              <span className="text-xs text-gray-400">{cat.count} domains</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${(cat.count / maxCount) * 100}%` }} />
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
