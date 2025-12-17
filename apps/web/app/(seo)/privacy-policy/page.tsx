/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Privacy Policy Index Redirect
 *
 * Redirects /privacy-policy to /reports (the main reports listing page).
 * This ensures users landing on /privacy-policy are directed to useful content.
 */

import { permanentRedirect } from 'next/navigation';

export default function PrivacyPolicyIndex() {
  permanentRedirect('/reports');
}

// Metadata for SEO - noindex since it redirects
export const metadata = {
  robots: {
    index: false,
    follow: true,
  },
};
