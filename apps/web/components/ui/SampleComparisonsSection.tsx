/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';
import { SampleComparisonCard } from './SampleComparisonCard';

/**
 * Sample comparison data structure
 */
interface Sample {
  id: string;
  domainA: string;
  domainB: string;
  label: string;
  description?: string;
}

/**
 * Props for the SampleComparisonsSection component
 */
interface SampleComparisonsSectionProps {
  /** Array of sample comparisons to display */
  samples: Sample[];
  /** Optional category name for contextual heading */
  categoryName?: string;
}

// HARD LIMIT: Never show more than 3 samples
// This is UX scaffolding, NOT SEO content
const MAX_VISIBLE_SAMPLES = 3;

/**
 * SampleComparisonsSection - Displays a section of sample comparisons
 *
 * This component is for UX demonstration only, NOT for SEO.
 * Includes disclaimer microcopy and CTA to scan own sites.
 *
 * Placement rules:
 * - ✅ Category hub page (content section)
 * - ❌ Navigation, footer, sidebar (structural)
 */
export function SampleComparisonsSection({ samples, categoryName }: SampleComparisonsSectionProps) {
  if (!samples || samples.length === 0) return null;

  return (
    <section className="mt-10 pt-10 border-t border-gray-100">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Try a Comparison</h2>
        <p className="text-sm text-gray-500 mt-1">
          {categoryName
            ? `Example comparisons in ${categoryName}`
            : 'See how the comparison feature works'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {samples.slice(0, MAX_VISIBLE_SAMPLES).map((sample) => (
          <SampleComparisonCard
            key={sample.id}
            domainA={sample.domainA}
            domainB={sample.domainB}
            label={sample.label}
            description={sample.description}
          />
        ))}
      </div>

      {/* Disclaimer microcopy */}
      <p className="text-xs text-gray-400 mt-6">
        Examples are shown for demonstration only — results may not reflect your site.{' '}
        <Link href="/" className="text-sky-600 hover:underline">
          Compare your own websites for accurate insights →
        </Link>
      </p>
    </section>
  );
}

export default SampleComparisonsSection;
