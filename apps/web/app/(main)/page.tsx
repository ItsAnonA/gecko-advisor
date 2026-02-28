/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import { buildSoftwareApplicationSchema } from '@gecko-advisor/shared/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { ScanForm } from '@/components/home';

/**
 * SEO Metadata for the homepage
 *
 * IMPORTANT: Canonical URL ensures all query string variants (?url=, ?p=, etc.)
 * consolidate to the base homepage URL for SEO purposes.
 */
export const metadata: Metadata = {
  title: 'GeckoAdvisor — Domain Intelligence for Vendor Risk & Compliance',
  description: 'Screen vendor domains before onboarding. Real-time stability, tracker detection, and privacy risk data across 142K+ domains.',
  alternates: {
    canonical: 'https://geckoadvisor.com/',
  },
  openGraph: {
    title: 'GeckoAdvisor — Domain Intelligence for Vendor Risk & Compliance',
    description: 'Screen vendor domains before onboarding. Real-time stability, tracker detection, and privacy risk data across 142K+ domains.',
    type: 'website',
    url: 'https://geckoadvisor.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GeckoAdvisor — Domain Intelligence for Vendor Risk & Compliance',
    description: 'Screen vendor domains before onboarding. Real-time stability, tracker detection, and privacy risk data across 142K+ domains.',
  },
};

/**
 * Homepage - Main landing page with privacy scanner
 */
export default function HomePage() {
  return (
    <>
      <JsonLd data={buildSoftwareApplicationSchema() as unknown as Record<string, unknown>} />
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-16 md:pb-24 space-y-6 md:space-y-8">
        <ScanForm />
      </main>
    </>
  );
}
