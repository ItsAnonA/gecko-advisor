/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Domain Report Page (SSR)
 *
 * The most important SEO page - generates unique content for each domain.
 * Uses ISR with 1-hour revalidation.
 */

import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  normalizeDomain,
  isValidDomain,
  buildWebPageSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  SEO_CONSTANTS,
} from '@gecko-advisor/shared';
import { getReportForDomain } from '@/lib/api';
import { ReportContent } from '@/components/seo/ReportContent';
import { JsonLd } from '@/components/seo/JsonLd';

interface Props {
  params: Promise<{ domain: string }>;
}

// Revalidate every hour
export const revalidate = 3600;

// Generate metadata - uses cached getReportForDomain()
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain: encodedDomain } = await params;
  const rawDomain = decodeURIComponent(encodedDomain);

  // This call is cached - same data reused in page component
  const report = await getReportForDomain(rawDomain);

  if (!report) {
    return { title: 'Not Found' };
  }

  const { tier, heading, description, domain } = report;

  return {
    title: heading,
    description,
    alternates: {
      canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-policy/${domain}`,
    },
    robots: {
      index: tier !== 'noindex',
      follow: true,
    },
    openGraph: {
      title: `${domain} Privacy Analysis | ${SEO_CONSTANTS.SITE_NAME}`,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-policy/${domain}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: heading,
      description,
    },
  };
}

// Page component - uses same cached getReportForDomain()
export default async function ReportPage({ params }: Props) {
  const { domain: encodedDomain } = await params;
  const rawDomain = decodeURIComponent(encodedDomain);
  const normalized = normalizeDomain(rawDomain);

  // 404 for invalid domains BEFORE any data fetch
  if (!normalized || !isValidDomain(normalized)) {
    notFound();
  }

  // Redirect non-canonical URLs
  // Compare decoded rawDomain, not params.domain (which is still encoded)
  if (rawDomain !== normalized) {
    redirect(`/privacy-policy/${normalized}`);
  }

  // This call reuses cached result from generateMetadata()
  const report = await getReportForDomain(rawDomain);

  if (!report) {
    notFound();
  }

  const { data, tier, heading, domain, scanData } = report;

  // Handle noindex tier or missing data
  if (tier === 'noindex' || !data || !scanData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-display font-bold text-gecko-800 mb-4">{heading}</h1>
        <p className="text-gecko-600">
          This report is not available or the scan is incomplete.
        </p>
        <p className="text-gecko-500 mt-4">
          <Link href="/" className="text-advisor-600 hover:text-advisor-700 underline">
            Scan this website
          </Link>{' '}
          to generate a privacy report.
        </p>
      </div>
    );
  }

  // Build schemas - cast to Record for JSON.stringify in JsonLd component
  const schemas: Record<string, unknown>[] = [
    buildWebPageSchema(scanData, domain) as unknown as Record<string, unknown>,
    buildBreadcrumbSchema(domain) as unknown as Record<string, unknown>,
  ];

  const faqSchema = buildFAQSchema(scanData, domain, tier);
  if (faqSchema) schemas.push(faqSchema as unknown as Record<string, unknown>);

  return (
    <>
      {/* JSON-LD Schemas */}
      {schemas.map((schema, i) => (
        <JsonLd key={i} data={schema as Record<string, unknown>} />
      ))}

      {/* SSR Content (crawlable - guaranteed 300+ words for full tier) */}
      <div className="container mx-auto px-4 py-8">
        <ReportContent scanData={scanData} domain={domain} tier={tier} heading={heading} />

        {/* Score visualization */}
        <div className="bg-white rounded-xl shadow-soft p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={
                    (scanData.score ?? 0) >= 70
                      ? '#34d399'
                      : (scanData.score ?? 0) >= 40
                        ? '#fcd34d'
                        : '#fca5a5'
                  }
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${((scanData.score ?? 0) / 100) * 251.2} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-display font-bold text-gecko-800">
                  {scanData.score ?? '?'}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gecko-800">Privacy Score</h3>
              <p className="text-gecko-600">
                {(scanData.score ?? 0) >= 70
                  ? 'Low Risk'
                  : (scanData.score ?? 0) >= 40
                    ? 'Moderate Risk'
                    : 'High Risk'}
              </p>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="bg-advisor-50 border border-advisor-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-gecko-800 mb-2">
            Want to check another website?
          </h3>
          <p className="text-gecko-600 mb-4">
            Analyze any website&apos;s privacy practices with our free scanner.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-advisor-600 text-white font-medium rounded-lg hover:bg-advisor-700 transition-colors"
          >
            Scan a Website
          </Link>
        </div>
      </div>
    </>
  );
}
