/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Narrative Content Component (Phase A - SEO Architecture)
 *
 * Renders verdict-first narratives for domain report pages.
 * Layout order: verdict → intro → H2 sections → about → links → freshness.
 *
 * Server component — no client-side JS.
 */

import Link from 'next/link';
import type {
  DomainNarrative,
  DomainData,
  SectionKey,
  DomainSummary,
} from '@/lib/generateDomainNarrative';
import {
  formatDate,
  getTrackerSectionTitle,
  getCookieSectionTitle,
  getComparisonSectionTitle,
  getHistorySectionTitle,
  getProfileSectionTitle,
} from '@/lib/generateDomainNarrative';
import { getComparisonPairsForDomain, getOtherDomain } from '@/data/comparison-pairs';

interface TechnologyLink {
  name: string;
  slug: string;
}

interface Props {
  narrative: DomainNarrative;
  domain: DomainData;
  relatedDomains: DomainSummary[];
  sameTrackerDomains: Record<string, string[]>;
  technologyLinks?: TechnologyLink[];
  categorySlug?: string | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 60) return 'text-sky-700';
  if (score >= 40) return 'text-amber-700';
  return 'text-red-700';
}

function getScoreBorderColor(score: number): string {
  if (score >= 80) return 'border-emerald-300';
  if (score >= 60) return 'border-sky-300';
  if (score >= 40) return 'border-amber-300';
  return 'border-red-300';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-50';
  if (score >= 60) return 'bg-sky-50';
  if (score >= 40) return 'bg-amber-50';
  return 'bg-red-50';
}

function getRelationLabel(reason: string | undefined, categoryName: string | null): string {
  switch (reason) {
    case 'same-category-similar-score':
      return categoryName ? `Similar privacy score in ${categoryName}` : 'Similar privacy score';
    case 'same-tracker-stack':
      return 'Overlapping tracker stack';
    case 'same-category':
      return categoryName ? `${categoryName} site` : 'Same category';
    default:
      return categoryName ? `${categoryName} site` : 'Related';
  }
}

