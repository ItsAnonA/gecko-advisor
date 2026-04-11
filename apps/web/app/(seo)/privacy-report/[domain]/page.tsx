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

import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import {
  normalizeHostname as normalizeDomain,
  isValidDomain,
  buildWebPageSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  SEO_CONSTANTS,
} from '@gecko-advisor/shared';
import { getReportForDomain, fetchDomainChanges, checkDomainStatus, fetchTopDomainsForStaticParams, fetchNarrativeContext } from '@/lib/api';
import { JsonLd } from '@/components/seo/JsonLd';
import { SEOSummary } from '@/components/seo/SEOSummary';
import { NarrativeContent } from '@/components/seo/NarrativeContent';
import { InteractiveReport, ChangeHistory, ChangeHistorySkeleton } from '@/components/report';
import { DomainReportCTA } from '@/components/report/DomainReportCTA';
import {
  generateDomainNarrative,
  generateDomainTitle,
  generateDomainDescription,
  getDomainDisplayName,
  type ComparisonLink,
} from '@/lib/generateDomainNarrative';
import { getComparisonPairsForDomain, getOtherDomain } from '@/data/comparison-pairs';

interface Props {
  params: Promise<{ domain: string }>;
}

// Revalidate every hour
export const revalidate = 3600;

// Pre-generate the top 500 most-scanned domains at build time for faster initial loads.
// Falls back to on-demand ISR for all other domains.
export async function generateStaticParams(): Promise<Array<{ domain: string }>> {
  try {
    const domains = await fetchTopDomainsForStaticParams(500);
    return domains.map((domain) => ({ domain }));
  } catch {
    // On any failure (e.g., API unreachable at build time), return empty array.
    // All pages will still be generated on-demand via ISR.
    return [];
  }
}

// Phase 3: Change History Section (async component for Suspense)
async function ChangeHistorySection({ domain }: { domain: string }) {
  const changesData = await fetchDomainChanges(domain, { limit: 10 });
  if (!changesData || changesData.changes.length === 0) {
    return null;
  }
  return <ChangeHistory domain={domain} changes={changesData.changes} />;
}

