// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Privacy Gecko

import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  /** Page title (will be appended with " | Gecko Advisor") */
  title: string;
  /** Meta description (max 155 characters recommended) */
  description: string;
  /** Canonical URL (absolute) */
  canonical?: string;
  /** Open Graph image URL (1200x630px recommended) */
  image?: string;
  /** Open Graph type (default: "website") */
  type?: 'website' | 'article';
  /** Twitter card type (default: "summary_large_image") */
  twitterCard?: 'summary' | 'summary_large_image';
  /** Robots meta tag (default: "index, follow") */
  robots?: string;
  /** Additional keywords (comma-separated) */
  keywords?: string;
  /** Article published time (ISO 8601) */
  publishedTime?: string;
  /** Article modified time (ISO 8601) */
  modifiedTime?: string;
}

const DEFAULT_IMAGE = '/og-image.png';
const SITE_NAME = 'Gecko Advisor';
const TWITTER_HANDLE = '@GeckoAdvisor';

export function SEO({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  twitterCard = 'summary_large_image',
  robots = 'index, follow',
  keywords,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const absoluteImage = image.startsWith('http') ? image : `https://geckoadvisor.com${image}`;
  const absoluteCanonical = canonical || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      {canonical && <link rel="canonical" href={absoluteCanonical} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      {canonical && <meta property="og:url" content={absoluteCanonical} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
}
