/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Faq() {
  const faqs = [
    {
      question: 'Is GeckoAdvisor open source?',
      answer: 'Yes! GeckoAdvisor is fully open source under the MIT license. Our code, methodology, and data sources are public on GitHub. Anyone can audit, contribute, or fork the project. We believe privacy tools should be transparent and community-driven.',
    },
    {
      question: 'What do you check?',
      answer: 'We scan for third-party trackers, cookies, HTTPS/TLS security, mixed content, and data sharing practices. Our analysis includes tracking domains from EasyPrivacy and WhoTracks.me databases.',
    },
    {
      question: 'Do you track users?',
      answer: "No. We don't use analytics, cookies, or any tracking. We practice the privacy we preach. Your scans are processed anonymously with no user accounts or authentication.",
    },
    {
      question: 'How accurate are the results?',
      answer: 'We use industry-standard databases (EasyPrivacy, WhoTracks.me) with ~95% accuracy for tracker detection. Our methodology is open-source and auditable on GitHub.',
    },
    {
      question: 'Can I scan my own website?',
      answer: "Absolutely! GeckoAdvisor is perfect for auditing your own site's privacy and security practices. Many developers use it during development to catch privacy issues early.",
    },
    {
      question: 'Is the code open source?',
      answer: 'Yes! Our code, methodology, and data sources are all public on GitHub for full transparency. You can review our approach, contribute improvements, or fork the project.',
    },
    {
      question: 'How long does a scan take?',
      answer: 'Most scans complete in 5-10 seconds. Complex websites with many resources may take up to 60 seconds. We show real-time progress during the scan.',
    },
    {
      question: 'Can I share my scan results?',
      answer: 'Yes! Every scan gets a unique shareable URL (e.g., /r/example-com-abc123). Anyone with the link can view the report without creating an account.',
    },
    {
      question: 'What privacy score do you use?',
      answer: 'We calculate a score from 0-100 based on trackers found, cookie usage, security headers, and HTTPS implementation. Higher scores (70-100) indicate better privacy practices.',
    },
    {
      question: 'Do you scan mobile apps?',
      answer: 'Not currently. GeckoAdvisor focuses on web-based privacy analysis. We scan publicly accessible websites and web applications.',
    },
    {
      question: 'Can I use this for commercial purposes?',
      answer: 'Yes! GeckoAdvisor is licensed under MIT, allowing commercial use. You can integrate it into your workflows, compliance processes, or client audits.',
    },
    {
      question: 'How often should I rescan a website?',
      answer: 'We recommend rescanning after major website updates or quarterly for ongoing monitoring. Our deduplication system prevents excessive rescans of the same URL within 24 hours.',
    },
    {
      question: 'What browsers do you support?',
      answer: 'GeckoAdvisor works on all modern browsers (Chrome, Firefox, Safari, Edge). Our scanning engine uses headless Chromium for consistent results across all websites.',
    },
    {
      question: 'Can I download scan reports?',
      answer: 'Currently, reports are web-based only. We plan to add PDF export and API access in future releases. Follow our GitHub for updates.',
    },
    {
      question: 'Why did my site get a low score?',
      answer: 'Low scores typically result from: many third-party trackers, excessive cookies, missing security headers, or mixed content warnings. Check the evidence section for specifics.',
    },
    {
      question: 'How can I improve my website\'s privacy score?',
      answer: 'Focus on: reducing third-party trackers, implementing proper HTTPS, adding security headers (CSP, HSTS), minimizing cookie usage, and using privacy-respecting analytics.',
    },
  ];

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header */}
        <header className="text-center space-y-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-5xl font-black text-zinc-900 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto">
            Everything you need to know about GeckoAdvisor's privacy scanning
          </p>
        </header>

        {/* FAQ Grid */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-stone-50 p-5 rounded-lg border-2 border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all"
              >
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm md:text-base text-zinc-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          {/* FAQ Footer */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-zinc-600">
              More questions?{' '}
              <a
                href="/docs"
                className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
              >
                Check our documentation
              </a>
              {' '}or{' '}
              <a
                href="mailto:hello@geckoadvisor.com"
                className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
              >
                contact us
              </a>
            </p>
          </div>
        </section>

        {/* Back to Home CTA */}
        <div className="text-center py-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Scanner
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
