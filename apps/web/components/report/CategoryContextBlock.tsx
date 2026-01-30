/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

interface CategoryContext {
  categorySlug: string;
  categoryName: string;
  categoryPercentile: number;
  categoryAvgScore: number;
  categoryAvgTrackers: number;
  positionLabel: string;
  comparisonText: string;
  sampleSize: number;
}

interface CategoryContextBlockProps {
  context: CategoryContext;
  domain: string;
}

/**
 * CategoryContextBlock - Shows how a domain compares within its category
 *
 * Displays:
 * - Category name and link to hub page
 * - Percentile ranking within category
 * - Comparison to category average
 * - Sample size context
 */
export function CategoryContextBlock({ context, domain }: CategoryContextBlockProps) {
  const isAboveAverage = context.categoryPercentile >= 50;
  const isTopTier = context.categoryPercentile >= 75;

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Category Comparison
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          How {domain} compares to other {context.categoryName.toLowerCase()} sites
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Category badge and percentile */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/privacy-benchmarks/${context.categorySlug}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {context.categoryName}
          </Link>

          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            isTopTier
              ? 'bg-emerald-100 text-emerald-700'
              : isAboveAverage
              ? 'bg-sky-100 text-sky-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {context.positionLabel}
          </div>
        </div>

        {/* Percentile bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Category ranking</span>
            <span className="font-medium text-zinc-700">{context.categoryPercentile}th percentile</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isTopTier
                  ? 'bg-emerald-500'
                  : isAboveAverage
                  ? 'bg-sky-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${context.categoryPercentile}%` }}
            />
          </div>
        </div>

        {/* Comparison text */}
        <div className={`p-3 rounded-lg ${
          isAboveAverage ? 'bg-emerald-50' : 'bg-amber-50'
        }`}>
          <div className="flex items-start gap-2">
            {isAboveAverage ? (
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <div>
              <p className={`text-sm font-medium ${isAboveAverage ? 'text-emerald-800' : 'text-amber-800'}`}>
                {context.comparisonText}
              </p>
              <p className={`text-xs mt-1 ${isAboveAverage ? 'text-emerald-600' : 'text-amber-600'}`}>
                Based on {context.sampleSize.toLocaleString()} {context.categoryName.toLowerCase()} websites analyzed
              </p>
            </div>
          </div>
        </div>

        {/* Category stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-zinc-900">{context.categoryAvgScore}</div>
            <div className="text-xs text-gray-500">Category Avg Score</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-zinc-900">{context.categoryAvgTrackers.toFixed(1)}</div>
            <div className="text-xs text-gray-500">Category Avg Trackers</div>
          </div>
        </div>

        {/* Link to category hub */}
        <Link
          href={`/privacy-benchmarks/${context.categorySlug}`}
          className="block text-center text-sm text-sky-600 hover:text-sky-700 font-medium py-2"
        >
          View all {context.categoryName} privacy benchmarks →
        </Link>
      </div>
    </section>
  );
}

export default CategoryContextBlock;
