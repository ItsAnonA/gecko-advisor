/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'About Gecko Advisor',
  description:
    'Learn about Gecko Advisor - a free, open-source privacy scanner that helps you understand how websites track and handle your data.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/about`,
  },
  openGraph: {
    title: `About | ${SEO_CONSTANTS.SITE_NAME}`,
    description: 'Learn about Gecko Advisor - a free, open-source privacy scanner.',
    url: `${SEO_CONSTANTS.BASE_URL}/about`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]}
      />

      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/GeckoAdvisor_Logo.webp"
            alt="Gecko Advisor Logo"
            width={120}
            height={120}
            className="h-28 w-auto"
          />
        </div>
        <h1 className="text-4xl font-display font-bold text-gecko-800 mb-4">
          About Gecko Advisor
        </h1>
        <p className="text-xl text-gecko-600 max-w-2xl mx-auto">
          A free, open-source privacy scanner that reveals how websites track you and handle your data.
        </p>
      </div>

      {/* Mission Section */}
      <section className="bg-white rounded-2xl shadow-soft p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gecko-800 mb-4">Our Mission</h2>
        <p className="text-gecko-600 mb-4">
          Gecko Advisor was created with one goal: <strong>empowering users to make informed decisions about their online privacy</strong>.
          In an era where data collection is ubiquitous, we believe everyone deserves to know exactly how websites track them.
        </p>
        <p className="text-gecko-600">
          We provide transparent, easy-to-understand privacy reports that break down complex tracking technologies
          into actionable insights. No technical expertise required.
        </p>
      </section>

      {/* What We Analyze */}
      <section className="bg-white rounded-2xl shadow-soft p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gecko-800 mb-6">What We Analyze</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-advisor-100 flex items-center justify-center">
              <CookieIcon className="w-6 h-6 text-advisor-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gecko-800 mb-1">Cookies & Storage</h3>
              <p className="text-sm text-gecko-600">First-party, third-party cookies, localStorage, and session storage.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <TrackerIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gecko-800 mb-1">Trackers & Analytics</h3>
              <p className="text-sm text-gecko-600">Advertising trackers, analytics scripts, and fingerprinting.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <NetworkIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gecko-800 mb-1">Third-Party Connections</h3>
              <p className="text-sm text-gecko-600">External services, CDNs, and data-sharing connections.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <ShieldIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gecko-800 mb-1">Security Headers</h3>
              <p className="text-sm text-gecko-600">HTTPS, CSP, HSTS, and other security configurations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="bg-gradient-to-br from-gecko-50 to-advisor-50 rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gecko-800 mb-4">100% Open Source</h2>
        <p className="text-gecko-600 mb-6">
          Gecko Advisor is completely free and open-source. Our code is publicly available on GitHub,
          meaning anyone can inspect, contribute to, or deploy their own instance.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="https://github.com/privacygecko/gecko-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gecko-800 text-white rounded-xl hover:bg-gecko-700 transition-colors"
          >
            <GitHubIcon className="w-5 h-5" />
            View on GitHub
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-advisor-600 border border-advisor-200 rounded-xl hover:bg-advisor-50 transition-colors"
          >
            Scan a Website
          </Link>
        </div>
      </section>

      {/* Privacy Commitment */}
      <section className="bg-white rounded-2xl shadow-soft p-8">
        <h2 className="text-2xl font-semibold text-gecko-800 mb-4">Our Privacy Commitment</h2>
        <ul className="space-y-3 text-gecko-600">
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong>No tracking:</strong> We don&apos;t use analytics, cookies, or fingerprinting on our site.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong>No accounts required:</strong> Scan any website without signing up or logging in.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong>No data selling:</strong> We never sell, share, or monetize your data.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span><strong>Transparent methodology:</strong> Our scoring algorithm is open-source and documented.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

// Icon Components
function CookieIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrackerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
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

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
