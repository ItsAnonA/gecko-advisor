/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const revalidate = 300; // 5-min ISR for live stats

export const metadata: Metadata = {
  title: 'Domain Risk Screening API',
  description:
    'Screen domains before onboarding vendors, partners, or clients. Privacy scores, tracker counts, stability trends — one API call per domain.',
  alternates: { canonical: 'https://geckoadvisor.com/api-access' },
  openGraph: {
    title: 'Domain Risk Screening API',
    description:
      'Screen domains before onboarding vendors, partners, or clients. Privacy scores, tracker counts, stability trends — one API call per domain.',
    type: 'website',
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
    price: '$999',
    period: ' one-time',
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
    a: 'Yes. Email api@geckoadvisor.com with any domain and we\'ll send you the full JSON response within 24 hours. No commitment, no credit card.',
  },
  {
    q: 'How do I authenticate?',
    a: 'Include your API key as a Bearer token: Authorization: Bearer ga_your_key_here. Keys are provisioned automatically after payment. View your key and usage at /api-access/dashboard.',
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
      <section className="mb-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
          Domain Risk Screening API
        </h1>
        <p className="text-xl text-zinc-600 leading-relaxed max-w-2xl">
          Screen domains before onboarding vendors, partners, or clients.
          Privacy scores, tracker counts, stability trends — one API call per domain.
        </p>
      </section>

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

      {/* Free Sample Offer */}
      <section className="bg-advisor-50 border border-advisor-200 rounded-2xl p-8 mb-12 text-center">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Try Before You Buy</h2>
        <p className="text-zinc-600 mb-4">
          Email us any domain and get the full API response — free, no commitment.
        </p>
        <a
          href="mailto:api@geckoadvisor.com?subject=Free%20API%20Sample%20Request&body=Domain%20I%27d%20like%20to%20check%3A%20"
          className="inline-block bg-advisor-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-advisor-700 transition-colors"
        >
          Email api@geckoadvisor.com
        </a>
      </section>

      {/* Trust Block */}
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

      {/* Sample API Response */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Sample Response</h2>
        <div className="relative">
          <div className="absolute top-3 right-3 text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded font-mono">
            GET /api/v1/domain/example.com
          </div>
          <pre className="bg-zinc-900 text-emerald-400 rounded-xl p-6 font-mono text-sm overflow-x-auto leading-relaxed">
            {SAMPLE_RESPONSE}
          </pre>
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
    </main>
  );
}
