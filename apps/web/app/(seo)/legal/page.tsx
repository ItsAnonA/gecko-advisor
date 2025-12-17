/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { LegalTabs } from './LegalTabs';

export const metadata: Metadata = {
  title: 'Legal | Gecko Advisor',
  description:
    'Terms of Use, Privacy Policy, License, and Cookie Policy for Gecko Advisor - the free, open-source privacy scanner.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/legal`,
  },
  openGraph: {
    title: `Legal | ${SEO_CONSTANTS.SITE_NAME}`,
    description: 'Terms of Use, Privacy Policy, License, and Cookie Policy for Gecko Advisor.',
    url: `${SEO_CONSTANTS.BASE_URL}/legal`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

export default function LegalPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Legal' },
        ]}
      />

      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gecko-800">Legal</h1>
        <p className="text-sm text-gecko-500">Last Updated: January 2025</p>
      </div>

      {/* Tab Navigation - Client Component */}
      <LegalTabs />

      {/* Back to Home */}
      <div className="text-center py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-advisor-500 hover:bg-advisor-600 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Scanner
        </Link>
      </div>
    </div>
  );
}
