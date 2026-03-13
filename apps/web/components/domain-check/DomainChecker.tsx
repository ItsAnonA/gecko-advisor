/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface DomainResult {
  scan: {
    score: number | null;
    label: string | null;
    status: string;
    finishedAt?: string | null;
  };
  meta?: {
    trackerCount?: number;
    cookieCount?: number;
    tlsGrade?: string;
    domain?: string;
  };
  evidence?: Array<{
    kind: string;
    title: string;
    severity: number;
  }>;
}

function getGradeColor(label: string | null): string {
  switch (label) {
    case 'A': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'B': return 'text-teal-600 bg-teal-50 border-teal-200';
    case 'C': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'F': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-zinc-600 bg-zinc-50 border-zinc-200';
  }
}

export function DomainChecker() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainResult | null>(null);
  const [checkedDomain, setCheckedDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    const trimmed = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!trimmed) {
      setError('Please enter a domain');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/v2/domain/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError(`No data found for "${trimmed}". Try scanning it first on our homepage.`);
        } else {
          setError('Failed to check domain. Please try again.');
        }
        setLoading(false);
        return;
      }

      const data: DomainResult = await res.json();
      setResult(data);
      setCheckedDomain(trimmed);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCheck();
  }, [handleCheck]);

  return (
    <div>
      {/* Search Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a domain (e.g., example.com)"
          className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 text-base focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:border-advisor-500 transition-all"
          disabled={loading}
        />
        <button
          onClick={handleCheck}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-advisor-500 text-white font-semibold hover:bg-advisor-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </span>
          ) : 'Check Domain'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-6 p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">{checkedDomain}</h3>
              {result.scan.finishedAt && (
                <p className="text-xs text-zinc-500 mt-1">
                  Last scanned: {new Date(result.scan.finishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            {result.scan.score !== null && (
              <div className={`flex-shrink-0 px-4 py-2 rounded-lg border font-bold text-lg ${getGradeColor(result.scan.label)}`}>
                {result.scan.label} ({result.scan.score})
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-zinc-50">
              <p className="text-xs text-zinc-500 mb-1">Trackers</p>
              <p className="text-lg font-bold text-zinc-900">{result.meta?.trackerCount ?? '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50">
              <p className="text-xs text-zinc-500 mb-1">Cookies</p>
              <p className="text-lg font-bold text-zinc-900">{result.meta?.cookieCount ?? '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50">
              <p className="text-xs text-zinc-500 mb-1">TLS Grade</p>
              <p className="text-lg font-bold text-zinc-900">{result.meta?.tlsGrade ?? '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50">
              <p className="text-xs text-zinc-500 mb-1">Fingerprinting</p>
              <p className="text-lg font-bold text-zinc-900">
                {result.evidence?.some(e => e.kind === 'fingerprint') ? 'Detected' : 'None'}
              </p>
            </div>
          </div>

          {/* View Full Report Link */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <Link
              href={`/privacy-report/${checkedDomain}`}
              className="text-sm font-semibold text-advisor-600 hover:text-advisor-700 transition-colors"
            >
              View full privacy report →
            </Link>
            <Link
              href="/api-access"
              className="text-xs text-zinc-500 hover:text-advisor-600 transition-colors"
            >
              Want API access?
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
