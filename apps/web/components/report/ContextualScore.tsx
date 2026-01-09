/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React, { useEffect, useState } from 'react';
import type { ContextData } from '@/lib/api';

interface ContextualScoreProps {
  score: number;
  label: string;
  context?: ContextData | null;
  loading?: boolean;
}

/**
 * Score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Background color for score ring
 */
function getScoreRingColor(score: number): string {
  if (score >= 70) return 'stroke-emerald-500';
  if (score >= 40) return 'stroke-amber-500';
  return 'stroke-red-500';
}

/**
 * Position badge style
 */
function getPositionStyle(position: string): string {
  if (position.includes('Top 10') || position.includes('Top 25')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (position.includes('Upper')) {
    return 'bg-blue-100 text-blue-800';
  }
  if (position.includes('Lower')) {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-red-100 text-red-800';
}

/**
 * ContextualScore - Shows score with percentile context
 *
 * Features:
 * - Animated score counter
 * - SVG ring visualization
 * - Percentile label below
 * - Position badge
 */
export default function ContextualScore({ score, label, context, loading }: ContextualScoreProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Animate score on mount
  useEffect(() => {
    setMounted(true);
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(score * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  // SVG ring calculation
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = mounted ? (score / 100) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      {/* Score Ring */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-100"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${getScoreRingColor(score)} transition-all duration-1000 ease-out`}
          />
        </svg>

        {/* Score number in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold ${getScoreColor(score)} tabular-nums`}>
            {displayScore}
          </span>
          <span className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
            {label}
          </span>
        </div>
      </div>

      {/* Contextual info */}
      {loading ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-5 w-32 bg-zinc-100 rounded" />
          <div className="h-4 w-48 bg-zinc-100 rounded" />
        </div>
      ) : context ? (
        <div className="mt-4 text-center space-y-2">
          {/* Position badge */}
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPositionStyle(context.positionLabel)}`}>
            {context.positionLabel}
          </span>

          {/* Percentile description */}
          <p className="text-sm text-zinc-600 max-w-xs">
            {context.percentileLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * MiniContextualScore - Compact inline version
 */
interface MiniContextualScoreProps {
  score: number;
  percentile?: number;
  positionLabel?: string;
}

export function MiniContextualScore({ score, percentile, positionLabel }: MiniContextualScoreProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`text-2xl font-bold ${getScoreColor(score)} tabular-nums`}>
        {score}
      </span>
      {positionLabel && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${getPositionStyle(positionLabel)}`}>
          {positionLabel}
        </span>
      )}
      {!positionLabel && percentile !== undefined && (
        <span className="text-xs text-zinc-500">
          Better than {percentile}% of sites
        </span>
      )}
    </div>
  );
}

/**
 * ScoreDistributionChart - Mini sparkline showing position
 */
interface ScoreDistributionChartProps {
  score: number;
  percentile: number;
}

export function ScoreDistributionChart({ score, percentile }: ScoreDistributionChartProps) {
  // Simple bell curve approximation
  const width = 120;
  const height = 40;
  const padding = 4;

  // Generate bell curve points
  const points: string[] = [];
  for (let i = 0; i <= 100; i += 2) {
    const x = padding + ((i / 100) * (width - 2 * padding));
    // Bell curve formula (simplified)
    const normalizedX = (i - 50) / 15;
    const y = height - padding - (Math.exp(-0.5 * normalizedX * normalizedX) * (height - 2 * padding));
    points.push(`${x},${y}`);
  }

  // Position marker
  const markerX = padding + ((percentile / 100) * (width - 2 * padding));

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Background curve */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#e4e4e7"
        strokeWidth="2"
      />
      {/* Position marker */}
      <line
        x1={markerX}
        y1={padding}
        x2={markerX}
        y2={height - padding}
        stroke={score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'}
        strokeWidth="2"
      />
      <circle
        cx={markerX}
        cy={padding + 4}
        r="4"
        fill={score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'}
      />
    </svg>
  );
}
