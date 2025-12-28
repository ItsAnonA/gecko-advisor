/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import type { ReportData } from '@/lib/api';

interface BenchmarkSectionProps {
  meta: ReportData['meta'];
  domain: string;
  score: number;
}

// Minimum sample size for statistically meaningful percentile
const MIN_SAMPLE_SIZE = 50;

/**
 * BenchmarkSection - Market comparison with distinctive visual hierarchy
 *
 * Features a bold percentile ring as the hero element, with comparison
 * metrics in a refined card layout. SEO-optimized with crawlable text.
 */
export default function BenchmarkSection({ meta, domain, score }: BenchmarkSectionProps) {
  const [mounted, setMounted] = React.useState(false);
  const [animatedPercentile, setAnimatedPercentile] = React.useState(0);
  const uniqueId = React.useId();

  const benchmarks = meta?.benchmarks;
  const globalBenchmarks = meta?.globalBenchmarks;
  const trackerInsights = meta?.trackerInsights;

  // Mount animation trigger
  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate percentile count
  React.useEffect(() => {
    if (!mounted || !benchmarks) return;

    const duration = 1400;
    const startTime = Date.now();
    const endValue = benchmarks.percentile;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercentile(Math.round(endValue * eased));

      if (progress < 1) requestAnimationFrame(animate);
    };

    setTimeout(() => requestAnimationFrame(animate), 200);
  }, [mounted, benchmarks]);

  if (!benchmarks || !globalBenchmarks) return null;

  const { percentile, comparedToAverage, trackerComparison, cookieComparison } = benchmarks;
  const { totalDomains, averageScore, averageTrackerCount, averageCookieCount } = globalBenchmarks;

  // Check if we have enough data for meaningful percentile
  const hasEnoughData = totalDomains >= MIN_SAMPLE_SIZE;

  // Ring calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercentile / 100) * circumference;

  // NEUTRAL theme - percentile ring is context, not judgment
  // No red/green based on percentile - always neutral slate
  const theme = {
    ring: '#64748b',           // slate-500 - always neutral
    ringGlow: 'rgba(100, 116, 139, 0.2)',
    bg: 'from-slate-50/80 to-stone-50',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  // Neutral position label - no judgment
  const getPositionLabel = (p: number): string => {
    if (p >= 75) return 'Upper quartile';
    if (p >= 50) return 'Upper half';
    if (p >= 25) return 'Lower half';
    return 'Lower quartile';
  };

  const getComparisonData = (type: 'tracker' | 'cookie') => {
    const comparison = type === 'tracker' ? trackerComparison : cookieComparison;
    const count = type === 'tracker' ? (meta?.trackerCount ?? 0) : (meta?.cookieCount ?? 0);
    const avg = type === 'tracker' ? averageTrackerCount : averageCookieCount;
    const diff = Math.abs(count - avg);

    if (comparison === 'below') return {
      icon: '↓',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      text: `${diff.toFixed(1)} fewer than avg`,
      status: 'good'
    };
    if (comparison === 'above') return {
      icon: '↑',
      color: 'text-red-600 bg-red-50 border-red-100',
      text: `${diff.toFixed(1)} more than avg`,
      status: 'warning'
    };
    return {
      icon: '≈',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      text: 'Near average',
      status: 'neutral'
    };
  };

  const trackerData = getComparisonData('tracker');
  const cookieData = getComparisonData('cookie');

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br ${theme.bg} p-6 transition-all duration-500 h-full ${mounted ? 'opacity-100' : 'opacity-0'}`}
      aria-labelledby="benchmark-heading"
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 id="benchmark-heading" className="text-base font-semibold text-zinc-900">
              Market Comparison
            </h3>
            <p className="text-xs text-zinc-500">
              {hasEnoughData
                ? `Based on ${totalDomains.toLocaleString()} analyzed sites`
                : `Building data (${totalDomains} sites analyzed)`}
            </p>
          </div>
        </div>

        {/* Main content grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Percentile Ring - Hero Element (only show when enough data) */}
          {hasEnoughData ? (
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="relative">
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-full blur-xl transition-opacity duration-700"
                  style={{
                    backgroundColor: theme.ringGlow,
                    opacity: mounted ? 0.6 : 0,
                    transform: 'scale(1.1)'
                  }}
                />

                {/* SVG Ring - smaller to de-emphasize */}
                <svg className="w-20 h-20 -rotate-90 relative z-10" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id={`percentile-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={theme.ring} />
                      <stop offset="100%" stopColor={theme.ring} stopOpacity="0.6" />
                    </linearGradient>
                  </defs>

                  {/* Background track */}
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />

                  {/* Progress ring */}
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke={`url(#percentile-grad-${uniqueId})`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={mounted ? strokeDashoffset : circumference}
                    className="transition-all duration-1000 ease-out"
                    style={{ transitionDelay: '200ms' }}
                  />
                </svg>

                {/* Center content - smaller text for de-emphasis */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold tabular-nums tracking-tight ${theme.text}`}>
                    {animatedPercentile}%
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium mt-0.5">
                    Percentile
                  </span>
                </div>
              </div>

              {/* Position indicator - neutral framing */}
              <div className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${theme.badge}`}>
                {getPositionLabel(percentile)}
              </div>
            </div>
          ) : (
            /* Placeholder when sample size is too small */
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 bg-stone-100 rounded-full border-2 border-dashed border-stone-300">
              <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-[10px] text-stone-500 font-medium mt-1 text-center px-2">
                Building<br />Data
              </span>
            </div>
          )}

          {/* Details section */}
          <div className="flex-1 space-y-4">
            {/* Neutral headline - no judgment, just facts */}
            {hasEnoughData ? (
              <p className="text-sm text-zinc-700 leading-relaxed">
                <span className="font-semibold text-zinc-900">{domain}</span> is at the{' '}
                <span className={`font-medium ${theme.text}`}>{percentile}th percentile</span> among {totalDomains.toLocaleString()} scanned sites.
                {comparedToAverage >= 0
                  ? ` Score is ${comparedToAverage} points above the dataset average of ${averageScore}.`
                  : ` Score is ${Math.abs(comparedToAverage)} points below the dataset average of ${averageScore}.`}
              </p>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Limited data:</strong> Market comparison will become more accurate as we analyze more websites.
                  Currently tracking {totalDomains} sites.
                </p>
              </div>
            )}

            {/* Score comparison bar */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-stone-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-600">Privacy Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Your score</span>
                  <span className={`text-sm font-bold ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {score}
                  </span>
                </div>
              </div>

              <div className="relative h-2.5 bg-stone-200 rounded-full overflow-hidden">
                {/* Average marker */}
                <div
                  className="absolute w-0.5 h-full bg-zinc-400 z-10"
                  style={{ left: `${averageScore}%` }}
                />
                <div
                  className="absolute -top-5 text-[9px] font-medium text-zinc-500 transform -translate-x-1/2"
                  style={{ left: `${averageScore}%` }}
                >
                  Avg {averageScore}
                </div>

                {/* Score fill */}
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    score >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                    score >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  style={{
                    width: mounted ? `${score}%` : '0%',
                    transitionDelay: '400ms'
                  }}
                />
              </div>

              <div className="flex justify-between mt-1 text-[9px] text-zinc-400">
                <span>0</span>
                <span>100</span>
              </div>
            </div>

            {/* Comparison metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border ${trackerData.color} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold">{trackerData.icon}</span>
                  <span className="text-sm font-semibold">{meta?.trackerCount ?? 0} Trackers</span>
                </div>
                <p className="text-xs opacity-80">{trackerData.text}</p>
              </div>

              <div className={`p-3 rounded-xl border ${cookieData.color} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold">{cookieData.icon}</span>
                  <span className="text-sm font-semibold">{meta?.cookieCount ?? 0} Cookies</span>
                </div>
                <p className="text-xs opacity-80">{cookieData.text}</p>
              </div>
            </div>

            {/* Common trackers */}
            {trackerInsights && trackerInsights.commonTrackers.length > 0 && (
              <div className="pt-3 border-t border-stone-200/60">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                  Known Trackers Detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {trackerInsights.commonTrackers.slice(0, 4).map((tracker, i) => (
                    <span
                      key={tracker}
                      className="px-2 py-0.5 text-xs bg-stone-100 text-stone-700 rounded-md border border-stone-200 font-mono"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {tracker}
                    </span>
                  ))}
                  {trackerInsights.commonTrackers.length > 4 && (
                    <span className="px-2 py-0.5 text-xs text-stone-500">
                      +{trackerInsights.commonTrackers.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEO content - neutral facts, no ranking claims */}
        <div className="mt-6 pt-4 border-t border-stone-200/60">
          <p className="text-xs text-zinc-600 leading-relaxed">
            {hasEnoughData ? (
              <>
                {domain} has a privacy score of {score}/100 based on {totalDomains.toLocaleString()} sites in the Gecko Advisor dataset.
                This site uses {meta?.trackerCount ?? 0} trackers (dataset average: {averageTrackerCount.toFixed(1)}) and sets {meta?.cookieCount ?? 0} cookies (dataset average: {averageCookieCount.toFixed(1)}).
              </>
            ) : (
              <>
                {domain} has a privacy score of {score}/100.
                This site uses {meta?.trackerCount ?? 0} trackers and sets {meta?.cookieCount ?? 0} cookies.
                Market comparison data is still being collected.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
