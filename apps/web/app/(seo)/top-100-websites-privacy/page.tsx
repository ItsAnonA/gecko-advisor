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
  type: 'top-100' as const,
  title: 'Top 100 Websites Privacy Analysis: How Popular Sites Score',
  metricLabel: 'Score',
  metricKey: 'score' as const,
  relatedPages: [
    { label: 'Most Tracked Websites', href: '/most-tracked-websites' },
    { label: 'Highest Privacy Scores', href: '/websites-with-highest-privacy-score' },
    { label: 'Most Cookies', href: '/websites-with-most-cookies' },
    { label: 'Least Private Websites', href: '/least-private-websites' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchRankings(PAGE_CONFIG.type);
  const avgScore = data?.stats.avgScore.toFixed(1) || '84';

  return {
    title: `${PAGE_CONFIG.title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description: `Privacy scores for the most-scanned websites. Average score: ${avgScore}/100. See how the internet's most popular domains handle trackers, cookies, and fingerprinting.`,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/top-100-websites-privacy` },
    openGraph: {
      title: PAGE_CONFIG.title,
      description: `How do the most popular websites handle privacy? See scores, tracker counts, and cookie analysis.`,
      url: `${SEO_CONSTANTS.BASE_URL}/top-100-websites-privacy`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function Top100Page() {
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
        intro={`Privacy scores for the most frequently scanned websites on Gecko Advisor. These are the domains users check most often. The average privacy score across all ${data.stats.totalDomains.toLocaleString()} analyzed domains is ${data.stats.avgScore.toFixed(1)} out of 100.`}
        metricLabel={PAGE_CONFIG.metricLabel}
        metricKey={PAGE_CONFIG.metricKey}
        data={data}
        relatedPages={PAGE_CONFIG.relatedPages}
      />
    </>
  );
}
