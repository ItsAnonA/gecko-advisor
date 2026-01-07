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
import { JsonLd } from '@/components/seo/JsonLd';
import { SEOSummary } from '@/components/seo/SEOSummary';
import { InteractiveReport } from '@/components/report';

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
      canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${domain}`,
    },
    robots: {
      index: tier !== 'noindex',
      follow: true,
    },
    openGraph: {
      title: `${domain} Privacy Score & Security Signals | ${SEO_CONSTANTS.SITE_NAME}`,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${domain}`,
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
    redirect(`/privacy-report/${normalized}`);
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

  // Build SEO content component to embed in Overview tab
  // Pass benchmark data for market comparison SEO content
  // Pass topFixes for remediation recommendations SEO content
  const seoContent = (
    <SEOSummary
      scanData={scanData}
      domain={domain}
      tier={tier}
      heading={heading}
      benchmarks={data.meta}
      topFixes={data.topFixes}
    />
  );

  return (
    <>
      {/* JSON-LD Schemas - Structured data for SEO */}
      {schemas.map((schema, i) => (
        <JsonLd key={i} data={schema as Record<string, unknown>} />
      ))}

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Breadcrumbs - At top for SEO and navigation with Schema.org markup */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol
            className="flex flex-wrap items-center gap-2 text-sm text-zinc-500"
            itemScope
            itemType="https://schema.org/BreadcrumbList"
          >
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" className="hover:text-advisor-600 transition-colors" itemProp="item">
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/reports" className="hover:text-advisor-600 transition-colors" itemProp="item">
                <span itemProp="name">Website Privacy Reports</span>
              </Link>
              <meta itemProp="position" content="2" />
            </li>
            <li aria-hidden="true">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span className="text-zinc-700 font-medium" itemProp="name">{domain}</span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </nav>

        {/* Interactive Report with SEO content embedded in Overview tab */}
        <InteractiveReport
          data={data}
          domain={domain}
          heading={heading}
          seoContent={seoContent}
        />
      </div>
    </>
  );
}
