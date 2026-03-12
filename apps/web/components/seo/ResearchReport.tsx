/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Research Report Component (Phase D SEO)
 *
 * Renders professional research publications designed to attract
 * journalist backlinks. Supports three report types: category-deep-dive,
 * tracker-landscape, and cross-category. Server component - no 'use client'.
 */

import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';

/* ────────────────────────────────────────────────────────── */
/*  Data Interfaces                                          */
/* ────────────────────────────────────────────────────────── */

export interface ResearchDomain {
  domain: string;
  displayName: string;
  score: number;
  label: string;
  trackerCount: number;
  cookieCount: number;
  hasFingerprinting: boolean;
  category: string | null;
  categorySlug: string | null;
}

export interface TrackerInfo {
  name: string;
  slug: string;
  domainCount: number;
  penetration: number;
  topCategories?: Array<{ name: string; slug: string; count: number }>;
}

export interface VendorBreakdown {
  vendor: string;
  trackers: string[];
  totalDomains: number;
}

export interface ResearchReportData {
  slug: string;
  title: string;
  subtitle: string;
  reportType: 'category-deep-dive' | 'tracker-landscape' | 'cross-category';
  generatedAt: string;

  keyFindings: string[];
  stats?: Record<string, number>;

  sampleSize?: number;
  globalComparison?: {
    avgScore: number;
    avgTrackers: number;
    fingerprintingRate: number;
    totalDomains: number;
  };
  gradeDistribution?: Record<string, number>;
  bestDomains?: ResearchDomain[];
  worstDomains?: ResearchDomain[];
  mostTracked?: ResearchDomain[];
  topTrackers?: TrackerInfo[];

  categoryBreakdown?: Array<{
    name: string;
    slug: string;
    domainCount: number;
    avgScore: number;
    avgTrackers: number;
    fingerprintingRate: number;
  }>;
  scoreDistribution?: Array<{ range: string; count: number }>;

  trackerDetails?: TrackerInfo[];
  vendorBreakdown?: VendorBreakdown[];
}

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                  */
/* ────────────────────────────────────────────────────────── */

function getGradeColor(label: string): string {
  if (label === 'A') return 'text-emerald-600';
  if (label === 'B') return 'text-emerald-500';
  if (label === 'C') return 'text-amber-600';
  if (label === 'D') return 'text-orange-600';
  return 'text-red-600';
}

