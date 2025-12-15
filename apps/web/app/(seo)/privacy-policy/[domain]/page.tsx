/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Domain Report Page (SSR)
 *
 * The most important SEO page - generates unique content for each domain.
 * Uses ISR with 1-hour revalidation.
 *
 * Combines:
 * - SSR content for SEO (crawlable text, JSON-LD schemas)
 * - Client-side interactive components (score dial, tabs, evidence list)
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
import ReportPageClient from '@/components/report/ReportPageClient';

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

  // Build share URL for the report
  const shareUrl = `${SEO_CONSTANTS.BASE_URL}/privacy-policy/${domain}`;

  return (
    <>
      {/* JSON-LD Schemas */}
      {schemas.map((schema, i) => (
        <JsonLd key={i} data={schema as Record<string, unknown>} />
      ))}

      {/* Main Report Container */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back to Home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-advisor-600 hover:text-advisor-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-advisor-500 rounded"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>
        </div>

        {/* SSR Content (crawlable - guaranteed 300+ words for full tier) */}
        {/* Hidden visually but available to search engines */}
        <div className="sr-only">
          <ReportContent scanData={scanData} domain={domain} tier={tier} heading={heading} />
        </div>

        {/* Interactive Client Component */}
        <ReportPageClient
          scan={data.scan}
          evidence={data.evidence || []}
          domain={domain}
          shareUrl={shareUrl}
        />
      </div>
    </>
  );
}
