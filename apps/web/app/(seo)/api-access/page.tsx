/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SampleRequestForm } from '@/components/conversion/SampleRequestForm';

export const revalidate = 300; // 5-min ISR for live stats

export const metadata: Metadata = {
  title: 'Domain Intelligence API — Pricing & Documentation',
  description:
    'Real-time domain risk data for vendor screening and compliance workflows. Privacy scores, tracker detection, stability metrics — one API call per domain. Plans from $49/mo.',
  alternates: { canonical: 'https://geckoadvisor.com/api-access' },
  openGraph: {
    title: 'Domain Intelligence API — Pricing & Documentation',
    description:
      'Real-time domain risk data for vendor screening and compliance workflows. Privacy scores, tracker detection, stability metrics — one API call per domain.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Domain Intelligence API — Pricing & Documentation',
    description:
      'Real-time domain risk data for vendor screening and compliance workflows.',
  },
};

interface Stats {
  totalScans: number;
  domainCount: number;
  lastScanTime: string | null;
  lastChangeDetected: string | null;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${apiUrl}/api/v2/stats`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'N/A';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

const SAMPLE_RESPONSE = `{
  "domain": "example.com",
  "privacyScore": 72,
  "scannedAt": "2026-02-19T09:00:00Z",
  "stabilityTier": "FULL",
  "volatilityIndex": 12.5,
  "trend": "STABLE",
  "scanConfidence": 0.71,
  "trackerCount": 4,
  "scanCount": 8,
  "dataAge": "18h"
}`;

const TIERS = [
  {
    name: 'Evaluation',
    price: '$49',
    period: '/mo',
    requests: '1,000 requests/mo',
    desc: 'Test the data against your workflow',
    cta: 'Start Evaluation',
    href: process.env.NEXT_PUBLIC_LS_CHECKOUT_EVALUATION || '#evaluation',
    highlight: false,
  },
  {
    name: 'Operational',
    price: '$149',
    period: '/mo',
    requests: '10,000 requests/mo',
    desc: 'Production integration for vendor screening',
    cta: 'Go Operational',
    href: process.env.NEXT_PUBLIC_LS_CHECKOUT_OPERATIONAL || '#operational',
    highlight: true,
  },
  {
    name: 'Bulk Intelligence',
    price: '$299',
    period: '/mo',
    requests: 'Full dataset access',
    desc: 'Bulk exports for risk modeling',
    cta: 'Get Bulk Access',
    href: process.env.NEXT_PUBLIC_LS_CHECKOUT_BULK || '#bulk',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/mo',
    requests: 'Unlimited requests',
    desc: 'Custom SLA, dedicated support, priority scanning',
    cta: 'Contact Us',
    href: 'mailto:api@geckoadvisor.com?subject=Enterprise%20API%20Access',
    highlight: false,
  },
];

const FAQ = [
  {
    q: 'What data does the API return?',
    a: 'Each call returns a domain\'s privacy score (0-100), tracker count, stability tier, volatility index, trend direction, scan confidence, and data age. All derived from real network analysis, not self-reported data.',
  },
  {
    q: 'How fresh is the data?',
    a: 'Most domains in our index are rescanned weekly. The dataAge field in every response tells you exactly when the domain was last analyzed. Enterprise customers can request priority rescans.',
  },
  {
    q: 'Can I try before I buy?',
    a: 'Yes. Use the sample request form on this page to enter any domain and we\'ll send you the full JSON response within 24 hours. No commitment, no credit card.',
  },
  {
    q: 'How do I authenticate?',
    a: 'Include your API key as a Bearer token: Authorization: Bearer ga_your_key_here. Keys are provisioned automatically after payment. View your key and usage at /api-access/dashboard.',
  },
  {
    q: 'What domains are covered?',
    a: 'Our index covers 142K+ domains and grows daily. If a domain isn\'t in our index, you can request an on-demand scan. Enterprise plans include priority scanning for any domain.',
  },
  {
    q: 'How is the privacy score calculated?',
    a: 'Scores are deterministic and based on a published methodology: trackers, cookies, fingerprinting, security headers, and TLS configuration. Each category has penalty caps to prevent any single factor from dominating. Full details at /methodology.',
  },
];

export default async function ApiAccessPage() {
  const stats = await fetchStats();

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'API Access' },
        ]}
      />

      {/* Hero */}
      <section className="mb-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
          Domain Risk Screening API
        </h1>
        <p className="text-xl text-zinc-600 leading-relaxed max-w-2xl">
          Screen domains before onboarding vendors, partners, or clients.
          Privacy scores, tracker counts, stability trends — one API call per domain.
        </p>
      </section>

      {/* Live Stats Badges */}
      {stats && (
        <div className="flex flex-wrap gap-3 mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-advisor-50 border border-advisor-200 text-sm font-medium text-advisor-700">
            <span className="w-2 h-2 rounded-full bg-advisor-500 animate-pulse" />
            {formatCount(stats.domainCount || 0)} domains monitored
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-zinc-700">
            {formatCount(stats.totalScans || 0)} scans completed
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-zinc-700">
            Daily scanning
          </span>
        </div>
      )}

      {/* Live Status Block */}
      {stats && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-12">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Live Coverage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.domainCount.toLocaleString()}</p>
              <p className="text-sm text-zinc-500">Domains indexed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.totalScans.toLocaleString()}</p>
              <p className="text-sm text-zinc-500">Total scans</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{timeAgo(stats.lastScanTime)}</p>
              <p className="text-sm text-zinc-500">Last scan</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{timeAgo(stats.lastChangeDetected)}</p>
              <p className="text-sm text-zinc-500">Last change detected</p>
            </div>
          </div>
        </section>
      )}

      {/* The Problem */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4">The Problem</h2>
        <p className="text-zinc-700 mb-4">
          Vendor risk teams manually check dozens of domains during procurement. Security teams lack continuous visibility into third-party privacy practices. Compliance officers can&apos;t prove due diligence without audit trails.
        </p>
        <p className="text-zinc-700">
          Manual domain checks don&apos;t scale, and point-in-time assessments miss behavioral changes between reviews.
        </p>
      </section>

      {/* What the API Provides */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What the API Provides</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-5 border border-zinc-200 rounded-lg bg-white">
            <h3 className="font-semibold text-zinc-900 mb-2">Privacy Score</h3>
            <p className="text-sm text-zinc-600">Deterministic 0-100 score with letter grade, penalty breakdown by category, and percentile ranking.</p>
          </div>
          <div className="p-5 border border-zinc-200 rounded-lg bg-white">
            <h3 className="font-semibold text-zinc-900 mb-2">Tracker Detection</h3>
            <p className="text-sm text-zinc-600">Known trackers identified from EasyPrivacy and WhoTracks.me databases. Ad networks, analytics, and fingerprinting scripts.</p>
          </div>
          <div className="p-5 border border-zinc-200 rounded-lg bg-white">
            <h3 className="font-semibold text-zinc-900 mb-2">Stability Metrics</h3>
            <p className="text-sm text-zinc-600">Volatility index, trend classification, confidence tier, and historical scan data for continuous monitoring.</p>
          </div>
          <div className="p-5 border border-zinc-200 rounded-lg bg-white">
            <h3 className="font-semibold text-zinc-900 mb-2">Change Detection</h3>
            <p className="text-sm text-zinc-600">Score changes, tracker additions/removals, fingerprinting status changes with severity classification.</p>
          </div>
        </div>
      </section>

      {/* What You Can Do With It */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What You Can Do With It</h2>
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-advisor-50 border border-advisor-200 flex items-center justify-center">
              <span className="text-advisor-600 font-bold text-sm">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Automate vendor screening</h3>
              <p className="text-sm text-zinc-600">Integrate into procurement workflows to check vendor domains before contract signing.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-advisor-50 border border-advisor-200 flex items-center justify-center">
              <span className="text-advisor-600 font-bold text-sm">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Build compliance dashboards</h3>
              <p className="text-sm text-zinc-600">Pull privacy data for internal compliance reporting and audit documentation.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-advisor-50 border border-advisor-200 flex items-center justify-center">
              <span className="text-advisor-600 font-bold text-sm">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Monitor vendor privacy drift</h3>
              <p className="text-sm text-zinc-600">Track changes over time with daily scanning and change detection alerts.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-advisor-50 border border-advisor-200 flex items-center justify-center">
              <span className="text-advisor-600 font-bold text-sm">4</span>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Enrich security tools</h3>
              <p className="text-sm text-zinc-600">Feed domain intelligence into SIEMs, SOAR platforms, and GRC tools via REST API.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sample API Response */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Sample Response</h2>
        <div className="relative">
          <div className="absolute top-3 right-3 text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded font-mono">
            GET /api/v2/domain/example.com
          </div>
          <pre className="bg-zinc-900 text-emerald-400 rounded-xl p-6 font-mono text-sm overflow-x-auto leading-relaxed">
            {SAMPLE_RESPONSE}
          </pre>
        </div>
      </section>

      {/* Try Before You Buy */}
      <section className="bg-advisor-50 border border-advisor-200 rounded-2xl p-8 mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2 text-center">Try Before You Buy</h2>
        <p className="text-zinc-600 mb-6 text-center max-w-lg mx-auto">
          Enter any domain and get the full API response — free, no commitment, no credit card.
        </p>
        <div className="max-w-md mx-auto">
          <SampleRequestForm />
        </div>
      </section>

      {/* Pricing Table */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-6 text-center">Pricing</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 ${
                tier.highlight
                  ? 'bg-advisor-600 text-white shadow-lg ring-2 ring-advisor-600'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <h3 className={`text-lg font-semibold mb-1 ${tier.highlight ? 'text-white' : 'text-zinc-900'}`}>
                {tier.name}
              </h3>
              <p className={`text-sm mb-4 ${tier.highlight ? 'text-advisor-100' : 'text-zinc-500'}`}>
                {tier.desc}
              </p>
              <p className="mb-1">
                <span className={`text-3xl font-bold ${tier.highlight ? 'text-white' : 'text-zinc-900'}`}>
                  {tier.price}
                </span>
                <span className={`text-sm ${tier.highlight ? 'text-advisor-200' : 'text-zinc-400'}`}>
                  {tier.period}
                </span>
              </p>
              <p className={`text-sm mb-6 ${tier.highlight ? 'text-advisor-100' : 'text-zinc-500'}`}>
                {tier.requests}
              </p>
              <a
                href={tier.href}
                className={`block text-center font-semibold py-3 rounded-xl transition-colors ${
                  tier.highlight
                    ? 'bg-white text-advisor-600 hover:bg-advisor-50'
                    : 'bg-advisor-600 text-white hover:bg-advisor-700'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-zinc-400 mt-4">
          Secure payment via LemonSqueezy. Keys provisioned instantly after checkout.
        </p>
        <p className="text-center text-sm text-zinc-500 mt-2">
          Already have an API key?{' '}
          <Link href="/api-access/dashboard" className="text-advisor-600 hover:text-advisor-700 underline">
            View your usage dashboard
          </Link>
        </p>
      </section>

      {/* Coverage & Methodology */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Coverage &amp; Methodology</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-5 border border-zinc-200 rounded-lg bg-white">
            <p className="text-3xl font-bold text-advisor-600">{stats ? formatCount(stats.domainCount || 0) : '142K+'}</p>
            <p className="text-sm text-zinc-600 mt-1">Domains monitored</p>
          </div>
          <div className="text-center p-5 border border-zinc-200 rounded-lg bg-white">
            <p className="text-3xl font-bold text-advisor-600">Daily</p>
            <p className="text-sm text-zinc-600 mt-1">Scanning frequency</p>
          </div>
          <div className="text-center p-5 border border-zinc-200 rounded-lg bg-white">
            <p className="text-3xl font-bold text-advisor-600">100%</p>
            <p className="text-sm text-zinc-600 mt-1">Published methodology</p>
          </div>
        </div>
        <p className="text-zinc-700 mt-4">
          All scores are calculated using a{' '}
          <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">
            published, deterministic methodology
          </Link>
          {' '}with penalty caps per category. Accuracy is tracked in monthly{' '}
          <Link href="/transparency-reports" className="text-emerald-600 hover:text-emerald-700 underline">
            transparency reports
          </Link>.
        </p>
      </section>

      {/* Trust Links */}
      <section className="flex flex-wrap gap-4 justify-center mb-12 text-sm text-zinc-500">
        <Link href="/methodology" className="hover:text-advisor-600 transition-colors underline underline-offset-2">
          Scoring methodology
        </Link>
        <span aria-hidden="true">|</span>
        <Link href="/transparency-reports" className="hover:text-advisor-600 transition-colors underline underline-offset-2">
          Transparency reports
        </Link>
        <span aria-hidden="true">|</span>
        <Link href="/api-access/dashboard" className="hover:text-advisor-600 transition-colors underline underline-offset-2">
          API Dashboard
        </Link>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {FAQ.map((item) => (
            <div key={item.q} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-zinc-900 mb-2">{item.q}</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compare section */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">How We Compare</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/gecko-advisor-vs-securityscorecard" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-zinc-900 mb-1 text-sm">vs SecurityScorecard</h3>
            <p className="text-xs text-zinc-500">Privacy scanning vs enterprise security ratings</p>
          </Link>
          <Link href="/gecko-advisor-vs-builtwith" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-zinc-900 mb-1 text-sm">vs BuiltWith</h3>
            <p className="text-xs text-zinc-500">Privacy risk vs technology identification</p>
          </Link>
          <Link href="/gecko-advisor-vs-mozilla-observatory" className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            <h3 className="font-semibold text-zinc-900 mb-1 text-sm">vs Mozilla Observatory</h3>
            <p className="text-xs text-zinc-500">Full privacy analysis vs header-only scanning</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
