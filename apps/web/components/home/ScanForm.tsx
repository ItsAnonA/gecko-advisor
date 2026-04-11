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
      <header className="text-center py-6 md:py-10 px-4">
        {/* Main Headline */}
        <h1 className="leading-[1.1] max-w-4xl mx-auto mb-5">
          <span className="block font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gecko-900 tracking-tight">
            Domain Intelligence for
          </span>
          <span className="block font-display text-4xl sm:text-5xl md:text-6xl font-bold text-advisor-600 tracking-tight mt-1">
            Risk &amp; Compliance
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gecko-500 max-w-xl mx-auto leading-relaxed mb-6">
          Screen vendor domains before onboarding. Detect trackers, assess privacy posture, monitor drift.
        </p>

        {/* Authority stats bar */}
        {stats && (
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gecko-400 font-medium tabular-nums">
            {stats.domainCount ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-advisor-500" />
                {formatCount(stats.domainCount)} domains monitored
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-advisor-400" />
              {formatCount(stats.totalScans)} scans completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-advisor-300" />
              Daily scanning
            </span>
          </div>
        )}
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

        {/* Scan Button + Secondary CTA */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-center gap-3">
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
              focus-visible:ring-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-2 focus-visible:outline-none
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
          <Link
            href="/api-access"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-advisor-500 text-advisor-600 font-semibold text-base hover:bg-advisor-50 transition-all duration-300"
          >
            API Access
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gecko-500 text-center" id="scan-help-text">
          Results in ~60 seconds • Privacy score (A-F) with evidence
        </p>
      </div>

      {/* Value Propositions */}
      <section className="max-w-4xl mx-auto mt-8 md:mt-12 mb-6 md:mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Vendor Screening */}
          <Link href="/check-domain-risk" className="group text-center p-6 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-advisor-300 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-light-sage border border-advisor-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gecko-900 mb-2">Vendor Screening</h3>
            <p className="text-sm text-gecko-600 leading-relaxed">Screen domains before onboarding vendors, partners, or clients.</p>
            <span className="inline-block mt-3 text-sm font-semibold text-advisor-600 group-hover:underline">Check a domain &rarr;</span>
          </Link>

          {/* Column 2: API Integration */}
          <Link href="/api-access" className="group text-center p-6 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-advisor-300 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-light-sage border border-advisor-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gecko-900 mb-2">API Integration</h3>
            <p className="text-sm text-gecko-600 leading-relaxed">Programmatic access for compliance and security workflows.</p>
            <span className="inline-block mt-3 text-sm font-semibold text-advisor-600 group-hover:underline">View API docs &rarr;</span>
          </Link>

          {/* Column 3: Transparent Methodology */}
          <Link href="/methodology" className="group text-center p-6 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-advisor-300 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-light-sage border border-advisor-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-advisor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gecko-900 mb-2">Transparent Methodology</h3>
            <p className="text-sm text-gecko-600 leading-relaxed">Published accuracy tracking and open methodology.</p>
            <span className="inline-block mt-3 text-sm font-semibold text-advisor-600 group-hover:underline">View methodology &rarr;</span>
          </Link>
        </div>
      </section>

      {/* Privacy Intelligence Section */}
      <section className="max-w-4xl mx-auto mb-6 md:mb-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-gecko-900 tracking-tight">
            Explore Our Research
          </h2>
          <p className="mt-2 text-sm md:text-base text-gecko-500">
            Data-driven insights from 205,000+ domain privacy analyses
          </p>
        </div>

        {/* Hierarchy: Privacy Index = primary hub (featured, full-width).
            The 3 ranking hubs are secondary supporting pages. This is intentional —
            we want Google to see Privacy Index as the canonical authority page. */}
        <div className="space-y-4">
          {/* Primary hub — featured */}
          <Link
            href="/privacy-index"
            className="group block p-6 md:p-7 rounded-xl bg-gradient-to-br from-advisor-50 to-zinc-50 border-2 border-advisor-200 hover:border-advisor-400 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-advisor-600">
                    Featured Research
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-display font-bold text-gecko-900 mb-1.5 group-hover:text-advisor-600 transition-colors">
                  The Privacy Index
                </h3>
                <p className="text-sm md:text-base text-gecko-600 leading-relaxed">
                  The definitive ranking of website privacy practices across the web — start here to explore our research.
                </p>
              </div>
              <svg className="hidden sm:block w-6 h-6 text-advisor-500 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>

          {/* Secondary hubs — supporting rankings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/most-tracked-websites"
              className="group p-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-white hover:border-advisor-300 hover:shadow-sm transition-all duration-300"
            >
              <h4 className="text-sm font-semibold text-gecko-900 mb-1 group-hover:text-advisor-600 transition-colors">
                Most Tracked Websites
              </h4>
              <p className="text-xs text-gecko-500 leading-relaxed">
                Sites deploying the most third-party trackers
              </p>
            </Link>

            <Link
              href="/least-private-websites"
              className="group p-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-white hover:border-advisor-300 hover:shadow-sm transition-all duration-300"
            >
              <h4 className="text-sm font-semibold text-gecko-900 mb-1 group-hover:text-advisor-600 transition-colors">
                Least Private Websites
              </h4>
              <p className="text-xs text-gecko-500 leading-relaxed">
                Domains with the lowest privacy scores
              </p>
            </Link>

            <Link
              href="/websites-with-most-cookies"
              className="group p-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-white hover:border-advisor-300 hover:shadow-sm transition-all duration-300"
            >
              <h4 className="text-sm font-semibold text-gecko-900 mb-1 group-hover:text-advisor-600 transition-colors">
                Websites with Most Cookies
              </h4>
              <p className="text-xs text-gecko-500 leading-relaxed">
                Sites setting the highest number of cookies
              </p>
            </Link>
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
                  rounded-lg -mx-3
                  transition-all duration-200
                  hover:bg-white/5 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]
                  hover:border-advisor-500/40 border-2 border-transparent
                  ${index !== recentReports.length - 1 ? 'border-b-2 !border-b-white/5 hover:!border-b-transparent' : ''}
                `}
              >
                <Link
                  href={`/privacy-report/${report.domain}`}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                  aria-label={`View privacy report for ${report.domain}`}
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

                  {/* Right side: Grade + View indicator */}
                  <div className="flex items-center gap-3 flex-shrink-0 sm:ml-4">
                    <div className="flex items-center">
                      <GradeBadge score={report.score} size="md" showLabel={true} />
                    </div>

                    <span
                      className="text-advisor-600 text-sm font-semibold whitespace-nowrap"
                      aria-hidden="true"
                    >
                      View Report →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
