/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchSimilarDomains, type SimilarDomainsResponse } from '@/lib/api';
import { SimilarityPage } from '@/components/seo/SimilarityPage';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain } = await params;
  const data = await fetchSimilarDomains(domain);
  if (!data) return {};

  const title = `Sites Like ${data.source.displayName}: Privacy Comparison`;
  const description = `Compare ${data.similar.length} domains similar to ${data.source.displayName}. See privacy scores, trackers, and side-by-side comparisons.`;

  return {
    title: `${title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/sites-like/${domain}` },
    openGraph: {
      title,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/sites-like/${domain}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function SitesLikePage({ params }: PageProps) {
  const { domain } = await params;
  const data: SimilarDomainsResponse | null = await fetchSimilarDomains(domain);
  if (!data) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Sites Like ${data.source.displayName}`,
    numberOfItems: data.similar.length,
    itemListElement: data.similar.slice(0, 10).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SEO_CONSTANTS.BASE_URL}/privacy-report/${d.domain}`,
      name: `${d.displayName} — Score ${d.score}`,
    })),
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />
      <SimilarityPage data={data} />
    </>
  );
}
