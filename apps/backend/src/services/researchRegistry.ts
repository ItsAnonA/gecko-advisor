/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Research Report Registry (Phase D)
 *
 * Defines curated research reports that aggregate existing data
 * into journalist-friendly, linkable narratives.
 */

export type ReportType = 'category-deep-dive' | 'tracker-landscape' | 'cross-category';

export interface ResearchEntry {
  slug: string;
  title: string;
  subtitle: string;
  reportType: ReportType;
  params: Record<string, string>;
  /** Short teaser for index page (~20 words) */
  teaser: string;
  /** Priority for index ordering (higher = first) */
  priority: number;
}

export const researchRegistry: ResearchEntry[] = [
  {
    slug: 'social-media-privacy-report',
    title: 'Social Media Privacy Report',
    subtitle: 'How social platforms track, profile, and fingerprint their users',
    reportType: 'category-deep-dive',
    params: { category: 'social-media' },
    teaser: 'A data-driven analysis of tracking practices across major social media platforms.',
    priority: 100,
  },
  {
    slug: 'streaming-services-privacy-ranking',
    title: 'Streaming Services Privacy Ranking',
    subtitle: 'Which streaming platforms respect your privacy — and which don\'t',
    reportType: 'category-deep-dive',
    params: { category: 'streaming' },
    teaser: 'Privacy scores, tracker counts, and fingerprinting rates across streaming services.',
    priority: 90,
  },
  {
    slug: 'ecommerce-tracking-report',
    title: 'E-Commerce Tracking Report',
    subtitle: 'How online retailers track your shopping behavior',
    reportType: 'category-deep-dive',
    params: { category: 'ecommerce' },
    teaser: 'Analysis of trackers, cookies, and fingerprinting across major online retailers.',
    priority: 80,
  },
  {
    slug: 'tracking-technologies-used-by-ai-tools',
    title: 'Tracking Technologies Used by AI Tools',
    subtitle: 'Privacy practices of the AI platforms reshaping the web',
    reportType: 'category-deep-dive',
    params: { category: 'saas' },
    teaser: 'Which AI and SaaS platforms deploy the most trackers and fingerprinting?',
    priority: 85,
  },
  {
    slug: 'most-tracked-websites-study',
    title: 'Most Tracked Websites: A Privacy Study',
    subtitle: 'We analyzed tens of thousands of domains. Here\'s what we found.',
    reportType: 'cross-category',
    params: { type: 'most-tracked' },
    teaser: 'Cross-industry analysis of which websites deploy the most third-party trackers.',
    priority: 95,
  },
  {
    slug: 'news-media-privacy-report',
    title: 'News & Media Privacy Report',
    subtitle: 'The privacy cost of staying informed',
    reportType: 'category-deep-dive',
    params: { category: 'news' },
    teaser: 'How news websites monetize attention through trackers, cookies, and fingerprinting.',
    priority: 75,
  },
  {
    slug: 'banking-privacy-report',
    title: 'Banking & Finance Privacy Report',
    subtitle: 'How financial institutions handle your digital privacy',
    reportType: 'category-deep-dive',
    params: { category: 'finance' },
    teaser: 'Privacy analysis of major banks and financial platforms.',
    priority: 70,
  },
  {
    slug: 'web-tracker-landscape',
    title: 'The Web Tracker Landscape',
    subtitle: 'Which tracking technologies dominate the web in 2026',
    reportType: 'tracker-landscape',
    params: {},
    teaser: 'Adoption rates, industry penetration, and trends for the top tracking technologies.',
    priority: 92,
  },
];

export function getResearchBySlug(slug: string): ResearchEntry | undefined {
  return researchRegistry.find((r) => r.slug === slug);
}

export function getAllResearchSlugs(): string[] {
  return researchRegistry.map((r) => r.slug);
}
