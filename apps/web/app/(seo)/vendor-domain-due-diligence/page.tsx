/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vendor Domain Due Diligence Guide',
  description:
    'How to screen vendor domains before onboarding. Automated due diligence checks for third-party trackers, security configuration, and privacy risk.',
  alternates: {
    canonical: 'https://geckoadvisor.com/vendor-domain-due-diligence',
  },
  openGraph: {
    title: 'Vendor Domain Due Diligence Guide',
    description:
      'Screen vendor domains for privacy risk before onboarding with automated tracker detection and security analysis.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vendor Domain Due Diligence Guide',
    description:
      'Screen vendor domains for privacy risk before onboarding with automated tracker detection and security analysis.',
  },
};

export default function VendorDueDiligencePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Vendor Domain Due Diligence</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Vendor Domain Due Diligence
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Screen vendor domains before onboarding to identify privacy risk, tracking behavior, and security gaps in your supply chain.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Why Vendor Domain Screening Matters</h2>
          <p className="text-zinc-700 mb-4">
            Every vendor you integrate introduces third-party risk. Their domains load scripts on your users&apos; browsers, set cookies, and may transmit data to advertising networks. Without screening, you inherit their privacy practices.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Supply chain risk</strong> — Vendors embed trackers that follow your users across the web</li>
            <li><strong>Compliance exposure</strong> — Unvetted vendors can violate GDPR, CCPA, and other privacy regulations</li>
            <li><strong>Security surface</strong> — Missing security headers and weak TLS configuration increase attack vectors</li>
            <li><strong>Reputation impact</strong> — Users associate your brand with the privacy practices of your vendors</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What to Check</h2>
          <p className="text-zinc-700 mb-4">
            A thorough vendor domain assessment examines observable behavior, not policy promises:
          </p>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Third-Party Trackers</h3>
              <p className="text-sm text-zinc-600">How many external tracking scripts does the vendor load? Are they advertising trackers or necessary analytics?</p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Cookie Practices</h3>
              <p className="text-sm text-zinc-600">Are cookies secured with HttpOnly, Secure, and SameSite flags? How many third-party cookies are set?</p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Fingerprinting Detection</h3>
              <p className="text-sm text-zinc-600">Does the vendor use canvas, WebGL, or audio fingerprinting to track visitors without cookies?</p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">Security Headers</h3>
              <p className="text-sm text-zinc-600">Are CSP, HSTS, Referrer-Policy, and Permissions-Policy properly configured?</p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-1">TLS Configuration</h3>
              <p className="text-sm text-zinc-600">Is the vendor using TLS 1.3? Is HSTS enabled? Are certificates valid and properly configured?</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">How to Automate Due Diligence</h2>
          <p className="text-zinc-700 mb-4">
            Manual vendor screening doesn&apos;t scale. Automated domain intelligence provides consistent, repeatable assessments:
          </p>
          <ol className="space-y-3 text-zinc-700">
            <li><strong>Scan vendor domains</strong> before signing contracts using the <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Domain Risk Checker</Link></li>
            <li><strong>Integrate programmatically</strong> with the <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">Domain Intelligence API</Link> in your procurement workflow</li>
            <li><strong>Monitor continuously</strong> with daily rescanning to detect changes in vendor privacy practices</li>
            <li><strong>Benchmark against peers</strong> to understand whether vendor practices are above or below industry norms</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">GeckoAdvisor&apos;s Approach</h2>
          <p className="text-zinc-700 mb-4">
            GeckoAdvisor monitors 142K+ domains daily, providing the data infrastructure for vendor privacy assessment:
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li>Automated scanning against known tracker databases (EasyPrivacy, WhoTracks.me)</li>
            <li>Deterministic scoring with <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">published methodology</Link> and penalty breakdowns</li>
            <li>Stability scoring to distinguish consistently good vendors from volatile ones</li>
            <li>Change detection with historical tracking for audit trails</li>
          </ul>
        </section>

        <footer className="pt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Check a domain</Link>
            <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">API access</Link>
            <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">Methodology</Link>
            <Link href="/transparency-reports" className="text-emerald-600 hover:text-emerald-700 underline">Transparency</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
