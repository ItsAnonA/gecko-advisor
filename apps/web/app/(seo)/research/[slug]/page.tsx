/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchResearchReport } from '@/lib/api';
import { ResearchReport, type ResearchReportData } from '@/components/seo/ResearchReport';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchResearchReport(slug);
  if (!data) return {};

  const finding = data.keyFindings?.[0] || data.subtitle;

  return {
    title: `${data.title} | ${SEO_CONSTANTS.SITE_NAME}`,
    description: finding,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/research/${slug}` },
    openGraph: {
      title: data.title,
      description: finding,
      url: `${SEO_CONSTANTS.BASE_URL}/research/${slug}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
    },
  };
}

export default async function ResearchReportPage({ params }: PageProps) {
  const { slug } = await params;
  const data: ResearchReportData | null = await fetchResearchReport(slug);
  if (!data) notFound();

  const reportSchema = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: data.title,
    description: data.keyFindings?.[0] || data.subtitle,
    url: `${SEO_CONSTANTS.BASE_URL}/research/${slug}`,
    datePublished: data.generatedAt,
    dateModified: data.generatedAt,
    publisher: {
      '@type': 'Organization',
      name: SEO_CONSTANTS.SITE_NAME,
      url: SEO_CONSTANTS.BASE_URL,
    },
    about: {
      '@type': 'Thing',
      name: 'Website Privacy',
    },
  };

  return (
    <>
      <JsonLd data={reportSchema as Record<string, unknown>} />
      <ResearchReport data={data} />
    </>
  );
}
