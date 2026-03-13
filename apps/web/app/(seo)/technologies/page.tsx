/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Technologies Index - Tracking Technology Intelligence
 *
 * Lists all tracked technologies grouped by category.
 * Creates entity relationships for SEO knowledge graph.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import {
  fetchTechnologies,
  riskBg,
  trendIcon,
  categoryColor,
  buildTechnologiesJsonLd,
  type TechnologyEntry,
} from '@/lib/technologies';

export const metadata: Metadata = {
  title: `Web Tracking Technologies: ${new Date().getFullYear()} Intelligence Report`,
  description:
    'Comprehensive database of web tracking technologies. See which trackers are most prevalent, their risk levels, adoption trends, and which websites deploy them.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/technologies`,
  },
  openGraph: {
    title: `Web Tracking Technologies: ${new Date().getFullYear()} Intelligence Report`,
    description:
      'Database of web tracking technologies ranked by prevalence. Tracker risk levels, adoption trends, and deployment data.',
    url: `${SEO_CONSTANTS.BASE_URL}/technologies`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'article',
  },
};

export const revalidate = 3600;

function groupByCategory(techs: TechnologyEntry[]): Record<string, TechnologyEntry[]> {
  const groups: Record<string, TechnologyEntry[]> = {};
  for (const t of techs) {
    const cat = t.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  }
  return groups;
}

const CATEGORY_ORDER = ['Advertising', 'Ad Network', 'Analytics', 'Social', 'Social Media', 'CDN', 'Hosting', 'Essential', 'Utility'];

