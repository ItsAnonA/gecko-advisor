/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Reports Index Page (SSR)
 *
 * Lists quality-gated privacy reports with tiered pagination.
 *
 * Pagination tiers (controls crawl budget):
 * - page 1-10:  index, follow  (high-value discovery pages)
 * - page 11+:   noindex, follow (crawlable but not indexed)
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { SEO_CONSTANTS, buildWebSiteSchema } from '@gecko-advisor/shared';
import { fetchReports } from '@/lib/api';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

/** Pages 1-10 get indexed; 11-50 noindex but follow; 51+ noindex nofollow */
const MAX_INDEXED_PAGE = 10;
const MAX_CRAWLABLE_PAGE = 50;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const shouldIndex = page <= MAX_INDEXED_PAGE;

  return {
    title: page === 1 ? 'Privacy Reports' : `Privacy Reports - Page ${page}`,
    description:
      'Browse privacy analysis reports for popular websites. Find out which sites track you and how they handle your data.',
    alternates: {
      // Canonical only for page 1; deep pages don't self-canonicalize
      canonical: page === 1 ? `${SEO_CONSTANTS.BASE_URL}/reports` : undefined,
    },
    robots: {
      index: shouldIndex,
      follow: page <= MAX_CRAWLABLE_PAGE, // Stop link following beyond page 50
    },
    openGraph: {
      title: 'Privacy Reports',
      description: 'Browse privacy analysis reports for popular websites.',
      url: `${SEO_CONSTANTS.BASE_URL}/reports`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

// Revalidate every hour
export const revalidate = 3600;

export default async function ReportsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const limit = 20;

  const result = await fetchReports(page, limit);

  if (!result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-bold text-gecko-800 mb-4">Privacy Reports</h1>
        <p className="text-gecko-600">Unable to load reports. Please try again later.</p>
      </div>
    );
  }

  const { items, pagination } = result;

  return (
    <>
      {/* Schema */}
      <JsonLd data={buildWebSiteSchema() as Record<string, unknown>} />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Privacy Reports' },
          ]}
        />

        <h1 className="text-3xl font-display font-bold text-gecko-800 mb-2">Privacy Reports</h1>
        <p className="text-gecko-600 mb-8">
          Browse privacy analysis reports for websites. Each report includes a privacy score,
          tracker detection, and security assessment.
        </p>

        {/* Report Grid */}
        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {items.map((item) => (
              <Link
                key={item.slug}
                href={`/privacy-report/${item.domain}`}
                className="block bg-white rounded-xl shadow-soft p-6 hover:shadow-soft-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Favicon */}
                    <Image
                      src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
                      alt=""
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded flex-shrink-0"
                      unoptimized
                    />
                    <h2 className="font-mono text-lg font-medium text-gecko-800 truncate">
                      {item.domain}
                    </h2>
                  </div>
                  <span
                    className={`flex-shrink-0 ml-2 px-2 py-1 text-sm font-semibold rounded ${
                      item.score >= 70
                        ? 'bg-green-100 text-green-700'
                        : item.score >= 40
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.score}/100
                  </span>
                </div>
                <p className="text-sm text-gecko-500">
                  {item.label} &bull;{' '}
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gecko-600 mb-8">No reports found.</p>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-2"
            aria-label="Reports pagination"
          >
            {pagination.page > 1 && (
              <Link
                href={`/reports?page=${pagination.page - 1}`}
                className="px-4 py-2 text-gecko-600 hover:text-advisor-600 hover:bg-gecko-50 rounded-lg transition-colors"
              >
                Previous
              </Link>
            )}

            <span className="px-4 py-2 text-gecko-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            {pagination.hasNextPage && (
              <Link
                href={`/reports?page=${pagination.page + 1}`}
                className="px-4 py-2 text-gecko-600 hover:text-advisor-600 hover:bg-gecko-50 rounded-lg transition-colors"
              >
                Next
              </Link>
            )}
          </nav>
        )}

        {/* SEO text */}
        <section className="mt-12 border-t border-light-border pt-8">
          <h2 className="text-xl font-semibold text-gecko-800 mb-4">
            About Gecko Advisor Privacy Reports
          </h2>
          <p className="text-gecko-600 mb-4">
            Gecko Advisor automatically scans websites to analyze their privacy practices. Our
            reports examine tracking scripts, third-party connections, cookie usage, and security
            configuration to generate a comprehensive privacy score.
          </p>
          <p className="text-gecko-600 mb-4">
            Each privacy report provides detailed findings including the number of trackers
            detected, third-party services the site connects to, and the quality of its security
            implementation. Use these reports to make informed decisions about which websites you
            visit and share your data with.
          </p>
          <p className="text-gecko-600">
            Want to check a website not listed here?{' '}
            <Link href="/" className="text-advisor-600 hover:text-advisor-700 underline">
              Scan any website
            </Link>{' '}
            to generate a free privacy report.
          </p>
        </section>
      </div>
    </>
  );
}
