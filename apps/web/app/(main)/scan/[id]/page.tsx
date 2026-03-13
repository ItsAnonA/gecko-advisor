/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import type { Metadata } from 'next';
import ScanProgressClient from './ScanProgressClient';

/**
 * Metadata for scan progress page
 */
export const metadata: Metadata = {
  title: 'Privacy Scan In Progress',
  description: 'Your privacy scan is being processed. Results will be available shortly.',
  robots: {
    index: false, // Don't index scan progress pages
    follow: false,
  },
};

/**
 * Scan Progress Page
 *
 * Displays the progress of a running privacy scan.
 * Redirects to the report page when the scan completes.
 */
export default async function ScanProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <ScanProgressClient scanId={id} />
    </main>
  );
}
