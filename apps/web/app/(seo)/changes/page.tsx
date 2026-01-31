/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Changes Feed Page
 *
 * Site-wide feed of privacy changes across all domains.
 * Shows recent significant changes with filtering by type.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { fetchRecentChanges, fetchChangeStats, type ChangeType, type RecentChange } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';

// Revalidate every 5 minutes for fresh content
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Privacy Changes Feed | Gecko Advisor',
  description:
    'Track how websites are changing their privacy practices. See which sites are adding or removing trackers, and how privacy scores are evolving.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/changes`,
  },
  openGraph: {
    title: 'Privacy Changes Feed | Gecko Advisor',
    description: 'Track how websites are changing their privacy practices in real-time.',
    url: `${SEO_CONSTANTS.BASE_URL}/changes`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
};

// ============================================================================
// Styles
// ============================================================================

const CHANGE_TYPE_STYLES: Record<ChangeType, { border: string; bg: string; text: string; label: string }> = {
  NONE: {
    border: 'border-l-zinc-300',
    bg: 'bg-zinc-50',
    text: 'text-zinc-600',
    label: 'No Change',
  },
  MINOR: {
    border: 'border-l-sky-400',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    label: 'Minor',
  },
  MODERATE: {
    border: 'border-l-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'Moderate',
  },
  MAJOR: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    label: 'Major',
  },
  CRITICAL: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    label: 'Critical',
  },
};

// ============================================================================
// Components
// ============================================================================

function ScoreDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-zinc-500 text-sm">No change</span>;
  }

  const isImprovement = delta > 0;
  const arrow = isImprovement ? '↑' : '↓';
  const color = isImprovement ? 'text-emerald-600' : 'text-red-600';
  const bgColor = isImprovement ? 'bg-emerald-50' : 'bg-red-50';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${color} ${bgColor}`}>
      <span>{arrow}</span>
      <span>{Math.abs(delta)} points</span>
    </span>
  );
}

function ChangeCard({ change }: { change: RecentChange }) {
  const styles = CHANGE_TYPE_STYLES[change.changeType];

  return (
    <article
      className={`border-l-4 ${styles.border} pl-4 py-4 ${styles.bg} rounded-r-lg`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href={`/privacy-report/${change.domain}`}
            className="text-lg font-medium text-zinc-900 hover:text-advisor-600 transition-colors"
          >
            {change.domain}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <ScoreDelta delta={change.scoreDelta} />
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles.text}`}>
              {styles.label}
            </span>
            {change.fingerprintingChanged && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  change.fingerprintingChanged
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                Fingerprinting {change.fingerprintingChanged ? 'detected' : 'removed'}
              </span>
            )}
          </div>
        </div>
        <time
          className="text-sm text-zinc-500"
          dateTime={change.detectedAt}
          title={new Date(change.detectedAt).toLocaleString()}
        >
          {formatRelativeTime(change.detectedAt)}
        </time>
      </div>

      {/* Score context */}
      <div className="mt-2 text-sm text-zinc-600">
        Score: {change.scoreBefore} → {change.scoreAfter}
        {change.trackerCountBefore !== change.trackerCountAfter && (
          <span className="ml-3">
            Trackers: {change.trackerCountBefore} → {change.trackerCountAfter}
          </span>
        )}
      </div>

      {/* Change reasons */}
      {change.changeReasons.length > 0 && (
        <ul className="mt-2 text-sm text-zinc-700 list-disc list-inside">
          {change.changeReasons.slice(0, 2).map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function StatsCard({ stats }: { stats: NonNullable<Awaited<ReturnType<typeof fetchChangeStats>>> }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6 mb-8">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">
        Changes in the Last {stats.period.days} Days
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-advisor-600">{stats.stats.totalChanges}</div>
          <div className="text-sm text-zinc-600">Total Changes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-900">{stats.stats.domainsWithChanges}</div>
          <div className="text-sm text-zinc-600">Domains Changed</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-900">{stats.stats.avgScoreDelta}</div>
          <div className="text-sm text-zinc-600">Avg Score Delta</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">
            {stats.stats.byType.CRITICAL + stats.stats.byType.MAJOR}
          </div>
          <div className="text-sm text-zinc-600">Major/Critical</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

export default async function ChangesPage() {
  const [changesData, statsData] = await Promise.all([
    fetchRecentChanges({ limit: 50 }),
    fetchChangeStats(30),
  ]);

  const changes = changesData?.changes ?? [];
  const hasChanges = changes.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <li>
            <Link href="/" className="hover:text-advisor-600 transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-zinc-700 font-medium">Privacy Changes</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">
          Privacy Changes Feed
        </h1>
        <p className="text-lg text-zinc-600 max-w-2xl">
          Track how websites are changing their privacy practices. See which sites are adding
          or removing trackers, implementing fingerprinting, and how their privacy scores
          are evolving over time.
        </p>
      </header>

      {/* Stats */}
      {statsData && <StatsCard stats={statsData} />}

      {/* Changes Feed */}
      <section aria-labelledby="recent-changes-heading">
        <h2 id="recent-changes-heading" className="text-xl font-semibold text-zinc-900 mb-4">
          Recent Changes
        </h2>

        {hasChanges ? (
          <div className="space-y-4">
            {changes.map((change) => (
              <ChangeCard key={change.id} change={change} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-50 rounded-lg">
            <p className="text-zinc-600">No privacy changes detected yet.</p>
            <p className="text-sm text-zinc-500 mt-2">
              Changes are recorded when we rescan domains and detect differences.
            </p>
          </div>
        )}
      </section>

      {/* SEO Content */}
      <section className="mt-12 prose prose-zinc max-w-none">
        <h2>Understanding Privacy Changes</h2>
        <p>
          Websites frequently update their privacy practices, whether by adding new
          analytics tools, implementing consent management, or changing their data
          collection methods. Our change detection system monitors these shifts,
          helping you understand how the web&apos;s privacy landscape is evolving.
        </p>

        <h3>Change Types</h3>
        <dl className="not-prose grid gap-3 mt-4">
          <div className="flex gap-3 items-start">
            <span className="inline-block w-3 h-3 mt-1.5 rounded-full bg-sky-400" />
            <div>
              <dt className="font-medium text-zinc-900">Minor (2-5 points)</dt>
              <dd className="text-sm text-zinc-600">
                Small adjustments like adding or removing one tracker, minor cookie changes.
              </dd>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="inline-block w-3 h-3 mt-1.5 rounded-full bg-amber-400" />
            <div>
              <dt className="font-medium text-zinc-900">Moderate (6-15 points)</dt>
              <dd className="text-sm text-zinc-600">
                Noticeable changes like adding multiple trackers or changing security headers.
              </dd>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="inline-block w-3 h-3 mt-1.5 rounded-full bg-orange-500" />
            <div>
              <dt className="font-medium text-zinc-900">Major (16-25 points)</dt>
              <dd className="text-sm text-zinc-600">
                Significant shifts in privacy posture, often indicating policy changes.
              </dd>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="inline-block w-3 h-3 mt-1.5 rounded-full bg-red-500" />
            <div>
              <dt className="font-medium text-zinc-900">Critical (&gt;25 points or fingerprinting)</dt>
              <dd className="text-sm text-zinc-600">
                Dramatic changes or the introduction/removal of fingerprinting techniques.
              </dd>
            </div>
          </div>
        </dl>
      </section>
    </div>
  );
}
