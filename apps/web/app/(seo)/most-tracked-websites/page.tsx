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
  type: 'most-tracked' as const,
  title: 'Most Tracked Websites: Sites With the Most Third-Party Trackers',
  metricLabel: 'Trackers',
  metricKey: 'trackerCount' as const,
  relatedPages: [
    { label: 'Highest Privacy Scores', href: '/websites-with-highest-privacy-score' },
    { label: 'Most Cookies', href: '/websites-with-most-cookies' },
    { label: 'Top 100 Privacy', href: '/top-100-websites-privacy' },
    { label: 'Least Private Websites', href: '/least-private-websites' },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchRankings(PAGE_CONFIG.type);
  const count = data?.stats.totalDomains.toLocaleString() || '40,000+';

  return {
    title: `${PAGE_CONFIG.title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description: `Ranked list of websites with the highest number of third-party trackers. Based on analysis of ${count} domains. Updated daily.`,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/most-tracked-websites` },
    openGraph: {
      title: PAGE_CONFIG.title,
      description: `Which websites load the most trackers? See the ranked list based on ${count} domain scans.`,
      url: `${SEO_CONSTANTS.BASE_URL}/most-tracked-websites`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function MostTrackedPage() {
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
      name: `${d.displayName} — ${d.trackerCount} trackers`,
    })),
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />
      <AuthorityPage
        title={PAGE_CONFIG.title}
        intro={`Based on analysis of ${data.stats.totalDomains.toLocaleString()} domains scanned by Gecko Advisor, these websites load the highest number of detected third-party trackers. The global average is ${data.stats.avgTrackerCount.toFixed(1)} trackers per domain.`}
        metricLabel={PAGE_CONFIG.metricLabel}
        metricKey={PAGE_CONFIG.metricKey}
        data={data}
        relatedPages={PAGE_CONFIG.relatedPages}
      />
    </>
  );
}
