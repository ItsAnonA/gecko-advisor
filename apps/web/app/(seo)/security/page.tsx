/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'Learn about Gecko Advisor security practices, vulnerability disclosure policy, and our commitment to transparency.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/security`,
  },
  openGraph: {
    title: 'Security',
    description: 'Learn about Gecko Advisor security practices and vulnerability disclosure policy.',
    url: `${SEO_CONSTANTS.BASE_URL}/security`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Security' },
        ]}
      />

      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gecko-800">Security</h1>
        <p className="text-lg text-gecko-600 max-w-2xl mx-auto">
          Transparency and security are core to our mission
        </p>
      </div>

      {/* Our Commitment */}
      <section className="p-8 rounded-xl bg-advisor-50 border border-advisor-200 mb-12">
        <h2 className="text-2xl font-bold text-advisor-600 mb-4">Our Security Commitment</h2>
        <p className="text-gecko-600 leading-relaxed">
          Gecko Advisor is built on the principle that privacy tools should be transparent and
          trustworthy. As an open-source project, our entire codebase is publicly auditable. We
          practice what we preach: no tracking, no hidden data collection, and complete transparency
          about how we operate.
        </p>
      </section>

      {/* What We Scan */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <SearchIcon className="w-8 h-8 text-advisor-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-gecko-800">What We Scan</h2>
        </div>
        <div className="space-y-4">
          <SecurityItem
            title="User-Submitted URLs Only"
            description="We only scan websites that users explicitly request. No automated crawling or unsolicited scanning."
          />
          <SecurityItem
            title="Shallow, Respectful Crawls"
            description="Maximum 10 pages or 10 seconds per scan. We respect robots.txt and server resources."
          />
          <SecurityItem
            title="Public Content Only"
            description="No authentication bypass attempts. We only analyze publicly accessible content."
          />
          <SecurityItem
            title="Rate Limiting"
            description="Abuse prevention mechanisms protect both our infrastructure and target websites."
          />
        </div>
      </section>

      {/* What We DON'T Collect */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <EyeOffIcon className="w-8 h-8 text-advisor-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-gecko-800">
            What We DON&apos;T Collect
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <NoCollectCard icon="👤" title="No User Tracking" description="No analytics, no behavioral tracking, no user profiles" />
          <NoCollectCard icon="🍪" title="No Cookies" description="We analyze cookies but don't use them ourselves" />
          <NoCollectCard icon="📧" title="No Personal Data" description="No email addresses, names, or contact information collected" />
          <NoCollectCard icon="🔑" title="No Accounts" description="Anonymous by design—no login or authentication required" />
        </div>
      </section>

      {/* Open Source Security */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <GitHubIcon className="w-8 h-8 text-advisor-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-gecko-800">Open Source Advantage</h2>
        </div>
        <div className="space-y-4">
          <SecurityItem
            title="Full Code Transparency"
            description="Every line of code is public on GitHub. Community auditable and reproducible."
          />
          <SecurityItem
            title="No Hidden Backdoors"
            description="Open source means no hidden data collection or secret functionality."
          />
          <SecurityItem
            title="Community Security"
            description="Security researchers and developers worldwide can review and improve our code."
          />
          <SecurityItem
            title="Public Issue Tracking"
            description="All bugs and security issues are tracked openly on GitHub."
          />
        </div>
        <a
          href="https://github.com/privacygecko/gecko-advisor"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-advisor-600 hover:text-advisor-700 font-semibold transition-colors"
        >
          View Source Code on GitHub
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </section>

      {/* Vulnerability Disclosure */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <ShieldIcon className="w-8 h-8 text-advisor-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-gecko-800">
            Responsible Vulnerability Disclosure
          </h2>
        </div>
        <div className="p-6 rounded-xl bg-white border border-gray-200 space-y-4 shadow-soft">
          <p className="text-gecko-600 leading-relaxed">
            We welcome security researchers to help us maintain the security of Gecko Advisor. If you
            discover a vulnerability, please report it responsibly.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-advisor-500 font-semibold">📧</span>
              <div>
                <strong className="text-gecko-800">Contact:</strong>
                <span className="text-gecko-600"> security@geckoadvisor.com</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-advisor-500 font-semibold">⏱️</span>
              <div>
                <strong className="text-gecko-800">Response Time:</strong>
                <span className="text-gecko-600"> Within 48 hours</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-advisor-500 font-semibold">📅</span>
              <div>
                <strong className="text-gecko-800">Disclosure Timeline:</strong>
                <span className="text-gecko-600"> 90-day coordinated disclosure</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-advisor-500 font-semibold">🏆</span>
              <div>
                <strong className="text-gecko-800">Recognition:</strong>
                <span className="text-gecko-600"> Security Hall of Fame for responsible reporters</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gecko-500 italic pt-4 border-t border-gray-200">
            We commit to no legal action against security researchers who report vulnerabilities in
            good faith.
          </p>
        </div>
      </section>

      {/* Data Retention */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="w-8 h-8 text-advisor-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-gecko-800">Data Retention Policy</h2>
        </div>
        <div className="space-y-4">
          <SecurityItem
            title="30-Day Report Retention"
            description="Public scan reports are retained for 30 days, then automatically deleted."
          />
          <SecurityItem
            title="No PII Collection"
            description="We don't collect personally identifiable information, so there's nothing to retain."
          />
          <SecurityItem
            title="IP Address Handling"
            description="IP addresses used only for rate limiting. Not logged or stored persistently."
          />
          <SecurityItem
            title="Right to Deletion"
            description="Contact us to request early deletion of any scan report you submitted."
          />
        </div>
      </section>

      {/* Infrastructure Security */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <ServerIcon className="w-8 h-8 text-advisor-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-gecko-800">Infrastructure Security</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SecurityFeature title="HTTPS Everywhere" description="TLS encryption for all connections" />
          <SecurityFeature title="DDoS Protection" description="Cloudflare protection against attacks" />
          <SecurityFeature title="Dependency Scanning" description="Automated security updates via Dependabot" />
          <SecurityFeature title="Container Isolation" description="Docker containers for service isolation" />
          <SecurityFeature title="CI/CD Security" description="Automated security scanning in pipeline" />
          <SecurityFeature title="Regular Audits" description="Periodic security reviews and updates" />
        </div>
      </section>

      {/* The Irony */}
      <section className="p-8 rounded-xl bg-gradient-to-br from-advisor-50 to-advisor-100 border border-advisor-200 mb-8">
        <h3 className="text-2xl font-bold text-gecko-800 mb-4">The Irony We Embrace</h3>
        <p className="text-gecko-600 leading-relaxed">
          We analyze websites for privacy violations while committing to never track our own users.
          Gecko Advisor doesn&apos;t use analytics, doesn&apos;t set cookies, and doesn&apos;t collect
          personal data. This isn&apos;t just philosophy—it&apos;s built into our architecture. When
          you use our scanner, you remain anonymous. That&apos;s a promise, not marketing.
        </p>
      </section>

      {/* Back to Home */}
      <div className="text-center py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-advisor-500 hover:bg-advisor-600 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Scanner
        </Link>
      </div>
    </div>
  );
}

interface SecurityItemProps {
  title: string;
  description: string;
}

function SecurityItem({ title, description }: SecurityItemProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-advisor-500"></div>
      <div>
        <h3 className="text-lg font-bold text-gecko-800 mb-1">{title}</h3>
        <p className="text-gecko-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface NoCollectCardProps {
  icon: string;
  title: string;
  description: string;
}

function NoCollectCard({ icon, title, description }: NoCollectCardProps) {
  return (
    <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-soft">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-gecko-800 mb-2">{title}</h3>
      <p className="text-sm text-gecko-600 leading-relaxed">{description}</p>
    </div>
  );
}

interface SecurityFeatureProps {
  title: string;
  description: string;
}

function SecurityFeature({ title, description }: SecurityFeatureProps) {
  return (
    <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-soft">
      <h4 className="font-bold text-gecko-800 mb-1">{title}</h4>
      <p className="text-sm text-gecko-600">{description}</p>
    </div>
  );
}

// Icon Components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}
