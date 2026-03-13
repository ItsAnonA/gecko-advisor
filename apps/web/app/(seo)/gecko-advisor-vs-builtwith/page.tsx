/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gecko Advisor vs BuiltWith: Technology Detection Comparison',
  description:
    'Compare Gecko Advisor and BuiltWith for technology detection and privacy risk. See how privacy scoring differs from technology stack identification.',
  alternates: {
    canonical: 'https://geckoadvisor.com/gecko-advisor-vs-builtwith',
  },
  openGraph: {
    title: 'Gecko Advisor vs BuiltWith: Technology Detection Comparison',
    description:
      'Compare Gecko Advisor and BuiltWith for technology detection and privacy risk assessment.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gecko Advisor vs BuiltWith: Technology Detection Comparison',
    description:
      'Compare Gecko Advisor and BuiltWith for technology detection and privacy risk assessment.',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does Gecko Advisor replace BuiltWith?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. BuiltWith is a technology identification platform that tells you what tools a website uses. Gecko Advisor is a privacy risk assessment platform that tells you what privacy impact those tools have on visitors. For technology stack profiling, use BuiltWith. For privacy risk assessment, use Gecko Advisor.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which is better for vendor screening?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'For privacy-focused vendor screening, Gecko Advisor provides more actionable data with privacy scores, risk factors, and change tracking. BuiltWith identifies technologies but does not assess whether they create privacy risk. For a complete vendor assessment, using both tools provides the most comprehensive view.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does pricing compare?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BuiltWith offers limited free lookups with Pro plans starting at $295/month. Gecko Advisor provides a free scanner and a REST API starting at $49/month for programmatic privacy risk data.',
      },
    },
  ],
};

