/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchAnswerData } from '@/lib/api';
import { AnswerPage, type AnswerPageData } from '@/components/seo/AnswerPage';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchAnswerData(slug);
  if (!data || !data.content) return {};

  return {
    title: data.title,
    description: data.content.headline,
    alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/answers/${slug}` },
    openGraph: {
      title: data.title,
      description: data.content.headline,
      url: `${SEO_CONSTANTS.BASE_URL}/answers/${slug}`,
      siteName: SEO_CONSTANTS.SITE_NAME,
      type: 'article',
    },
  };
}

export default async function AnswerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data: AnswerPageData | null = await fetchAnswerData(slug);
  if (!data || !data.content) notFound();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.content.faqItems.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema as Record<string, unknown>} />
      <AnswerPage data={data} />
    </>
  );
}
