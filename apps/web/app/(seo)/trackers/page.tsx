/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchTrackerList } from '@/lib/api';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Tracker & Technology Directory | ${SEO_CONSTANTS.SITE_NAME}`,
  description:
    'Browse all third-party trackers and technologies detected across our dataset. See which websites use each tracker, adoption rates, and privacy impact.',
  alternates: { canonical: `${SEO_CONSTANTS.BASE_URL}/trackers` },
  openGraph: {
    title: 'Tracker & Technology Directory',
    description:
      'Explore third-party trackers detected across thousands of websites. See adoption rates and privacy impact.',
    url: `${SEO_CONSTANTS.BASE_URL}/trackers`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

export default async function TrackersIndexPage() {
  const data = await fetchTrackerList();
  if (!data || data.trackers.length === 0) notFound();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Tracker & Technology Directory',
    numberOfItems: data.total,
    itemListElement: data.trackers.slice(0, 20).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SEO_CONSTANTS.BASE_URL}/trackers/${t.slug}`,
      name: `${t.name} (${t.domainCount} domains)`,
    })),
  };

  return (
    <>
      <JsonLd data={schema as Record<string, unknown>} />
      <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Research', href: '/privacy-index' },
            { label: 'Trackers' },
          ]}
        />

        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
          Tracker &amp; Technology Directory
        </h1>
        <p className="text-lg text-zinc-600 mb-8 max-w-3xl leading-relaxed">
          {data.total.toLocaleString()} third-party trackers and technologies detected across
          our dataset. Each page shows which websites use the technology, industry breakdown,
          and commonly co-occurring trackers.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.trackers.map((t) => (
            <Link
              key={t.slug}
              href={`/trackers/${t.slug}`}
              className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-lg hover:border-advisor-300 hover:bg-advisor-50 transition-colors"
            >
              <span className="font-medium text-zinc-900">{t.name}</span>
              <span className="text-sm text-zinc-500 tabular-nums ml-2 shrink-0">
                {t.domainCount.toLocaleString()} domains
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
