'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

interface UsageData {
  tier: string;
  requestsUsed: number;
  requestsLimit: number;
  remainingPercent: number;
  expiresAt: string | null;
  lastResetAt: string;
}

function usageColor(percent: number): string {
  const used = 100 - percent;
  if (used > 80) return 'bg-red-500';
  if (used > 50) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function usageIndicator(percent: number): { color: string; label: string } {
  const used = 100 - percent;
  if (used > 80) return { color: 'text-red-600', label: 'High usage' };
  if (used > 50) return { color: 'text-yellow-600', label: 'Moderate usage' };
  return { color: 'text-emerald-600', label: 'Healthy' };
}

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ApiDashboardPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.geckoadvisor.com';

  async function checkUsage() {
    if (!apiKey.trim()) {
      setError('Please enter your API key.');
      return;
    }

    setLoading(true);
    setError(null);
    setUsage(null);

    try {
      const res = await fetch(`${apiUrl}/api/v2/api-keys/usage`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });

      if (res.status === 401) {
        setError('Invalid API key. Please check your key and try again.');
        return;
      }

      if (!res.ok) {
        setError(`Request failed (${res.status}). Please try again later.`);
        return;
      }

      const data: UsageData = await res.json();
      setUsage(data);
    } catch {
      setError('Could not connect to the API. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const indicator = usage ? usageIndicator(usage.remainingPercent) : null;
  const usedPercent = usage ? 100 - usage.remainingPercent : 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <title>API Dashboard | Gecko Advisor</title>

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'API Access', href: '/api-access' },
          { label: 'Dashboard' },
        ]}
      />

      <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 mb-2">
        API Dashboard
      </h1>
      <p className="text-zinc-600 mb-8">
        Enter your API key to view usage, remaining requests, and subscription details.
      </p>

      {/* API Key Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <label htmlFor="api-key-input" className="block text-sm font-semibold text-zinc-700 mb-2">
          API Key
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') checkUsage();
              }}
              placeholder="ga_your_key_here"
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:border-transparent"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <button
            onClick={checkUsage}
            disabled={loading}
            className="bg-advisor-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-advisor-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            )}
            Check Usage
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Usage Results */}
      {usage && indicator && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Usage Overview</h2>
            <span className={`text-sm font-medium ${indicator.color}`}>
              {indicator.label}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-zinc-500 mb-1">
              <span>{usage.requestsUsed.toLocaleString()} used</span>
              <span>{usage.requestsLimit.toLocaleString()} limit</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usageColor(usage.remainingPercent)}`}
                style={{ width: `${Math.min(usedPercent, 100)}%` }}
              />
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {usage.remainingPercent}% remaining
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tier</p>
              <p className="text-lg font-semibold text-zinc-900">{usage.tier}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-lg font-semibold text-zinc-900">
                {(usage.requestsLimit - usage.requestsUsed).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Last Reset</p>
              <p className="text-sm font-medium text-zinc-900">{formatDate(usage.lastResetAt)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Expires</p>
              <p className="text-sm font-medium text-zinc-900">{formatDate(usage.expiresAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 text-sm">
        <a
          href="https://geckoadvisor.lemonsqueezy.com/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-advisor-600 hover:text-advisor-700 font-medium transition-colors"
        >
          Manage Billing &rarr;
        </a>
        <span className="hidden sm:inline text-zinc-300">|</span>
        <Link
          href="/api-access"
          className="text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          View pricing plans
        </Link>
      </div>
    </main>
  );
}
