/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

'use client';

import { useState } from 'react';

type Tab = 'terms' | 'privacy' | 'license' | 'cookies';

export function LegalTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center border-b border-gray-200 pb-4 mb-8">
        <TabButton active={activeTab === 'terms'} onClick={() => setActiveTab('terms')}>
          Terms of Use
        </TabButton>
        <TabButton active={activeTab === 'privacy'} onClick={() => setActiveTab('privacy')}>
          Privacy Policy
        </TabButton>
        <TabButton active={activeTab === 'license'} onClick={() => setActiveTab('license')}>
          License
        </TabButton>
        <TabButton active={activeTab === 'cookies'} onClick={() => setActiveTab('cookies')}>
          Cookies
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="prose max-w-none">
        {activeTab === 'terms' && <TermsContent />}
        {activeTab === 'privacy' && <PrivacyContent />}
        {activeTab === 'license' && <LicenseContent />}
        {activeTab === 'cookies' && <CookiesContent />}
      </div>
    </>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
        active ? 'bg-advisor-500 text-white' : 'bg-gray-100 text-gecko-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function TermsContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gecko-800 mb-4">Terms of Use</h2>
        <p className="text-gecko-600 leading-relaxed">
          Welcome to Gecko Advisor. By using our privacy scanning service, you agree to these terms.
          Please read them carefully.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Service Description</h3>
        <p className="text-gecko-600 leading-relaxed mb-4">
          Gecko Advisor provides automated privacy analysis of websites. We scan user-submitted URLs
          to identify cookies, trackers, security headers, and third-party resources. Our service is
          provided &quot;as-is&quot; under the MIT open-source license.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Acceptable Use</h3>
        <p className="text-gecko-600 leading-relaxed mb-4">
          You agree to use Gecko Advisor responsibly. Prohibited activities include:
        </p>
        <ul className="list-disc list-inside text-gecko-600 space-y-2 ml-4">
          <li>Submitting URLs you don&apos;t have permission to analyze</li>
          <li>Attempting to circumvent rate limiting or abuse prevention measures</li>
          <li>Using automated tools to overload our service</li>
          <li>Misrepresenting scan results or using them for malicious purposes</li>
          <li>Attempting to hack, compromise, or disrupt our infrastructure</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">No Warranty</h3>
        <p className="text-gecko-600 leading-relaxed">
          Gecko Advisor is provided &quot;AS IS&quot; without warranties of any kind. We make no
          guarantees about accuracy, completeness, or reliability of scan results. This is an
          educational tool, not legal or professional advice.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Limitation of Liability</h3>
        <p className="text-gecko-600 leading-relaxed">
          We are not liable for any damages arising from your use of Gecko Advisor, including but not
          limited to: inaccurate scan results, service interruptions, data loss, or any decisions made
          based on our analysis.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Contact</h3>
        <p className="text-gecko-600 leading-relaxed">
          Questions about these terms? Contact us at{' '}
          <a href="mailto:legal@geckoadvisor.com" className="text-advisor-600 hover:text-advisor-700">
            legal@geckoadvisor.com
          </a>
        </p>
      </section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gecko-800 mb-4">Privacy Policy</h2>
        <p className="text-gecko-600 leading-relaxed">
          Gecko Advisor is built on privacy principles. We collect minimal data and never track users.
          This policy explains what we collect, why, and how we use it.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">What We Collect</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gecko-800 mb-2">Submitted URLs</h4>
            <p className="text-gecko-600 leading-relaxed">
              We temporarily store URLs you submit for scanning to generate reports. These are retained
              for 30 days, then automatically deleted.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gecko-800 mb-2">Scan Results</h4>
            <p className="text-gecko-600 leading-relaxed">
              Privacy analysis results are stored with public URLs for 30 days. Anyone with the report
              URL can view results.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gecko-800 mb-2">IP Addresses (Rate Limiting Only)</h4>
            <p className="text-gecko-600 leading-relaxed">
              Your IP address is used only for rate limiting abuse prevention. We do not log or store
              IP addresses persistently.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">What We DON&apos;T Collect</h3>
        <ul className="list-disc list-inside text-gecko-600 space-y-2 ml-4">
          <li>No user accounts or authentication data</li>
          <li>No cookies (we analyze them, but don&apos;t use them)</li>
          <li>No personal information (name, email, phone, etc.)</li>
          <li>No tracking pixels or analytics</li>
          <li>No behavioral data or browsing history</li>
          <li>No location data beyond IP-based rate limiting</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Contact</h3>
        <p className="text-gecko-600 leading-relaxed">
          Privacy questions or deletion requests? Contact us at{' '}
          <a href="mailto:privacy@geckoadvisor.com" className="text-advisor-600 hover:text-advisor-700">
            privacy@geckoadvisor.com
          </a>
        </p>
      </section>
    </div>
  );
}

function LicenseContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gecko-800 mb-4">License Information</h2>
        <p className="text-gecko-600 leading-relaxed">
          Gecko Advisor is open source under the MIT License. This page explains our licensing and the
          third-party data sources we use.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Gecko Advisor License (MIT)</h3>
        <p className="text-gecko-600 leading-relaxed mb-4">
          Gecko Advisor is licensed under the{' '}
          <a
            href="https://github.com/privacygecko/gecko-advisor/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-advisor-600 hover:text-advisor-700"
          >
            MIT License
          </a>
          .
        </p>
        <div className="p-6 rounded-lg bg-white border border-gray-200 mb-4">
          <p className="text-gecko-600 leading-relaxed mb-4">
            <strong className="text-gecko-800">What this means:</strong>
          </p>
          <ul className="list-disc list-inside text-gecko-600 space-y-2 ml-4">
            <li>Commercial use allowed</li>
            <li>Modification allowed</li>
            <li>Distribution allowed</li>
            <li>Private use allowed</li>
            <li>Must include copyright notice and license</li>
            <li>No warranty provided</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Third-Party Licenses</h3>
        <p className="text-gecko-600 leading-relaxed mb-4">
          Gecko Advisor integrates data from several open-source privacy databases:
        </p>

        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-white border border-gray-200">
            <h4 className="text-lg font-bold text-gecko-800 mb-2">EasyPrivacy</h4>
            <p className="text-gecko-600 leading-relaxed mb-3">
              Dual licensed under GPL v3 and Creative Commons BY-SA 3.0. We use server-side for tracker
              detection.
            </p>
            <p className="text-xs text-gecko-500 italic">Eyeo GmbH and contributors</p>
          </div>

          <div className="p-6 rounded-lg bg-white border border-gray-200">
            <h4 className="text-lg font-bold text-gecko-800 mb-2">WhoTracks.Me</h4>
            <p className="text-gecko-600 leading-relaxed mb-3">
              Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).
            </p>
            <p className="text-xs text-gecko-500 italic">Ghostery GmbH</p>
          </div>

          <div className="p-6 rounded-lg bg-white border border-gray-200">
            <h4 className="text-lg font-bold text-gecko-800 mb-2">Public Suffix List</h4>
            <p className="text-gecko-600 leading-relaxed mb-3">
              Licensed under Mozilla Public License.
            </p>
            <p className="text-xs text-gecko-500 italic">Mozilla and contributors</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CookiesContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-gecko-800 mb-4">Cookie Policy</h2>
        <div className="p-6 rounded-lg bg-advisor-50 border border-advisor-200 mb-6">
          <p className="text-lg text-gecko-800 font-semibold mb-3">
            The Short Version: We Don&apos;t Use Cookies
          </p>
          <p className="text-gecko-600 leading-relaxed">
            It&apos;s ironic—we analyze websites for cookie usage, but Gecko Advisor itself doesn&apos;t
            use cookies. No tracking cookies, no advertising cookies, no analytics cookies. None.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">What We DON&apos;T Use</h3>
        <ul className="list-disc list-inside text-gecko-600 space-y-2 ml-4">
          <li>No tracking cookies</li>
          <li>No advertising cookies</li>
          <li>No analytics cookies (Google Analytics, etc.)</li>
          <li>No social media cookies</li>
          <li>No third-party cookies of any kind</li>
          <li>No &quot;essential&quot; cookies (we don&apos;t need them)</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-gecko-800 mb-3">Why No Cookies?</h3>
        <p className="text-gecko-600 leading-relaxed mb-4">
          Gecko Advisor&apos;s mission is privacy transparency. Using tracking cookies would undermine
          our core values. We built our service to function without any cookies because:
        </p>
        <ul className="list-disc list-inside text-gecko-600 space-y-2 ml-4">
          <li>We don&apos;t track users</li>
          <li>We don&apos;t need authentication (no user accounts)</li>
          <li>We don&apos;t use analytics (we trust our product)</li>
          <li>We respect your privacy by design, not just in policy</li>
        </ul>
      </section>

      <section className="mt-8 p-6 rounded-lg bg-gradient-to-br from-advisor-50 to-advisor-100 border border-advisor-200">
        <h4 className="text-lg font-bold text-gecko-800 mb-3">The Ultimate Irony</h4>
        <p className="text-gecko-600 leading-relaxed">
          We analyze thousands of websites for invasive cookie practices while maintaining a
          cookie-free service ourselves. This isn&apos;t marketing—it&apos;s our architecture. Privacy
          isn&apos;t just what we measure; it&apos;s how we operate.
        </p>
      </section>
    </div>
  );
}
