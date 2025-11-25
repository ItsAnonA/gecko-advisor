/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getRecentReports } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Footer from '../components/Footer';
import Header from '../components/Header';
import GradeBadge from '../components/GradeBadge';
import TurnstileWidget, { useTurnstileEnabled } from '../components/TurnstileWidget';
import type { RecentReportsResponse } from '@gecko-advisor/shared';

type RecentItem = RecentReportsResponse['items'][number] & { evidenceCount: number };
type RecentQueryResult = { items: RecentItem[] };

interface ScanResponse {
  scanId: string;
  slug: string;
  statusUrl: string;
  resultsUrl: string;
}

// TASK 3: Helper function for relative time
const getRelativeTime = (value: RecentItem['createdAt']): string => {
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
};

const fetchRecentReports = async (): Promise<RecentQueryResult> => {
  const response = await getRecentReports();
  return {
    items: response.items.map((item) => ({
      ...item,
      evidenceCount: item.evidenceCount ?? 0,
    })),
  };
};

export default function Home() {
  const [input, setInput] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();
  const turnstileEnabled = useTurnstileEnabled();

  async function onScan() {
    try {
      setLoading(true);

      // If Turnstile is enabled and no token, show error
      if (turnstileEnabled && !turnstileToken) {
        toast.error('Please wait for security check to complete');
        return;
      }

      // Call the v2 API endpoint
      const response = await fetch('/api/v2/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          url: input,
          ...(turnstileToken && { turnstileToken }),
        }),
      });

      if (!response.ok) {
        // Handle errors
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start scan');
      }

      const data: ScanResponse = await response.json();

      toast.success('Scan started successfully!');
      navigate(`/scan/${data.scanId}?slug=${encodeURIComponent(data.slug)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start scan';
      toast.error(message);
      console.error('[Home] Scan failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-16 md:pb-24 space-y-6 md:space-y-8">
      {/* Hero Section - Privacy Scanner */}
      <header className="text-center space-y-6 py-8 md:py-16">
        {/* Trust Signals - Above headline */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-advisor-500/10 border border-advisor-500/20 text-xs font-semibold text-advisor-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Open Source
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-advisor-500/10 border border-advisor-500/20 text-xs font-semibold text-advisor-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            No Account Required
          </span>
          <a
            href="https://github.com/privacygecko/gecko-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-advisor-500/10 border border-advisor-500/20 text-xs font-semibold text-advisor-400 hover:bg-advisor-500/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
        </div>

        {/* Main Headline - Clean, professional messaging */}
        <h1 className="leading-tight max-w-4xl mx-auto px-4">
          <span className="block text-4xl sm:text-5xl md:text-6xl font-bold text-light-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Instant Privacy Analysis
          </span>
          <span className="block text-3xl sm:text-4xl md:text-5xl font-bold text-advisor-500 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] mt-2">
            for Any Website
          </span>
        </h1>

        {/* Subheadline - Benefit-focused */}
        <p className="text-lg md:text-xl text-light-secondary mb-10 max-w-2xl mx-auto leading-relaxed px-4">
          Scan any website to reveal hidden trackers, cookies, and data collection practices.
          100% free, transparent, and privacy-respecting.
        </p>
      </header>

      {/* Floating Command Center Scan Box - Enhanced with depth */}
      <div className="
        relative z-10
        max-w-3xl mx-auto
        bg-gradient-to-br from-dark-elevated/95 via-dark-surface/90 to-dark-bg/85
        rounded-2xl
        shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2),0_0_40px_-10px_rgba(16,185,129,0.1)]
        border border-advisor-500/30
        backdrop-blur-xl
        p-6 md:p-8
        before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-br before:from-advisor-500/40 before:via-advisor-500/10 before:to-transparent before:-z-10
        hover:shadow-[0_25px_70px_-15px_rgba(16,185,129,0.25),0_0_50px_-10px_rgba(16,185,129,0.15)]
        transition-shadow duration-300
      ">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-advisor-500 animate-pulse"></div>
          <span className="text-xs uppercase tracking-wider font-bold text-advisor-500">
            Privacy Scanner
          </span>
        </div>

        {/* Turnstile widget (hidden) */}
        <div className="hidden">
          <TurnstileWidget
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => {
              console.warn('[Turnstile] Failed to verify');
              toast.error('Security check failed. Please refresh and try again.');
            }}
            onExpire={() => {
              setTurnstileToken(null);
              toast.error('Security check expired. Please try again.');
            }}
          />
        </div>

        {/* Unified Scanner Input */}
        <div className="relative mb-4">
          <input
            id="scan-input"
            type="url"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                onScan();
              }
            }}
            className="
              w-full
              pl-6 pr-32 py-5 text-lg
              bg-dark-bg/50 backdrop-blur-sm
              border-2 border-dark-border
              rounded-xl
              focus:outline-none focus:ring-4 focus:ring-[#00d985]/50 focus:border-[#00d985]
              transition-all duration-200
              text-light-primary placeholder-light-secondary/60
            "
            placeholder="Paste any URL (e.g., nytimes.com)"
            aria-label="Scan input"
            aria-describedby="scan-help-text"
          />

          <button
            onClick={onScan}
            disabled={loading || (turnstileEnabled && !turnstileToken)}
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              px-5 py-2.5
              rounded-lg
              bg-[#00d985]
              hover:bg-[#00c278]
              shadow-lg shadow-[#00d985]/30
              hover:shadow-xl hover:shadow-[#00c278]/50
              hover:scale-105
              active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              transition-all duration-300
              text-dark-bg font-semibold text-base
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
                  <span className="hidden sm:inline">Scanning...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden sm:inline">Scan</span>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-light-secondary/80 text-center" id="scan-help-text">
          Results in ~60 seconds • Privacy score (A-F) with evidence
        </p>
      </div>

      {/* How It Works - Unified 3-step workflow */}
      <section className="max-w-4xl mx-auto mt-16 md:mt-24 mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-light-primary mb-6 md:mb-8">
          How It Works
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
          {/* Step 1: Scan */}
          <div className="flex flex-col items-center justify-start flex-1 max-w-xs h-[280px]">
            <div className="text-center p-8 rounded-xl border border-advisor-500/20 bg-gradient-to-b from-dark-surface/80 to-dark-bg/60 shadow-[0_8px_30px_rgba(16,185,129,0.08)] backdrop-blur-sm animate-fadeInUp opacity-0 [animation-delay:100ms] [animation-fill-mode:forwards] w-full h-full flex flex-col hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] hover:border-advisor-500/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-advisor-500/20 to-advisor-600/10 border border-advisor-500/30 flex items-center justify-center shadow-lg shadow-advisor-500/20 transition-all duration-200 hover:scale-110 hover:shadow-advisor-500/40">
                <svg className="w-7 h-7 text-advisor-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-light-primary mb-1">
                Scan the Website
              </h3>
              <div className="h-[1px] w-6 bg-dark-border/50 mx-auto mb-2"></div>
              <p className="text-[13px] text-light-tertiary leading-relaxed">
                Cookies, Trackers, Security Headers
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-3xl text-gray-500/70 rotate-90 md:rotate-0 flex-shrink-0 flex items-center justify-center mt-0 md:mt-16" aria-hidden="true">
            →
          </div>

          {/* Step 2: Analyze */}
          <div className="flex flex-col items-center justify-start flex-1 max-w-xs h-[280px]">
            <div className="text-center p-8 rounded-xl border border-advisor-500/20 bg-gradient-to-b from-dark-surface/80 to-dark-bg/60 shadow-[0_8px_30px_rgba(16,185,129,0.08)] backdrop-blur-sm animate-fadeInUp opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards] w-full h-full flex flex-col hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] hover:border-advisor-500/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-advisor-500/20 to-advisor-600/10 border border-advisor-500/30 flex items-center justify-center shadow-lg shadow-advisor-500/20 transition-all duration-200 hover:scale-110 hover:shadow-advisor-500/40">
                <svg className="w-7 h-7 text-advisor-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-light-primary mb-1">
                Analyze the Data
              </h3>
              <div className="h-[1px] w-6 bg-dark-border/50 mx-auto mb-2"></div>
              <p className="text-[13px] text-light-tertiary leading-relaxed">
                Cross-referencing, Detection Engine
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-3xl text-gray-500/70 rotate-90 md:rotate-0 flex-shrink-0 flex items-center justify-center mt-0 md:mt-16" aria-hidden="true">
            →
          </div>

          {/* Step 3: Report */}
          <div className="flex flex-col items-center justify-start flex-1 max-w-xs h-[280px]">
            <div className="text-center p-8 rounded-xl border border-advisor-500/20 bg-gradient-to-b from-dark-surface/80 to-dark-bg/60 shadow-[0_8px_30px_rgba(16,185,129,0.08)] backdrop-blur-sm animate-fadeInUp opacity-0 [animation-delay:300ms] [animation-fill-mode:forwards] w-full h-full flex flex-col hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] hover:border-advisor-500/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-advisor-500/20 to-advisor-600/10 border border-advisor-500/30 flex items-center justify-center shadow-lg shadow-advisor-500/20 transition-all duration-200 hover:scale-110 hover:shadow-advisor-500/40">
                <svg className="w-7 h-7 text-advisor-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-light-primary mb-1">
                Report
              </h3>
              <div className="h-[1px] w-6 bg-dark-border/50 mx-auto mb-2"></div>
              <p className="text-[13px] text-light-tertiary leading-relaxed">
                Privacy Score, Evidence, Recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      <RecentReports />

    </main>
    <Footer />
    </>
  );
}

function RecentReports() {
  const { data } = useQuery<RecentQueryResult>({
    queryKey: ['recent'],
    queryFn: fetchRecentReports,
    staleTime: 30_000,
  });
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Card>
      {/* ✅ Improvement #1: Section header with icon and larger font */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-light-primary flex items-center gap-2.5">
          {/* Activity/Radar icon for "Recent" */}
          <svg className="w-6 h-6 text-advisor-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Recent Privacy Scans</span>
        </h2>
        {/* ✅ Improvement #6: Subtle accent line under title */}
        <div className="h-[2px] w-16 bg-gradient-to-r from-advisor-500/60 to-transparent mt-2"></div>
      </div>

      {/* ✅ Improvement #5: Removed divide-y, adding per-row borders instead */}
      <ul className="space-y-0">
        {items.map((report, index) => {
          // Extract domain for favicon
          const domain = report.domain;

          return (
            <li
              key={report.slug}
              className={`
                py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3
                rounded-lg px-3 -mx-3 cursor-pointer
                transition-all duration-200
                ${/* ✅ Improvement #2: Enhanced hover states */ ''}
                hover:bg-white/5 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]
                ${/* ✅ Improvement #7 (Bonus): Row glow effect on hover */ ''}
                hover:border-advisor-500/40 border-2 border-transparent
                ${/* ✅ Improvement #5: Subtle divider between rows */ ''}
                ${index !== items.length - 1 ? 'border-b-2 !border-b-white/5 hover:!border-b-transparent' : ''}
              `}
              onClick={() => window.location.href = `/r/${report.slug}`}
            >
              {/* Left side: Favicon + Domain + Meta */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Favicon */}
                <div className="flex-shrink-0 w-10 h-10 rounded bg-dark-elevated flex items-center justify-center overflow-hidden border-2 border-dark-border">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
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
                  <div className="font-semibold text-light-primary truncate">{domain}</div>
                  <div className="text-xs text-light-secondary flex items-center gap-2 mt-0.5">
                    <span>{getRelativeTime(report.createdAt)}</span>
                    <span className="text-dark-border">•</span>
                    <span>{report.evidenceCount} checks</span>
                  </div>
                </div>
              </div>

              {/* Right side: Grade + View Link */}
              {/* ✅ Improvement #3: Fixed vertical alignment with items-center */}
              <div className="flex items-center gap-3 flex-shrink-0 sm:ml-4">
                {/* Grade Badge - ensures consistent padding and line-height */}
                <div className="flex items-center">
                  <GradeBadge score={report.score} size="md" showLabel={true} />
                </div>

                {/* ✅ Improvement #4: Better link color with green-400 */}
                <a
                  href={`/r/${report.slug}`}
                  className="text-green-400 hover:text-green-300 hover:underline text-sm font-semibold transition-colors whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`View privacy report for ${domain}`}
                >
                  View Report →
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
