/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UrlInput, saveRecentScan, TurnstileWidget, useTurnstileEnabled, RateLimitIndicator } from '@/components/scan';
import type { UrlInputRef, RateLimitError } from '@/components/scan';
import { Card, GradeBadge } from '@/components/ui';
import { startScan, getRecentReports, getStats, ScanError, type RecentReport, type StatsResponse } from '@/lib/api';

/**
 * Helper function for relative time formatting
 */
function getRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format large numbers with K/M suffix
 */
function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/**
 * ScanForm - Main scan form component for the homepage
 */
export default function ScanForm() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const router = useRouter();
  const turnstileEnabled = useTurnstileEnabled();
  const urlInputRef = useRef<UrlInputRef>(null);

  // Fetch stats and recent reports on mount
  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load stats:', err));

    getRecentReports()
      .then((data) => setRecentReports(data.items || []))
      .catch((err) => console.error('Failed to load recent reports:', err));
  }, []);

  const handleScan = useCallback(async () => {
    try {
      setError(null);
      setRateLimitError(null);

      // Validate URL using the UrlInput ref
      if (!urlInputRef.current?.isValid()) {
        setError('Please enter a valid URL');
        urlInputRef.current?.focus();
        return;
      }

      // Get the normalized URL from the input
      const normalizedUrl = urlInputRef.current.getNormalizedUrl();
      if (!normalizedUrl) {
        setError('Please enter a valid URL');
        return;
      }

      setLoading(true);

      // If Turnstile is enabled and no token, show error
      if (turnstileEnabled && !turnstileToken) {
        setError('Please wait for security check to complete');
        setLoading(false);
        return;
      }

      // Save to recent scans before making the request
      saveRecentScan(normalizedUrl);

      // Call the v2 API endpoint
      const data = await startScan(normalizedUrl, turnstileToken || undefined);

      // Navigate to scan progress page
      router.push(`/scan/${data.scanId}?slug=${encodeURIComponent(data.slug)}`);
    } catch (err) {
      // Check if it's a rate limit error
      if (err instanceof ScanError && err.isRateLimitError()) {
        const rateLimitData = err.getRateLimitError();
        if (rateLimitData) {
          setRateLimitError({
            type: 'rate_limit_exceeded',
            title: rateLimitData.title,
            status: 429,
            detail: rateLimitData.detail,
            retryAfterSeconds: rateLimitData.retryAfterSeconds,
            scansUsed: rateLimitData.scansUsed,
            scansRemaining: rateLimitData.scansRemaining,
            resetAt: rateLimitData.resetAt,
          });
          // Don't set generic error for rate limits - the indicator handles it
          setLoading(false);
          return;
        }
      }

      const message = err instanceof Error ? err.message : 'Failed to start scan';
      setError(message);
      console.error('[ScanForm] Scan failed:', err);
      setLoading(false);
    }
  }, [turnstileEnabled, turnstileToken, router]);

  return (
    <>
      {/* Hero Section */}
      <header className="text-center space-y-4 py-4 md:py-8">
        {/* Trust Signals */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-4">
          {/* Open Source */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-advisor-50 border border-advisor-200 text-xs font-medium text-advisor-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Open Source
          </span>
          {/* No Account Required */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            No Account Required
          </span>
          {/* GitHub */}
          <a
            href="https://github.com/privacygecko/gecko-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-200 hover:border-zinc-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
          {/* Scans count */}
          {stats && stats.totalScans > 0 && (
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-advisor-500 border border-advisor-600 text-xs font-medium text-white hover:bg-advisor-600 transition-colors"
              aria-label={`View all ${formatCount(stats.totalScans)} scan reports`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatCount(stats.totalScans)}+ Scans
            </Link>
          )}
        </div>

        {/* Main Headline */}
        <h1 className="leading-tight max-w-4xl mx-auto px-4">
          <span className="block text-4xl sm:text-5xl md:text-6xl font-bold text-gecko-900">
            Instant Privacy Analysis
          </span>
          <span className="block text-3xl sm:text-4xl md:text-5xl font-bold text-advisor-600 mt-2">
            for Any Website
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gecko-600 mb-4 max-w-2xl mx-auto leading-relaxed px-4">
          Scan any website to reveal hidden trackers, cookies, and data collection practices.
          100% free, transparent, and privacy-respecting.
        </p>
      </header>

      {/* Privacy Scanner Box */}
      <div className="
        relative z-10
        max-w-3xl mx-auto
        bg-white
        rounded-2xl
        shadow-sm
        border border-advisor-200
        p-6 md:p-8
        hover:shadow-md hover:border-advisor-300
        transition-all duration-300
      ">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-advisor-500 animate-pulse"></div>
          <span className="text-xs uppercase tracking-wider font-bold text-advisor-600">
            Privacy Scanner
          </span>
        </div>

        {/* Turnstile widget (hidden) */}
        <div className="hidden">
          <TurnstileWidget
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => {
              console.warn('[Turnstile] Failed to verify');
              setError('Security check failed. Please refresh and try again.');
            }}
            onExpire={() => {
              setTurnstileToken(null);
              setError('Security check expired. Please try again.');
            }}
          />
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <UrlInput
            ref={urlInputRef}
            value={input}
            onChange={setInput}
            onSubmit={handleScan}
            placeholder="Enter any website (e.g., nytimes.com)"
            disabled={loading}
            id="scan-input"
            ariaDescribedBy="scan-help-text"
            debounceMs={400}
            showRecentScans={true}
            maxRecentScans={5}
          />
        </div>

        {/* Rate Limit Indicator - only shown when rate limited */}
        <RateLimitIndicator
          rateLimitError={rateLimitError}
          onCountdownComplete={() => setRateLimitError(null)}
        />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Scan Button */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={handleScan}
            disabled={loading || (turnstileEnabled && !turnstileToken)}
            className="
              px-8 py-3.5
              rounded-xl
              bg-advisor-500
              hover:bg-advisor-600
              shadow-lg shadow-advisor-500/30
              hover:shadow-xl hover:shadow-advisor-600/40
              hover:scale-[1.02]
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              transition-all duration-300
              text-white font-semibold text-base
              whitespace-nowrap
            "
            aria-label="Start privacy scan"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Scan Website</span>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gecko-500 text-center" id="scan-help-text">
          Results in ~60 seconds • Privacy score (A-F) with evidence
        </p>
      </div>

      {/* How It Works Section */}
      <section className="max-w-4xl mx-auto mt-8 md:mt-12 mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gecko-900 mb-4 md:mb-6">
          How It Works
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
          {/* Step 1: Scan */}
          <div className="flex flex-col items-center justify-start flex-1 max-w-xs h-[200px]">
            <div className="text-center p-5 rounded-xl border border-gray-200 bg-white shadow-sm w-full h-full flex flex-col hover:shadow-md hover:border-advisor-300 transition-all duration-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-light-sage border border-advisor-200 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
                <svg className="w-6 h-6 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-bold text-gecko-900 mb-1">
                Scan the Website
              </h3>
              <div className="h-[1px] w-6 bg-light-border mx-auto mb-1"></div>
              <p className="text-[13px] text-gecko-600 leading-relaxed">
                Cookies, Trackers, Security Headers
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-2xl text-gecko-300 rotate-90 md:rotate-0 flex-shrink-0 flex items-center justify-center mt-0 md:mt-8" aria-hidden="true">
            →
          </div>

          {/* Step 2: Analyze */}
          <div className="flex flex-col items-center justify-start flex-1 max-w-xs h-[200px]">
            <div className="text-center p-5 rounded-xl border border-gray-200 bg-white shadow-sm w-full h-full flex flex-col hover:shadow-md hover:border-advisor-300 transition-all duration-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-light-sage border border-advisor-200 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
                <svg className="w-6 h-6 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-bold text-gecko-900 mb-1">
                Analyze the Data
              </h3>
              <div className="h-[1px] w-6 bg-light-border mx-auto mb-1"></div>
              <p className="text-[13px] text-gecko-600 leading-relaxed">
                Cross-referencing, Detection Engine
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-2xl text-gecko-300 rotate-90 md:rotate-0 flex-shrink-0 flex items-center justify-center mt-0 md:mt-8" aria-hidden="true">
            →
          </div>

          {/* Step 3: Report */}
          <div className="flex flex-col items-center justify-start flex-1 max-w-xs h-[200px]">
            <div className="text-center p-5 rounded-xl border border-gray-200 bg-white shadow-sm w-full h-full flex flex-col hover:shadow-md hover:border-advisor-300 transition-all duration-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-light-sage border border-advisor-200 flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md">
                <svg className="w-6 h-6 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-bold text-gecko-900 mb-1">
                Report
              </h3>
              <div className="h-[1px] w-6 bg-light-border mx-auto mb-1"></div>
              <p className="text-[13px] text-gecko-600 leading-relaxed">
                Privacy Score, Evidence, Recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Reports Section */}
      {recentReports.length > 0 && (
        <Card className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2.5">
              <svg className="w-6 h-6 text-advisor-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Recent Privacy Scans</span>
            </h2>
            <div className="h-[2px] w-16 bg-gradient-to-r from-advisor-500/60 to-transparent mt-2"></div>
          </div>

          <ul className="space-y-0">
            {recentReports.map((report, index) => (
              <li
                key={report.slug}
                className={`
                  py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3
                  rounded-lg px-3 -mx-3 cursor-pointer
                  transition-all duration-200
                  hover:bg-white/5 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]
                  hover:border-advisor-500/40 border-2 border-transparent
                  ${index !== recentReports.length - 1 ? 'border-b-2 !border-b-white/5 hover:!border-b-transparent' : ''}
                `}
                onClick={() => window.location.href = `/privacy-report/${report.domain}`}
              >
                {/* Left side: Favicon + Domain + Meta */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Favicon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded bg-white flex items-center justify-center overflow-hidden border-2 border-gray-200">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${report.domain}&sz=32`}
                      alt=""
                      width="32"
                      height="32"
                      className="rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Domain info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate">{report.domain}</div>
                    <div className="text-xs text-zinc-600 flex items-center gap-2 mt-0.5">
                      <span>{getRelativeTime(report.createdAt)}</span>
                      <span className="text-zinc-400">•</span>
                      <span>{report.evidenceCount || 0} checks</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Grade + View Link */}
                <div className="flex items-center gap-3 flex-shrink-0 sm:ml-4">
                  <div className="flex items-center">
                    <GradeBadge score={report.score} size="md" showLabel={true} />
                  </div>

                  <Link
                    href={`/privacy-report/${report.domain}`}
                    className="text-green-400 hover:text-green-300 hover:underline text-sm font-semibold transition-colors whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`View privacy report for ${report.domain}`}
                  >
                    View Report →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
