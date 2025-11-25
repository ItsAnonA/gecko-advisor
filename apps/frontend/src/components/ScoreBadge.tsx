/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import clsx from 'clsx';
import type { ScoreBand } from '../lib/adapters/scan';

const BAND_STYLES: Record<ScoreBand, string> = {
  safe: 'bg-score-safe/20 text-score-safe border-score-safe/30',
  risky: 'bg-score-caution/20 text-score-caution border-score-caution/30',
  dangerous: 'bg-score-danger/20 text-score-danger border-score-danger/30',
  unknown: 'bg-dark-elevated text-light-secondary border-dark-border',
};

export interface ScoreBadgeProps {
  score: number | null;
  band: ScoreBand;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, band, label, size = 'md' }: ScoreBadgeProps) {
  const displayScore = typeof score === 'number' ? Math.round(score) : '—';
  const sizeClasses = size === 'lg' ? 'text-2xl px-4 py-3' : size === 'sm' ? 'text-sm px-2 py-1.5' : 'text-base px-3 py-2';

  return (
    <div className={clsx('inline-flex min-w-[120px] flex-col items-center rounded-2xl border text-center shadow-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]', BAND_STYLES[band], sizeClasses)}>
      <div className="text-4xl font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{displayScore}</div>
      <div className="text-sm font-medium uppercase tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{label}</div>
    </div>
  );
}
