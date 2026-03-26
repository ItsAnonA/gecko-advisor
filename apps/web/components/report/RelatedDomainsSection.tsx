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

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-sky-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50';
  if (score >= 60) return 'bg-sky-50';
  if (score >= 40) return 'bg-amber-50';
  return 'bg-red-50';
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Group domains by score band for visual clustering.
 * Keeps natural semantic grouping instead of a flat list.
 */
function groupByScoreBand(domains: RelatedDomain[]): { label: string; domains: RelatedDomain[] }[] {
  const bands: { label: string; min: number; max: number }[] = [
    { label: 'Excellent Privacy (A)', min: 80, max: 101 },
    { label: 'Good Privacy (B-C)', min: 60, max: 80 },
    { label: 'Needs Improvement (D-F)', min: 0, max: 60 },
  ];

  return bands
    .map(band => ({
      label: band.label,
      domains: domains.filter(d => d.score >= band.min && d.score < band.max),
    }))
    .filter(group => group.domains.length > 0);
}

/**
 * RelatedDomainsSection - Shows up to 20 related domains with visual grouping.
 *
 * Domains are grouped by score band (Excellent / Good / Needs Improvement)
 * to create semantic clusters rather than a flat list.
 */
export function RelatedDomainsSection({ domains, categoryName }: RelatedDomainsSectionProps) {
  if (!domains || domains.length === 0) {
    return null;
  }

  // For ≤6 domains, show flat list (not enough to group meaningfully)
  const useGrouping = domains.length > 6;
  const groups = useGrouping ? groupByScoreBand(domains) : null;

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
            ? `${domains.length} ${categoryName.toLowerCase()} sites with similar privacy profiles`
            : `${domains.length} sites with similar privacy profiles`}
        </p>
      </div>

      {/* Grouped layout for 7+ domains */}
      {groups ? (
        <div>
          {groups.map(group => (
            <div key={group.label}>
              <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {group.label}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-gray-100">
                {group.domains.map(related => (
                  <DomainLink key={related.domain} related={related} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat layout for ≤6 domains */
        <div className="divide-y divide-gray-100">
          {domains.map(related => (
            <DomainLink key={related.domain} related={related} />
          ))}
        </div>
      )}

      {/* Footer with category link */}
      {categoryName && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href={`/privacy-benchmarks/${categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
            className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            See full {categoryName} privacy ranking
          </Link>
        </div>
      )}
    </section>
  );
}

function DomainLink({ related }: { related: RelatedDomain }) {
  return (
    <Link
      href={`/privacy-report/${related.domain}`}
      className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
    >
      <div className="min-w-0">
        <span className="font-medium text-zinc-900 group-hover:text-sky-600 transition-colors truncate block text-sm">
          {related.domain}
        </span>
        {related.categoryName && (
          <span className="text-xs text-gray-500">{related.categoryName}</span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className={`px-2 py-0.5 rounded text-xs font-semibold ${getScoreBg(related.score)} ${getScoreColor(related.score)}`}>
          {getGrade(related.score)} {related.score}
        </div>
        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-sky-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default RelatedDomainsSection;
