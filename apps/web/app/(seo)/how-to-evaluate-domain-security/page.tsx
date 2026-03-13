/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Evaluate Domain Security: 6-Point Checklist',
  description:
    'A 6-point checklist for evaluating domain security: tracker inventory, configuration stability, infrastructure reliability, volatility scoring, privacy posture, and historical patterns.',
  alternates: {
    canonical: 'https://geckoadvisor.com/how-to-evaluate-domain-security',
  },
  openGraph: {
    title: 'How to Evaluate Domain Security: 6-Point Checklist',
    description:
      'A 6-point checklist for evaluating domain security: tracker inventory, configuration stability, infrastructure reliability, volatility scoring, privacy posture, and historical patterns.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Evaluate Domain Security: 6-Point Checklist',
    description:
      'A 6-point checklist for evaluating domain security: tracker inventory, configuration stability, infrastructure reliability, and more.',
  },
};

export default function HowToEvaluateDomainSecurityPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li><Link href="/" className="hover:text-advisor-600 transition-colors">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">How to Evaluate Domain Security</li>
        </ol>
      </nav>

      <article className="prose prose-zinc prose-lg max-w-none">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            How to Evaluate Domain Security
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            A 6-point checklist for assessing domain security posture, from tracker inventory to historical pattern analysis.
          </p>
        </header>

        {/* The Domain Security Checklist */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">The Domain Security Checklist</h2>
          <p className="text-zinc-700 mb-6">
            Evaluating a domain&apos;s security requires looking beyond surface-level indicators. The following six-point checklist covers the observable signals that reveal a domain&apos;s true security posture.
          </p>

          <div className="space-y-6">
            <div className="p-5 border border-zinc-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center">1</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Tracker Inventory</h3>
                  <p className="text-zinc-700 text-sm">
                    Catalog all third-party scripts loading on the domain. Identify which are advertising trackers, which are analytics, and which are functional dependencies. A domain loading 15+ trackers from ad networks presents a fundamentally different risk profile than one loading 2 analytics scripts. Cross-reference detected trackers against known databases like EasyPrivacy and WhoTracks.me to classify their purpose and data collection scope.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center">2</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Configuration Stability</h3>
                  <p className="text-zinc-700 text-sm">
                    Check whether security settings remain consistent across scans. A domain that fluctuates between having and missing CSP headers, or that intermittently drops HSTS, may indicate unstable deployment processes or inconsistent infrastructure. Stable configuration is a prerequisite for reliable security — a header that appears 50% of the time provides 0% protection.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center">3</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Infrastructure Reliability</h3>
                  <p className="text-zinc-700 text-sm">
                    Verify TLS configuration, certificate validity, and protocol version. Domains should use TLS 1.3 (or at minimum TLS 1.2 with strong cipher suites), have valid certificates from trusted authorities, and enforce HSTS to prevent downgrade attacks. Mixed content (loading HTTP resources on HTTPS pages) is a red flag that undermines the entire encryption chain.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center">4</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Volatility Score</h3>
                  <p className="text-zinc-700 text-sm">
                    Measure how much the domain&apos;s security posture fluctuates over time. High volatility — large score swings between scans — suggests operational instability, frequent configuration changes, or inconsistent deployment practices. Low volatility with a high score indicates mature, well-maintained security infrastructure. GeckoAdvisor calculates a volatility index for domains with multiple scans, helping distinguish genuinely secure domains from those that happen to look good on a single check.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center">5</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Privacy Posture</h3>
                  <p className="text-zinc-700 text-sm">
                    Assess fingerprinting detection, cookie practices, and data collection scope. Canvas fingerprinting, WebGL probing, and audio context analysis allow tracking without cookies and are nearly invisible to users. Cookie security flags (HttpOnly, Secure, SameSite) determine whether session data can be intercepted. The combination of fingerprinting with extensive tracking scripts indicates aggressive data collection beyond what most users expect.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 border border-zinc-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center">6</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-2">Historical Pattern</h3>
                  <p className="text-zinc-700 text-sm">
                    Review the domain&apos;s security history for regressions and improvements. A domain that has steadily improved its score over months demonstrates investment in security. One that shows sudden drops may have experienced configuration drift, infrastructure changes, or deliberate relaxation of privacy controls. Historical patterns also reveal whether changes are sustained or temporary — a brief improvement followed by regression suggests one-time fixes rather than systematic practice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Automate This */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">How to Automate This</h2>
          <p className="text-zinc-700 mb-4">
            Running this checklist manually against every domain is impractical at scale. The <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">Domain Intelligence API</Link> provides programmatic access to all six checklist dimensions:
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li><strong>Scan endpoints</strong> return tracker counts, fingerprinting detection, cookie analysis, and security header status in a single request</li>
            <li><strong>Stability endpoints</strong> provide volatility index, trend classification (IMPROVING, STABLE, DECLINING, VOLATILE), and confidence tier</li>
            <li><strong>Change detection</strong> tracks score deltas, tracker additions and removals, and fingerprinting status changes between scans</li>
            <li><strong>Historical data</strong> enables trend analysis over weeks and months, not just point-in-time snapshots</li>
          </ul>
          <p className="text-zinc-700 mt-4">
            Integrate these endpoints into your security monitoring pipeline to run continuous domain assessments without manual intervention.
          </p>
        </section>

        {/* What GeckoAdvisor Checks */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What GeckoAdvisor Checks</h2>
          <p className="text-zinc-700 mb-4">
            GeckoAdvisor&apos;s automated scanner covers all six checklist items through a single scan. The scanner loads the target domain in a real browser environment, captures all network requests, analyzes cookies and headers, checks TLS configuration, and detects fingerprinting scripts.
          </p>
          <p className="text-zinc-700 mb-4">
            Results are scored using a deterministic algorithm with published category weights and penalty caps. Every finding includes specific evidence — the exact tracker URL, the missing header name, the insecure cookie — so you can verify findings independently.
          </p>
          <p className="text-zinc-700">
            For the full scoring breakdown, see the <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">methodology page</Link>.
          </p>
        </section>

        <footer className="pt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/api-access" className="text-emerald-600 hover:text-emerald-700 underline">API access</Link>
            <Link href="/check-domain-risk" className="text-emerald-600 hover:text-emerald-700 underline">Check a domain</Link>
            <Link href="/methodology" className="text-emerald-600 hover:text-emerald-700 underline">Methodology</Link>
            <Link href="/vendor-domain-due-diligence" className="text-emerald-600 hover:text-emerald-700 underline">Vendor due diligence</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