function getGradeBg(grade: string): string {
  if (grade === 'A') return 'bg-emerald-600';
  if (grade === 'B') return 'bg-emerald-500';
  if (grade === 'C') return 'bg-amber-500';
  if (grade === 'D') return 'bg-orange-500';
  return 'bg-red-500';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function reportTypeBadge(type: ResearchReportData['reportType']): string {
  switch (type) {
    case 'category-deep-dive':
      return 'Category Deep Dive';
    case 'tracker-landscape':
      return 'Tracker Landscape';
    case 'cross-category':
      return 'Cross-Category Analysis';
  }
}

function deltaArrow(value: number, baseline: number): string {
  if (value > baseline) return '\u2191'; // up arrow
  if (value < baseline) return '\u2193'; // down arrow
  return '\u2013'; // en dash
}

function deltaColor(value: number, baseline: number, higherIsBetter: boolean): string {
  const isHigher = value > baseline;
  if (value === baseline) return 'text-zinc-500';
  if (higherIsBetter) return isHigher ? 'text-emerald-600' : 'text-red-600';
  return isHigher ? 'text-red-600' : 'text-emerald-600';
}

/* ────────────────────────────────────────────────────────── */
/*  Sub-components                                           */
/* ────────────────────────────────────────────────────────── */

function ReportHeader({ data }: { data: ResearchReportData }) {
  return (
    <header className="mb-10">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-advisor-700 bg-advisor-50 border border-advisor-200 rounded-full">
          {reportTypeBadge(data.reportType)}
        </span>
        {data.sampleSize != null && (
          <span className="inline-block px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 border border-zinc-200 rounded-full tabular-nums">
            n = {data.sampleSize.toLocaleString()} domains
          </span>
        )}
      </div>

      <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-zinc-900 leading-tight mb-3 font-display">
        {data.title}
      </h1>

      <p className="text-lg md:text-xl text-zinc-600 max-w-3xl leading-relaxed mb-4">
        {data.subtitle}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
        <span>
          Published {formatDate(data.generatedAt)}
        </span>
        <span aria-hidden="true" className="hidden sm:inline">|</span>
        <span>
          Gecko Advisor Research
        </span>
      </div>
    </header>
  );
}

function KeyFindings({ findings }: { findings: string[] }) {
  if (findings.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="key-findings-heading">
      <div className="border-l-4 border-advisor-500 bg-advisor-50/50 rounded-r-xl p-6 md:p-8">
        <h2
          id="key-findings-heading"
          className="text-lg font-semibold text-zinc-900 mb-4 font-display uppercase tracking-wide text-sm"
        >
          Key Findings
        </h2>
        <ol className="space-y-3">
          {findings.map((finding, i) => (
            <li key={i} className="flex gap-3 text-zinc-700 leading-relaxed">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-advisor-600 text-white text-xs font-bold flex items-center justify-center mt-0.5 tabular-nums">
                {i + 1}
              </span>
              <span>{finding}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StatsDashboard({
  stats,
  globalComparison,
}: {
  stats: Record<string, number>;
  globalComparison?: ResearchReportData['globalComparison'];
}) {
  const statEntries = Object.entries(stats);
  if (statEntries.length === 0) return null;

  const labelMap: Record<string, { label: string; format: (v: number) => string; compareKey?: keyof NonNullable<ResearchReportData['globalComparison']>; higherIsBetter?: boolean }> = {
    avgScore: { label: 'Avg Privacy Score', format: (v) => v.toFixed(1), compareKey: 'avgScore', higherIsBetter: true },
    avgTrackers: { label: 'Avg Trackers', format: (v) => v.toFixed(1), compareKey: 'avgTrackers', higherIsBetter: false },
    fingerprintingRate: { label: 'Fingerprinting Rate', format: (v) => `${v.toFixed(1)}%`, compareKey: 'fingerprintingRate', higherIsBetter: false },
    totalDomains: { label: 'Domains Analyzed', format: (v) => v.toLocaleString() },
    totalTrackers: { label: 'Unique Trackers', format: (v) => v.toLocaleString() },
    avgCookies: { label: 'Avg Cookies', format: (v) => v.toFixed(1) },
    medianScore: { label: 'Median Score', format: (v) => String(v) },
    gradeARate: { label: 'Grade A Rate', format: (v) => `${v.toFixed(1)}%` },
    gradeFRate: { label: 'Grade F Rate', format: (v) => `${v.toFixed(1)}%` },
  };

  return (
    <section className="mb-10" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">Report Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statEntries.slice(0, 8).map(([key, value]) => {
          const meta = labelMap[key] || { label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), format: (v: number) => String(v) };
          const baseline = globalComparison && meta.compareKey ? globalComparison[meta.compareKey] : undefined;

          return (
            <div
              key={key}
              className="p-4 bg-white border border-zinc-200 rounded-xl"
            >
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
                {meta.label}
              </p>
              <p className="text-2xl font-bold text-zinc-900 tabular-nums font-display">
                {meta.format(value)}
              </p>
              {baseline != null && (
                <p className={`text-xs mt-1 tabular-nums ${deltaColor(value, baseline, meta.higherIsBetter ?? false)}`}>
                  {deltaArrow(value, baseline)} Global avg: {meta.format(baseline)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GradeDistributionChart({ distribution }: { distribution: Record<string, number> }) {
  const grades = ['A', 'B', 'C', 'D', 'F'];
  const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);
  if (total === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="grade-dist-heading">
      <h2 id="grade-dist-heading" className="text-xl font-semibold text-zinc-900 mb-4 font-display">
        Grade Distribution
      </h2>
      <div className="space-y-3">
        {grades.map((grade) => {
          const count = distribution[grade] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={grade} className="flex items-center gap-3">
              <span className="w-8 text-sm font-bold text-zinc-700 tabular-nums text-right">{grade}</span>
              <div className="flex-1 h-7 bg-zinc-100 rounded overflow-hidden">
                <div
                  className={`h-full ${getGradeBg(grade)} rounded transition-all`}
                  style={{ width: `${Math.max(pct, 0.5)}%` }}
                  role="img"
                  aria-label={`Grade ${grade}: ${count} domains (${pct.toFixed(1)}%)`}
                />
              </div>
              <span className="w-24 text-sm text-zinc-600 tabular-nums text-right">
                {count.toLocaleString()} ({pct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DomainRankingTable({
  title,
  domains,
  metric,
  metricLabel,
}: {
  title: string;
  domains: ResearchDomain[];
  metric: 'score' | 'trackerCount';
  metricLabel: string;
}) {
  if (!domains || domains.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-zinc-900 mb-3">{title}</h3>
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Domain</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Score</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">{metricLabel}</th>
                <th className="px-4 py-3 text-center font-semibold text-zinc-700 hidden md:table-cell">FP</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 hidden lg:table-cell">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {domains.map((d, i) => (
                <tr key={d.domain} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/privacy-report/${d.domain}`}
                      className="text-advisor-600 hover:text-advisor-700 font-medium"
                    >
                      {d.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold tabular-nums ${getGradeColor(d.label)}`}>
                      {d.score}
                    </span>
                    <span className="text-zinc-400 text-xs ml-1">{d.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 font-medium">
                    {d[metric]}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {d.hasFingerprinting ? (
                      <span className="text-red-500 text-xs font-semibold" title="Fingerprinting detected">Yes</span>
                    ) : (
                      <span className="text-zinc-300 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {d.categorySlug ? (
                      <Link
                        href={`/privacy-benchmarks/${d.categorySlug}`}
                        className="text-xs text-zinc-500 hover:text-advisor-600"
                      >
                        {d.category}
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400">{'\u2014'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrackerBarChart({ trackers }: { trackers: TrackerInfo[] }) {
  if (!trackers || trackers.length === 0) return null;

  const maxPenetration = Math.max(...trackers.map((t) => t.penetration), 1);

  return (
    <section className="mb-10" aria-labelledby="top-trackers-heading">
      <h2 id="top-trackers-heading" className="text-xl font-semibold text-zinc-900 mb-4 font-display">
        Most Prevalent Trackers
      </h2>
      <div className="space-y-2.5">
        {trackers.map((tracker) => {
          const barWidth = (tracker.penetration / maxPenetration) * 100;
          return (
            <div key={tracker.slug} className="flex items-center gap-3">
              <Link
                href={`/technologies/${tracker.slug}`}
                className="w-44 text-sm text-advisor-600 hover:text-advisor-700 font-medium truncate shrink-0"
              >
                {tracker.name}
              </Link>
              <div className="flex-1 h-6 bg-zinc-100 rounded overflow-hidden">
                <div
                  className="h-full bg-zinc-700 rounded"
                  style={{ width: `${Math.max(barWidth, 1)}%` }}
                  role="img"
                  aria-label={`${tracker.name}: ${tracker.penetration.toFixed(1)}% penetration`}
                />
              </div>
              <span className="w-28 text-sm text-zinc-600 tabular-nums text-right shrink-0">
                {tracker.penetration.toFixed(1)}%
                <span className="text-zinc-400 text-xs ml-1">({tracker.domainCount.toLocaleString()})</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoryBreakdownTable({
  categories,
}: {
  categories: NonNullable<ResearchReportData['categoryBreakdown']>;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="category-breakdown-heading">
      <h2 id="category-breakdown-heading" className="text-xl font-semibold text-zinc-900 mb-4 font-display">
        Privacy by Industry
      </h2>
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Industry</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Domains</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Avg Score</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Avg Trackers</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700 hidden md:table-cell">FP Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.map((cat) => (
                <tr key={cat.slug} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/privacy-benchmarks/${cat.slug}`}
                      className="text-advisor-600 hover:text-advisor-700 font-medium"
                    >
                      {cat.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {cat.domainCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900">
                    {cat.avgScore.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {cat.avgTrackers.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700 hidden md:table-cell">
                    {cat.fingerprintingRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ScoreDistributionChart({
  distribution,
}: {
  distribution: NonNullable<ResearchReportData['scoreDistribution']>;
}) {
  if (distribution.length === 0) return null;

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <section className="mb-10" aria-labelledby="score-dist-heading">
      <h2 id="score-dist-heading" className="text-xl font-semibold text-zinc-900 mb-4 font-display">
        Score Distribution
      </h2>
      <div className="space-y-2">
        {distribution.map((bucket) => {
          const barWidth = (bucket.count / maxCount) * 100;
          return (
            <div key={bucket.range} className="flex items-center gap-3">
              <span className="w-20 text-sm text-zinc-600 tabular-nums text-right shrink-0">
                {bucket.range}
              </span>
              <div className="flex-1 h-6 bg-zinc-100 rounded overflow-hidden">
                <div
                  className="h-full bg-advisor-500 rounded"
                  style={{ width: `${Math.max(barWidth, 0.5)}%` }}
                  role="img"
                  aria-label={`${bucket.range}: ${bucket.count} domains`}
                />
              </div>
              <span className="w-16 text-sm text-zinc-600 tabular-nums text-right shrink-0">
                {bucket.count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VendorEcosystem({ vendors }: { vendors: VendorBreakdown[] }) {
  if (!vendors || vendors.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="vendor-heading">
      <h2 id="vendor-heading" className="text-xl font-semibold text-zinc-900 mb-4 font-display">
        Vendor Ecosystem
      </h2>
      <p className="text-zinc-600 mb-4">
        The tracking ecosystem is dominated by a small number of technology companies.
        Here is how tracker ownership breaks down:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendors.map((vendor) => (
          <div
            key={vendor.vendor}
            className="p-4 bg-white border border-zinc-200 rounded-xl"
          >
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold text-zinc-900">{vendor.vendor}</h3>
              <span className="text-sm text-zinc-500 tabular-nums">
                {vendor.totalDomains.toLocaleString()} domains
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vendor.trackers.map((tracker) => (
                <span
                  key={tracker}
                  className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-600 rounded"
                >
                  {tracker}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MethodologySection({ sampleSize }: { sampleSize?: number }) {
  return (
    <section className="mb-10 p-6 bg-zinc-50 border border-zinc-200 rounded-xl" aria-labelledby="methodology-heading">
      <h2 id="methodology-heading" className="text-lg font-semibold text-zinc-900 mb-2 font-display">
        Methodology
      </h2>
      <div className="text-sm text-zinc-600 leading-relaxed space-y-2">
        <p>
          This report is based on automated privacy scans of
          {sampleSize != null ? ` ${sampleSize.toLocaleString()}` : ''} domains using
          Gecko Advisor&#39;s scanning infrastructure. Each domain is evaluated for
          third-party trackers, cookies, fingerprinting scripts, security headers,
          and TLS configuration.
        </p>
        <p>
          Scores are deterministic and evidence-based: every deduction maps to a
          specific, verifiable finding. Only domains with at least 2 completed scans
          are included to ensure data reliability. Results reflect the most recent
          scan available at the time of publication.
        </p>
      </div>
      <Link
        href="/methodology"
        className="text-sm text-advisor-600 hover:text-advisor-700 mt-3 inline-block font-medium"
      >
        Read full methodology
      </Link>
    </section>
  );
}

function CitationBlock({ data }: { data: ResearchReportData }) {
  const citationDate = formatShortDate(data.generatedAt);
  const citation = `Gecko Advisor. "${data.title}." geckoadvisor.com/research/${data.slug}, ${citationDate}.`;

  return (
    <section className="mb-10 p-6 border border-zinc-200 rounded-xl bg-white" aria-labelledby="citation-heading">
      <h2 id="citation-heading" className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wide font-display">
        How to Cite This Report
      </h2>
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-sm text-zinc-700 leading-relaxed select-all">
        {citation}
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="p-6 md:p-8 bg-advisor-50 border border-advisor-200 rounded-xl text-center">
      <h2 className="text-lg font-semibold text-zinc-900 mb-2 font-display">
        Check any domain&#39;s privacy posture
      </h2>
      <p className="text-zinc-600 mb-4 max-w-lg mx-auto">
        Enter a domain to see its full privacy analysis, including trackers, cookies,
        fingerprinting, and security headers.
      </p>
      <Link
        href="/check-domain-risk"
        className="inline-block px-6 py-2.5 bg-advisor-600 text-white rounded-lg hover:bg-advisor-700 transition-colors font-medium"
      >
        Check Domain Risk
      </Link>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  Main Component                                           */
/* ────────────────────────────────────────────────────────── */

export function ResearchReport({ data }: { data: ResearchReportData }) {
  return (
    <article className="max-w-5xl mx-auto px-4 py-8 md:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Research', href: '/research' },
          { label: data.title },
        ]}
      />

      {/* ── Header ── */}
      <ReportHeader data={data} />

      {/* ── Key Findings ── */}
      <KeyFindings findings={data.keyFindings} />

      {/* ── Stats Dashboard ── */}
      {data.stats && <StatsDashboard stats={data.stats} globalComparison={data.globalComparison} />}

      {/* ── Grade Distribution (category / cross-category) ── */}
      {data.gradeDistribution && (
        <GradeDistributionChart distribution={data.gradeDistribution} />
      )}

      {/* ── Score Distribution (cross-category) ── */}
      {data.scoreDistribution && data.scoreDistribution.length > 0 && (
        <ScoreDistributionChart distribution={data.scoreDistribution} />
      )}

      {/* ── Domain Rankings (category deep-dive) ── */}
      {data.reportType === 'category-deep-dive' && (
        <section className="mb-10" aria-labelledby="domain-rankings-heading">
          <h2 id="domain-rankings-heading" className="text-xl font-semibold text-zinc-900 mb-6 font-display">
            Domain Rankings
          </h2>
          <DomainRankingTable
            title="Best Privacy Scores"
            domains={data.bestDomains ?? []}
            metric="score"
            metricLabel="Trackers"
          />
          <DomainRankingTable
            title="Worst Privacy Scores"
            domains={data.worstDomains ?? []}
            metric="score"
            metricLabel="Trackers"
          />
          <DomainRankingTable
            title="Most Trackers"
            domains={data.mostTracked ?? []}
            metric="trackerCount"
            metricLabel="Trackers"
          />
        </section>
      )}

      {/* ── Domain Rankings (cross-category) ── */}
      {data.reportType === 'cross-category' && data.mostTracked && data.mostTracked.length > 0 && (
        <DomainRankingTable
          title="Most Tracked Websites"
          domains={data.mostTracked}
          metric="trackerCount"
          metricLabel="Trackers"
        />
      )}

      {/* ── Top Trackers ── */}
      {(data.topTrackers && data.topTrackers.length > 0) && (
        <TrackerBarChart trackers={data.topTrackers} />
      )}

      {/* ── Tracker Details (tracker-landscape) ── */}
      {data.trackerDetails && data.trackerDetails.length > 0 && (
        <TrackerBarChart trackers={data.trackerDetails} />
      )}

      {/* ── Category Breakdown (cross-category) ── */}
      {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
        <CategoryBreakdownTable categories={data.categoryBreakdown} />
      )}

      {/* ── Vendor Ecosystem (tracker-landscape) ── */}
      {data.vendorBreakdown && data.vendorBreakdown.length > 0 && (
        <VendorEcosystem vendors={data.vendorBreakdown} />
      )}

      {/* ── Methodology ── */}
      <MethodologySection sampleSize={data.sampleSize} />

      {/* ── Citation ── */}
      <CitationBlock data={data} />

      {/* ── CTA ── */}
      <CTASection />
    </article>
  );
}
