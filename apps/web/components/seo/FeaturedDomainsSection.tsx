/*
SPDX-FileCopyrightText: 2026 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * FeaturedDomainsSection
 *
 * Renders the curated "featured" tier on each authority hub. The selection
 * algorithm in `lib/featuredDomains.ts` returns up to 12 entries in priority
 * order (extremes first, then brands, then clean). This component lays them
 * out as:
 *   - The first 3 entries get hero-card treatment (large, full-width on mobile,
 *     3-up on desktop). These are the most attention-grabbing entries by design
 *     — placing them at the top of the visual hierarchy maps to their position
 *     in the selection algorithm.
 *   - The remaining 9 entries render in a tighter supporting grid below.
 *
 * Each card is a single `<Link>` to the underlying privacy report. The narrative
 * sentence is the *anchor's surrounding context* — Google reads it as a strong
 * topical signal that this hub is voting for that report.
 *
 * Hub-specific accent colors (red for tracker/cookie hubs, amber for least-private,
 * emerald for clean entries on the privacy-index hub) match the existing hub
 * page palette so the featured section feels native.
 */

import Link from 'next/link';
import type { FeaturedDomain } from '@/lib/featuredDomains';
import type { RankingType } from '@/lib/rankings';

interface FeaturedDomainsSectionProps {
  featured: FeaturedDomain[];
  hubType: RankingType;
}

/** Headline metric to surface on each card — depends on which hub we're on.
 * For privacy-index (mixed), we show the metric that drove the entry's
 * narrative selection so the badge and the sentence agree. */
function pickHeadlineMetric(
  entry: FeaturedDomain,
  hubType: RankingType
): { label: string; value: string; tone: 'red' | 'amber' | 'emerald' | 'zinc' } {
  switch (hubType) {
    case 'most-tracked':
      return { label: 'trackers', value: String(entry.trackers), tone: 'red' };
    case 'least-private':
      return { label: 'score', value: `${entry.score}/100`, tone: 'red' };
    case 'most-cookies':
      return { label: 'cookies', value: String(entry.cookies), tone: 'amber' };
    case 'privacy-index':
      // Use the entry's selection bucket to pick a tone — keeps mixed-hub
      // cards visually consistent with their narrative framing.
      if (entry.kind === 'clean') {
        return { label: 'score', value: `${entry.score}/100`, tone: 'emerald' };
      }
      return { label: 'score', value: `${entry.score}/100`, tone: 'zinc' };
  }
}

/** Tailwind class strings keyed by tone. Centralized to keep the JSX terse. */
const TONE_STYLES = {
  red: {
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    accent: 'text-red-600',
    heroBg: 'from-red-50/60 to-zinc-50',
    heroBorder: 'border-red-200',
  },
  amber: {
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    accent: 'text-amber-600',
    heroBg: 'from-amber-50/60 to-zinc-50',
    heroBorder: 'border-amber-200',
  },
  emerald: {
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accent: 'text-emerald-600',
    heroBg: 'from-emerald-50/60 to-zinc-50',
    heroBorder: 'border-emerald-200',
  },
  zinc: {
    badgeBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    accent: 'text-advisor-600',
    heroBg: 'from-zinc-50 to-white',
    heroBorder: 'border-zinc-200',
  },
} as const;

/** Hub-level intro copy + section heading. Lives in the component (not the
 * lib) because it's purely presentational. */
function getSectionMeta(hubType: RankingType): { heading: string; intro: string } {
  switch (hubType) {
    case 'most-tracked':
      return {
        heading: 'Notable Tracker-Heavy Sites',
        intro: 'A closer look at domains running the highest tracker counts and recognizable brands you might not expect to see on this list.',
      };
    case 'least-private':
      return {
        heading: 'Notable Low-Scoring Sites',
        intro: 'Domains with the worst privacy scores in our index, alongside well-known brands that scored unexpectedly poorly.',
      };
    case 'most-cookies':
      return {
        heading: 'Notable Cookie-Heavy Sites',
        intro: 'Sites that drop the highest number of cookies on a single visit — including some household names.',
      };
    case 'privacy-index':
      return {
        heading: 'Notable Domains in Our Index',
        intro: 'A curated cross-section of our privacy index — extremes, recognizable brands, and a few sites doing it right.',
      };
  }
}

export function FeaturedDomainsSection({ featured, hubType }: FeaturedDomainsSectionProps) {
  if (featured.length === 0) return null;

  const { heading, intro } = getSectionMeta(hubType);
  const heroes = featured.slice(0, 3);
  const supporting = featured.slice(3);

  return (
    <section className="my-12 md:my-16">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-zinc-900 mb-2">
          {heading}
        </h2>
        <p className="text-sm md:text-base text-zinc-600 leading-relaxed max-w-3xl">
          {intro}
        </p>
      </div>

      {/* Hero row — top 3 most attention-grabbing entries.
          Selection order from lib/featuredDomains.ts puts the extremes first,
          so these are inherently the "shock factor" entries on every hub. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {heroes.map((entry) => {
          const metric = pickHeadlineMetric(entry, hubType);
          const tone = TONE_STYLES[metric.tone];
          return (
            <Link
              key={entry.domain}
              href={`/privacy-report/${entry.domain}`}
              className={`group block p-5 md:p-6 rounded-xl bg-gradient-to-br ${tone.heroBg} border-2 ${tone.heroBorder} hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-lg md:text-xl font-display font-bold text-zinc-900 group-hover:text-advisor-600 transition-colors">
                  {entry.displayName}
                </h3>
                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${tone.badgeBg}`}>
                  #{entry.rank}
                </span>
              </div>
              <div className="mb-3">
                <span className={`text-3xl md:text-4xl font-bold font-display ${tone.accent}`}>
                  {metric.value}
                </span>
                <span className="ml-1.5 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                  {metric.label}
                </span>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">
                {entry.narrative}
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-advisor-600 group-hover:gap-2 transition-all">
                Read full report
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Supporting grid — remaining featured entries in a tighter 2-3 column
          layout. Same data as heroes but compact, no gradient. */}
      {supporting.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {supporting.map((entry) => {
            const metric = pickHeadlineMetric(entry, hubType);
            const tone = TONE_STYLES[metric.tone];
            return (
              <Link
                key={entry.domain}
                href={`/privacy-report/${entry.domain}`}
                className="group block p-4 rounded-lg bg-white border border-zinc-200 hover:border-advisor-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-advisor-600 transition-colors truncate">
                    {entry.displayName}
                  </h4>
                  <span className={`flex-shrink-0 text-sm font-bold ${tone.accent}`}>
                    {metric.value}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                  {entry.narrative}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
