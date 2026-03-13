/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gecko Advisor vs Mozilla Observatory: Security Scanner Comparison',
  description:
    'Compare Gecko Advisor and Mozilla Observatory for website security and privacy scanning. See how full privacy analysis differs from HTTP header-only checks.',
  alternates: {
    canonical: 'https://geckoadvisor.com/gecko-advisor-vs-mozilla-observatory',
  },
  openGraph: {
    title: 'Gecko Advisor vs Mozilla Observatory: Security Scanner Comparison',
    description:
      'Compare Gecko Advisor and Mozilla Observatory for website security and privacy scanning.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gecko Advisor vs Mozilla Observatory: Security Scanner Comparison',
    description:
      'Compare Gecko Advisor and Mozilla Observatory for website security and privacy scanning.',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is Gecko Advisor a Mozilla Observatory replacement?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For security header analysis specifically, both tools evaluate similar headers, but Observatory provides more granular CSP recommendations. For overall privacy and security assessment — including trackers, cookies, fingerprinting, and TLS — Gecko Advisor provides substantially broader coverage. Many teams use both.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why would I pay for Gecko Advisor when Observatory is free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Gecko Advisor\'s free scanner provides the same zero-cost entry point for individual scans. The paid API is for teams needing programmatic access to privacy data for procurement workflows, vendor monitoring at scale, or privacy risk dashboards. Observatory does not offer this level of integration, and its scope is limited to HTTP headers.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which is more accurate for security headers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Both tools evaluate core security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). Observatory provides more detailed CSP analysis. Gecko Advisor shows how security header configuration interacts with overall privacy posture — for example, whether a site has CSP configured but still loads trackers allowed by that policy.',
      },
    },
  ],
};

