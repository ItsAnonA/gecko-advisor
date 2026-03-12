/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Rankings data fetcher and types for authority anchor pages.
 */

export interface RankingEntry {
  rank: number;
  domain: string;
  score: number;
  trackers: number;
  cookies: number;
  grade: string;
}

export interface CategoryBreakdown {
  category: string;
  slug: string;
  count: number;
  avgScore: number;
}

export interface FreshnessStats {
  lastScanDate: string;
  totalDomainsInDb: number;
  totalEvidenceCount: number;
  totalCookiesDetected: number;
  totalTrackersDetected: number;
}

export interface RankingsData {
  type: string;
  title: string;
  description: string;
  lastUpdated: string;
  totalDomains: number;
  rankings: RankingEntry[];
  stats: {
    averageScore: number;
    averageTrackers: number;
    averageCookies: number;
    totalAnalyzed: number;
  };
  categoryBreakdown?: CategoryBreakdown[];
  freshness?: FreshnessStats;
}

export type RankingType = 'most-tracked' | 'least-private' | 'most-cookies' | 'privacy-index';

export async function fetchRankings(type: RankingType): Promise<RankingsData | null> {
  try {
    const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/v2/rankings/${type}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-amber-600';
    case 'D': return 'text-orange-600';
    case 'F': return 'text-red-600';
    default: return 'text-gray-500';
  }
}

export function gradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'B': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'C': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'D': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'F': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

/** Build ItemList JSON-LD for rich results */
export function buildRankingsJsonLd(data: RankingsData, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: data.title,
    description: data.description,
    url,
    numberOfItems: data.rankings.length,
    itemListElement: data.rankings.slice(0, 50).map((entry) => ({
      '@type': 'ListItem',
      position: entry.rank,
      name: entry.domain,
      url: `https://geckoadvisor.com/privacy-report/${entry.domain}`,
    })),
  };
}

/** Build FAQPage JSON-LD for FAQ rich results */
export function buildFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
