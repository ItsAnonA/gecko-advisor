/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Technology entity data fetcher and types for tracker intelligence pages.
 */

export interface TechnologyEntry {
  slug: string;
  name: string;
  domain: string;
  category: string;
  prevalence: number;
  adoptionTrend: 'UP' | 'DOWN' | 'FLAT';
  siteCount: number;
}

export interface TechnologiesListData {
  technologies: TechnologyEntry[];
  totalTrackers: number;
  lastUpdated: string;
}

export interface TechnologyDomain {
  domain: string;
  score: number;
  grade: string;
  trackers: number;
}

export interface TechnologyCategory {
  category: string;
  count: number;
}

export interface TechnologyDetailData {
  technology: {
    slug: string;
    name: string;
    domain: string;
    category: string;
    description: string;
    riskLevel: 'High' | 'Medium' | 'Low';
    prevalence: number;
    adoptionTrend: 'UP' | 'DOWN' | 'FLAT';
    netChange: number;
    topCategories: TechnologyCategory[];
  };
  domains: TechnologyDomain[];
  stats: {
    totalSites: number;
    avgScore: number;
    avgTrackers: number;
  };
}

export async function fetchTechnologies(): Promise<TechnologiesListData | null> {
  try {
    const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/v2/technologies`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchTechnology(slug: string): Promise<TechnologyDetailData | null> {
  try {
    const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';
    const res = await fetch(`${API_URL}/api/v2/technologies/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function riskColor(level: string): string {
  switch (level) {
    case 'High': return 'text-red-400';
    case 'Medium': return 'text-amber-400';
    case 'Low': return 'text-emerald-400';
    default: return 'text-gray-400';
  }
}

export function riskBg(level: string): string {
  switch (level) {
    case 'High': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

export function trendIcon(trend: string): { symbol: string; color: string; label: string } {
  switch (trend) {
    case 'UP': return { symbol: '\u2191', color: 'text-red-400', label: 'Growing' };
    case 'DOWN': return { symbol: '\u2193', color: 'text-emerald-400', label: 'Declining' };
    default: return { symbol: '\u2014', color: 'text-gray-500', label: 'Stable' };
  }
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Analytics: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    Advertising: 'text-red-400 bg-red-500/10 border-red-500/20',
    'Ad Network': 'text-red-400 bg-red-500/10 border-red-500/20',
    Social: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    'Social Media': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    CDN: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    Essential: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Hosting: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };
  return map[category] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20';
}

/** Build ItemList JSON-LD for technologies index */
export function buildTechnologiesJsonLd(data: TechnologiesListData, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Web Tracking Technologies',
    description: 'Third-party tracking technologies detected across the web, ranked by prevalence.',
    url,
    numberOfItems: data.technologies.length,
    itemListElement: data.technologies.slice(0, 50).map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: entry.name,
      url: `https://geckoadvisor.com/technologies/${entry.slug}`,
    })),
  };
}

/** Build SoftwareApplication JSON-LD for technology detail */
export function buildTechnologyJsonLd(data: TechnologyDetailData, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: data.technology.name,
    description: data.technology.description,
    url,
    applicationCategory: `Web ${data.technology.category}`,
  };
}

/** Build FAQPage JSON-LD from question/answer pairs */
export function buildFaqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
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

/** Build Article JSON-LD for editorial/guide pages */
export function buildArticleJsonLd(opts: {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    author: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      url: 'https://geckoadvisor.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      url: 'https://geckoadvisor.com',
    },
    ...(opts.datePublished && { datePublished: opts.datePublished }),
    ...(opts.dateModified && { dateModified: opts.dateModified }),
  };
}
