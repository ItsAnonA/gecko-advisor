/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

'use client';

/**
 * ChangeHistory Component
 *
 * Displays privacy changes for a domain over time.
 * Shows score deltas, tracker changes, and fingerprinting status.
 */

import { useState } from 'react';
import type { DomainChange, ChangeType } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';

// ============================================================================
// Types
// ============================================================================

interface ChangeHistoryProps {
  domain: string;
  changes: DomainChange[];
  showTitle?: boolean;
  maxItems?: number;
}

// ============================================================================
// Constants
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
// Subcomponents
// ============================================================================

function ScoreDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-zinc-500">No change</span>;
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

function TrackerChanges({
  added,
  removed,
  expanded,
  onToggle,
}: {
  added: string[];
  removed: string[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalChanges = added.length + removed.length;

  if (totalChanges === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="text-sm text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
      >
        <span>{expanded ? '−' : '+'}</span>
        <span>
          {totalChanges} tracker {totalChanges === 1 ? 'change' : 'changes'}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 text-sm space-y-1 pl-4 border-l-2 border-zinc-200">
          {added.length > 0 && (
            <div className="text-red-600">
              <span className="font-medium">Added:</span>{' '}
              {added.slice(0, 5).join(', ')}
              {added.length > 5 && ` +${added.length - 5} more`}
            </div>
          )}
          {removed.length > 0 && (
            <div className="text-emerald-600">
              <span className="font-medium">Removed:</span>{' '}
              {removed.slice(0, 5).join(', ')}
              {removed.length > 5 && ` +${removed.length - 5} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FingerprintingBadge({ changed, current }: { changed: boolean; current: boolean }) {
  if (!changed) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        current
          ? 'bg-red-100 text-red-700'
          : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      {current ? 'Fingerprinting detected' : 'Fingerprinting removed'}
    </span>
  );
}

function ChangeItem({ change }: { change: DomainChange }) {
  const [expanded, setExpanded] = useState(false);
  const styles = CHANGE_TYPE_STYLES[change.changeType];

  return (
    <div
      className={`border-l-4 ${styles.border} pl-4 py-3 ${styles.bg} rounded-r-lg`}
    >
      {/* Header: Score change and date */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <ScoreDelta delta={change.scoreDelta} />
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles.bg} ${styles.text}`}>
            {styles.label}
          </span>
          <FingerprintingBadge
            changed={change.fingerprintingChanged}
            current={change.fingerprintingAfter}
          />
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
          {change.changeReasons.slice(0, 3).map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}

      {/* Expandable tracker details */}
      <TrackerChanges
        added={change.trackersAdded}
        removed={change.trackersRemoved}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChangeHistory({
  domain,
  changes,
  showTitle = true,
  maxItems = 10,
}: ChangeHistoryProps) {
  const displayedChanges = changes.slice(0, maxItems);

  if (displayedChanges.length === 0) {
    return null;
  }

  return (
    <section className="mt-8" aria-labelledby="change-history-heading">
      {showTitle && (
        <h2
          id="change-history-heading"
          className="text-xl font-semibold text-zinc-900 mb-4"
        >
          Privacy Change History
        </h2>
      )}

      <p className="text-sm text-zinc-600 mb-4">
        Track how {domain}&apos;s privacy practices have evolved over time.
      </p>

      <div className="space-y-3">
        {displayedChanges.map((change) => (
          <ChangeItem key={change.id} change={change} />
        ))}
      </div>

      {changes.length > maxItems && (
        <p className="mt-4 text-sm text-zinc-500">
          Showing {maxItems} of {changes.length} changes
        </p>
      )}
    </section>
  );
}

// ============================================================================
// Skeleton for Suspense
// ============================================================================

export function ChangeHistorySkeleton() {
  return (
    <section className="mt-8 animate-pulse">
      <div className="h-7 bg-zinc-200 rounded w-48 mb-4" />
      <div className="h-4 bg-zinc-100 rounded w-64 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-l-4 border-zinc-200 pl-4 py-3 bg-zinc-50 rounded-r-lg">
            <div className="flex items-center gap-3">
              <div className="h-6 bg-zinc-200 rounded-full w-24" />
              <div className="h-5 bg-zinc-200 rounded w-16" />
            </div>
            <div className="mt-2 h-4 bg-zinc-100 rounded w-48" />
            <div className="mt-2 h-4 bg-zinc-100 rounded w-64" />
          </div>
        ))}
      </div>
    </section>
  );
}
