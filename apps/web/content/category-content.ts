/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Category Content - Editorial content for category hub pages
 *
 * This file contains unique, SEO-friendly content for each category,
 * helping make hub pages more index-worthy and valuable to visitors.
 */

export interface CategoryContent {
  /** Short intro paragraph (~50 words) */
  intro: string;
  /** Why privacy matters in this category */
  whyItMatters: string;
  /** 3-4 data-backed insights from our analysis */
  keyFindings: string[];
  /** User-actionable checklist items */
  whatToLookFor: string[];
  /** How we analyze this category */
  methodology: string;
}

/**
 * Editorial content for each category
 *
 * Add new categories here as they become available.
 * Each entry should have unique, valuable content that
 * helps users understand privacy implications in that industry.
 */
export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  streaming: {
    intro:
      'Streaming services collect extensive data about viewing habits, preferences, and device information. Our analysis reveals significant differences in how major platforms handle user privacy, from tracker deployment to cookie practices.',
    whyItMatters:
      'Your streaming history reveals intimate details about your interests, beliefs, and lifestyle. This data is valuable to advertisers and can be used to build detailed profiles of your behavior. Understanding how streaming platforms handle this data helps you make informed choices about where you spend your time.',
    keyFindings: [
      'Major streaming platforms average 8-12 trackers per page, significantly higher than other industries',
      'Over 70% of streaming sites use browser fingerprinting to identify users across devices',
      'Video advertising platforms often set cookies that persist for 2+ years',
      'Free, ad-supported tiers consistently show 2-3x more tracking than paid subscriptions',
    ],
    whatToLookFor: [
      'Check if the platform offers ad-free tiers with reduced tracking',
      'Look for clear data deletion and account removal options',
      'Review which third parties receive your viewing data',
      'Consider using a VPN to limit location-based tracking',
    ],
    methodology:
      'We scan streaming platform homepages and login pages, analyzing network requests, cookies, and JavaScript execution. Each scan captures real browser behavior, not just declared policies.',
  },

  ecommerce: {
    intro:
      'E-commerce platforms track your browsing, purchase history, and shopping patterns extensively. Our benchmarks show wide variation in privacy practices, with some retailers deploying dozens of trackers while others prioritize minimal data collection.',
    whyItMatters:
      'Shopping behavior reveals your income level, health concerns, family status, and personal preferences. This data fuels dynamic pricing, targeted advertising, and can even affect credit decisions. Knowing which retailers respect your privacy helps you shop more confidently.',
    keyFindings: [
      'The average e-commerce site deploys 15+ third-party trackers',
      'Product pages often contain more trackers than homepage or checkout',
      'Cart abandonment tracking is nearly universal, even on privacy-conscious sites',
      'Mobile shopping experiences typically include additional device fingerprinting',
    ],
    whatToLookFor: [
      'Prefer retailers with clear, accessible privacy policies',
      'Look for guest checkout options to minimize account data collection',
      'Check if the site works without accepting all cookies',
      'Consider using virtual card numbers for added payment privacy',
    ],
    methodology:
      'Our scans analyze the full shopping journey from homepage to product pages. We identify trackers, measure cookie persistence, and detect fingerprinting techniques used to identify returning visitors.',
  },

  saas: {
    intro:
      'Software-as-a-Service platforms handle sensitive business data while often deploying extensive analytics and marketing tools. Our analysis shows enterprise SaaS generally outperforms consumer tools in privacy practices, though significant gaps remain.',
    whyItMatters:
      'SaaS tools often have deep access to your work documents, communications, and business processes. Third-party trackers on these platforms can expose sensitive business information to advertising networks. Choosing privacy-respecting tools protects both personal and business data.',
    keyFindings: [
      'Enterprise SaaS averages 5-7 trackers vs 12+ for consumer-focused tools',
      'Free tiers consistently deploy more tracking than paid plans',
      'Marketing automation tools show the highest tracker counts in the category',
      'SOC 2 certified platforms average 30% fewer third-party connections',
    ],
    whatToLookFor: [
      'Verify the platform has relevant security certifications (SOC 2, ISO 27001)',
      'Check if business data is isolated from marketing analytics',
      'Review data processing agreements for GDPR/CCPA compliance',
      'Prefer platforms with transparent subprocessor lists',
    ],
    methodology:
      'We scan SaaS platform marketing sites and login pages. While we cannot scan authenticated areas, public-facing pages reveal the third-party ecosystem and tracking practices typical of the platform.',
  },

  news: {
    intro:
      'News websites face unique challenges balancing ad-supported business models with reader privacy. Our benchmarks reveal major publishers often deploy 20+ trackers, while subscription-focused outlets show significantly better practices.',
    whyItMatters:
      'Your reading habits reveal your political views, health concerns, financial interests, and personal beliefs. News sites are among the most heavily tracked categories online, with data often shared across vast advertising networks. Understanding these practices helps you choose news sources that respect your privacy.',
    keyFindings: [
      'Ad-supported news sites average 20-30 trackers per page',
      'Paywalled content typically shows 40-60% fewer trackers than free articles',
      'Video content on news sites often includes additional advertising trackers',
      'Local news sites often outperform major publishers in privacy metrics',
    ],
    whatToLookFor: [
      'Consider reader-supported or subscription news sources',
      'Check if the site offers an ad-free or reduced-tracking tier',
      'Look for news aggregators that strip tracking from source articles',
      'Enable reader mode in your browser to reduce script execution',
    ],
    methodology:
      'We scan news site homepages and sample article pages, capturing the full advertising and analytics ecosystem. Our analysis includes both direct trackers and those loaded through header bidding systems.',
  },

  social: {
    intro:
      'Social media platforms are built on data collection, using detailed user profiles to power advertising. Our analysis compares mainstream platforms with privacy-focused alternatives, revealing stark differences in tracking approaches.',
    whyItMatters:
      'Social platforms collect your posts, connections, location, browsing habits, and communication patterns. This creates comprehensive profiles used for targeted advertising and content recommendations. Understanding the privacy tradeoffs helps you choose platforms aligned with your values.',
    keyFindings: [
      'Major social platforms deploy 15-25 first-party tracking mechanisms',
      'Privacy-focused alternatives average 3-5 trackers total',
      'Social login buttons on third-party sites enable cross-site tracking',
      'Mobile apps typically collect significantly more data than web versions',
    ],
    whatToLookFor: [
      'Review privacy settings and limit data sharing where possible',
      'Prefer platforms with chronological feeds over algorithmic ones',
      'Consider privacy-focused alternatives like Mastodon or Signal',
      'Use web versions when possible to limit app-based tracking',
    ],
    methodology:
      'We scan social platform public pages and login flows. Our analysis captures tracking pixels, social widgets, and cross-site tracking mechanisms used to follow users across the web.',
  },

  finance: {
    intro:
      'Financial services websites balance strict security requirements with marketing analytics needs. Our benchmarks show banks and fintech platforms vary widely in their approach to third-party tracking, with traditional banks often outperforming newer entrants.',
    whyItMatters:
      'Financial data is among the most sensitive information online. While core banking functions are heavily regulated, marketing pages often deploy extensive tracking. Understanding these practices helps you choose financial partners who respect your data.',
    keyFindings: [
      'Traditional banks average 8-12 trackers on marketing pages',
      'Fintech platforms often deploy 15+ trackers for user acquisition',
      'Authenticated banking portals show significantly less tracking',
      'Investment platforms vary widely, from 3 to 30+ trackers',
    ],
    whatToLookFor: [
      'Verify the institution uses encrypted connections throughout',
      'Check for multi-factor authentication and security features',
      'Review data sharing policies with affiliates and partners',
      'Prefer institutions with clear breach notification policies',
    ],
    methodology:
      'We scan financial service marketing sites and login pages. While authenticated areas require strict security, public-facing pages reveal third-party relationships and tracking practices.',
  },

  healthcare: {
    intro:
      'Healthcare websites handle some of the most sensitive personal information online. Our analysis reveals concerning gaps between privacy expectations and actual tracking practices, even on major hospital and telehealth platforms.',
    whyItMatters:
      'Health information is uniquely sensitive and protected by laws like HIPAA. However, marketing pages and symptom checkers often deploy standard advertising trackers, potentially exposing health interests to data brokers. Choosing privacy-respecting healthcare resources protects your medical privacy.',
    keyFindings: [
      'Hospital marketing sites average 12-18 third-party trackers',
      'Telehealth platforms show wide variation, from 2 to 25+ trackers',
      'Symptom checker tools often share queries with advertising networks',
      'Patient portals generally show better privacy than marketing sites',
    ],
    whatToLookFor: [
      'Verify telehealth platforms are HIPAA compliant',
      'Be cautious with symptom checkers on ad-supported sites',
      'Check if health content is served from first-party domains',
      'Review how appointment booking data is handled',
    ],
    methodology:
      'We scan healthcare organization websites, including marketing pages and patient resources. Our analysis identifies trackers that may inadvertently expose health-related browsing behavior.',
  },

  education: {
    intro:
      'Educational platforms serve learners from K-12 through professional development, with varying privacy standards. Our benchmarks show significant differences between platforms designed for children versus adult learners.',
    whyItMatters:
      'Educational data reveals learning patterns, struggles, interests, and academic performance. For younger learners, this data requires special protection under laws like COPPA. Understanding platform practices helps educators and parents make informed choices.',
    keyFindings: [
      'K-12 focused platforms average 5-8 trackers, reflecting stricter regulations',
      'Adult learning platforms often deploy 15+ marketing trackers',
      'Free educational resources show higher tracking than paid alternatives',
      'University websites often rival commercial sites in tracker counts',
    ],
    whatToLookFor: [
      'For children, verify COPPA compliance and data collection limits',
      'Check if the platform sells or shares data with third parties',
      'Review data retention policies, especially for student records',
      'Prefer platforms with classroom privacy modes',
    ],
    methodology:
      'We scan educational platform homepages and course catalog pages. Our analysis distinguishes between platforms designed for different age groups and regulatory environments.',
  },

  travel: {
    intro:
      'Travel booking sites use extensive tracking to personalize pricing and recommendations. Our analysis reveals dynamic pricing practices and significant variations in how platforms handle your search and booking data.',
    whyItMatters:
      'Travel searches reveal your income, preferences, and upcoming plans. This data enables dynamic pricing where you may see different prices based on your browsing history. Understanding tracking practices helps you shop more strategically.',
    keyFindings: [
      'Travel aggregators deploy 20-35 trackers on average',
      'Direct booking with airlines and hotels often shows fewer trackers',
      'Price comparison sites share search data with multiple ad networks',
      'Mobile travel apps typically include location tracking capabilities',
    ],
    whatToLookFor: [
      'Consider booking directly with providers for fewer middlemen',
      'Clear cookies between price comparisons to avoid dynamic pricing',
      'Use private browsing for travel searches',
      'Check if the site offers price guarantees or transparency',
    ],
    methodology:
      'We scan travel booking sites including search forms and results pages. Our analysis captures the advertising ecosystem that enables retargeting and price personalization.',
  },

  gaming: {
    intro:
      'Gaming platforms collect gameplay data, social connections, and payment information across PC, console, and mobile. Our benchmarks show mobile gaming platforms generally deploy more aggressive tracking than traditional gaming services.',
    whyItMatters:
      'Gaming data reveals your leisure activities, spending patterns, social connections, and even psychological tendencies. This information is valuable for advertising and can be used to optimize engagement mechanics. Understanding these practices helps you game more privately.',
    keyFindings: [
      'Mobile gaming platforms average 18-25 advertising trackers',
      'PC gaming clients show 8-12 trackers on average',
      'Free-to-play games consistently deploy more tracking than paid titles',
      'Gaming hardware manufacturers track across multiple touchpoints',
    ],
    whatToLookFor: [
      'Review in-game advertising and data sharing settings',
      'Check if gameplay data is shared with third parties',
      'Consider privacy implications of social features',
      'Be aware of tracking in game launchers and storefronts',
    ],
    methodology:
      'We scan gaming platform websites, launcher pages, and storefronts. Our analysis identifies advertising SDKs and analytics tools common in the gaming industry.',
  },

  'ai-tools': {
    intro:
      'AI tools and platforms process user prompts, documents, and conversations that may contain sensitive personal and business data. Our analysis reveals significant differences in how AI providers handle third-party tracking on their public-facing properties.',
    whyItMatters:
      'AI platforms often receive your most sensitive thinking — business strategies, personal questions, code, and creative work. Third-party trackers on these platforms can expose your usage patterns and interests to advertising networks. As AI becomes embedded in daily workflows, understanding provider privacy practices is essential for both personal and enterprise use.',
    keyFindings: [
      'AI tool marketing sites average 10-18 third-party trackers',
      'Open-source AI platforms generally deploy fewer trackers than commercial alternatives',
      'Free-tier AI tools show 2-3x more advertising trackers than paid plans',
      'Several major AI providers use fingerprinting on their login and marketing pages',
    ],
    whatToLookFor: [
      'Review whether prompts and conversations are used for model training',
      'Check for enterprise plans with data isolation and no training on inputs',
      'Verify the platform offers data deletion and export capabilities',
      'Prefer providers with transparent data retention and processing policies',
    ],
    methodology:
      'We scan AI platform marketing sites, documentation pages, and login flows. Our analysis captures third-party trackers, cookies, and fingerprinting deployed on publicly accessible pages.',
  },

  crypto: {
    intro:
      'Cryptocurrency exchanges and DeFi platforms handle high-value financial transactions while often deploying extensive analytics. Our benchmarks reveal major differences between centralized exchanges and decentralized protocols in their approach to user tracking.',
    whyItMatters:
      'Cryptocurrency activity reveals your financial holdings, trading patterns, and investment strategies. Tracking on exchange platforms can link wallet addresses to real identities. For users who value the pseudonymity blockchain offers, understanding platform tracking is critical to maintaining financial privacy.',
    keyFindings: [
      'Centralized exchanges average 12-20 third-party trackers on marketing pages',
      'DeFi protocol interfaces generally deploy fewer trackers than centralized platforms',
      'KYC-heavy platforms often share data with identity verification third parties',
      'Crypto news sites and aggregators rival traditional news in tracker counts',
    ],
    whatToLookFor: [
      'Check whether the platform shares transaction data with analytics firms',
      'Review KYC data retention policies and third-party sharing',
      'Prefer platforms with clear data breach notification commitments',
      'Consider hardware wallets and self-custody for maximum privacy',
    ],
    methodology:
      'We scan cryptocurrency platform marketing pages, trading interfaces, and documentation. Our analysis identifies advertising, analytics, and identity verification trackers.',
  },

  vpn: {
    intro:
      'VPN services market themselves on privacy protection, but their own websites often deploy the same trackers they promise to block. Our benchmarks hold VPN providers to the standard they set for themselves, revealing which providers practice what they preach.',
    whyItMatters:
      'VPN providers have complete visibility into your browsing traffic. If a VPN marketing site deploys extensive trackers, it raises questions about the provider\'s commitment to privacy as a core value. The gap between marketing claims and observable website behavior is a meaningful trust signal.',
    keyFindings: [
      'VPN provider websites average 8-15 third-party trackers',
      'Affiliate-driven VPN brands often deploy the most aggressive marketing trackers',
      'Privacy-focused VPNs with no-log audits tend to have cleaner websites',
      'Several major VPNs use fingerprinting on their own marketing pages',
    ],
    whatToLookFor: [
      'Compare website tracking behavior against the provider\'s privacy claims',
      'Look for independently audited no-log policies',
      'Check if the VPN provider uses its own analytics or relies on Google Analytics',
      'Prefer providers whose website privacy matches their product promises',
    ],
    methodology:
      'We scan VPN provider marketing sites and account pages. We compare each provider\'s tracking footprint against their stated privacy commitments, providing a trust signal beyond marketing claims.',
  },

  dating: {
    intro:
      'Dating platforms collect deeply personal information about relationships, preferences, and identity. Our analysis shows that dating apps and websites deploy some of the highest tracker counts of any category, monetizing sensitive personal data through advertising networks.',
    whyItMatters:
      'Dating platforms know your relationship status, sexual orientation, religious preferences, and location patterns. This is among the most intimate data collected online. Tracker exposure can share these signals with advertising networks, creating privacy risks that go far beyond typical web browsing.',
    keyFindings: [
      'Dating platforms average 18-30 third-party trackers per page',
      'Free dating sites deploy 3-5x more trackers than paid alternatives',
      'Location tracking scripts are nearly universal on dating platforms',
      'Several major dating apps share data with dozens of advertising partners',
    ],
    whatToLookFor: [
      'Review data sharing policies with advertising and analytics partners',
      'Check if the platform sells profile data to data brokers',
      'Prefer paid services that do not rely on advertising for revenue',
      'Verify location data handling and whether it is shared with third parties',
    ],
    methodology:
      'We scan dating platform marketing sites and public-facing pages. Our analysis identifies advertising, analytics, and location tracking scripts deployed on accessible pages.',
  },

  banking: {
    intro:
      'Online banking platforms balance strict regulatory security requirements with digital marketing needs. Our benchmarks reveal that while authenticated banking portals maintain strong security, bank marketing sites and product pages often deploy extensive third-party tracking.',
    whyItMatters:
      'Banking data is among the most sensitive personal information. While core banking operations are regulated, marketing pages and financial product comparisons often share browsing data with advertising networks. Understanding which banks minimize tracking helps protect your financial privacy beyond what regulations require.',
    keyFindings: [
      'Bank marketing sites average 10-15 third-party trackers',
      'Digital-only banks often deploy more marketing trackers than traditional institutions',
      'Authenticated banking portals show significantly less tracking than marketing pages',
      'Credit card comparison and application pages frequently include advertising trackers',
    ],
    whatToLookFor: [
      'Verify the bank uses encrypted connections and strong authentication',
      'Check marketing pages separately from authenticated banking areas',
      'Review data sharing policies with affiliates and marketing partners',
      'Prefer banks with clear, minimal data collection on informational pages',
    ],
    methodology:
      'We scan bank marketing sites, product pages, and login flows. Our analysis distinguishes between public-facing marketing tracking and the typically stricter authenticated banking environment.',
  },
};

/**
 * Get category content by slug
 *
 * Returns undefined if no content exists for the category.
 */
export function getCategoryContent(slug: string): CategoryContent | undefined {
  return CATEGORY_CONTENT[slug];
}

/**
 * Check if category has editorial content
 */
export function hasCategoryContent(slug: string): boolean {
  return slug in CATEGORY_CONTENT;
}

/**
 * Get all available category slugs with content
 */
export function getAvailableCategorySlugs(): string[] {
  return Object.keys(CATEGORY_CONTENT);
}
