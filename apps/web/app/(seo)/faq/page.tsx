/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

const faqs = [
  {
    question: 'What is Gecko Advisor?',
    answer:
      'Gecko Advisor is a domain intelligence platform built for vendor risk and compliance teams. We provide automated privacy scoring, tracker detection, and security analysis for any website, helping organizations make informed decisions during vendor onboarding and ongoing monitoring.',
  },
  {
    question: 'What do you check?',
    answer:
      'We scan for third-party trackers, cookies, HTTPS/TLS security, mixed content, and data sharing practices. Our analysis includes tracking domains from EasyPrivacy and WhoTracks.me databases.',
  },
  {
    question: 'Do you track users?',
    answer:
      "No. We don't use analytics, cookies, or any tracking. We practice the privacy we preach. Your scans are processed anonymously with no user accounts or authentication.",
  },
  {
    question: 'How accurate are the results?',
    answer:
      'We use industry-standard databases (EasyPrivacy, WhoTracks.me) with ~95% accuracy for tracker detection. Our methodology is documented and transparent, available on our methodology page.',
  },
  {
    question: 'Can I scan my own website?',
    answer:
      "Absolutely! Gecko Advisor is perfect for auditing your own site's privacy and security practices. Many developers and compliance teams use it to catch privacy issues before they become vendor risk concerns.",
  },
  {
    question: 'Is the methodology transparent?',
    answer:
      'Yes. Our scoring methodology, detection approach, and data sources are fully documented on our methodology page. We publish accuracy metrics and confidence calibration data so teams can assess our reliability.',
  },
  {
    question: 'How long does a scan take?',
    answer:
      'Most scans complete in 5-10 seconds. Complex websites with many resources may take up to 60 seconds. We show real-time progress during the scan.',
  },
  {
    question: 'Can I share my scan results?',
    answer:
      'Yes! Every scan gets a unique shareable URL (e.g., /r/example-com-abc123). Anyone with the link can view the report without creating an account.',
  },
  {
    question: 'What privacy score do you use?',
    answer:
      'We calculate a score from 0-100 based on trackers found, cookie usage, security headers, and HTTPS implementation. Higher scores (70-100) indicate better privacy practices.',
  },
  {
    question: 'Do you scan mobile apps?',
    answer:
      'Not currently. GeckoAdvisor focuses on web-based privacy analysis. We scan publicly accessible websites and web applications.',
  },
  {
    question: 'Can I use this for commercial purposes?',
    answer:
      'Yes! Gecko Advisor offers a free scanner for individual use and a paid API for programmatic access. Enterprise teams can integrate domain intelligence into vendor risk workflows, compliance pipelines, and security audits.',
  },
  {
    question: 'How often should I rescan a website?',
    answer:
      'We recommend rescanning after major website updates or quarterly for ongoing monitoring. Our deduplication system prevents excessive rescans of the same URL within 24 hours.',
  },
  {
    question: 'What browsers do you support?',
    answer:
      'GeckoAdvisor works on all modern browsers (Chrome, Firefox, Safari, Edge). Our scanning engine uses headless Chromium for consistent results across all websites.',
  },
  {
    question: 'Can I download scan reports?',
    answer:
      'Currently, reports are web-based only. Our Domain Intelligence API provides programmatic access to scan data for integration into your existing workflows and tools.',
  },
  {
    question: 'Why did my site get a low score?',
    answer:
      'Low scores typically result from: many third-party trackers, excessive cookies, missing security headers, or mixed content warnings. Check the evidence section for specifics.',
  },
  {
    question: "How can I improve my website's privacy score?",
    answer:
      'Focus on: reducing third-party trackers, implementing proper HTTPS, adding security headers (CSP, HSTS), minimizing cookie usage, and using privacy-respecting analytics.',
  },
];

// SEO: FAQPage structured data for rich snippets in Google
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

// SEO: Breadcrumb structured data
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://geckoadvisor.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'FAQ',
      item: 'https://geckoadvisor.com/faq',
    },
  ],
};

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    "Get answers to common questions about Gecko Advisor's privacy scanner. Learn how we detect trackers, calculate privacy scores, and assess domain risk.",
  keywords:
    'privacy scanner FAQ, website tracker detection, privacy score explained, domain intelligence platform, vendor risk assessment',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/faq`,
  },
  openGraph: {
    title: 'Frequently Asked Questions',
    description: "Get answers to common questions about Gecko Advisor's privacy scanner.",
    url: `${SEO_CONSTANTS.BASE_URL}/faq`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Frequently Asked Questions',
    description: "Get answers to common questions about Gecko Advisor's privacy scanner.",
  },
};

export default function FaqPage() {
  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'FAQ' },
          ]}
        />

        {/* Header */}
        <header className="text-center space-y-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-5xl font-black text-gecko-800 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg md:text-xl text-gecko-600 max-w-2xl mx-auto">
            Everything you need to know about GeckoAdvisor&apos;s privacy scanning
          </p>
        </header>

        {/* FAQ Grid */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-soft">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-stone-50 p-5 rounded-lg border-2 border-gray-200 hover:border-advisor-500 hover:shadow-lg transition-all"
              >
                <h2 className="text-lg font-semibold text-gecko-800 mb-2">{faq.question}</h2>
                <p className="text-sm md:text-base text-gecko-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>

          {/* FAQ Footer */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gecko-600">
              More questions?{' '}
              <a
                href="mailto:hello@geckoadvisor.com"
                className="text-advisor-600 hover:text-advisor-700 font-medium hover:underline"
              >
                contact us
              </a>
            </p>
          </div>
        </section>

        {/* Back to Home CTA */}
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
    </>
  );
}