export default function GeckoAdvisorVsMozillaObservatoryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Gecko Advisor vs Mozilla Observatory</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Gecko Advisor vs Mozilla Observatory
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Observatory checks your headers. Gecko Advisor checks everything a visitor experiences.
          </p>
        </header>

        {/* Quick Comparison Table */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Quick Comparison</h2>
          <div className="overflow-x-auto my-8 not-prose">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-900">Feature</th>
                  <th className="text-left p-3 font-semibold text-advisor-700">Gecko Advisor</th>
                  <th className="text-left p-3 font-semibold text-gray-600">Mozilla Observatory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3 font-medium text-gray-900">Focus</td>
                  <td className="p-3 text-gray-700">Full privacy &amp; security analysis</td>
                  <td className="p-3 text-gray-500">HTTP security headers only</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Scope</td>
                  <td className="p-3 text-gray-700">Trackers, cookies, fingerprinting, headers, TLS</td>
                  <td className="p-3 text-gray-500">CSP, HSTS, X-Frame-Options, X-Content-Type-Options</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Privacy scoring</td>
                  <td className="p-3 text-gray-700">0-100 privacy score with grade</td>
                  <td className="p-3 text-gray-500">A+ to F header score</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Tracker detection</td>
                  <td className="p-3 text-gray-700">Yes, with third-party identification</td>
                  <td className="p-3 text-gray-500">No</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Cookie analysis</td>
                  <td className="p-3 text-gray-700">Yes, categorized by purpose</td>
                  <td className="p-3 text-gray-500">No</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Fingerprinting</td>
                  <td className="p-3 text-gray-700">Yes, canvas/WebGL/audio</td>
                  <td className="p-3 text-gray-500">No</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">TLS grading</td>
                  <td className="p-3 text-gray-700">Yes, TLS version and cipher analysis</td>
                  <td className="p-3 text-gray-500">Partial (HSTS only)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Change tracking</td>
                  <td className="p-3 text-gray-700">Historical score changes, trend analysis</td>
                  <td className="p-3 text-gray-500">No history</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">API</td>
                  <td className="p-3 text-gray-700">REST API with per-domain data</td>
                  <td className="p-3 text-gray-500">Public API (limited)</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Pricing</td>
                  <td className="p-3 text-gray-700">Free scanner, API from $49/mo</td>
                  <td className="p-3 text-gray-500">Completely free</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Where Mozilla Observatory Excels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Where Mozilla Observatory Excels</h2>
          <p className="text-zinc-700 mb-4">
            Mozilla Observatory is a focused, free tool for evaluating HTTP security header configuration. Built by Mozilla&apos;s security team, it provides specific, actionable recommendations for hardening your website&apos;s header configuration.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Free and open-source</strong> -- Completely free to use with no usage limits, backed by Mozilla&apos;s reputation and open-source development model</li>
            <li><strong>Focused HTTP header analysis</strong> -- Deep evaluation of Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and other security headers</li>
            <li><strong>Actionable CSP recommendations</strong> -- Provides specific guidance on building and improving Content-Security-Policy headers, including inline script handling and nonce configuration</li>
            <li><strong>Community trust</strong> -- Developed and maintained by Mozilla, with widespread adoption in the web security community and integration with other Mozilla security tools</li>
            <li><strong>Third-party integration</strong> -- Aggregates results from additional scanners like SSL Labs, ImmuniWeb, and Security Headers into a single view</li>
          </ul>
          <p className="text-zinc-700 mt-4">
            For developers focused on hardening their own website&apos;s security headers, Mozilla Observatory provides a best-in-class, focused analysis with clear remediation guidance.
          </p>
        </section>

        {/* Where Gecko Advisor Excels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Where Gecko Advisor Excels</h2>
          <p className="text-zinc-700 mb-4">
            Gecko Advisor evaluates the complete visitor experience, not just HTTP headers. It renders the page in a real browser, observes all network requests, and analyzes the full privacy and security posture of a domain.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Comprehensive privacy analysis</strong> -- Evaluates trackers, cookies, fingerprinting, security headers, and TLS in a single scan rather than headers alone</li>
            <li><strong>Third-party tracker ecosystem mapping</strong> -- Identifies every third-party request, classifies trackers by category (advertising, analytics, social), and cross-references against known tracking databases</li>
            <li><strong>Cookie audit</strong> -- Full analysis of first-party and third-party cookies including purposes, lifetimes, and security attribute coverage (HttpOnly, Secure, SameSite)</li>
            <li><strong>Fingerprinting detection</strong> -- Identifies canvas, WebGL, and audio fingerprinting techniques that operate independently of security headers and cookies</li>
            <li><strong>Historical change tracking</strong> -- Monitors how a domain&apos;s privacy posture changes over time, with trend analysis and stability scoring for <Link href="/vendor-domain-due-diligence" className="text-emerald-600 hover:text-emerald-700 underline">vendor due diligence</Link></li>
            <li><strong>Vendor risk context</strong> -- Built for assessing third-party vendor domains, not just your own site, with features designed for privacy teams and compliance workflows</li>
            <li><strong>Deterministic scoring</strong> -- A transparent 0-100 privacy score with <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">published methodology</Link> showing exactly how each finding contributes to the overall score</li>
          </ul>
        </section>

        {/* Use Both Together */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Use Both Together</h2>
          <p className="text-zinc-700 mb-4">
            Mozilla Observatory and Gecko Advisor are complementary tools that together provide a thorough security and privacy assessment.
          </p>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">For your own website</h3>
              <p className="text-sm text-zinc-600">
                Run Mozilla Observatory first to get specific header hardening recommendations. Implement those recommendations, then run Gecko Advisor to assess the broader privacy posture -- including whether third-party scripts you load are undermining the security headers you just configured.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">For vendor assessment</h3>
              <p className="text-sm text-zinc-600">
                Use Gecko Advisor as your primary tool for vendor privacy assessment. Its comprehensive analysis covers everything Observatory checks (security headers) plus everything it does not (trackers, cookies, fingerprinting, TLS grading). Observatory can supplement with detailed CSP recommendations if you need to advise a vendor on specific header improvements.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">For ongoing monitoring</h3>
              <p className="text-sm text-zinc-600">
                Observatory provides a point-in-time header check with no history. Gecko Advisor tracks changes over time, showing whether a domain&apos;s privacy practices are improving, declining, or volatile. For ongoing vendor monitoring, Gecko Advisor&apos;s change detection and stability scoring provide the longitudinal view that Observatory lacks.
              </p>
            </div>
          </div>
        </section>

        {/* A Note on Scope */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">A Note on Scope</h2>
          <p className="text-zinc-700 mb-4">
            It is worth understanding what each tool&apos;s score actually measures. A website can receive an A+ from Mozilla Observatory (all security headers perfectly configured) while simultaneously receiving a low score from Gecko Advisor (loading dozens of trackers, setting persistent cookies, and deploying fingerprinting).
          </p>
          <p className="text-zinc-700 mb-4">
            This is not a contradiction. Observatory measures whether the server sends the right HTTP headers. Gecko Advisor measures what happens in the visitor&apos;s browser. A site can have excellent header configuration while still loading third-party scripts that track visitors across the web.
          </p>
          <p className="text-zinc-700">
            Security headers are necessary but not sufficient for privacy. They protect against certain attack vectors (clickjacking, XSS, protocol downgrades) but do not prevent the site itself from loading advertising trackers, setting third-party cookies, or deploying fingerprinting techniques. A complete privacy assessment requires examining both.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Is Gecko Advisor a Mozilla Observatory replacement?</h3>
              <p className="text-zinc-700">
                For security header analysis specifically, both tools evaluate similar headers, but Observatory provides more granular CSP recommendations. For overall privacy and security assessment -- including trackers, cookies, fingerprinting, and TLS -- Gecko Advisor provides substantially broader coverage. Many teams use both: Observatory for header-specific hardening guidance, and Gecko Advisor for comprehensive privacy risk assessment.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Why would I pay for Gecko Advisor when Observatory is free?</h3>
              <p className="text-zinc-700">
                Gecko Advisor&apos;s free scanner provides the same zero-cost entry point for individual scans. The paid <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">API</Link> is for teams that need programmatic access to privacy data -- integrating vendor screening into procurement workflows, monitoring vendor domains at scale, or building privacy risk dashboards. Observatory does not offer this level of integration or data depth, and its scope is limited to HTTP headers.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Which is more accurate for security headers?</h3>
              <p className="text-zinc-700">
                Both tools evaluate core security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). Observatory provides more detailed CSP analysis and specific implementation recommendations. Gecko Advisor provides broader context by showing how security header configuration interacts with the site&apos;s overall privacy posture -- for example, whether a site has CSP configured but still loads trackers allowed by that policy.
              </p>
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
            <Link href="/how-to-evaluate-domain-security" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Security Evaluation Guide</h3>
              <p className="text-sm text-zinc-600">6-point checklist for evaluating domain security configuration.</p>
            </Link>
            <Link href="/check-domain-risk" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Risk Checker</h3>
              <p className="text-sm text-zinc-600">Instantly check the privacy risk of any domain.</p>
            </Link>
            <Link href="/methodology" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Scoring Methodology</h3>
              <p className="text-sm text-zinc-600">How the Gecko Advisor privacy score is calculated.</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <footer className="not-prose mt-12 rounded-xl bg-zinc-900 p-8 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-3">Go beyond security headers</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Get a complete privacy and security assessment -- trackers, cookies, fingerprinting, headers, and TLS analyzed in a single scan.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              Scan a Website
            </Link>
            <Link
              href="/api-access"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-zinc-600 text-zinc-300 font-semibold hover:bg-zinc-800 transition-colors"
            >
              API Access
            </Link>
          </div>
        </footer>
      </article>
    </main>
    </>
  );
}
