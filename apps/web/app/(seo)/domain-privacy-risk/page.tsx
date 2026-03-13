/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Domain Privacy Risk Assessment',
  description:
    'Understand domain privacy risk signals — trackers, fingerprinting, cookies, and security configuration. Free domain risk lookup and assessment methodology.',
  alternates: {
    canonical: 'https://geckoadvisor.com/domain-privacy-risk',
  },
  openGraph: {
    title: 'Domain Privacy Risk Assessment',
    description:
      'Understand domain privacy risk signals — trackers, fingerprinting, cookies, and security configuration.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Domain Privacy Risk Assessment',
    description:
      'Understand domain privacy risk signals — trackers, fingerprinting, cookies, and security configuration.',
  },
};

export default function DomainPrivacyRiskPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Domain Privacy Risk Assessment</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Domain Privacy Risk Assessment
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Understand what makes a domain high or low risk for privacy, and how to assess the signals that matter.
          </p>
        </header>

        {/* What Is Domain Privacy Risk */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What Is Domain Privacy Risk</h2>
          <p className="text-zinc-700 mb-4">
            Domain privacy risk measures how aggressively a website collects, shares, and exposes visitor data. It is determined by observable technical signals — the scripts a page loads, the cookies it sets, the security headers it configures, and the encryption protocols it uses.
          </p>
          <p className="text-zinc-700 mb-4">
            A high-risk domain loads many third-party trackers, uses fingerprinting techniques to identify visitors without consent, sets insecure cookies, and lacks basic security headers. A low-risk domain minimizes external connections, secures its cookies, and implements defense-in-depth with proper headers and modern TLS.
          </p>
          <p className="text-zinc-700">
            Privacy risk is not a binary judgment. It exists on a spectrum, and different signals carry different weight. A single advertising tracker is a minor concern; active fingerprinting combined with 20+ trackers and missing security headers is a serious one.
          </p>
        </section>

        {/* Signals We Track */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Signals We Track</h2>
          <p className="text-zinc-700 mb-4">
            GeckoAdvisor assesses domain privacy risk across five signal categories:
          </p>
          <ul className="space-y-3 text-zinc-700">
            <li>
              <strong className="text-zinc-900">Trackers</strong> — Third-party scripts from known tracking networks (ad tech, analytics, retargeting). Matched against EasyPrivacy and WhoTracks.me databases. More trackers means more data shared with external parties.
            </li>
            <li>
              <strong className="text-zinc-900">Fingerprinting</strong> — Techniques that identify users without cookies: canvas fingerprinting, WebGL rendering, audio context analysis, and font enumeration. These are difficult for users to detect or prevent.
            </li>
            <li>
              <strong className="text-zinc-900">Cookies</strong> — First-party and third-party cookies, their security flags (Secure, HttpOnly, SameSite), duration, and purpose. Insecure cookies can be intercepted or used for cross-site tracking.
            </li>
            <li>
              <strong className="text-zinc-900">Security Headers</strong> — HTTP response headers that protect visitors: Content-Security-Policy (CSP), HTTP Strict Transport Security (HSTS), Referrer-Policy, Permissions-Policy, and X-Content-Type-Options.
            </li>
            <li>
              <strong className="text-zinc-900">TLS Configuration</strong> — Encryption protocol version, certificate validity, and HSTS enforcement. Modern TLS 1.3 with HSTS provides the strongest transport security.
            </li>
          </ul>
        </section>

        {/* High vs Low Risk */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">High vs Low Risk</h2>
          <p className="text-zinc-700 mb-4">
            The following table summarizes key differences between low-risk and high-risk domain configurations:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 pr-4 font-semibold text-zinc-900">Signal</th>
                  <th className="text-left py-3 pr-4 font-semibold text-zinc-900">Low Risk</th>
                  <th className="text-left py-3 font-semibold text-zinc-900">High Risk</th>
                </tr>
              </thead>
              <tbody className="text-zinc-700">
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Trackers</td>
                  <td className="py-3 pr-4">0&ndash;3 trackers</td>
                  <td className="py-3">15+ trackers</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Fingerprinting</td>
                  <td className="py-3 pr-4">Not detected</td>
                  <td className="py-3">Active fingerprinting</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Cookies</td>
                  <td className="py-3 pr-4">Proper security flags</td>
                  <td className="py-3">Missing Secure/HttpOnly</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Security Headers</td>
                  <td className="py-3 pr-4">CSP, HSTS, Referrer-Policy</td>
                  <td className="py-3">Missing key headers</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">TLS</td>
                  <td className="py-3 pr-4">TLS 1.3 with HSTS</td>
                  <td className="py-3">TLS 1.2 without HSTS</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Score</td>
                  <td className="py-3 pr-4">80&ndash;100</td>
                  <td className="py-3">0&ndash;59</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Check a Domain */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Check a Domain</h2>
          <p className="text-zinc-700 mb-4">
            Use the <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Domain Risk Checker</Link> to scan any domain and receive a full privacy risk assessment. The scan runs in under 60 seconds and produces an evidence-based report with specific findings, severity ratings, and actionable recommendations.
          </p>
          <p className="text-zinc-700">
            For programmatic access, the <Link href="/domain-intelligence-api" className="text-emerald-600 hover:text-emerald-700 underline">Domain Intelligence API</Link> provides the same assessment data in a structured format suitable for integration into security dashboards, procurement workflows, and compliance tooling.
          </p>
        </section>

        {/* Methodology */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Methodology</h2>
          <p className="text-zinc-700 mb-4">
            Privacy scores start at 100 and are reduced based on detected issues. Each signal category has a maximum penalty cap to prevent single issues from dominating the overall score. Tracker detection uses EasyPrivacy and WhoTracks.me as reference databases. Security header assessment follows Mozilla Observatory recommendations.
          </p>
          <p className="text-zinc-700">
            For the full scoring breakdown, category weights, and limitation disclosures, see the <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">complete methodology page</Link>.
          </p>
        </section>

        <footer className="pt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Check a domain</Link>
            <Link href="/domain-intelligence-api" className="text-emerald-600 hover:text-emerald-700 underline">API access</Link>
            <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">Methodology</Link>
            <Link href="/vendor-domain-due-diligence" className="text-emerald-600 hover:text-emerald-700 underline">Vendor due diligence</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
