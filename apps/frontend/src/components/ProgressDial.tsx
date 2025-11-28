/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export default function ProgressDial({ percent, 'data-testid': dataTestId }: { percent: number; 'data-testid'?: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;
  return (
    <svg width={120} height={120} viewBox="0 0 100 100" role="img" aria-label={`Progress ${pct}%`} data-testid={dataTestId} className="drop-shadow-sm">
      <circle cx="50" cy="50" r={r} stroke="#1f2937" strokeWidth={8} fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke={'#0ea5e9'}
        strokeWidth={8}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight={700} fill="#1f2937" className="">{pct}%</text>
    </svg>
  );
}
