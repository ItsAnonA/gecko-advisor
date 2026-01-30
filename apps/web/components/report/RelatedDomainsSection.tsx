/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

interface RelatedDomain {
  domain: string;
  score: number;
  categoryName?: string;
}

interface RelatedDomainsSectionProps {
  domains: RelatedDomain[];
  categoryName?: string;
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-sky-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Get score background color
 */
function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50';
  if (score >= 60) return 'bg-sky-50';
  if (score >= 40) return 'bg-amber-50';
  return 'bg-red-50';
}

/**
 * RelatedDomainsSection - Shows related domains for internal linking
 *
 * Displays up to 5 domains with similar privacy scores in the same category.
 * Each domain links to its privacy report page.
 */
export function RelatedDomainsSection({ domains, categoryName }: RelatedDomainsSectionProps) {
  if (!domains || domains.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Similar Sites to Compare
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {categoryName
            ? `Other ${categoryName.toLowerCase()} sites with similar privacy scores`
            : 'Sites with similar privacy scores'}
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {domains.map((related, index) => (
          <Link
            key={related.domain}
            href={`/privacy-report/${related.domain}`}
            className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
              <div className="min-w-0">
                <span className="font-medium text-zinc-900 group-hover:text-sky-600 transition-colors truncate block">
                  {related.domain}
                </span>
                {related.categoryName && (
                  <span className="text-xs text-gray-500">{related.categoryName}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded-md text-sm font-semibold ${getScoreBg(related.score)} ${getScoreColor(related.score)}`}>
                {related.score}/100
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-sky-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer with category link if available */}
      {categoryName && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href="/privacy-benchmarks"
            className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Browse all privacy benchmarks
          </Link>
        </div>
      )}
    </section>
  );
}

export default RelatedDomainsSection;
