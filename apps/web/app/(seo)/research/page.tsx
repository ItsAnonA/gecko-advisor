/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchResearchList } from '@/lib/api';
import { ResearchIndex } from '@/components/seo/ResearchIndex';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Privacy Research Reports',
  description:
    'Original privacy research based on automated analysis of tens of thousands of websites. Industry reports, tracker landscape studies, and cross-category privacy rankings.',
  alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/research` },
  openGraph: {
    title: 'Privacy Research Reports',
    description:
      'Data-driven privacy research across industries. Trackers, cookies, fingerprinting — analyzed at scale.',
    url: `${SEO_CONSTANTS.BASE_URL}/research`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

export default async function ResearchIndexPage() {
  const reports = await fetchResearchList();
  if (!reports || reports.length === 0) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Privacy Research Reports',
    description: 'Original privacy research based on automated analysis of websites.',
    url: `${SEO_CONSTANTS.BASE_URL}/research`,
    publisher: {
      '@type': 'Organization',
      name: SEO_CONSTANTS.SITE_NAME,
      url: SEO_CONSTANTS.BASE_URL,
    },
    hasPart: reports.map((r) => ({
      '@type': 'Report',
      name: r.title,
      description: r.teaser,
      url: `${SEO_CONSTANTS.BASE_URL}/research/${r.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />
      <ResearchIndex reports={reports} />
    </>
  );
}
