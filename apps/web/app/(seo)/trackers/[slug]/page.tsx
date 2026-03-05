/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchTrackerDetail } from '@/lib/api';
import { TrackerPage, type TrackerDetailData } from '@/components/seo/TrackerPage';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchTrackerDetail(slug);
  if (!data) return {};

  const title = `${data.name}: Website Adoption & Privacy Impact`;
  const description = `${data.domainCount.toLocaleString()} websites use ${data.name} (${data.datasetPercentage}% of scanned domains). See which sites use it, industry breakdown, and related trackers.`;

  return {
    title: `${title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/trackers/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SEO_CONSTANTS.BASE_URL}/trackers/${slug}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'website',
    },
  };
}

export default async function TrackerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data: TrackerDetailData | null = await fetchTrackerDetail(slug);
  if (!data) notFound();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is ${data.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${data.name} is a third-party technology detected on ${data.domainCount.toLocaleString()} websites in our dataset, representing ${data.datasetPercentage}% of scanned domains.`,
        },
      },
      {
        '@type': 'Question',
        name: `How many websites use ${data.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Based on our analysis, ${data.domainCount.toLocaleString()} websites use ${data.name}. ${data.topCategory ? `The most common industry is ${data.topCategory.name}.` : ''}`,
        },
      },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchema as Record<string, unknown>} />
      <TrackerPage data={data} />
    </>
  );
}