export default function GeckoAdvisorVsBuiltWithPage() {
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
          <li className="text-zinc-700 font-medium">Gecko Advisor vs BuiltWith</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            Gecko Advisor vs BuiltWith
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            BuiltWith tells you what tech a site uses. Gecko Advisor tells you what that tech does to visitors.
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
                  <th className="text-left p-3 font-semibold text-gray-600">BuiltWith</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3 font-medium text-gray-900">Focus</td>
                  <td className="p-3 text-gray-700">Privacy risk from technologies</td>
                  <td className="p-3 text-gray-500">Technology stack identification</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Tracker detection</td>
                  <td className="p-3 text-gray-700">Deep privacy analysis per tracker</td>
                  <td className="p-3 text-gray-500">Lists technologies detected</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Risk scoring</td>
                  <td className="p-3 text-gray-700">Privacy score 0-100 with evidence</td>
                  <td className="p-3 text-gray-500">No risk scoring</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Cookie analysis</td>
                  <td className="p-3 text-gray-700">Full cookie audit (1st/3rd party, purpose)</td>
                  <td className="p-3 text-gray-500">Not available</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Fingerprinting</td>
                  <td className="p-3 text-gray-700">Canvas, WebGL, audio detection</td>
                  <td className="p-3 text-gray-500">Not available</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Security headers</td>
                  <td className="p-3 text-gray-700">CSP, HSTS, X-Frame-Options analysis</td>
                  <td className="p-3 text-gray-500">Not available</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Pricing</td>
                  <td className="p-3 text-gray-700">Free scanner, API from $49/mo</td>
                  <td className="p-3 text-gray-500">Free limited, Pro from $295/mo</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-gray-900">Use case</td>
                  <td className="p-3 text-gray-700">Vendor privacy risk assessment</td>
                  <td className="p-3 text-gray-500">Market research, lead generation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Where BuiltWith Excels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Where BuiltWith Excels</h2>
          <p className="text-zinc-700 mb-4">
            BuiltWith is the industry standard for technology profiling. It identifies the full technology stack behind any website -- from content management systems and hosting providers to analytics tools, advertising platforms, and JavaScript frameworks.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Market research</strong> -- Track technology adoption across millions of websites, identify market share by technology category, and monitor competitive technology choices</li>
            <li><strong>Competitive intelligence</strong> -- See exactly what technology stack your competitors use, including A/B testing tools, email platforms, and payment processors</li>
            <li><strong>Lead generation</strong> -- Build targeted prospect lists based on technology usage, such as &ldquo;all websites using Shopify and Klaviyo in the US&rdquo;</li>
            <li><strong>Technology market share</strong> -- Comprehensive historical data on technology adoption trends, market penetration, and growth trajectories across the web</li>
            <li><strong>Historical technology adoption</strong> -- Track when websites added or removed specific technologies, with archives going back years</li>
          </ul>
          <p className="text-zinc-700 mt-4">
            If your goal is understanding what technologies a website uses for market research or sales prospecting, BuiltWith provides the deepest technology identification database available.
          </p>
        </section>

        {/* Where Gecko Advisor Excels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Where Gecko Advisor Excels</h2>
          <p className="text-zinc-700 mb-4">
            Gecko Advisor goes beyond identifying technologies to analyze their privacy impact. Rather than listing that a site uses Google Analytics, Gecko Advisor evaluates whether that tracker is configured in a privacy-respecting manner, what data it collects, and how it contributes to the overall privacy risk profile.
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Privacy compliance assessment</strong> -- Evaluate whether a vendor&apos;s technology choices create GDPR, CCPA, or ePrivacy compliance risks for your organization</li>
            <li><strong>Tracker risk analysis</strong> -- Not just detection but classification: which trackers are advertising networks, which are analytics, and what privacy implications each carries</li>
            <li><strong>Cookie audit with security attributes</strong> -- Analyze cookie purposes, lifetimes, and security flags (HttpOnly, Secure, SameSite) that BuiltWith does not evaluate</li>
            <li><strong>Fingerprinting detection</strong> -- Identify advanced tracking techniques (canvas, WebGL, audio fingerprinting) that operate without cookies and bypass consent mechanisms</li>
            <li><strong>Security header validation</strong> -- Assess CSP, HSTS, Referrer-Policy, and Permissions-Policy configuration that directly affects visitor privacy and security</li>
            <li><strong>Evidence-based scoring</strong> -- A deterministic 0-100 privacy score with <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">published methodology</Link>, showing exactly which findings contributed to the score</li>
            <li><strong>Vendor due diligence</strong> -- Purpose-built for <Link href="/vendor-domain-due-diligence" className="text-emerald-600 hover:text-emerald-700 underline">screening vendor domains</Link> before onboarding, with historical change tracking and stability scoring</li>
          </ul>
        </section>

        {/* Complementary Tools */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Complementary Tools</h2>
          <p className="text-zinc-700 mb-4">
            BuiltWith and Gecko Advisor answer fundamentally different questions, and using both provides a more complete picture of vendor technology risk.
          </p>
          <div className="space-y-4">
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Step 1: Identify with BuiltWith</h3>
              <p className="text-sm text-zinc-600">
                Use BuiltWith to catalog the technologies a vendor deploys. Identify their analytics platform, advertising network integrations, CMS, hosting provider, and third-party service dependencies.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Step 2: Assess risk with Gecko Advisor</h3>
              <p className="text-sm text-zinc-600">
                Use Gecko Advisor to evaluate the privacy risk those technologies create for visitors. Understand which trackers are actively collecting data, whether fingerprinting is deployed, and how security headers protect (or fail to protect) user privacy.
              </p>
            </div>
            <div className="p-4 border border-zinc-200 rounded-lg">
              <h3 className="font-semibold text-zinc-900 mb-2">Step 3: Monitor changes</h3>
              <p className="text-sm text-zinc-600">
                BuiltWith tracks technology stack changes over time. Gecko Advisor tracks the privacy impact of those changes -- whether new technologies improved or degraded the vendor&apos;s privacy score, and whether tracker counts increased or decreased.
              </p>
            </div>
          </div>
          <p className="text-zinc-700 mt-4">
            Together, you get both the &ldquo;what&rdquo; (BuiltWith) and the &ldquo;so what&rdquo; (Gecko Advisor) -- a complete view of vendor technology and its privacy implications.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Does Gecko Advisor replace BuiltWith?</h3>
              <p className="text-zinc-700">
                No. They serve different purposes. BuiltWith is a technology identification platform -- it tells you what tools and services a website uses. Gecko Advisor is a privacy risk assessment platform -- it tells you what privacy impact those tools have on visitors. If you need comprehensive technology stack profiling for market research or lead generation, BuiltWith is the right tool. If you need to assess privacy risk for vendor due diligence or compliance, Gecko Advisor is purpose-built for that.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Which is better for vendor screening?</h3>
              <p className="text-zinc-700">
                For privacy-focused vendor screening, Gecko Advisor provides more actionable data. It gives you a privacy score, identifies specific risk factors (trackers, fingerprinting, missing security headers), and tracks changes over time. BuiltWith tells you what technologies a vendor uses but does not assess whether those technologies create privacy risk. For a complete vendor assessment, using both tools provides the most comprehensive view.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">How does pricing compare?</h3>
              <p className="text-zinc-700">
                BuiltWith offers limited free lookups with Pro plans starting at $295/month for full technology profiling and list building. Gecko Advisor provides a free scanner for individual domain assessments and a <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">REST API starting at $49/month</Link> for programmatic privacy risk data. For teams that need privacy risk assessment rather than market research, Gecko Advisor offers a more focused and cost-effective solution.
              </p>
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
            <Link href="/technologies" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Tracking Technologies</h3>
              <p className="text-sm text-zinc-600">Browse tracker profiles with privacy impact analysis.</p>
            </Link>
            <Link href="/check-domain-risk" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Risk Checker</h3>
              <p className="text-sm text-zinc-600">Instantly check the privacy risk of any domain.</p>
            </Link>
            <Link href="/api-access" className="block p-4 border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors">
              <h3 className="font-semibold text-zinc-900 mb-1">Domain Intelligence API</h3>
              <p className="text-sm text-zinc-600">Programmatic access to privacy scores and evidence data.</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <footer className="not-prose mt-12 rounded-xl bg-zinc-900 p-8 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-3">See the privacy impact of any domain</h2>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            Go beyond technology detection. Get an instant privacy risk assessment with tracker analysis, cookie audit, and fingerprinting detection.
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
