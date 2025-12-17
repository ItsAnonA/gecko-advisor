/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Legacy Short Slug Redirect
 *
 * Catches old root-level short slugs (e.g., /ePpVg5) and redirects to /r/[slug]
 * This maintains backwards compatibility with previously indexed URLs.
 */

import { permanentRedirect, notFound } from 'next/navigation';

interface Props {
  params: Promise<{ shortSlug: string }>;
}

// Short slugs are 8 alphanumeric characters
const SHORT_SLUG_PATTERN = /^[a-zA-Z0-9]{8}$/;

export default async function LegacyShortSlugPage({ params }: Props) {
  const { shortSlug } = await params;

  // Only redirect if it looks like a short slug (8 alphanumeric chars)
  if (SHORT_SLUG_PATTERN.test(shortSlug)) {
    permanentRedirect(`/r/${shortSlug}`);
  }

  // For anything else, show 404
  notFound();
}

// Generate metadata for SEO - noindex for these redirects
export async function generateMetadata({ params }: Props) {
  const { shortSlug } = await params;

  if (SHORT_SLUG_PATTERN.test(shortSlug)) {
    return {
      robots: 'noindex, follow',
    };
  }

  return {
    robots: 'noindex, nofollow',
  };
}
