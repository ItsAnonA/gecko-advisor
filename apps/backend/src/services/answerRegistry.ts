/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Answer Registry (Phase C1)
 *
 * Curated list of answer pages targeting high-volume search queries.
 * Each entry defines a slug, title, query type, and parameters.
 */

export type AnswerQueryType = 'domain-tracking' | 'category-ranking' | 'tracker-usage';

export interface AnswerEntry {
  slug: string;
  title: string;
  queryType: AnswerQueryType;
  params: Record<string, string>;
  relatedSlugs: string[];
}

export const answerRegistry: AnswerEntry[] = [
  // Domain-tracking (7)
  {
    slug: 'does-facebook-track-users',
    title: 'Does Facebook Track Users?',
    queryType: 'domain-tracking',
    params: { domain: 'facebook.com' },
    relatedSlugs: ['which-social-media-track-users-most', 'most-private-social-media-platforms'],
  },
  {
    slug: 'does-amazon-track-you',
    title: 'Does Amazon Track You?',
    queryType: 'domain-tracking',
    params: { domain: 'amazon.com' },
    relatedSlugs: ['which-ecommerce-sites-track-you'],
  },
  {
    slug: 'does-reddit-track-users',
    title: 'Does Reddit Track Users?',
    queryType: 'domain-tracking',
    params: { domain: 'reddit.com' },
    relatedSlugs: ['which-social-media-track-users-most'],
  },
  {
    slug: 'does-netflix-track-you',
    title: 'Does Netflix Track You?',
    queryType: 'domain-tracking',
    params: { domain: 'netflix.com' },
    relatedSlugs: ['which-streaming-services-track-you', 'most-private-streaming-services'],
  },
  {
    slug: 'does-tiktok-track-you',
    title: 'Does TikTok Track You?',
    queryType: 'domain-tracking',
    params: { domain: 'tiktok.com' },
    relatedSlugs: ['which-social-media-track-users-most'],
  },
  {
    slug: 'does-google-track-you',
    title: 'Does Google Track You?',
    queryType: 'domain-tracking',
    params: { domain: 'google.com' },
    relatedSlugs: ['which-websites-use-google-analytics'],
  },
  {
    slug: 'does-youtube-track-users',
    title: 'Does YouTube Track Users?',
    queryType: 'domain-tracking',
    params: { domain: 'youtube.com' },
    relatedSlugs: ['which-streaming-services-track-you', 'does-google-track-you'],
  },

  // Category-ranking (8)
  {
    slug: 'which-social-media-track-users-most',
    title: 'Which Social Media Platforms Track Users Most?',
    queryType: 'category-ranking',
    params: { category: 'social-media', sort: 'trackerCount', order: 'desc' },
    relatedSlugs: ['most-private-social-media-platforms', 'does-facebook-track-users'],
  },
  {
    slug: 'most-private-social-media-platforms',
    title: 'Most Private Social Media Platforms',
    queryType: 'category-ranking',
    params: { category: 'social-media', sort: 'score', order: 'desc' },
    relatedSlugs: ['which-social-media-track-users-most'],
  },
  {
    slug: 'which-streaming-services-track-you',
    title: 'Which Streaming Services Track You?',
    queryType: 'category-ranking',
    params: { category: 'streaming', sort: 'trackerCount', order: 'desc' },
    relatedSlugs: ['most-private-streaming-services', 'does-netflix-track-you'],
  },
  {
    slug: 'most-private-streaming-services',
    title: 'Most Private Streaming Services',
    queryType: 'category-ranking',
    params: { category: 'streaming', sort: 'score', order: 'desc' },
    relatedSlugs: ['which-streaming-services-track-you'],
  },
  {
    slug: 'which-news-sites-track-users-most',
    title: 'Which News Sites Track Users Most?',
    queryType: 'category-ranking',
    params: { category: 'news', sort: 'trackerCount', order: 'desc' },
    relatedSlugs: ['which-social-media-track-users-most'],
  },
  {
    slug: 'which-ecommerce-sites-track-you',
    title: 'Which E-Commerce Sites Track You?',
    queryType: 'category-ranking',
    params: { category: 'ecommerce', sort: 'trackerCount', order: 'desc' },
    relatedSlugs: ['does-amazon-track-you'],
  },
  {
    slug: 'which-banking-sites-are-most-private',
    title: 'Which Banking Sites Are Most Private?',
    queryType: 'category-ranking',
    params: { category: 'banking', sort: 'score', order: 'desc' },
    relatedSlugs: [],
  },
  {
    slug: 'which-ai-tools-track-users',
    title: 'Which AI Tools Track Users?',
    queryType: 'category-ranking',
    params: { category: 'saas', sort: 'trackerCount', order: 'desc' },
    relatedSlugs: [],
  },

  // Tracker-usage (5)
  {
    slug: 'which-websites-use-google-analytics',
    title: 'Which Websites Use Google Analytics?',
    queryType: 'tracker-usage',
    params: { tracker: 'Google Analytics' },
    relatedSlugs: ['websites-using-google-tag-manager', 'does-google-track-you'],
  },
  {
    slug: 'which-sites-use-meta-pixel',
    title: 'Which Sites Use Meta Pixel?',
    queryType: 'tracker-usage',
    params: { tracker: 'Meta Pixel' },
    relatedSlugs: ['does-facebook-track-users', 'sites-using-tiktok-pixel'],
  },
  {
    slug: 'websites-using-google-tag-manager',
    title: 'Websites Using Google Tag Manager',
    queryType: 'tracker-usage',
    params: { tracker: 'Google Tag Manager' },
    relatedSlugs: ['which-websites-use-google-analytics'],
  },
  {
    slug: 'which-websites-use-hotjar',
    title: 'Which Websites Use Hotjar?',
    queryType: 'tracker-usage',
    params: { tracker: 'Hotjar' },
    relatedSlugs: ['which-websites-use-google-analytics'],
  },
  {
    slug: 'sites-using-tiktok-pixel',
    title: 'Sites Using TikTok Pixel',
    queryType: 'tracker-usage',
    params: { tracker: 'TikTok Pixel' },
    relatedSlugs: ['does-tiktok-track-you', 'which-sites-use-meta-pixel'],
  },
];

/**
 * Lookup an answer entry by slug.
 */
export function getAnswerBySlug(slug: string): AnswerEntry | undefined {
  return answerRegistry.find((a) => a.slug === slug);
}

/**
 * Get all answer slugs (for sitemap).
 */
export function getAllAnswerSlugs(): string[] {
  return answerRegistry.map((a) => a.slug);
}
