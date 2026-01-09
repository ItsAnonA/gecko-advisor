/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchSuggestions, type SuggestedComparison } from '@/lib/api';

interface ComparisonPromptProps {
  currentDomain: string;
  currentScore?: number;
  onCompare?: (domain: string) => void;
}

/**
 * ComparisonPrompt - Encourages users to compare privacy practices
 *
 * Shows suggested comparisons and allows searching for custom domains
 */
export default function ComparisonPrompt({ currentDomain, currentScore, onCompare }: ComparisonPromptProps) {
  const [suggestions, setSuggestions] = useState<SuggestedComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Fetch suggestions on mount
  useEffect(() => {
    async function loadSuggestions() {
      setLoading(true);
      try {
        const data = await fetchSuggestions(currentDomain);
        setSuggestions(data.slice(0, 3)); // Max 3 suggestions
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSuggestions();
  }, [currentDomain]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      const normalized = searchValue.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (normalized && normalized !== currentDomain) {
        onCompare?.(normalized);
        window.location.href = `/compare/${encodeURIComponent(currentDomain)}/${encodeURIComponent(normalized)}`;
      }
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="font-semibold text-zinc-900">Compare Privacy Practices</h3>
      </div>

      <p className="text-sm text-zinc-600 mb-4">
        How does <span className="font-medium text-zinc-900">{currentDomain}</span> compare to other sites?
      </p>

      {/* Suggestions */}
      {loading ? (
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 w-28 rounded-lg bg-zinc-100 animate-pulse"
            />
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion.domain}
              href={`/compare/${encodeURIComponent(currentDomain)}/${encodeURIComponent(suggestion.domain)}`}
              onClick={() => onCompare?.(suggestion.domain)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-sm font-medium text-zinc-700 transition-colors"
              title={suggestion.reason}
            >
              <span>{suggestion.domain}</span>
              {suggestion.score !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  (suggestion.score ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-700' :
                  (suggestion.score ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {suggestion.score}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Custom search toggle */}
      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="text-sm text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Compare with a different site
        </button>
      ) : (
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Enter domain (e.g., example.com)"
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!searchValue.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Compare
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSearch(false);
              setSearchValue('');
            }}
            className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * MiniComparisonPrompt - Compact version for inline use
 */
interface MiniComparisonPromptProps {
  currentDomain: string;
  onCompare?: (domain: string) => void;
}

export function MiniComparisonPrompt({ currentDomain, onCompare }: MiniComparisonPromptProps) {
  const [suggestions, setSuggestions] = useState<SuggestedComparison[]>([]);

  useEffect(() => {
    fetchSuggestions(currentDomain)
      .then((data) => setSuggestions(data.slice(0, 2)))
      .catch(() => {});
  }, [currentDomain]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">Compare with:</span>
      {suggestions.map((suggestion, index) => (
        <React.Fragment key={suggestion.domain}>
          {index > 0 && <span className="text-zinc-300">|</span>}
          <Link
            href={`/compare/${encodeURIComponent(currentDomain)}/${encodeURIComponent(suggestion.domain)}`}
            onClick={() => onCompare?.(suggestion.domain)}
            className="text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
          >
            {suggestion.domain}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
}
