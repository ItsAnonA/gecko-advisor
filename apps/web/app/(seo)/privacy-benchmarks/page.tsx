/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Privacy Benchmarks Index Page
 *
 * Lists all categories with their benchmark summaries.
 * Links to individual category hub pages.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';

export const metadata: Metadata = {
  title: 'Privacy Benchmarks by Industry',
  description:
    'Compare website privacy practices across industries. See how streaming, e-commerce, SaaS, and news sites handle your data with average scores and tracker analysis.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-benchmarks`,
  },
  openGraph: {
    title: 'Privacy Benchmarks by Industry',
    description:
      'Compare website privacy practices across industries. See how streaming, e-commerce, SaaS, and news sites handle your data.',
    url: `${SEO_CONSTANTS.BASE_URL}/privacy-benchmarks`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

// Revalidate every hour
export const revalidate = 3600;

interface CategoryData {
  slug: string;
  name: string;
  description: string;
  icon: string;
  benchmarks: {
    avgScore: number;
    sampleSize: number;
    avgTrackers: number;
    fingerprintingRate: number;
  } | null;
}

async function getCategories(): Promise<CategoryData[]> {
  try {
    const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/v2/categories`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, string> = {
  streaming: '🎬',
  ecommerce: '🛒',
  saas: '💼',
  news: '📰',
};

export default async function PrivacyBenchmarksPage() {
  const categories = await getCategories();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-sky-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Privacy Benchmarks</span>
      </nav>

      {/* Header */}
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Privacy Benchmarks by Industry
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Compare how websites in different industries handle your privacy. See average
          scores, tracker counts, and fingerprinting rates across thousands of analyzed
          sites.
        </p>
      </header>

      {/* Categories Grid */}
      {categories.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/privacy-benchmarks/${category.slug}`}
              className="group block p-6 bg-white rounded-xl border border-gray-200 hover:border-sky-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl" role="img" aria-hidden="true">
                  {CATEGORY_ICONS[category.slug] || '📊'}
                </span>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-sky-600 transition-colors">
                    {category.name}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1 mb-4">{category.description}</p>

                  {category.benchmarks ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Avg Score</span>
                        <p className="font-semibold text-gray-900">
                          {category.benchmarks.avgScore}/100
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Sites Analyzed</span>
                        <p className="font-semibold text-gray-900">
                          {category.benchmarks.sampleSize.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Trackers</span>
                        <p className="font-semibold text-gray-900">
                          {category.benchmarks.avgTrackers.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Fingerprinting</span>
                        <p className="font-semibold text-gray-900">
                          {category.benchmarks.fingerprintingRate}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Benchmarks coming soon</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl mb-12">
          <p className="text-gray-500">Category benchmarks are being calculated...</p>
          <p className="text-gray-400 text-sm mt-2">Check back soon!</p>
        </div>
      )}

      {/* CTA */}
      <section className="bg-sky-50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Check any website&apos;s privacy
        </h2>
        <p className="text-gray-600 mb-6">
          Free, instant analysis. No signup required.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors"
        >
          Scan a Website
        </Link>
      </section>
    </main>
  );
}
