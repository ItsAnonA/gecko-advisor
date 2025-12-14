/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * SEO JSON-LD Schema Builders
 *
 * Generates structured data for search engine understanding.
 * Follow schema.org specifications.
 */

import type { ScanDataForMetadata } from './metadata.js';
import type { IndexTier } from './index-gating.js';
import { SEO_CONSTANTS, getPageTitle, buildMetaDescription } from './metadata.js';

/**
 * Maximum words allowed in FAQ answers per SEO contract.
 * Google may truncate or ignore answers longer than this.
 */
export const FAQ_MAX_WORDS = 55;

/**
 * Enforces word limit on FAQ answers.
 * Truncates at sentence boundary when possible.
 *
 * @param text - Original answer text
 * @param maxWords - Maximum words (default: 55)
 * @returns Truncated text within word limit
 */
export function enforceWordLimit(text: string, maxWords = FAQ_MAX_WORDS): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }

  const truncated = words.slice(0, maxWords).join(' ');

  // Try to end at a sentence boundary (period) if one exists past 60% of text
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > truncated.length * 0.6) {
    return truncated.slice(0, lastPeriod + 1);
  }

  // Otherwise just add ellipsis
  return truncated + '...';
}

/**
 * JSON-LD Schema types
 */
export interface WebPageSchema {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  name: string;
  description: string;
  url: string;
  dateModified?: string;
  isPartOf: {
    '@type': 'WebSite';
    name: string;
    url: string;
  };
  mainEntity?: {
    '@type': 'Article' | 'Report';
    headline: string;
    description: string;
    datePublished?: string;
    dateModified?: string;
    publisher: {
      '@type': 'Organization';
      name: string;
      url: string;
    };
  };
}

export interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface FAQSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

/**
 * Builds WebPage schema for a domain report.
 *
 * @param scanData - Scan data
 * @param domain - Normalized domain
 * @param baseUrl - Base URL
 * @returns WebPage JSON-LD schema
 */
export function buildWebPageSchema(
  scanData: ScanDataForMetadata | null | undefined,
  domain: string,
  baseUrl = SEO_CONSTANTS.BASE_URL
): WebPageSchema {
  const title = getPageTitle(domain, scanData?.score);
  const description = buildMetaDescription(scanData, domain);
  const url = `${baseUrl}/privacy-policy/${domain}`;
  const dateModified = scanData?.finishedAt
    ? new Date(scanData.finishedAt).toISOString()
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    ...(dateModified && { dateModified }),
    isPartOf: {
      '@type': 'WebSite',
      name: SEO_CONSTANTS.SITE_NAME,
      url: baseUrl,
    },
    mainEntity: {
      '@type': 'Report',
      headline: title,
      description,
      ...(dateModified && { datePublished: dateModified, dateModified }),
      publisher: {
        '@type': 'Organization',
        name: SEO_CONSTANTS.SITE_NAME,
        url: baseUrl,
      },
    },
  };
}

/**
 * Builds Breadcrumb schema for a domain report.
 *
 * @param domain - Normalized domain
 * @param baseUrl - Base URL
 * @returns BreadcrumbList JSON-LD schema
 */
export function buildBreadcrumbSchema(
  domain: string,
  baseUrl = SEO_CONSTANTS.BASE_URL
): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Privacy Reports',
        item: `${baseUrl}/reports`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: domain,
        // No item URL for current page (best practice)
      },
    ],
  };
}

/**
 * Builds FAQ schema for a domain report.
 * Only generated for 'full' tier pages with complete data.
 * All answers are limited to 55 words per SEO contract.
 *
 * @param scanData - Scan data
 * @param domain - Normalized domain
 * @param tier - Index tier
 * @returns FAQPage JSON-LD schema or null if not applicable
 */
export function buildFAQSchema(
  scanData: ScanDataForMetadata | null | undefined,
  domain: string,
  tier?: IndexTier
): FAQSchema | null {
  // Only generate FAQ for full tier with complete data
  if (!scanData || tier === 'noindex') {
    return null;
  }

  const questions: FAQSchema['mainEntity'] = [];

  // Q1: Does this site track you?
  if (typeof scanData.trackerCount === 'number') {
    const trackerAnswer =
      scanData.trackerCount === 0
        ? `No tracking scripts were detected on ${domain} during our scan. Common analytics tools such as Google Analytics, Facebook Pixel, and advertising trackers were not identified.`
        : `Gecko Advisor detected ${scanData.trackerCount} tracking script${scanData.trackerCount === 1 ? '' : 's'} on ${domain}. These may include analytics platforms, advertising networks, or behavioral tracking technologies.`;

    questions.push({
      '@type': 'Question',
      name: `Does ${domain} track visitors?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: enforceWordLimit(trackerAnswer),
      },
    });
  }

  // Q2: Third-party connections
  if (typeof scanData.thirdPartyCount === 'number') {
    const thirdPartyAnswer =
      scanData.thirdPartyCount === 0
        ? `${domain} does not appear to connect to third-party services based on our scan. Your browser did not connect to external domains when loading this site.`
        : `When loading ${domain}, we detected connections to ${scanData.thirdPartyCount} third-party service${scanData.thirdPartyCount === 1 ? '' : 's'}. These may include CDNs, analytics providers, or embedded content.`;

    questions.push({
      '@type': 'Question',
      name: `Does ${domain} share data with third parties?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: enforceWordLimit(thirdPartyAnswer),
      },
    });
  }

  // Q3: Is it secure?
  if (scanData.tlsGrade) {
    const tlsAnswer =
      scanData.tlsGrade === 'A' || scanData.tlsGrade === 'A+'
        ? `${domain} uses TLS Grade ${scanData.tlsGrade} encryption, indicating strong security configuration. Your connection to this site is encrypted using modern standards.`
        : `${domain} uses TLS Grade ${scanData.tlsGrade} encryption. While encrypted, there may be room for improvement in the security configuration.`;

    questions.push({
      '@type': 'Question',
      name: `Is ${domain} secure?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: enforceWordLimit(tlsAnswer),
      },
    });
  }

  // Q4: Privacy score explanation (always include if score exists)
  if (typeof scanData.score === 'number') {
    const scoreAnswer = `${domain} has a privacy score of ${scanData.score}/100 based on Gecko Advisor's automated analysis. This score is calculated based on detected tracking scripts, third-party connections, cookie usage, and security configuration. Higher scores indicate fewer observable privacy concerns.`;

    questions.push({
      '@type': 'Question',
      name: `What is ${domain}'s privacy score?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: enforceWordLimit(scoreAnswer),
      },
    });
  }

  // Need at least 2 questions for FAQ schema
  if (questions.length < 2) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions,
  };
}

/**
 * Builds Organization schema for the site.
 *
 * @param baseUrl - Base URL
 * @returns Organization JSON-LD schema
 */
export function buildOrganizationSchema(
  baseUrl = SEO_CONSTANTS.BASE_URL
): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONSTANTS.SITE_NAME,
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      'https://twitter.com/geckoadvisor',
      'https://github.com/privacygecko/gecko-advisor',
    ],
  };
}

/**
 * Builds WebSite schema for search appearance.
 *
 * @param baseUrl - Base URL
 * @returns WebSite JSON-LD schema
 */
export function buildWebSiteSchema(baseUrl = SEO_CONSTANTS.BASE_URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_CONSTANTS.SITE_NAME,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/privacy-policy/{search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
