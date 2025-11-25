/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { ScanHistoryEntry } from '../lib/history';

export interface RecentScansProps {
  entries: ScanHistoryEntry[];
}

export function RecentScans({ entries }: RecentScansProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-dark-border p-4 text-sm text-light-secondary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        Your latest scans will appear here once you run them.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <a
          key={entry.slug}
          href={`/r/${encodeURIComponent(entry.slug)}`}
          className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-dark-border bg-dark-surface px-4 py-3 shadow-sm transition hover:border-advisor-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-dark-bg"
        >
          <div>
            <p className="text-sm font-semibold text-light-primary break-words drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{entry.domain}</p>
            <p className="text-xs text-light-tertiary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{formatDate(entry.scannedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{entry.score ?? '—'}</p>
            <p className="text-xs text-light-tertiary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{entry.label ?? 'Pending'}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
