/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gecko Advisor vs SecurityScorecard: Domain Privacy Comparison',
  description:
    'Compare Gecko Advisor and SecurityScorecard for domain risk assessment. See how privacy-focused scanning differs from enterprise security ratings, with feature and pricing comparison.',
  alternates: {
    canonical: 'https://geckoadvisor.com/gecko-advisor-vs-securityscorecard',
  },
  openGraph: {
    title: 'Gecko Advisor vs SecurityScorecard: Domain Privacy Comparison',
    description:
      'Compare Gecko Advisor and SecurityScorecard for domain risk assessment. Privacy-focused scanning vs enterprise security ratings.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gecko Advisor vs SecurityScorecard: Domain Privacy Comparison',
    description:
      'Compare Gecko Advisor and SecurityScorecard for domain risk assessment. Privacy-focused scanning vs enterprise security ratings.',
  },
};

export default function GeckoAdvisorVsSecurityScorecardPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Gecko Advisor vs SecurityScorecard</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Gecko Advisor vs SecurityScorecard
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Both tools assess domain risk. One costs $25,000/year. Here&apos;s what you actually need.
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
                  <th className="text-left p-3 font-semibold text-gray-600">SecurityScorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3 font-medium text-gray-900">Focus</td>
                  <td className="p-3 text-gray-700">Privacy &amp; tracker intelligence</td>
                  <td className="p-3 text-gray-500">Broad cybersecurity ratings</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Pricing</td>
                  <td className="p-3 text-gray-700">Free scanner, API from $49/mo</td>
                  <td className="p-3 text-gray-500">$25,000+/year enterprise</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Scan depth</td>
                  <td className="p-3 text-gray-700">Trackers, cookies, fingerprinting, headers, TLS</td>
                  <td className="p-3 text-gray-500">Network security, patching, DNS, IP reputation</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Data model</td>
                  <td className="p-3 text-gray-700">Evidence-based findings with severity</td>
                  <td className="p-3 text-gray-500">Letter grade (A-F) from aggregated signals</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Time to value</td>
                  <td className="p-3 text-gray-700">Instant scan, no onboarding</td>
                  <td className="p-3 text-gray-500">Weeks of implementation</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">API access</td>
                  <td className="p-3 text-gray-700">REST API, per-domain reports</td>
                  <td className="p-3 text-gray-500">Enterprise contracts only</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Open methodology</td>
                  <td className="p-3 text-gray-700">Published scoring methodology</td>
                  <td className="p-3 text-gray-500">Proprietary algorithm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Where SecurityScorecard Excels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Where SecurityScorecard Excels</h2>
          <p className="text-zinc-700 mb-4">
            SecurityScorecard is built for enterprise security teams managing broad cybersecurity risk across large vendor portfolios. It aggregates signals from network infrastructure, DNS configuration, patching cadence, and IP reputation into a single security rating.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Enterprise security posture</strong> -- Monitors network-level vulnerabilities, open ports, and infrastructure configuration across thousands of vendors simultaneously</li>
            <li><strong>IP reputation analysis</strong> -- Tracks malware associations, botnet participation, and blacklist appearances at the network layer</li>
            <li><strong>Compliance framework mapping</strong> -- Maps findings to SOC 2, ISO 27001, NIST, and other enterprise compliance frameworks</li>
            <li><strong>Board-level reporting</strong> -- Provides executive dashboards and portfolio-level risk views designed for CISO presentations</li>
            <li><strong>Remediation workflows</strong> -- Built-in vendor collaboration tools for communicating and tracking security remediation</li>
          </ul>
          <p className="text-zinc-700 mt-4">
            If your primary concern is network-level security posture across hundreds of enterprise vendors, and you have the budget for enterprise procurement, SecurityScorecard delivers comprehensive coverage in that domain.
          </p>
        </section>

        {/* Where Gecko Advisor Excels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Where Gecko Advisor Excels</h2>
          <p className="text-zinc-700 mb-4">
            Gecko Advisor focuses specifically on what happens when someone visits a website. It analyzes the privacy implications of a domain&apos;s client-side behavior -- the trackers loaded, cookies set, fingerprinting techniques used, and security headers configured.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Tracker detection</strong> -- Identifies every third-party tracking script loaded on visitors, cross-referenced against EasyPrivacy and WhoTracks.me databases</li>
            <li><strong>Cookie audit</strong> -- Categorizes first-party and third-party cookies by purpose, flags missing security attributes (HttpOnly, Secure, SameSite)</li>
            <li><strong>Fingerprinting detection</strong> -- Detects canvas, WebGL, and audio fingerprinting techniques that track users without cookies</li>
            <li><strong>Security header analysis</strong> -- Evaluates CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Frame-Options, and X-Content-Type-Options</li>
            <li><strong>TLS configuration grading</strong> -- Assesses TLS version, cipher suites, certificate validity, and HSTS deployment</li>
            <li><strong>Historical change tracking</strong> -- Monitors score changes, tracker additions and removals, and fingerprinting status over time</li>
            <li><strong>Stability scoring</strong> -- Distinguishes consistently privacy-friendly vendors from those with volatile privacy practices</li>
          </ul>
          <p className="text-zinc-700 mt-4">
            For privacy teams conducting vendor due diligence, Gecko Advisor provides the domain-level privacy intelligence that SecurityScorecard does not cover. The free scanner makes it accessible for teams of any size, and the <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">REST API</Link> enables programmatic integration at a fraction of enterprise pricing.
          </p>
        </section>

        {/* Who Should Use Which */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Who Should Use Which</h2>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Choose SecurityScorecard if:</h3>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>You are a CISO team managing 500+ vendors with enterprise budgets</li>
                <li>Your primary concern is network security posture, not website privacy behavior</li>
                <li>You need compliance framework mapping (SOC 2, ISO 27001, NIST)</li>
                <li>You require board-level reporting with portfolio risk aggregation</li>
                <li>Your procurement process already supports $25K+ annual contracts</li>
              </ul>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Choose Gecko Advisor if:</h3>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>You are a privacy team, compliance officer, or security analyst focused on domain-level behavior</li>
                <li>You need to know what trackers, cookies, and fingerprinting a vendor deploys on visitors</li>
                <li>You want instant results without weeks of onboarding or enterprise procurement</li>
                <li>You need a transparent, published methodology rather than a proprietary black box</li>
                <li>You want API access starting at $49/month instead of $25,000/year</li>
              </ul>
            </div>
          </div>
        </section>

        {/* The Privacy Gap */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">The Privacy Gap</h2>
          <p className="text-zinc-700 mb-4">
            SecurityScorecard tells you if a vendor&apos;s network is secure. It does not tell you what that vendor&apos;s website does to your users when they visit it.
          </p>
          <p className="text-zinc-700 mb-4">
            A vendor can receive an A rating from SecurityScorecard while simultaneously loading 30+ third-party trackers, setting persistent advertising cookies, and deploying canvas fingerprinting on every page load. These are fundamentally different risk vectors.
          </p>
          <p className="text-zinc-700 mb-4">
            Network security and website privacy are complementary dimensions of vendor risk. SecurityScorecard answers: &ldquo;Is this vendor&apos;s infrastructure secure?&rdquo; Gecko Advisor answers: &ldquo;What does this vendor&apos;s website do to visitors?&rdquo;
          </p>
          <p className="text-zinc-700">
            For organizations that care about both questions -- and most privacy-conscious organizations should -- these tools serve different purposes. Gecko Advisor fills the privacy intelligence gap that network-level security ratings leave open.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Is Gecko Advisor a SecurityScorecard replacement?</h3>
              <p className="text-zinc-700">
                No. They assess different dimensions of domain risk. SecurityScorecard evaluates network infrastructure security -- open ports, patching, DNS configuration, IP reputation. Gecko Advisor evaluates website-level privacy behavior -- trackers, cookies, fingerprinting, security headers. If your concern is specifically privacy and tracker risk, Gecko Advisor provides deeper coverage in that area. If you need broad enterprise security ratings, SecurityScorecard is purpose-built for that.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Can I use both tools together?</h3>
              <p className="text-zinc-700">
                Yes, and many vendor risk programs benefit from doing so. Use SecurityScorecard for infrastructure security posture and compliance framework mapping. Use Gecko Advisor for website privacy assessment, tracker detection, and cookie auditing. Together they provide a more complete picture of vendor risk than either tool alone.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">How does pricing compare?</h3>
              <p className="text-zinc-700">
                SecurityScorecard pricing starts at approximately $25,000/year for enterprise contracts, with higher tiers for larger vendor portfolios. Gecko Advisor offers a free scanner for individual assessments and a <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">REST API starting at $49/month</Link> for programmatic access. This makes Gecko Advisor accessible to teams that cannot justify enterprise procurement for privacy-specific assessments.
              </p>
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
            <Link href="/api-access" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Intelligence API</h3>
              <p className="text-sm text-zinc-600">Programmatic access to privacy scores, trackers, and evidence data.</p>
            </Link>
            <Link href="/check-domain-risk" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Risk Checker</h3>
              <p className="text-sm text-zinc-600">Instantly check the privacy risk of any domain.</p>
            </Link>
            <Link href="/vendor-domain-due-diligence" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Vendor Due Diligence</h3>
              <p className="text-sm text-zinc-600">Guide to screening vendor domains before onboarding.</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <footer className="not-prose mt-12 rounded-xl bg-zinc-900 p-8 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-3">Screen a vendor domain now</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Get an instant privacy assessment for any domain -- trackers, cookies, fingerprinting, and security headers analyzed in seconds.
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
  );
}
