/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import { DomainChecker } from '@/components/domain-check/DomainChecker';

export const metadata: Metadata = {
  title: 'Free Domain Risk Checker',
  description:
    'Check any domain for privacy risk — trackers, fingerprinting, cookies, and security configuration. Free instant lookup across 142K+ monitored domains.',
  alternates: {
    canonical: 'https://geckoadvisor.com/check-domain-risk',
  },
  openGraph: {
    title: 'Free Domain Risk Checker',
    description: 'Free domain privacy risk lookup. Check any domain for trackers, fingerprinting, and security issues.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Domain Risk Checker',
    description: 'Free domain privacy risk lookup. Check any domain for trackers, fingerprinting, and security issues.',
  },
};

export default function CheckDomainRiskPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Domain Risk Checker</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
          Domain Risk Checker
        </h1>
        <p className="text-xl text-zinc-600 leading-relaxed">
          Check any domain for privacy risk signals. Instant lookup across our monitored domain database.
        </p>
      </header>

      {/* Interactive Checker */}
      <DomainChecker />

      {/* What This Checks */}
      <section className="mt-12 mb-10">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What This Checks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-4 border border-zinc-200 rounded-lg">
            <h3 className="font-semibold text-zinc-900 text-sm mb-1">Privacy Score</h3>
            <p className="text-xs text-zinc-600">Deterministic 0-100 score based on observable behavior</p>
          </div>
          <div className="p-4 border border-zinc-200 rounded-lg">
            <h3 className="font-semibold text-zinc-900 text-sm mb-1">Tracker Detection</h3>
            <p className="text-xs text-zinc-600">Third-party trackers from known databases</p>
          </div>
          <div className="p-4 border border-zinc-200 rounded-lg">
            <h3 className="font-semibold text-zinc-900 text-sm mb-1">Stability Metrics</h3>
            <p className="text-xs text-zinc-600">Volatility index and confidence tier</p>
          </div>
          <div className="p-4 border border-zinc-200 rounded-lg">
            <h3 className="font-semibold text-zinc-900 text-sm mb-1">Security Headers</h3>
            <p className="text-xs text-zinc-600">CSP, HSTS, TLS configuration assessment</p>
          </div>
        </div>
      </section>

      {/* Who Uses This */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Who Uses This</h2>
        <ul className="space-y-2 text-zinc-700">
          <li><strong>Vendor risk teams</strong> screening third-party domains before onboarding</li>
          <li><strong>Security analysts</strong> evaluating domain privacy posture during investigations</li>
          <li><strong>Compliance officers</strong> documenting due diligence for audits</li>
          <li><strong>Developers</strong> checking third-party dependencies before integration</li>
        </ul>
      </section>

      {/* API CTA */}
      <section className="p-6 rounded-xl border-2 border-advisor-200 bg-advisor-50/50">
        <h3 className="font-bold text-zinc-900 mb-2">Need programmatic access?</h3>
        <p className="text-sm text-zinc-600 mb-4">
          Integrate domain risk checks into your procurement, compliance, or security workflows.
        </p>
        <Link
          href="/domain-intelligence-api"
          className="inline-flex items-center gap-2 text-sm font-semibold text-advisor-600 hover:text-advisor-700 transition-colors"
        >
          Domain Intelligence API
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </section>

      {/* Footer links */}
      <footer className="pt-8 mt-8 border-t border-zinc-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/domain-intelligence-api" className="text-emerald-600 hover:text-emerald-700 underline">API access</Link>
          <Link href="/vendor-domain-due-diligence" className="text-emerald-600 hover:text-emerald-700 underline">Vendor due diligence</Link>
          <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">Methodology</Link>
        </div>
      </footer>
    </main>
  );
}
