/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Blog | Gecko Advisor',
  description:
    'Stay informed about online privacy, data protection, and security best practices. Read our latest articles on protecting your digital footprint.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/blog`,
  },
  openGraph: {
    title: `Privacy Blog | ${SEO_CONSTANTS.SITE_NAME}`,
    description:
      'Stay informed about online privacy, data protection, and security best practices.',
    url: `${SEO_CONSTANTS.BASE_URL}/blog`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Blog | Gecko Advisor',
    description:
      'Stay informed about online privacy, data protection, and security best practices.',
  },
};

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog' },
        ]}
      />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gecko-800">Privacy Blog</h1>
        <p className="mt-2 text-gecko-600">
          Insights, guides, and news about online privacy and data protection
        </p>
      </div>

      {/* Coming Soon State */}
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-soft">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-advisor-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gecko-800 mb-3">Blog Coming Soon</h2>
        <p className="text-gecko-600 max-w-md mx-auto mb-8">
          We&apos;re working on privacy guides, security tutorials, and industry insights. Check back
          soon for our first articles.
        </p>

        {/* Newsletter Signup Placeholder */}
        <div className="max-w-md mx-auto bg-advisor-50 rounded-xl p-6 border border-advisor-200">
          <h3 className="font-semibold text-gecko-800 mb-2">Get Notified</h3>
          <p className="text-sm text-gecko-600 mb-4">
            Follow us on GitHub to stay updated when we publish new content.
          </p>
          <a
            href="https://github.com/privacygecko/gecko-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gecko-800 text-white font-semibold rounded-lg hover:bg-gecko-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Watch on GitHub
          </a>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-12 text-center bg-stone-50 rounded-2xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gecko-800 mb-2">
          Check your website&apos;s privacy
        </h2>
        <p className="text-gecko-600 mb-6 max-w-2xl mx-auto">
          Use our free scanner to analyze any website for trackers, cookies, and privacy issues. Get
          a detailed report in seconds.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-advisor-600 hover:bg-advisor-500 active:bg-advisor-700 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Scan a Website
        </Link>
      </div>
    </div>
  );
}
