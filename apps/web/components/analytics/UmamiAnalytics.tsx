/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Script from 'next/script';

/**
 * UmamiAnalytics - Privacy-focused analytics integration
 *
 * Uses Umami (https://umami.is) for privacy-respecting analytics:
 * - No cookies required
 * - GDPR compliant by default
 * - Lightweight (~2KB script)
 * - Self-hostable option available
 *
 * Only loads in production environment to avoid polluting analytics
 * during development and testing.
 */
export function UmamiAnalytics() {
  // Only load in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  if (!websiteId) {
    return null;
  }

  return (
    <Script
      defer
      src="/stats/script.js"
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}

export default UmamiAnalytics;
