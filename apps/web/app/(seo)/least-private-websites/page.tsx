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
  type: 'least-private' as const,
  title: 'Least Private Websites: Lowest Privacy Scores',
  metricLabel: 'Score',
  metricKey: 'score' as const,
  relatedPages: [
    { label: 'Most Tracked Websites', href: '/most-tracked-websites' },
    { label: 'Highest Privacy Scores', href: '/websites-with-highest-privacy-score' },
    { label: 'Most Cookies', href: '/websites-with-most-cookies' },
    { label: 'Top 100 Privacy', href: '/top-100-websites-privacy' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchRankings(PAGE_CONFIG.type);
  const count = data?.stats.totalDomains.toLocaleString() || '40,000+';

  return {
    title: `${PAGE_CONFIG.title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description: `Websites with the lowest privacy scores. Ranked by score out of 100 based on tracker, cookie, and fingerprinting analysis of ${count} domains.`,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/least-private-websites` },
    openGraph: {
      title: PAGE_CONFIG.title,
      description: `Which websites score lowest for privacy? Based on analysis of ${count} domains.`,
      url: `${SEO_CONSTANTS.BASE_URL}/least-private-websites`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function LeastPrivatePage() {
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
      name: `${d.displayName} — Score: ${d.score}/100`,
    })),
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />
      <AuthorityPage
        title={PAGE_CONFIG.title}
        intro={`These websites have the lowest privacy scores among ${data.stats.totalDomains.toLocaleString()} domains analyzed by Gecko Advisor. Scores are based on tracker count, cookie usage, fingerprinting detection, and security header analysis. The global average score is ${data.stats.avgScore.toFixed(1)}.`}
        metricLabel={PAGE_CONFIG.metricLabel}
        metricKey={PAGE_CONFIG.metricKey}
        data={data}
        relatedPages={PAGE_CONFIG.relatedPages}
      />
    </>
  );
}
