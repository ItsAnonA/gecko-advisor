/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

type Tab = 'terms' | 'privacy' | 'license' | 'cookies';

export default function Legal() {
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-6 pb-16 md:pb-24 space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-light-primary">
            Legal
          </h1>
          <p className="text-sm text-light-tertiary">
            Last Updated: January 2025
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 justify-center border-b border-dark-border/30 pb-4">
          <TabButton
            active={activeTab === 'terms'}
            onClick={() => setActiveTab('terms')}
          >
            Terms of Use
          </TabButton>
          <TabButton
            active={activeTab === 'privacy'}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy Policy
          </TabButton>
          <TabButton
            active={activeTab === 'license'}
            onClick={() => setActiveTab('license')}
          >
            License
          </TabButton>
          <TabButton
            active={activeTab === 'cookies'}
            onClick={() => setActiveTab('cookies')}
          >
            Cookies
          </TabButton>
        </div>

        {/* Tab Content */}
        <div className="prose prose-invert max-w-none">
          {activeTab === 'terms' && <TermsContent />}
          {activeTab === 'privacy' && <PrivacyContent />}
          {activeTab === 'license' && <LicenseContent />}
          {activeTab === 'cookies' && <CookiesContent />}
        </div>
      </main>
      <Footer />
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
      className={`
        px-6 py-3 rounded-lg font-semibold transition-all
        ${active
          ? 'bg-advisor-500 text-dark-bg'
          : 'bg-dark-surface/40 text-light-secondary hover:text-light-primary hover:bg-dark-surface/60'
        }
      `}
    >
      {children}
    </button>
  );
}

function TermsContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-light-primary mb-4">Terms of Use</h2>
        <p className="text-light-secondary leading-relaxed">
          Welcome to Gecko Advisor. By using our privacy scanning service, you agree to these terms.
          Please read them carefully.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Service Description</h3>
        <p className="text-light-secondary leading-relaxed mb-4">
          Gecko Advisor provides automated privacy analysis of websites. We scan user-submitted URLs
          to identify cookies, trackers, security headers, and third-party resources. Our service is
          provided "as-is" under the MIT open-source license.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Acceptable Use</h3>
        <p className="text-light-secondary leading-relaxed mb-4">
          You agree to use Gecko Advisor responsibly. Prohibited activities include:
        </p>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
          <li>Submitting URLs you don't have permission to analyze</li>
          <li>Attempting to circumvent rate limiting or abuse prevention measures</li>
          <li>Using automated tools to overload our service</li>
          <li>Misrepresenting scan results or using them for malicious purposes</li>
          <li>Attempting to hack, compromise, or disrupt our infrastructure</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">No Warranty</h3>
        <p className="text-light-secondary leading-relaxed">
          Gecko Advisor is provided "AS IS" without warranties of any kind. We make no guarantees about
          accuracy, completeness, or reliability of scan results. This is an educational tool, not legal
          or professional advice.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Limitation of Liability</h3>
        <p className="text-light-secondary leading-relaxed">
          We are not liable for any damages arising from your use of Gecko Advisor, including but not
          limited to: inaccurate scan results, service interruptions, data loss, or any decisions made
          based on our analysis.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Indemnification</h3>
        <p className="text-light-secondary leading-relaxed">
          You agree to indemnify and hold harmless Gecko Advisor contributors from any claims arising
          from your use of the service, including URLs you submit for scanning.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Changes to Terms</h3>
        <p className="text-light-secondary leading-relaxed">
          We reserve the right to modify these terms at any time. Changes will be posted on this page
          with an updated "Last Modified" date. Continued use of the service constitutes acceptance of
          modified terms.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Governing Law</h3>
        <p className="text-light-secondary leading-relaxed">
          These terms are governed by the laws of the United States. Any disputes will be resolved in
          accordance with applicable jurisdiction.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Contact</h3>
        <p className="text-light-secondary leading-relaxed">
          Questions about these terms? Contact us at{' '}
          <a href="mailto:legal@geckoadvisor.com" className="text-advisor-400 hover:text-advisor-300">
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
        <h2 className="text-2xl font-bold text-light-primary mb-4">Privacy Policy</h2>
        <p className="text-light-secondary leading-relaxed">
          Gecko Advisor is built on privacy principles. We collect minimal data and never track users.
          This policy explains what we collect, why, and how we use it.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">What We Collect</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-light-primary mb-2">Submitted URLs</h4>
            <p className="text-light-secondary leading-relaxed">
              We temporarily store URLs you submit for scanning to generate reports. These are retained
              for 30 days, then automatically deleted.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-light-primary mb-2">Scan Results</h4>
            <p className="text-light-secondary leading-relaxed">
              Privacy analysis results are stored with public URLs for 30 days. Anyone with the report
              URL can view results.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-light-primary mb-2">IP Addresses (Rate Limiting Only)</h4>
            <p className="text-light-secondary leading-relaxed">
              Your IP address is used only for rate limiting abuse prevention. We do not log or store
              IP addresses persistently.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">What We DON'T Collect</h3>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
          <li>No user accounts or authentication data</li>
          <li>No cookies (we analyze them, but don't use them)</li>
          <li>No personal information (name, email, phone, etc.)</li>
          <li>No tracking pixels or analytics</li>
          <li>No behavioral data or browsing history</li>
          <li>No location data beyond IP-based rate limiting</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">How We Use Data</h3>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
          <li>Provide privacy scanning service</li>
          <li>Generate shareable scan reports</li>
          <li>Prevent abuse through rate limiting</li>
          <li>Improve scan accuracy (aggregate, anonymized analysis only)</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Third-Party Services</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-light-primary mb-2">Cloudflare</h4>
            <p className="text-light-secondary leading-relaxed">
              We use Cloudflare for DDoS protection and CDN services. Cloudflare may process IP addresses
              for security purposes. See{' '}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-advisor-400 hover:text-advisor-300">
                Cloudflare Privacy Policy
              </a>
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-light-primary mb-2">Hosting Provider</h4>
            <p className="text-light-secondary leading-relaxed">
              Our infrastructure is hosted on secure cloud servers. We do not share user data with our
              hosting provider beyond what's necessary for service operation.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Data Retention</h3>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
          <li>Scan reports: 30 days, then automatic deletion</li>
          <li>IP addresses: Not persistently logged (rate limiting only)</li>
          <li>Personal data: None collected</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Your Rights</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-light-primary mb-2">GDPR (EU Users)</h4>
            <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
              <li>Right to access your data (though we collect minimal data)</li>
              <li>Right to deletion (contact us to remove scan reports early)</li>
              <li>Right to data portability</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-light-primary mb-2">CCPA (California Users)</h4>
            <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
              <li>Right to know what data we collect</li>
              <li>Right to delete your data</li>
              <li>Right to opt-out (though we don't sell data)</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Contact</h3>
        <p className="text-light-secondary leading-relaxed">
          Privacy questions or deletion requests? Contact us at{' '}
          <a href="mailto:privacy@geckoadvisor.com" className="text-advisor-400 hover:text-advisor-300">
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
        <h2 className="text-2xl font-bold text-light-primary mb-4">License Information</h2>
        <p className="text-light-secondary leading-relaxed">
          Gecko Advisor is open source under the MIT License. This page explains our licensing and the
          third-party data sources we use.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Gecko Advisor License (MIT)</h3>
        <p className="text-light-secondary leading-relaxed mb-4">
          Gecko Advisor is licensed under the{' '}
          <a
            href="https://github.com/privacygecko/gecko-advisor/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-advisor-400 hover:text-advisor-300"
          >
            MIT License
          </a>.
        </p>
        <div className="p-6 rounded-lg bg-dark-surface/40 border border-dark-border/30 mb-4">
          <p className="text-light-secondary leading-relaxed mb-4">
            <strong className="text-light-primary">What this means:</strong>
          </p>
          <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
            <li>✅ Commercial use allowed</li>
            <li>✅ Modification allowed</li>
            <li>✅ Distribution allowed</li>
            <li>✅ Private use allowed</li>
            <li>⚠️ Must include copyright notice and license</li>
            <li>⚠️ No warranty provided</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Third-Party Licenses</h3>
        <p className="text-light-secondary leading-relaxed mb-4">
          Gecko Advisor integrates data from several open-source privacy databases:
        </p>

        <div className="space-y-6">
          <div className="p-6 rounded-lg bg-dark-surface/40 border border-dark-border/30">
            <h4 className="text-lg font-bold text-light-primary mb-2">EasyPrivacy</h4>
            <p className="text-light-secondary leading-relaxed mb-3">
              Dual licensed under GPL v3 and Creative Commons BY-SA 3.0. We use server-side for tracker detection.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://easylist.to/" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                Official Site →
              </a>
              <a href="https://github.com/easylist/easylist" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                GitHub →
              </a>
            </div>
            <p className="text-xs text-light-tertiary mt-3 italic">
              © Eyeo GmbH and contributors
            </p>
          </div>

          <div className="p-6 rounded-lg bg-dark-surface/40 border border-dark-border/30">
            <h4 className="text-lg font-bold text-light-primary mb-2">WhoTracks.Me</h4>
            <p className="text-light-secondary leading-relaxed mb-3">
              Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://whotracks.me/" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                Official Site →
              </a>
              <a href="https://github.com/ghostery/whotracks.me" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                GitHub →
              </a>
            </div>
            <p className="text-xs text-light-tertiary mt-3 italic">
              © Ghostery GmbH
            </p>
          </div>

          <div className="p-6 rounded-lg bg-dark-surface/40 border border-dark-border/30">
            <h4 className="text-lg font-bold text-light-primary mb-2">Public Suffix List</h4>
            <p className="text-light-secondary leading-relaxed mb-3">
              Licensed under Mozilla Public License.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://publicsuffix.org/" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                Official Site →
              </a>
              <a href="https://github.com/publicsuffix/list" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                GitHub →
              </a>
            </div>
            <p className="text-xs text-light-tertiary mt-3 italic">
              © Mozilla and contributors
            </p>
          </div>

          <div className="p-6 rounded-lg bg-dark-surface/40 border border-dark-border/30">
            <h4 className="text-lg font-bold text-light-primary mb-2">Inter Font</h4>
            <p className="text-light-secondary leading-relaxed mb-3">
              Licensed under SIL Open Font License 1.1.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://rsms.me/inter/" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                Official Site →
              </a>
              <a href="https://github.com/rsms/inter" target="_blank" rel="noopener noreferrer" className="text-sm text-advisor-400 hover:text-advisor-300">
                GitHub →
              </a>
            </div>
            <p className="text-xs text-light-tertiary mt-3 italic">
              © 2020 The Inter Project Authors
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Full Attribution</h3>
        <p className="text-light-secondary leading-relaxed">
          For complete attribution and third-party licenses, see:
        </p>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4 mt-3">
          <li>
            <a href="/about" className="text-advisor-400 hover:text-advisor-300">
              About & Credits Page
            </a>
          </li>
          <li>
            <a href="https://github.com/privacygecko/gecko-advisor/blob/main/NOTICE.md" target="_blank" rel="noopener noreferrer" className="text-advisor-400 hover:text-advisor-300">
              NOTICE.md
            </a>
          </li>
          <li>
            <a href="https://github.com/privacygecko/gecko-advisor/blob/main/LICENSE-THIRD-PARTY.md" target="_blank" rel="noopener noreferrer" className="text-advisor-400 hover:text-advisor-300">
              LICENSE-THIRD-PARTY.md
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

function CookiesContent() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-light-primary mb-4">Cookie Policy</h2>
        <div className="p-6 rounded-lg bg-advisor-600/10 border border-advisor-500/30 mb-6">
          <p className="text-lg text-light-primary font-semibold mb-3">
            The Short Version: We Don't Use Cookies
          </p>
          <p className="text-light-secondary leading-relaxed">
            It's ironic—we analyze websites for cookie usage, but Gecko Advisor itself doesn't use cookies.
            No tracking cookies, no advertising cookies, no analytics cookies. None.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">What We Use Instead</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-dark-surface/40 border border-dark-border/30">
            <h4 className="font-semibold text-light-primary mb-2">localStorage (Optional UI Preferences)</h4>
            <p className="text-light-secondary leading-relaxed">
              We may use browser localStorage to remember:
            </p>
            <ul className="list-disc list-inside text-light-secondary space-y-1 ml-4 mt-2">
              <li>Your preferred theme (if we add dark mode toggle)</li>
              <li>Recently viewed scan (session context only)</li>
            </ul>
            <p className="text-sm text-light-tertiary mt-3">
              This data never leaves your browser and is not transmitted to our servers.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">What We DON'T Use</h3>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
          <li>❌ No tracking cookies</li>
          <li>❌ No advertising cookies</li>
          <li>❌ No analytics cookies (Google Analytics, etc.)</li>
          <li>❌ No social media cookies</li>
          <li>❌ No third-party cookies of any kind</li>
          <li>❌ No "essential" cookies (we don't need them)</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Why No Cookies?</h3>
        <p className="text-light-secondary leading-relaxed mb-4">
          Gecko Advisor's mission is privacy transparency. Using tracking cookies would undermine our
          core values. We built our service to function without any cookies because:
        </p>
        <ul className="list-disc list-inside text-light-secondary space-y-2 ml-4">
          <li>We don't track users</li>
          <li>We don't need authentication (no user accounts)</li>
          <li>We don't use analytics (we trust our product)</li>
          <li>We respect your privacy by design, not just in policy</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Third-Party Services</h3>
        <p className="text-light-secondary leading-relaxed mb-4">
          We use Cloudflare for DDoS protection and CDN. Cloudflare may use cookies for security purposes,
          but we do not have access to or control over these cookies. See{' '}
          <a href="https://www.cloudflare.com/cookie-policy/" target="_blank" rel="noopener noreferrer" className="text-advisor-400 hover:text-advisor-300">
            Cloudflare Cookie Policy
          </a>
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-light-primary mb-3">Your Browser Settings</h3>
        <p className="text-light-secondary leading-relaxed">
          Since we don't use cookies, there's nothing to configure. However, if you want to clear
          localStorage data (UI preferences), you can do so in your browser settings under
          "Site Data" or "Storage."
        </p>
      </section>

      <section className="mt-8 p-6 rounded-lg bg-gradient-to-br from-advisor-600/20 to-emerald-600/20 border border-advisor-500/30">
        <h4 className="text-lg font-bold text-light-primary mb-3">
          The Ultimate Irony
        </h4>
        <p className="text-light-secondary leading-relaxed">
          We analyze thousands of websites for invasive cookie practices while maintaining a
          cookie-free service ourselves. This isn't marketing—it's our architecture. Privacy
          isn't just what we measure; it's how we operate.
        </p>
      </section>
    </div>
  );
}