// Generate metadata - uses cached getReportForDomain() + narrative context
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain: encodedDomain } = await params;
  const rawDomain = decodeURIComponent(encodedDomain);

  // This call is cached - same data reused in page component
  const report = await getReportForDomain(rawDomain);

  if (!report) {
    return { title: 'Not Found' };
  }

  const { tier: baseTier, heading, description, domain } = report;

  // Try narrative-driven titles for quality-tier domains
  const narrativeCtx = await fetchNarrativeContext(domain);
  let title = heading;
  let desc = description;

  // Domains with < 3 scans get demoted to 'limited' (noindex) regardless of scan quality.
  // Only domains with sufficient scan history produce differentiated content worth indexing.
  const scanCount = narrativeCtx?.domain?.scanCount ?? 1;
  const tier = (baseTier === 'full' && scanCount < 3) ? 'limited' as const : baseTier;

  if (narrativeCtx && scanCount >= 3) {
    // Use varied titles from narrative engine
    title = generateDomainTitle(narrativeCtx.domain);
    if (narrativeCtx.categoryStats) {
      desc = generateDomainDescription(narrativeCtx.domain, narrativeCtx.categoryStats);
    }
  }

  // Freshness signal: article:modified_time from last scan date
  const lastScanned = narrativeCtx?.scanHistory?.[0]?.date || report.scanData.finishedAt;

  return {
    title,
    description: desc,
    alternates: {
      canonical: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${domain}`,
    },
    robots: {
      index: tier === 'full',
      follow: true,
    },
    openGraph: {
      title: `${getDomainDisplayName(domain)} Privacy Score & Tracker Analysis`,
      description: desc,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${domain}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
      ...(lastScanned && { modifiedTime: new Date(lastScanned).toISOString() }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
    // article:modified_time for freshness signal
    other: lastScanned
      ? { 'article:modified_time': new Date(lastScanned).toISOString() }
      : undefined,
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

  // Permanent redirect non-canonical URLs (308, not 307)
  // Compare decoded rawDomain, not params.domain (which is still encoded)
  if (rawDomain !== normalized) {
    permanentRedirect(`/privacy-report/${normalized}`);
  }

  // This call reuses cached result from generateMetadata()
  const report = await getReportForDomain(rawDomain);

  // Smart 404 handling: redirect if value exists, 404 only for bot noise
  if (!report) {
    const status = await checkDomainStatus(normalized);

    // Domain exists but scan was pruned → 301 redirect to preserve SEO value
    if (status.exists && !status.hasScan) {
      // If domain has category, redirect to category hub (308 permanent)
      if (status.category?.slug) {
        permanentRedirect(`/privacy-benchmarks/${status.category.slug}`);
      }
      // Otherwise redirect to reports index (308 permanent)
      permanentRedirect('/reports');
    }

    // Domain never existed → true 404 (bot noise)
    notFound();
  }

  // data and scanData are guaranteed non-null when report is non-null
  const { data, tier, heading, domain, scanData } = report;

  // Fetch narrative context for quality-tier domains
  const narrativeCtx = await fetchNarrativeContext(domain);
  const isQualityTier = narrativeCtx && narrativeCtx.domain.scanCount >= 3;

  // Generate narrative for quality-tier domains (500-900 words)
  let narrative = null;
  if (isQualityTier && narrativeCtx.globalStats) {
    const comparisonPairs = getComparisonPairsForDomain(domain);
    const comparisonLinks = comparisonPairs.slice(0, 5).map(pair => ({
      otherDomain: getOtherDomain(pair, domain),
      otherDisplayName: getDomainDisplayName(getOtherDomain(pair, domain)),
    }));

    narrative = generateDomainNarrative(
      narrativeCtx.domain,
      narrativeCtx.categoryStats || null,
      narrativeCtx.globalStats,
      narrativeCtx.scanHistory,
      narrativeCtx.relatedDomains,
      comparisonLinks
    );
  }

  // Build schemas - cast to Record for JSON.stringify in JsonLd component
  const schemas: Record<string, unknown>[] = [
    buildWebPageSchema(scanData, domain) as unknown as Record<string, unknown>,
    buildBreadcrumbSchema(domain) as unknown as Record<string, unknown>,
  ];

  const faqSchema = buildFAQSchema(scanData, domain, tier);
  if (faqSchema) schemas.push(faqSchema as unknown as Record<string, unknown>);

  // TechArticle schema with dateModified for freshness signal
  const lastScanned = narrativeCtx?.scanHistory?.[0]?.date || scanData.finishedAt;
  if (lastScanned) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: `${getDomainDisplayName(domain)} Privacy Report`,
      dateModified: new Date(lastScanned).toISOString(),
      author: { '@type': 'Organization', name: 'Gecko Advisor' },
      publisher: { '@type': 'Organization', name: 'Gecko Advisor' },
      mainEntityOfPage: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${domain}`,
    } as Record<string, unknown>);
  }

  // Build SEO content: NarrativeContent for quality-tier, SEOSummary as fallback
  const seoContent = narrative ? (
    <NarrativeContent
      narrative={narrative}
      domain={narrativeCtx!.domain}
      relatedDomains={narrativeCtx!.relatedDomains}
      sameTrackerDomains={narrativeCtx!.sameTrackerDomains}
      technologyLinks={narrativeCtx!.technologyLinks}
      categorySlug={narrativeCtx!.categorySlug}
    />
  ) : (
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
              <Link href="/domain-privacy-risk" className="hover:text-advisor-600 transition-colors" itemProp="item">
                <span itemProp="name">Domain Privacy Risk</span>
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
          category={data.category}
        />

        {/* Phase 3: Change History - shows privacy changes over time */}
        <Suspense fallback={<ChangeHistorySkeleton />}>
          <ChangeHistorySection domain={domain} />
        </Suspense>

        {/* Domain Intelligence Resources CTA — signals drive contextual hub links */}
        <DomainReportCTA
          domain={domain}
          score={scanData.score}
          trackerCount={scanData.trackerCount}
          cookieCount={data.meta?.cookieCount}
        />
      </div>
    </>
  );
}
