// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Privacy Gecko

import { Helmet } from 'react-helmet-async';

export interface StructuredDataProps {
  /** Schema.org JSON-LD data */
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * StructuredData component for adding JSON-LD schema markup
 *
 * @example
 * ```tsx
 * <StructuredData data={{
 *   "@context": "https://schema.org",
 *   "@type": "WebSite",
 *   "name": "Gecko Advisor",
 *   "url": "https://geckoadvisor.com"
 * }} />
 * ```
 */
export function StructuredData({ data }: StructuredDataProps) {
  const jsonLd = Array.isArray(data) ? data : [data];

  return (
    <Helmet>
      {jsonLd.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}

/**
 * Pre-built structured data schemas
 */
export const schemas = {
  /**
   * WebSite schema with SearchAction
   */
  website: (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Gecko Advisor',
    url: 'https://geckoadvisor.com',
    description: 'Free, open-source privacy scanner for websites',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://geckoadvisor.com/?url={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }),

  /**
   * Organization schema
   */
  organization: (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Privacy Gecko',
    url: 'https://privacygecko.com',
    logo: 'https://geckoadvisor.com/logo.png',
    sameAs: ['https://github.com/PrivacyGecko'],
    description: 'Privacy tools ecosystem - Building open-source tools that make privacy accessible to everyone',
  }),

  /**
   * Review schema for scan reports
   */
  review: (props: {
    domain: string;
    score: number;
    scanDate: string;
    trackerCount: number;
  }): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'WebSite',
      name: props.domain,
    },
    author: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: props.score.toString(),
      bestRating: '100',
      worstRating: '0',
    },
    datePublished: props.scanDate,
    description: `Privacy analysis of ${props.domain}: ${props.trackerCount} trackers detected`,
  }),

  /**
   * BreadcrumbList schema
   */
  breadcrumb: (items: Array<{ name: string; url: string }>): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }),

  /**
   * FAQPage schema
   */
  faq: (items: Array<{ question: string; answer: string }>): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }),

  /**
   * Article schema
   */
  article: (props: {
    title: string;
    description: string;
    publishedDate: string;
    modifiedDate?: string;
    authorName?: string;
  }): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.description,
    datePublished: props.publishedDate,
    dateModified: props.modifiedDate || props.publishedDate,
    author: {
      '@type': 'Organization',
      name: props.authorName || 'Privacy Gecko',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Privacy Gecko',
      logo: {
        '@type': 'ImageObject',
        url: 'https://geckoadvisor.com/logo.png',
      },
    },
  }),
};