export function NarrativeContent({ narrative, domain, relatedDomains, sameTrackerDomains, technologyLinks, categorySlug }: Props) {
  const comparisonPairs = getComparisonPairsForDomain(domain.name);

  function renderSection(key: SectionKey) {
    switch (key) {
      case 'trackers':
        return (
          <section key="trackers" className="mb-6">
            <h2 className="text-xl font-semibold text-gecko-800 mb-3">
              {getTrackerSectionTitle(domain)}
            </h2>
            <p className="text-gecko-700 leading-relaxed">{narrative.trackerSection}</p>
            {narrative.rareTrackerSection && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gecko-800 mb-2">Rare Tracker Detection</h3>
                <p className="text-gecko-700 leading-relaxed">{narrative.rareTrackerSection}</p>
              </div>
            )}
            {narrative.trackerDistributionSection && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gecko-800 mb-2">Tracker Distribution</h3>
                <p className="text-gecko-700 leading-relaxed">{narrative.trackerDistributionSection}</p>
              </div>
            )}
            {narrative.zeroTrackerSection && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h3 className="text-lg font-medium text-emerald-800 mb-1">Zero Tracker Profile</h3>
                <p className="text-emerald-700 leading-relaxed">{narrative.zeroTrackerSection}</p>
              </div>
            )}
          </section>
        );

      case 'cookies':
        return (
          <section key="cookies" className="mb-6">
            <h2 className="text-xl font-semibold text-gecko-800 mb-3">
              {getCookieSectionTitle(domain)}
            </h2>
            <p className="text-gecko-700 leading-relaxed">{narrative.cookieSection}</p>
            {narrative.highCookieSection && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-lg font-medium text-amber-800 mb-1">High Cookie Count</h3>
                <p className="text-amber-700 leading-relaxed">{narrative.highCookieSection}</p>
              </div>
            )}
          </section>
        );

      case 'comparison':
        return (
          <section key="comparison" className="mb-6">
            <h2 className="text-xl font-semibold text-gecko-800 mb-3">
              {getComparisonSectionTitle(domain)}
            </h2>
            <p className="text-gecko-700 leading-relaxed">{narrative.comparisonSection}</p>
            {narrative.categoryRankSection && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-1">{domain.displayName} Category Rank</h3>
                <p className="text-blue-700 leading-relaxed">{narrative.categoryRankSection}</p>
              </div>
            )}
          </section>
        );

      case 'history':
        return (
          <section key="history" className="mb-6">
            <h2 className="text-xl font-semibold text-gecko-800 mb-3">
              {getHistorySectionTitle(domain)}
            </h2>
            <p className="text-gecko-700 leading-relaxed">{narrative.historySection}</p>
            {narrative.recentChangesSection && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="text-lg font-medium text-orange-800 mb-1">Recent Changes Detected</h3>
                <p className="text-orange-700 leading-relaxed">{narrative.recentChangesSection}</p>
              </div>
            )}
            {narrative.scoreImproveSection && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h3 className="text-lg font-medium text-emerald-800 mb-1">Score Improvement</h3>
                <p className="text-emerald-700 leading-relaxed">{narrative.scoreImproveSection}</p>
              </div>
            )}
            {narrative.scoreDeclineSection && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-medium text-red-800 mb-1">Score Decline</h3>
                <p className="text-red-700 leading-relaxed">{narrative.scoreDeclineSection}</p>
              </div>
            )}
          </section>
        );

      case 'profile':
        return (
          <section key="profile" className="mb-6">
            <h2 className="text-xl font-semibold text-gecko-800 mb-3">
              {getProfileSectionTitle(domain)}
            </h2>
            <p className="text-gecko-700 leading-relaxed">{narrative.profileInterpretation}</p>
            <p className="text-gecko-500 text-sm mt-2">
              <Link href="/methodology" className="text-advisor-600 hover:text-advisor-700 underline">
                How scores are calculated
              </Link>
            </p>
          </section>
        );

      default:
        return null;
    }
  }

  return (
    <article className="narrative-content">
      {/* ── VERDICT BLOCK (above the fold) ── */}
      <div className={`mb-6 p-5 rounded-lg border-2 ${getScoreBorderColor(domain.privacyScore)} ${getScoreBgColor(domain.privacyScore)}`}>
        <div className="flex items-baseline gap-3 mb-3">
          <span className={`text-3xl font-bold ${getScoreColor(domain.privacyScore)}`}>
            {domain.privacyScore}/100
          </span>
          <h2 className={`text-lg font-semibold ${getScoreColor(domain.privacyScore)}`}>
            {narrative.verdict.headline}
          </h2>
        </div>
        <ul className="space-y-1.5 mb-3">
          {narrative.verdict.keyFindings.map((finding, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gecko-700">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gecko-400 shrink-0" />
              {finding}
            </li>
          ))}
        </ul>
        <p className="text-sm text-gecko-600 leading-relaxed">{narrative.verdict.interpretation}</p>
      </div>

      {/* Intro */}
      <p className="text-gecko-700 leading-relaxed mb-6 text-lg">{narrative.intro}</p>

      {/* H2 sections in domain-specific order */}
      {narrative.sectionOrder.map((key) => renderSection(key))}

      {/* About section */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gecko-800 mb-3">About This Report</h2>
        <p className="text-gecko-700 leading-relaxed">{narrative.aboutSection}</p>
        <p className="text-gecko-500 text-sm mt-2">
          <Link href="/methodology" className="text-advisor-600 hover:text-advisor-700 underline">
            Methodology
          </Link>
        </p>
      </section>

      {/* ============================================================ */}
      {/* INTERNAL LINK DENSITY BLOCKS */}
      {/* ============================================================ */}

      {/* Link Block 1: Similar Sites with relationship reasons */}
      {relatedDomains.length > 0 && (
        <section className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gecko-800 mb-3">
            {domain.categoryName
              ? `${domain.categoryName} Sites Similar to ${domain.displayName}`
              : `Sites Similar to ${domain.displayName}`}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {relatedDomains.map(d => (
              <li key={d.domain} className="flex items-center justify-between py-1">
                <div className="min-w-0">
                  <Link
                    href={`/privacy-report/${d.domain}`}
                    className="text-advisor-600 hover:text-advisor-700 underline truncate block"
                  >
                    {d.displayName || d.domain}
                  </Link>
                  <span className="text-xs text-zinc-500">
                    {getRelationLabel(d.relationReason, domain.categoryName)}
                  </span>
                </div>
                <span className="text-sm text-zinc-500 shrink-0 ml-2">Score: {d.privacyScore}</span>
              </li>
            ))}
          </ul>
          {domain.categoryName && (
            <p className="mt-3 text-sm">
              <Link
                href={`/privacy-benchmarks/${domain.categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
                className="text-advisor-600 hover:text-advisor-700 underline"
              >
                See full {domain.categoryName} ranking
              </Link>
            </p>
          )}
        </section>
      )}

      {/* Link Block 2: Compare */}
      {comparisonPairs.length > 0 && (
        <section className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gecko-800 mb-3">
            Compare {domain.displayName}
          </h3>
          <ul className="space-y-2">
            {comparisonPairs.slice(0, 5).map(pair => {
              const other = getOtherDomain(pair, domain.name);
              const [a, b] = [pair.domainA, pair.domainB].sort();
              return (
                <li key={`${a}-${b}`}>
                  <Link
                    href={`/compare/${a}/${b}`}
                    className="text-advisor-600 hover:text-advisor-700 underline"
                  >
                    {domain.displayName} vs {other}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Link Block 3: Cluster Anchors */}
      {(categorySlug || (technologyLinks && technologyLinks.length > 0)) && (
        <section className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gecko-800 mb-3">
            {domain.displayName} Privacy Context
          </h3>
          <div className="flex flex-wrap gap-2">
            {categorySlug && domain.categoryName && (
              <Link
                href={`/privacy-benchmarks/${categorySlug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-advisor-600 hover:text-advisor-700 hover:border-advisor-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {domain.categoryName} Benchmark
              </Link>
            )}
            {technologyLinks?.map(tech => (
              <Link
                key={tech.slug}
                href={`/technologies/${tech.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-advisor-600 hover:text-advisor-700 hover:border-advisor-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {tech.name}
              </Link>
            ))}
            <Link
              href="/privacy-index"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-zinc-600 hover:text-advisor-700 hover:border-advisor-300 transition-colors"
            >
              Privacy Index
            </Link>
            <Link
              href="/most-tracked-websites"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-zinc-600 hover:text-advisor-700 hover:border-advisor-300 transition-colors"
            >
              Most Tracked Websites
            </Link>
          </div>
        </section>
      )}

      {/* Link Block 4: Sites Using Same Trackers */}
      {Object.keys(sameTrackerDomains).length > 0 && (
        <section className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gecko-800 mb-3">
            Sites Using the Same Trackers
          </h3>
          {Object.entries(sameTrackerDomains).map(([tracker, domains]) => (
            domains.length > 0 && (
              <div key={tracker} className="mb-3">
                <p className="text-sm font-medium text-zinc-600 mb-1">{tracker}:</p>
                <ul className="flex flex-wrap gap-2">
                  {domains.map(d => (
                    <li key={d}>
                      <Link
                        href={`/privacy-report/${d}`}
                        className="text-advisor-600 hover:text-advisor-700 underline text-sm"
                      >
                        {d}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </section>
      )}

      {/* ── Freshness Signal (metadata — bottom of page) ── */}
      <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
        <h3 className="text-sm font-semibold text-zinc-600 mb-2">Scan Metadata</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-zinc-500">Last scanned:</span>{' '}
            <span className="font-medium text-zinc-800">{formatDate(narrative.freshnessSignal.lastScanned)}</span>
          </div>
          {narrative.freshnessSignal.previousScan && (
            <div>
              <span className="text-zinc-500">Previous scan:</span>{' '}
              <span className="font-medium text-zinc-800">{formatDate(narrative.freshnessSignal.previousScan)}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-500">Scan count:</span>{' '}
            <span className="font-medium text-zinc-800">{narrative.freshnessSignal.scanCount}</span>
          </div>
          <div>
            <span className="text-zinc-500">Status:</span>{' '}
            <span className={`font-medium ${narrative.freshnessSignal.changesDetected ? 'text-orange-600' : 'text-emerald-600'}`}>
              {narrative.freshnessSignal.changesDetected ? 'Changes detected' : 'No changes detected'}
            </span>
          </div>
        </div>
        {narrative.freshnessSignal.changesDetected && (
          <div className="mt-3 pt-3 border-t border-zinc-200 text-sm">
            <p className="text-zinc-600 font-medium mb-1">Changes since previous scan:</p>
            <ul className="space-y-1 text-zinc-700">
              {narrative.freshnessSignal.trackersAdded.map(t => (
                <li key={`add-${t}`}>+ Tracker added: {t}</li>
              ))}
              {narrative.freshnessSignal.trackersRemoved.map(t => (
                <li key={`rm-${t}`}>- Tracker removed: {t}</li>
              ))}
              {narrative.freshnessSignal.scoreChange && (
                <li>
                  Score changed: {narrative.freshnessSignal.scoreChange.old} → {narrative.freshnessSignal.scoreChange.new}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
