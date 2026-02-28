/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useState, useCallback } from 'react';

interface SampleRequestFormProps {
  defaultDomain?: string;
}

export function SampleRequestForm({ defaultDomain = '' }: SampleRequestFormProps) {
  const [domain, setDomain] = useState(defaultDomain);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedDomain) {
      setError('Please enter a domain');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v2/sample-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: trimmedDomain, email: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError('Rate limit reached. Please try again tomorrow.');
        } else {
          setError(data.detail || 'Something went wrong. Please try again.');
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [domain, email]);

  if (success) {
    return (
      <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50 text-center">
        <svg className="w-10 h-10 mx-auto mb-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-semibold text-emerald-900 mb-1">Request received</h3>
        <p className="text-sm text-emerald-700">We&apos;ll send the sample data to your email within 24 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <h3 className="font-semibold text-zinc-900 mb-1">Request a sample report</h3>
      <p className="text-sm text-zinc-500 mb-4">Enter a domain and your email. We&apos;ll send you sample API data within 24 hours.</p>

      <div className="space-y-3">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Domain (e.g., example.com)"
          className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:border-advisor-500 transition-all"
          disabled={loading}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Work email"
          className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:border-advisor-500 transition-all"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full px-4 py-2.5 rounded-lg bg-advisor-500 text-white font-medium text-sm hover:bg-advisor-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : 'Request sample data'}
      </button>
    </form>
  );
}
