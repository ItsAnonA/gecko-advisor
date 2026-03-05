/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Research Index Component (Phase D SEO)
 *
 * Displays all available research reports in a card grid.
 * Designed to feel like an academic paper listing / research portal.
 * Server component - no 'use client'.
 */

import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';

/* ────────────────────────────────────────────────────────── */
/*  Data Interfaces                                          */
/* ────────────────────────────────────────────────────────── */

interface ResearchReportSummary {
  slug: string;
  title: string;
  subtitle: string;
  teaser: string;
  reportType: string;
}

interface ResearchIndexProps {
  reports: ResearchReportSummary[];
}

/* ────────────────────────────────────────────────────────── */
/*  Helpers                                                  */
/* ────────────────────────────────────────────────────────── */

function reportTypeBadge(type: string): { label: string; classes: string } {
  switch (type) {
    case 'category-deep-dive':
      return { label: 'Category Deep Dive', classes: 'bg-advisor-50 text-advisor-700 border-advisor-200' };
    case 'tracker-landscape':
      return { label: 'Tracker Landscape', classes: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    case 'cross-category':
      return { label: 'Cross-Category', classes: 'bg-trust-50 text-trust-700 border-trust-200' };
    default:
      return { label: type, classes: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Main Component                                           */
/* ────────────────────────────────────────────────────────── */

export function ResearchIndex({ reports }: ResearchIndexProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Research', href: '/research' },
          { label: 'Privacy Research Reports' },
        ]}
      />

      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4 font-display">
          Privacy Research Reports
        </h1>
        <p className="text-lg text-zinc-600 max-w-3xl leading-relaxed">
          Original research based on automated privacy analysis of thousands of
          websites. Each report provides evidence-based findings on tracker
          adoption, fingerprinting prevalence, and security posture across
          industries and the broader web.
        </p>
      </header>

      {/* Report Grid */}
      {reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {reports.map((report) => {
            const badge = reportTypeBadge(report.reportType);
            return (
              <Link
                key={report.slug}
                href={`/research/${report.slug}`}
                className="group flex flex-col p-5 bg-white border border-zinc-200 rounded-xl hover:border-advisor-300 hover:shadow-soft transition-all"
              >
                {/* Badge */}
                <span
                  className={`self-start px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full border mb-3 ${badge.classes}`}
                >
                  {badge.label}
                </span>

                {/* Title */}
                <h2 className="text-lg font-semibold text-zinc-900 mb-1 group-hover:text-advisor-700 transition-colors leading-snug">
                  {report.title}
                </h2>

                {/* Subtitle */}
                <p className="text-sm text-zinc-500 mb-3">{report.subtitle}</p>

                {/* Teaser */}
                <p className="text-sm text-zinc-600 leading-relaxed flex-1">
                  {report.teaser}
                </p>

                {/* Read link */}
                <span className="mt-4 text-sm font-medium text-advisor-600 group-hover:text-advisor-700 transition-colors">
                  Read Report {'\u2192'}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-lg">
            No research reports available yet. Check back soon.
          </p>
        </div>
      )}

      {/* CTA */}
      <section className="p-6 md:p-8 bg-advisor-50 border border-advisor-200 rounded-xl text-center">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2 font-display">
          Need privacy data for your organization?
        </h2>
        <p className="text-zinc-600 mb-4 max-w-lg mx-auto">
          Access domain privacy scores, tracker data, and security analysis
          programmatically through the Gecko Advisor API.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/domain-intelligence-api"
            className="inline-block px-6 py-2.5 bg-advisor-600 text-white rounded-lg hover:bg-advisor-700 transition-colors font-medium"
          >
            Explore the API
          </Link>
          <Link
            href="/check-domain-risk"
            className="inline-block px-6 py-2.5 bg-white text-advisor-700 border border-advisor-300 rounded-lg hover:bg-advisor-50 transition-colors font-medium"
          >
            Check a Domain
          </Link>
        </div>
      </section>
    </div>
  );
}
