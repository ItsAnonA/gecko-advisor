/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Technology Detail Page - Individual Tracker Profile
 *
 * Shows tracker details, sites using it, category breakdown,
 * privacy implications, and risk assessment.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { gradeBg } from '@/lib/rankings';
import {
  fetchTechnology,
  riskBg,
  trendIcon,
  categoryColor,
  buildTechnologyJsonLd,
  buildFaqPageJsonLd,
} from '@/lib/technologies';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchTechnology(slug);
  if (!data) return { title: 'Technology Not Found' };

  const { technology } = data;
  const title = `Websites Using ${technology.name} (${data.stats.totalSites.toLocaleString()} Sites) — Privacy & Tracking Analysis`;
  const description = `${data.stats.totalSites.toLocaleString()} websites use ${technology.name}. See which sites deploy this ${technology.category.toLowerCase()} tracker, its privacy risk level (${technology.riskLevel}), prevalence (${technology.prevalence}%), and adoption trends.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${SEO_CONSTANTS.BASE_URL}/technologies/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/technologies/${slug}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
    },
  };
}

export const revalidate = 3600;

export default async function TechnologyDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchTechnology(slug);

  if (!data) notFound();

  const { technology, domains, stats } = data;
  const trend = trendIcon(technology.adoptionTrend);

  const faqItems = [
    {
      question: `Does ${technology.name} track users?`,
      answer: `${technology.name} is a ${technology.category.toLowerCase()} technology that ${technology.riskLevel === 'High' ? 'collects data primarily for advertising and user profiling purposes' : technology.riskLevel === 'Medium' ? 'collects behavioral data such as page views and interactions' : 'serves primarily functional purposes with minimal data collection'}. It is deployed on ${stats.totalSites.toLocaleString()} websites in our dataset.`,
    },
    {
      question: `How many websites use ${technology.name}?`,
      answer: `We detect ${technology.name} on ${stats.totalSites.toLocaleString()} websites, representing a ${technology.prevalence}% prevalence across our monitored dataset. The adoption trend is currently ${technology.adoptionTrend === 'UP' ? 'growing' : technology.adoptionTrend === 'DOWN' ? 'declining' : 'stable'}.`,
    },
    {
      question: `Is ${technology.name} safe?`,
      answer: `${technology.name} is classified as ${technology.riskLevel.toLowerCase()} risk. ${technology.riskLevel === 'High' ? 'High-risk technologies exist primarily for user profiling and cross-site tracking.' : technology.riskLevel === 'Medium' ? 'Medium-risk technologies collect behavioral data but typically within a defined scope.' : 'Low-risk technologies serve functional purposes with minimal privacy impact.'} Websites using it have an average privacy score of ${stats.avgScore}/100.`,
    },
    {
      question: `How do I block ${technology.name}?`,
      answer: `Browser extensions like uBlock Origin and Privacy Badger can block ${technology.name}. Most content blocklist-based tools include ${technology.domain} in their default filter lists. For enterprise environments, DNS-level blocking or firewall rules can prevent connections to ${technology.domain} across all devices on the network.`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildTechnologyJsonLd(data, `${SEO_CONSTANTS.BASE_URL}/technologies/${slug}`)
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildFaqPageJsonLd(faqItems)),
        }}
      />

      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Technologies', href: '/technologies' },
                { label: technology.name },
              ]}
            />

            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${categoryColor(technology.category)}`}>
                  {technology.category}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${riskBg(technology.riskLevel)}`}>
                  {technology.riskLevel} Risk
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                Websites Using {technology.name}
              </h1>
              <p className="text-sm text-slate-400 font-mono mb-4">{technology.domain}</p>
              <p className="text-lg text-slate-300 max-w-2xl mb-10">
                {technology.name} is a {technology.category.toLowerCase()} {technology.riskLevel === 'High' ? 'tracker' : 'technology'} deployed
                on {stats.totalSites.toLocaleString()} websites ({technology.prevalence}% prevalence).
                See which sites use it, adoption trends, and privacy impact.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-cyan-300">{technology.prevalence}%</div>
                  <div className="text-sm text-slate-400 mt-1">Prevalence</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">{stats.totalSites.toLocaleString()}</div>
                  <div className="text-sm text-slate-400 mt-1">Sites detected</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className={`text-2xl font-bold flex items-center gap-2 ${trend.color === 'text-red-400' ? 'text-red-400' : trend.color === 'text-emerald-400' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    <span>{trend.symbol}</span>
                    <span className="text-lg">{technology.netChange >= 0 ? '+' : ''}{technology.netChange}</span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">Trend ({trend.label})</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">{stats.avgScore}/100</div>
                  <div className="text-sm text-slate-400 mt-1">Avg site score</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sites Using This Technology */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Top Sites Using {technology.name}
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            {stats.totalSites.toLocaleString()} websites use {technology.name}. Sites using this {technology.category.toLowerCase()} technology have an average privacy score of {stats.avgScore}/100 and {stats.avgTrackers} trackers. Click any domain for a full privacy report.
          </p>

          {domains.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Domain</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right">Trackers</div>
                <div className="col-span-2 text-right">Grade</div>
              </div>

              {domains.map((entry, i) => (
                <Link
                  key={entry.domain}
                  href={`/privacy-report/${entry.domain}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="col-span-1 text-sm text-gray-400 font-mono">{i + 1}</div>
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <Image
                      src={`https://www.google.com/s2/favicons?domain=${entry.domain}&sz=32`}
                      alt=""
                      width={16}
                      height={16}
                      className="w-4 h-4 rounded flex-shrink-0"
                      unoptimized
                    />
                    <span className="font-medium text-gray-900 truncate text-sm">{entry.domain}</span>
                  </div>
                  <div className="col-span-2 text-right text-sm text-gray-600">{entry.score}/100</div>
                  <div className="col-span-2 text-right text-sm text-gray-600">{entry.trackers}</div>
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
              <p className="text-gray-500">Domain data is being collected. Check back soon.</p>
            </div>
          )}
        </section>

        {/* Category Breakdown */}
        {technology.topCategories && technology.topCategories.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {technology.name} by Industry
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Which industries deploy {technology.name} most frequently.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {technology.topCategories.slice(0, 8).map((cat) => (
                <Link
                  key={cat.category}
                  href={`/privacy-benchmarks/${cat.category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block p-4 rounded-xl border border-gray-200 hover:border-slate-300 hover:shadow-soft transition-all bg-white"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{cat.category}</span>
                    <span className="text-xs text-gray-400">{cat.count} sites</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-slate-600"
                      style={{ width: `${Math.min((cat.count / Math.max(...technology.topCategories.map((c) => c.count))) * 100, 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Editorial - Privacy Implications */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <article className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Privacy Implications of {technology.name}
            </h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              {technology.name} is classified as a {technology.riskLevel.toLowerCase()}-risk {technology.category.toLowerCase()} technology
              with a prevalence of {technology.prevalence}% across our monitored dataset. When a website deploys {technology.name},
              it creates a data channel between the visitor&apos;s browser and {technology.domain}, allowing
              the collection of browsing behavior, page interactions, and potentially device fingerprinting data.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              What Data Does {technology.name} Collect?
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              {technology.category === 'Analytics' || technology.category === 'Social' || technology.category === 'Social Media'
                ? `As a ${technology.category.toLowerCase()} technology, ${technology.name} typically collects page views, session duration, click patterns, referrer data, and user agent information. Some implementations may also collect form interactions, scroll depth, and custom event data configured by the website operator.`
                : technology.category === 'Advertising' || technology.category === 'Ad Network'
                ? `As an advertising technology, ${technology.name} collects browsing data used for ad targeting and conversion tracking. This typically includes pages visited, purchase events, form submissions, and cross-site identifiers that enable user profiling across the ${stats.totalSites.toLocaleString()} websites where it is deployed.`
                : `As a ${technology.category.toLowerCase()} technology, ${technology.name} processes requests that may include IP addresses, user agents, referrer headers, and timing data. The privacy impact depends on the specific implementation and data retention policies of the provider.`
              }
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Compliance Considerations
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Under GDPR and ePrivacy Directive, websites deploying {technology.name} must obtain informed
              consent before the technology loads, unless it falls under the &ldquo;strictly necessary&rdquo; exemption.
              With a prevalence of {technology.prevalence}%, {technology.name} is one of the
              {technology.prevalence > 20 ? ' most widely deployed' : technology.prevalence > 5 ? ' commonly found' : ' less common'} technologies
              in our dataset. Vendor risk teams should verify that partners using {technology.name} have
              implemented proper consent management and data processing agreements.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              Impact on Privacy Scores
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Websites using {technology.name} have an average privacy score of {stats.avgScore}/100 and an average
              of {stats.avgTrackers} total trackers. {technology.riskLevel === 'High'
                ? 'The high-risk classification of this technology contributes significantly to score deductions.'
                : technology.riskLevel === 'Medium'
                ? 'As a medium-risk technology, its presence contributes moderate score deductions.'
                : 'As a low-risk technology, its direct impact on privacy scores is minimal.'
              } Our detailed domain reports show exactly how each tracker affects a site&apos;s overall privacy grade.
            </p>
          </article>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FaqItem
              question={`Does ${technology.name} track users?`}
              answer={`${technology.name} is a ${technology.category.toLowerCase()} technology that ${technology.riskLevel === 'High' ? 'collects data primarily for advertising and user profiling purposes' : technology.riskLevel === 'Medium' ? 'collects behavioral data such as page views and interactions' : 'serves primarily functional purposes with minimal data collection'}. It is deployed on ${stats.totalSites.toLocaleString()} websites in our dataset.`}
            />
            <FaqItem
              question={`How many websites use ${technology.name}?`}
              answer={`We detect ${technology.name} on ${stats.totalSites.toLocaleString()} websites, representing a ${technology.prevalence}% prevalence across our monitored dataset. The adoption trend is currently ${technology.adoptionTrend === 'UP' ? 'growing' : technology.adoptionTrend === 'DOWN' ? 'declining' : 'stable'}.`}
            />
            <FaqItem
              question={`Is ${technology.name} safe?`}
              answer={`${technology.name} is classified as ${technology.riskLevel.toLowerCase()} risk. ${technology.riskLevel === 'High' ? 'High-risk technologies exist primarily for user profiling and cross-site tracking.' : technology.riskLevel === 'Medium' ? 'Medium-risk technologies collect behavioral data but typically within a defined scope.' : 'Low-risk technologies serve functional purposes with minimal privacy impact.'} Websites using it have an average privacy score of ${stats.avgScore}/100.`}
            />
            <FaqItem
              question={`How do I block ${technology.name}?`}
              answer={`Browser extensions like uBlock Origin and Privacy Badger can block ${technology.name}. Most content blocklist-based tools include ${technology.domain} in their default filter lists. For enterprise environments, DNS-level blocking or firewall rules can prevent connections to ${technology.domain} across all devices on the network.`}
            />
          </div>
        </section>

        {/* Cross-links */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Explore More</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <CrossLink href="/technologies" title="All Technologies" description="Browse our full tracker database" />
            <CrossLink href="/most-tracked-websites" title="Most Tracked Websites" description="100 domains with the most trackers" />
            <CrossLink href="/privacy-index" title="Privacy Index" description="100 domains with the best privacy" />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Does your vendor use {technology.name}?
            </h2>
            <p className="text-gray-600 mb-6">
              Scan any domain to see its full tracker footprint. Free, instant analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors"
              >
                Scan a Website
              </Link>
              <Link
                href="/api-access"
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
