/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useSearchParams } from 'react-router-dom';

// Lazy load both versions for code splitting
const ReportPageOriginal = React.lazy(() => import('./ReportPage'));
const ReportPageRedesigned = React.lazy(() => import('./ReportPageRedesigned'));

/**
 * ReportPageWrapper enables switching between original and redesigned report pages.
 *
 * Usage:
 * - New design: /r/[slug] (default - compact, tab-based)
 * - Classic design: /r/[slug]?design=classic (original vertical scroll)
 *
 * The new design provides:
 * - 5-10 second comprehension at a glance
 * - Tab-based navigation (no excessive scrolling)
 * - Progressive disclosure (summary first, details on demand)
 */
export default function ReportPageWrapper() {
  const [searchParams] = useSearchParams();
  const designVersion = searchParams.get('design');

  // Use classic/original design only if explicitly requested
  const useClassicDesign = designVersion === 'classic' || designVersion === 'original';

  return useClassicDesign ? <ReportPageOriginal /> : <ReportPageRedesigned />;
}
