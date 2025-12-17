/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Slug Redirect Page
 *
 * Redirects short URLs (/r/:slug) to canonical domain URLs.
 * Uses 308 Permanent Redirect for SEO.
 */

import { notFound, permanentRedirect } from 'next/navigation';
import { fetchReportBySlug } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SlugRedirectPage({ params }: Props) {
  const { slug } = await params;

  if (!slug || typeof slug !== 'string') {
    notFound();
  }

  const report = await fetchReportBySlug(slug);

  if (!report || !report.domain) {
    notFound();
  }

  // 308 Permanent Redirect to canonical URL
  permanentRedirect(`/privacy-policy/${report.domain}`);
}

// Metadata for redirect pages (minimal)
export function generateMetadata() {
  return {
    robots: {
      index: false,
      follow: true,
    },
  };
}
