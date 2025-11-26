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
 * ReportPageWrapper enables A/B testing between original and redesigned report pages.
 *
 * Usage:
 * - Original design: /r/[slug] (default)
 * - New design: /r/[slug]?design=new
 *
 * This allows side-by-side comparison before committing to the new design.
 */
export default function ReportPageWrapper() {
  const [searchParams] = useSearchParams();
  const designVersion = searchParams.get('design');

  // Use new design if ?design=new is present
  const useNewDesign = designVersion === 'new';

  return useNewDesign ? <ReportPageRedesigned /> : <ReportPageOriginal />;
}
