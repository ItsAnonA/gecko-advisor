/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function AboutCredits() {
  return (
    <div className="max-w-none space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900">About Gecko Advisor</h1>
        <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
          Making privacy transparency accessible to everyone
        </p>
      </section>

      {/* Mission Statement */}
      <section className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8 shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-emerald-700 mb-4">Our Mission</h2>
            <p className="text-lg text-zinc-700 leading-relaxed mb-4">
              Gecko Advisor helps everyone understand how websites track and collect data. Our open-source privacy scanner reveals hidden trackers, cookies, and data collection practices—making privacy transparency accessible to all.
            </p>
            <p className="text-base text-zinc-600 leading-relaxed">
              We analyze privacy practices without collecting user data—our commitment to privacy extends to our own operations. 100% free, no account required.
            </p>
          </div>
        </div>
      </section>

      {/* Two Column: Approach & Values */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Our Approach */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-700">Our Approach</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Open-source methodology</strong> for full auditability</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Deterministic scoring</strong> for reproducible results</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Evidence-based analysis</strong> backed by recognized privacy databases</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Accessible to everyone</strong> who cares about privacy</span>
            </li>
          </ul>
        </section>

        {/* Our Values */}
        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-700">Our Values</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Transparency:</strong> Code, data sources, and methodology are public</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Accuracy:</strong> We cite sources and provide evidence for every finding</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Privacy:</strong> We don't track users while analyzing tracking</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-zinc-600"><strong className="text-zinc-900">Accessibility:</strong> Free and open for everyone to use</span>
            </li>
          </ul>
        </section>
      </div>

      {/* Data Sources */}
      <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-emerald-700">Data Sources & Attribution</h2>
        </div>
        <p className="text-zinc-600 mb-6">
          Our privacy analysis is powered by industry-recognized databases and transparent methodologies:
        </p>
        <div className="space-y-4">
          <div className="bg-stone-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-zinc-900 mb-2">EasyPrivacy</h3>
            <p className="text-sm text-zinc-600 mb-2">
              Dual licensed (GPL v3 + CC BY-SA 3.0). Used for tracker detection.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href="https://easylist.to/" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">Official Site</a>
              <span className="text-gray-300">·</span>
              <a href="https://github.com/easylist/easylist" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">GitHub</a>
            </div>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-zinc-900 mb-2">WhoTracks.me</h3>
            <p className="text-sm text-zinc-600 mb-2">
              Tracker database under CC BY 4.0 license.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href="https://whotracks.me/" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">Official Site</a>
              <span className="text-gray-300">·</span>
              <a href="https://github.com/ghostery/whotracks.me" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">GitHub</a>
            </div>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-zinc-900 mb-2">Public Suffix List</h3>
            <p className="text-sm text-zinc-600 mb-2">
              Maintained by Mozilla contributors under Mozilla Public License.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <a href="https://publicsuffix.org/" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">Official Site</a>
              <span className="text-gray-300">·</span>
              <a href="https://github.com/publicsuffix/list" target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">GitHub</a>
            </div>
          </div>
        </div>
      </section>

      {/* Legal & Credits */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-700 mb-4">Legal</h3>
          <ul className="space-y-2">
            <li><a href="/terms.html" className="text-zinc-600 hover:text-emerald-600 transition-colors">Terms of Use</a></li>
            <li><a href="/privacy.html" className="text-zinc-600 hover:text-emerald-600 transition-colors">Privacy Policy</a></li>
            <li><a href="/NOTICE.md" className="text-zinc-600 hover:text-emerald-600 transition-colors">NOTICE</a></li>
            <li><a href="/LICENSE-THIRD-PARTY.md" className="text-zinc-600 hover:text-emerald-600 transition-colors">Third-Party Licenses</a></li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-700 mb-4">Scanning Policy</h3>
          <p className="text-zinc-600 text-sm leading-relaxed mb-3">
            We analyze privacy practices through three methods:
          </p>
          <ul className="text-zinc-600 text-sm leading-relaxed space-y-1 mb-3">
            <li>• <strong>User-submitted URLs</strong> — scanned on request</li>
            <li>• <strong>Curated targets</strong> — popular apps and services we proactively analyze</li>
            <li>• <strong>Freshness updates</strong> — periodic re-scans of previously analyzed sites</li>
          </ul>
          <p className="text-zinc-600 text-sm leading-relaxed">
            All scans are shallow (policy pages only), rate-limited, and respect opt-out requests.
          </p>
        </section>
      </div>
    </div>
  );
}
