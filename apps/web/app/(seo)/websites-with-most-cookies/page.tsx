/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchRankings } from '@/lib/api';
import { AuthorityPage } from '@/components/seo/AuthorityPage';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

const PAGE_CONFIG = {
  type: 'most-cookies' as const,
  title: 'Websites With the Most Cookies: Browser Cookie Analysis',
  metricLabel: 'Cookies',
  metricKey: 'cookieCount' as const,
  relatedPages: [
    { label: 'Most Tracked Websites', href: '/most-tracked-websites' },
    { label: 'Highest Privacy Scores', href: '/websites-with-highest-privacy-score' },
    { label: 'Top 100 Privacy', href: '/top-100-websites-privacy' },
    { label: 'Least Private Websites', href: '/least-private-websites' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchRankings(PAGE_CONFIG.type);
  const count = data?.stats.totalDomains.toLocaleString() || '40,000+';

  return {
    title: `${PAGE_CONFIG.title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description: `Which websites set the most cookies? Ranked list based on automated scans of ${count} domains. Average: ${data?.stats.avgCookieCount.toFixed(1) || '5'} cookies per site.`,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/websites-with-most-cookies` },
    openGraph: {
      title: PAGE_CONFIG.title,
      description: `See which websites set the most cookies in your browser. Based on ${count} domain scans.`,
      url: `${SEO_CONSTANTS.BASE_URL}/websites-with-most-cookies`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function MostCookiesPage() {
  const data = await fetchRankings(PAGE_CONFIG.type);
  if (!data) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: PAGE_CONFIG.title,
    numberOfItems: data.domains.length,
    itemListElement: data.domains.slice(0, 10).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${d.domain}`,
      name: `${d.displayName} — ${d.cookieCount} cookies`,
    })),
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />
      <AuthorityPage
        title={PAGE_CONFIG.title}
        intro={`These websites set the highest number of cookies during a visit. Based on automated scans of ${data.stats.totalDomains.toLocaleString()} domains by Gecko Advisor. The global average is ${data.stats.avgCookieCount.toFixed(1)} cookies per domain.`}
        metricLabel={PAGE_CONFIG.metricLabel}
        metricKey={PAGE_CONFIG.metricKey}
        data={data}
        relatedPages={PAGE_CONFIG.relatedPages}
      />
    </>
  );
}
