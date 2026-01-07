/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How Privacy Scores Are Calculated | Gecko Advisor Methodology',
  description:
    'Learn how Gecko Advisor calculates privacy scores by analyzing real network behavior — trackers, third-party requests, cookies, security headers, and TLS configuration.',
  openGraph: {
    title: 'How Privacy Scores Are Calculated | Gecko Advisor',
    description:
      'Understanding Gecko Advisor methodology: What we analyze, how we score, and the limitations of automated privacy scanning.',
    type: 'article',
  },
};

/**
 * Methodology Page
 *
 * RULES (from authority prompt):
 * - This is defensive armor against skeptics
 * - Text is frozen - no casual edits
 * - Linked from every report page
 */
export default function MethodologyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <article className="prose prose-zinc prose-lg max-w-none">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-4">
            How Gecko Advisor Calculates Privacy Scores
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            <strong>What websites actually do, not what they promise.</strong>
            {' '}We analyze real network behavior to assess website privacy practices.
          </p>
        </header>

        {/* What We Analyze */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What We Analyze</h2>
          <p className="text-zinc-700 mb-4">
            Gecko Advisor examines publicly observable signals from websites — what they actually
            do, not what their privacy policies claim. Our automated scanner checks:
          </p>
          <ul className="space-y-3 text-zinc-700">
            <li>
              <strong className="text-zinc-900">Tracking scripts</strong> — Known analytics and
              advertising trackers from databases like EasyPrivacy and WhoTracks.me
            </li>
            <li>
              <strong className="text-zinc-900">Third-party connections</strong> — External services
              loaded by the page that may share visitor data
            </li>
            <li>
              <strong className="text-zinc-900">Cookies</strong> — Cookie security flags (Secure,
              HttpOnly, SameSite) and duration
            </li>
            <li>
              <strong className="text-zinc-900">Security headers</strong> — CSP, HSTS,
              Referrer-Policy, Permissions-Policy, X-Content-Type-Options
            </li>
            <li>
              <strong className="text-zinc-900">TLS configuration</strong> — Encryption strength,
              protocol version, and certificate validity
            </li>
          </ul>
        </section>

        {/* Scoring Categories */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Scoring Categories</h2>
          <p className="text-zinc-700 mb-4">
            Privacy scores start at 100 and are reduced based on detected concerns. Each category
            has a maximum penalty cap to prevent single issues from dominating the score:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 pr-4 font-semibold text-zinc-900">Category</th>
                  <th className="text-left py-3 pr-4 font-semibold text-zinc-900">Max Penalty</th>
                  <th className="text-left py-3 font-semibold text-zinc-900">What It Measures</th>
                </tr>
              </thead>
              <tbody className="text-zinc-700">
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Tracking</td>
                  <td className="py-3 pr-4">50 points</td>
                  <td className="py-3">Known trackers, fingerprinting scripts, ad networks</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Security</td>
                  <td className="py-3 pr-4">45 points</td>
                  <td className="py-3">TLS grade, security headers, mixed content</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Third-Party</td>
                  <td className="py-3 pr-4">15 points</td>
                  <td className="py-3">External domain connections (not tracking)</td>
                </tr>
                <tr className="border-b border-zinc-100">
                  <td className="py-3 pr-4">Cookies</td>
                  <td className="py-3 pr-4">10 points</td>
                  <td className="py-3">Missing Secure/HttpOnly/SameSite flags</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Compliance</td>
                  <td className="py-3 pr-4">5 points</td>
                  <td className="py-3">Privacy policy presence</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-zinc-600 text-sm mt-4">
            Bonus points (up to +10) are awarded for excellent TLS configuration (A+ or A grade).
          </p>
        </section>

        {/* Score Interpretation */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Score Interpretation</h2>
          <div className="space-y-3 text-zinc-700">
            <div className="flex gap-4">
              <span className="font-mono font-bold text-emerald-600 w-16">80-100</span>
              <span>
                <strong>Low Privacy Risk</strong> — Minimal tracking detected, good security
                configuration
              </span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono font-bold text-teal-600 w-16">60-79</span>
              <span>
                <strong>Moderate Privacy Risk</strong> — Some tracking or security concerns detected
              </span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono font-bold text-amber-600 w-16">40-59</span>
              <span>
                <strong>High Privacy Risk</strong> — Significant tracking or multiple security issues
              </span>
            </div>
            <div className="flex gap-4">
              <span className="font-mono font-bold text-red-600 w-16">0-39</span>
              <span>
                <strong>Critical Privacy Risk</strong> — Extensive tracking and/or serious security gaps
              </span>
            </div>
          </div>
        </section>

        {/* What We Don't Analyze */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">What We Don&apos;t Analyze</h2>
          <p className="text-zinc-700 mb-4">
            Our scores reflect observable behavior at scan time. We do not:
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li>Read or interpret privacy policy text</li>
            <li>Verify GDPR/CCPA compliance claims</li>
            <li>Access internal data handling practices</li>
            <li>Monitor changes over time (each scan is a snapshot)</li>
            <li>Test logged-in or authenticated states</li>
            <li>Simulate mobile app behavior</li>
          </ul>
        </section>

        {/* Limitations */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Limitations</h2>
          <p className="text-zinc-700 mb-4">
            Privacy scores are relative measures based on detected signals. A higher score suggests
            fewer observable privacy concerns, but does not guarantee:
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li>The website&apos;s internal data handling practices are safe</li>
            <li>The website complies with all privacy regulations</li>
            <li>Your personal data is secure on that website</li>
            <li>The website won&apos;t change its practices after our scan</li>
          </ul>
          <p className="text-zinc-700 mt-4">
            We recommend reviewing each website&apos;s privacy policy for complete information about
            how your data may be collected and used.
          </p>
        </section>

        {/* Data Sources */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Data Sources</h2>
          <p className="text-zinc-700 mb-4">
            Gecko Advisor uses the following open-source databases and standards:
          </p>
          <ul className="space-y-2 text-zinc-700">
            <li>
              <strong>EasyPrivacy</strong> — Tracker detection (server-side; attribution)
            </li>
            <li>
              <strong>WhoTracks.me</strong> — Tracker database (CC BY 4.0)
            </li>
            <li>
              <strong>Public Suffix List</strong> — Domain classification
            </li>
            <li>
              <strong>Mozilla Observatory</strong> — Security header recommendations
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-zinc-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">
              Scan a website
            </Link>
            <Link href="/reports" className="text-emerald-600 hover:text-emerald-700 underline">
              Browse reports
            </Link>
            <Link href="/faq" className="text-emerald-600 hover:text-emerald-700 underline">
              FAQ
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