function sortedCategories(groups: Record<string, TechnologyEntry[]>): string[] {
  return Object.keys(groups).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default async function TechnologiesPage() {
  const data = await fetchTechnologies();
  const groups = data ? groupByCategory(data.technologies) : {};
  const categories = sortedCategories(groups);

  return (
    <>
      {data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildTechnologiesJsonLd(data, `${SEO_CONSTANTS.BASE_URL}/technologies`)
            ),
          }}
        />
      )}

      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Privacy Rankings', href: '/privacy-index' },
                { label: 'Technologies' },
              ]}
            />

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm font-medium mb-6 border border-cyan-500/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                Technology Intelligence
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Tracking Technologies
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mb-10">
                Every third-party tracker we detect, ranked by prevalence.
                See which technologies are growing, declining, and how they affect privacy scores.
              </p>

              {data && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold text-cyan-300">{data.totalTrackers}</div>
                    <div className="text-sm text-slate-400 mt-1">Technologies tracked</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white">{data.technologies.length}</div>
                    <div className="text-sm text-slate-400 mt-1">Top trackers profiled</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 col-span-2 md:col-span-1">
                    <div className="text-2xl font-bold text-slate-300">{data.lastUpdated}</div>
                    <div className="text-sm text-slate-400 mt-1">Last dataset update</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Technology Cards by Category */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          {data && categories.length > 0 ? (
            <div className="space-y-10">
              {categories.map((cat) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{cat}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {groups[cat].length} {groups[cat].length === 1 ? 'tracker' : 'trackers'}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groups[cat].map((tech) => (
                      <TechCard key={tech.slug} tech={tech} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
              <p className="text-gray-500">Technology data is being collected. Check back soon.</p>
            </div>
          )}
        </section>

        {/* Editorial */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <article className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Understanding Web Tracking Technologies
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              The modern web runs on third-party technologies. Analytics platforms measure user behavior,
              advertising networks serve targeted ads, social widgets enable sharing, and CDNs optimize
              delivery. Each of these technologies creates a data relationship between the website visitor
              and the third-party provider. Our technology intelligence database catalogs these relationships
              across thousands of domains.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Why Tracker Prevalence Matters
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              A tracker&apos;s prevalence indicates its reach. A technology deployed on 60% of websites has
              extraordinary cross-site tracking potential, even if individual sites believe they&apos;re only
              sharing data with one provider. The most prevalent trackers build the most comprehensive
              user profiles because they observe behavior across the widest surface area of the web.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Adoption Trends Signal Industry Shifts
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When a tracker shows a declining adoption trend, it often signals regulatory pressure,
              browser restrictions, or market shift toward privacy-respecting alternatives. Conversely,
              growing trackers may indicate new advertising strategies or analytics capabilities that
              websites are adopting. Monitoring these trends helps compliance teams anticipate which
              technologies will appear in their vendor ecosystem next.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Risk Levels Explained
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We assign risk levels based on technology category and data collection scope. Advertising
              and ad network technologies receive &ldquo;High&rdquo; risk ratings because they exist primarily to
              profile users across sites. Analytics technologies receive &ldquo;Medium&rdquo; risk because they
              collect behavioral data but typically within a single-site context. CDN and essential
              technologies receive &ldquo;Low&rdquo; risk because they serve functional purposes with minimal
              data collection.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              How We Detect and Classify Trackers
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our automated scanner loads websites in a headless browser and monitors all network
              requests to third-party domains. We cross-reference detected domains against community
              blocklists, our own fingerprinting detection engine, and the DuckDuckGo Tracker Radar
              dataset. Each technology is classified by category, owner, and risk level. Detection
              data is refreshed weekly as domains are rescanned, ensuring our prevalence and trend
              data reflects the current state of the web.
            </p>
          </article>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FaqItem
              question="What is a web tracking technology?"
              answer="A web tracking technology is a third-party script, pixel, or beacon embedded in websites that collects data about visitor behavior. Common examples include analytics platforms (Google Analytics), advertising pixels (Meta Pixel), and session replay tools (Hotjar). These technologies communicate with external servers, creating data flows between the website and the third-party provider."
            />
            <FaqItem
              question="Which tracking technologies are most common?"
              answer={data ? `We currently track ${data.totalTrackers} distinct technologies. The most prevalent are typically analytics and advertising platforms from major technology companies, deployed across tens of thousands of websites. Each technology profile page shows the exact number of sites where we detect it.` : 'Analytics and advertising platforms from major technology companies are the most prevalent, deployed across tens of thousands of websites.'}
            />
            <FaqItem
              question="How is tracker risk level determined?"
              answer="Risk levels reflect the technology's primary purpose and data collection scope. Advertising and ad network technologies are rated High risk because they exist to profile users across sites. Analytics tools are Medium risk because they collect behavioral data. CDN and essential infrastructure technologies are Low risk because they serve functional purposes."
            />
            <FaqItem
              question="What do adoption trends mean?"
              answer="Adoption trends show whether a technology is being added to more websites (growing), removed from websites (declining), or maintaining its current presence (stable). Declining trends often signal regulatory pressure, browser restrictions, or industry shift toward alternatives."
            />
          </div>
        </section>

        {/* Cross-links */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Rankings</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <CrossLink href="/most-tracked-websites" title="Most Tracked Websites" description="100 domains deploying the most trackers" />
            <CrossLink href="/privacy-index" title="Privacy Index" description="100 domains with the best privacy scores" />
            <CrossLink href="/least-private-websites" title="Least Private Websites" description="100 domains with the worst privacy" />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              What trackers does your vendor use?
            </h2>
            <p className="text-gray-600 mb-6">
              Scan any domain to see its full technology fingerprint. Free, instant analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors"
              >
                Scan a Website
              </Link>
              <Link
                href="/domain-intelligence-api"
                className="inline-block px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:border-slate-300 transition-colors"
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

function TechCard({ tech }: { tech: TechnologyEntry }) {
  const trend = trendIcon(tech.adoptionTrend);
  return (
    <Link
      href={`/technologies/${tech.slug}`}
      className="group block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-soft transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-slate-600 transition-colors">
            {tech.name}
          </h3>
          <span className="text-xs text-gray-400 font-mono">{tech.domain}</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${riskBg(tech.category === 'Advertising' || tech.category === 'Ad Network' ? 'High' : tech.category === 'Analytics' || tech.category === 'Social' || tech.category === 'Social Media' ? 'Medium' : 'Low')}`}>
          {tech.category}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-slate-800 font-bold tabular-nums">{tech.prevalence}%</span>
          <span className="text-gray-400 ml-1">prevalence</span>
        </div>
        <div>
          <span className="text-gray-600 tabular-nums">{tech.siteCount.toLocaleString()}</span>
          <span className="text-gray-400 ml-1">sites</span>
        </div>
        <div className="ml-auto" title={trend.label}>
          <span className={`${tech.adoptionTrend === 'UP' ? 'text-red-500' : tech.adoptionTrend === 'DOWN' ? 'text-emerald-500' : 'text-gray-400'} font-mono text-sm`}>
            {trend.symbol}
          </span>
        </div>
      </div>
    </Link>
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
      <div className="px-5 pb-5 text-gray-600 leading-relaxed">{answer}</div>
    </details>
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
