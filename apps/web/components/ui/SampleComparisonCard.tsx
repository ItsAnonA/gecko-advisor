/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

/**
 * Props for the SampleComparisonCard component
 */
interface SampleComparisonCardProps {
  /** First domain to compare */
  domainA: string;
  /** Second domain to compare */
  domainB: string;
  /** Display label for the comparison */
  label: string;
  /** Optional description */
  description?: string;
}

/**
 * SampleComparisonCard - Displays a curated sample comparison
 *
 * This is UX scaffolding to help users understand the compare feature.
 * IMPORTANT: These are NOT SEO content - compare pages have noindex.
 *
 * Features:
 * - "Example" badge to set expectations
 * - ?source=sample param for analytics tracking
 * - Links to compare page (which has noindex)
 */
export function SampleComparisonCard({
  domainA,
  domainB,
  label,
  description,
}: SampleComparisonCardProps) {
  return (
    <Link
      href={`/compare/${domainA}/${domainB}?source=sample`}
      className="block p-4 bg-white border border-gray-200 rounded-xl hover:border-sky-300 hover:shadow-sm transition-all group"
    >
      {/* Example badge */}
      <span className="inline-block px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded mb-2">
        Example
      </span>

      {/* Label */}
      <h3 className="font-medium text-gray-900 group-hover:text-sky-600 transition-colors mb-1">
        {label}
      </h3>

      {/* Domain pair */}
      <p className="text-sm text-gray-600">
        <span className="font-mono text-xs">{domainA}</span>
        <span className="mx-2 text-gray-400">vs</span>
        <span className="font-mono text-xs">{domainB}</span>
      </p>

      {/* Description */}
      {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
    </Link>
  );
}

export default SampleComparisonCard;
