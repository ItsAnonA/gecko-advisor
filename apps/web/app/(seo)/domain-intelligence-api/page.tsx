/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';
import { SampleRequestForm } from '@/components/conversion/SampleRequestForm';

export const metadata: Metadata = {
  title: 'Domain Intelligence API',
  description:
    'Real-time domain risk data for vendor screening and compliance workflows. Programmatic access to privacy scores, tracker detection, and stability metrics across 142K+ domains.',
  alternates: {
    canonical: 'https://geckoadvisor.com/domain-intelligence-api',
  },
  openGraph: {
    title: 'Domain Intelligence API',
    description:
      'Real-time domain risk data for vendor screening and compliance workflows. Privacy scores, tracker detection, and stability metrics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Domain Intelligence API',
    description:
      'Real-time domain risk data for vendor screening and compliance workflows.',
  },
};

// Revalidate every 5 minutes for fresh stats
export const revalidate = 300;

// Fetch live stats from backend (ISR cached)
async function getApiStats(): Promise<{ domainCount: number; totalScans: number } | null> {
  try {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${apiUrl}/api/v2/stats`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default async function DomainIntelligenceApiPage() {
  const stats = await getApiStats();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Domain Intelligence API</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
          Domain Intelligence API
        </h1>
        <p className="text-xl text-zinc-600 leading-relaxed max-w-2xl">
          Real-time domain risk data for vendor screening and compliance workflows.
        </p>

        {/* Live Stats Badges */}
        {stats && (
          <div className="flex flex-wrap gap-3 mt-6">
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
      </header>

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
        <div className="grid gap-4 md:grid-cols-2 mb-6">
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

        {/* Sample Response */}
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-800 px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">GET</span>
            <span className="text-xs font-mono text-zinc-300">/api/v2/domain/example.com</span>
          </div>
          <pre className="bg-zinc-900 text-zinc-100 p-4 text-sm overflow-x-auto font-mono leading-relaxed">
{`{
  "scan": {
    "score": 72,
    "label": "C",
    "status": "done",
    "finishedAt": "2026-02-28T03:00:00Z"
  },
  "meta": {
    "trackerCount": 8,
    "cookieCount": 12,
    "tlsGrade": "A",
    "benchmarks": {
      "percentile": 65,
      "comparedToAverage": +4
    }
  },
  "evidence": [
    {
      "kind": "tracker",
      "title": "Google Analytics detected",
      "severity": 3
    }
  ]
}`}
          </pre>
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

      {/* CTA */}
      <section className="mb-12 p-8 rounded-xl border-2 border-advisor-200 bg-advisor-50/50 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">Get API Access</h2>
        <p className="text-zinc-600 mb-6 max-w-lg mx-auto">
          Start integrating domain intelligence into your vendor screening and compliance workflows.
        </p>
        <div className="max-w-md mx-auto mb-6">
          <SampleRequestForm />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/check-domain-risk"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-advisor-500 text-white font-semibold hover:bg-advisor-600 transition-colors"
          >
            Try the free checker
          </Link>
          <a
            href="mailto:api@geckoadvisor.com"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-advisor-500 text-advisor-600 font-semibold hover:bg-advisor-50 transition-colors"
          >
            Contact for API access
          </a>
        </div>
      </section>

      {/* Footer links */}
      <footer className="pt-8 border-t border-zinc-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Domain risk checker</Link>
          <Link href="/vendor-domain-due-diligence" className="text-emerald-600 hover:text-emerald-700 underline">Vendor due diligence</Link>
          <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">Methodology</Link>
          <Link href="/transparency-reports" className="text-emerald-600 hover:text-emerald-700 underline">Transparency</Link>
        </div>
      </footer>
    </main>
  );
}
