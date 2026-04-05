/**
 * Tracker Classification Map
 *
 * Canonical source of truth for tracker purpose classification.
 * Used by the narrative engine to transform raw tracker counts
 * into interpreted privacy profiles.
 *
 * Purpose categories:
 * - advertising: Ad networks, retargeting, programmatic buying
 * - analytics: Site analytics, session recording, A/B testing
 * - social: Social media widgets, share buttons, embeds
 * - fingerprinting: Browser/device fingerprinting services
 * - functional: Essential services (CDN, hosting, CMS)
 * - unknown: Not classified — degrades gracefully
 *
 * Confidence levels:
 * - high: Single-purpose tracker, unambiguous classification
 * - medium: Mixed-use or dual-purpose (e.g., HubSpot does analytics + marketing)
 * - low: Fallback classification, may vary by deployment
 */

// ============================================================
// TYPES
// ============================================================

export type TrackerPurpose =
  | 'advertising'
  | 'analytics'
  | 'social'
  | 'fingerprinting'
  | 'functional'
  | 'unknown';

export type TrackerConfidence = 'high' | 'medium' | 'low';

export interface TrackerClassification {
  /** Canonical display name */
  name: string;
  /** Primary purpose category */
  purpose: TrackerPurpose;
  /** Classification confidence */
  confidence: TrackerConfidence;
  /** Privacy risk level derived from purpose */
  risk: 'high' | 'medium' | 'low' | 'none';
  /** Optional secondary purpose (for mixed-use trackers) */
  secondaryPurpose?: TrackerPurpose;
  /** Short description of what this tracker does */
  description: string;
}

export interface PurposeBreakdown {
  advertising: number;
  analytics: number;
  social: number;
  fingerprinting: number;
  functional: number;
  unknown: number;
}

export interface TrackerPurposeAnalysis {
  /** Count per purpose category */
  breakdown: PurposeBreakdown;
  /** The dominant purpose (highest count, excluding functional/unknown) */
  dominantPurpose: TrackerPurpose | null;
  /** Share of dominant purpose as decimal (0-1), excluding functional/unknown */
  dominantPurposeShare: number;
  /** Count of trackers with unknown classification */
  unknownCount: number;
  /** Whether the tracker stack is skewed toward one purpose */
  isSkewed: boolean;
  /** Human-readable summary of the stack composition */
  stackProfile: 'advertising-heavy' | 'analytics-heavy' | 'social-heavy' | 'mixed' | 'minimal' | 'functional-only';
  /** Per-tracker classifications (ordered by risk desc) */
  classified: Array<{ domain: string; classification: TrackerClassification }>;
}

// ============================================================
// CLASSIFICATION MAP
// ============================================================

const TRACKER_MAP: Record<string, TrackerClassification> = {
  // ─── ADVERTISING: Ad networks, retargeting, programmatic ───

  'doubleclick.net': {
    name: 'DoubleClick (Google)',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Google\'s ad serving and tracking platform for display advertising',
  },
  'googlesyndication.com': {
    name: 'Google AdSense',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Google\'s advertising network for publishers',
  },
  'googleadservices.com': {
    name: 'Google Ads',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Google\'s conversion tracking and remarketing service',
  },
  'googletag.com': {
    name: 'Google Publisher Tag',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Google ad tag management for publishers',
  },
  'googletagservices.com': {
    name: 'Google Tag Services',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Google ad tag delivery infrastructure',
  },
  'facebook.net': {
    name: 'Meta Pixel',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'analytics',
    description: 'Meta\'s conversion tracking and audience building pixel',
  },
  'connect.facebook.net': {
    name: 'Meta Pixel',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'analytics',
    description: 'Meta\'s conversion tracking and audience building pixel',
  },
  'amazon-adsystem.com': {
    name: 'Amazon Ads',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Amazon\'s advertising and product targeting platform',
  },
  'criteo.com': {
    name: 'Criteo',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Retargeting and personalized display advertising',
  },
  'criteo.net': {
    name: 'Criteo',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Retargeting and personalized display advertising',
  },
  'rubiconproject.com': {
    name: 'Magnite (Rubicon)',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Programmatic advertising exchange',
  },
  'adsrvr.org': {
    name: 'The Trade Desk',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Demand-side platform for programmatic ad buying',
  },
  'adnxs.com': {
    name: 'Xandr (AppNexus)',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Microsoft-owned programmatic advertising platform',
  },
  'pubmatic.com': {
    name: 'PubMatic',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Supply-side platform for programmatic advertising',
  },
  'casalemedia.com': {
    name: 'Index Exchange',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Ad exchange and header bidding platform',
  },
  'openx.net': {
    name: 'OpenX',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Programmatic advertising marketplace',
  },
  'outbrain.com': {
    name: 'Outbrain',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Content recommendation and native advertising',
  },
  'taboola.com': {
    name: 'Taboola',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Content discovery and native advertising platform',
  },
  'snap.com': {
    name: 'Snap Ads',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Snapchat advertising pixel and conversion tracking',
  },
  'ads-twitter.com': {
    name: 'X/Twitter Ads',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'X/Twitter advertising and conversion tracking',
  },
  'ads.linkedin.com': {
    name: 'LinkedIn Ads',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'LinkedIn advertising and conversion tracking',
  },
  'media.net': {
    name: 'Media.net',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Contextual advertising network (Yahoo/Bing)',
  },
  'moatads.com': {
    name: 'Moat (Oracle)',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'analytics',
    description: 'Ad viewability and attention measurement',
  },
  'demdex.net': {
    name: 'Adobe Audience Manager',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Adobe\'s data management platform for audience targeting',
  },
  'bidswitch.net': {
    name: 'BidSwitch',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Real-time bidding optimization platform',
  },
  'sharethrough.com': {
    name: 'Sharethrough',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Native advertising and programmatic exchange',
  },
  'smartadserver.com': {
    name: 'Smart AdServer',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Full-stack ad serving platform',
  },
  'adform.net': {
    name: 'Adform',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Programmatic advertising platform',
  },
  'advertising.com': {
    name: 'AOL Advertising',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Yahoo/AOL advertising network',
  },
  'contextweb.com': {
    name: 'PulsePoint',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Programmatic advertising and health marketing',
  },
  'lijit.com': {
    name: 'Sovrn',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Publisher advertising tools and exchange',
  },
  'mathtag.com': {
    name: 'MediaMath',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Demand-side platform for programmatic advertising',
  },
  'yieldmo.com': {
    name: 'Yieldmo',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Attention-based ad marketplace',
  },
  'teads.tv': {
    name: 'Teads',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Video and display advertising platform',
  },
  'triplelift.com': {
    name: 'TripleLift',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Native programmatic advertising exchange',
  },
  'liadm.com': {
    name: 'LiveIntent',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Email-based identity and advertising',
  },
  '33across.com': {
    name: '33Across',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Attention-based advertising platform',
  },
  'intentiq.com': {
    name: 'IntentIQ',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Identity resolution for advertising',
  },
  'rlcdn.com': {
    name: 'LiveRamp',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Data connectivity and identity resolution for ads',
  },
  'id5-sync.com': {
    name: 'ID5',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Universal ID solution for programmatic advertising',
  },
  'bluekai.com': {
    name: 'Oracle BlueKai',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Oracle data management platform for ad targeting',
  },
  'exelator.com': {
    name: 'Nielsen eXelate',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Audience data and targeting platform',
  },
  'everesttech.net': {
    name: 'Adobe Advertising Cloud',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Adobe\'s advertising management platform',
  },
  'dotomi.com': {
    name: 'Microsoft Advertising',
    purpose: 'advertising',
    confidence: 'high',
    risk: 'high',
    description: 'Microsoft advertising network',
  },

  // ─── ANALYTICS: Site analytics, session recording, A/B testing ───

  'google-analytics.com': {
    name: 'Google Analytics',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Web traffic measurement and visitor behavior analytics',
  },
  'googletagmanager.com': {
    name: 'Google Tag Manager',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Tag management system that can load analytics and ad trackers',
  },
  'hotjar.com': {
    name: 'Hotjar',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Heatmaps, session recordings, and behavior analytics',
  },
  'clarity.ms': {
    name: 'Microsoft Clarity',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Session replay and heatmap analytics by Microsoft',
  },
  'mixpanel.com': {
    name: 'Mixpanel',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Product analytics and user event tracking',
  },
  'amplitude.com': {
    name: 'Amplitude',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Product analytics and behavioral data platform',
  },
  'segment.io': {
    name: 'Segment',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Customer data platform that routes data to multiple services',
  },
  'segment.com': {
    name: 'Segment',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Customer data platform that routes data to multiple services',
  },
  'newrelic.com': {
    name: 'New Relic',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Application performance monitoring and observability',
  },
  'sentry.io': {
    name: 'Sentry',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Error tracking and performance monitoring',
  },
  'datadoghq.com': {
    name: 'Datadog',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Infrastructure monitoring and APM',
  },
  'scorecardresearch.com': {
    name: 'Comscore',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Cross-platform audience measurement',
  },
  'chartbeat.com': {
    name: 'Chartbeat',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Real-time content analytics for publishers',
  },
  'chartbeat.net': {
    name: 'Chartbeat',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Real-time content analytics for publishers',
  },
  'optimizely.com': {
    name: 'Optimizely',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'A/B testing and experimentation platform',
  },
  'quantserve.com': {
    name: 'Quantcast',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Audience measurement and real-time advertising',
  },
  'hubspot.com': {
    name: 'HubSpot',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Marketing automation, CRM, and analytics platform',
  },
  'hubspot.net': {
    name: 'HubSpot',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Marketing automation, CRM, and analytics platform',
  },
  'bing.com': {
    name: 'Microsoft Bing',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Bing webmaster tools and UET conversion tracking',
  },
  'intercom.io': {
    name: 'Intercom',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    description: 'Customer messaging and behavioral tracking',
  },
  'fullstory.com': {
    name: 'FullStory',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Digital experience analytics with session replay',
  },
  'mouseflow.com': {
    name: 'Mouseflow',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Session replay and behavioral analytics',
  },
  'crazyegg.com': {
    name: 'Crazy Egg',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Heatmaps and A/B testing tool',
  },
  'heap.io': {
    name: 'Heap',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Auto-capture product analytics',
  },
  'plausible.io': {
    name: 'Plausible',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Privacy-focused web analytics (no cookies)',
  },
  'matomo.cloud': {
    name: 'Matomo',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Open-source web analytics platform',
  },
  'nr-data.net': {
    name: 'New Relic',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'New Relic browser agent data collection',
  },
  'pendo.io': {
    name: 'Pendo',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Product analytics and user guidance platform',
  },
  'logrocket.com': {
    name: 'LogRocket',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Session replay and frontend monitoring',
  },
  'contentsquare.net': {
    name: 'Contentsquare',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Digital experience analytics platform',
  },
  'heapanalytics.com': {
    name: 'Heap',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Auto-capture product analytics',
  },
  'omtrdc.net': {
    name: 'Adobe Analytics',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'medium',
    description: 'Adobe\'s enterprise web analytics platform',
  },
  'adobedtm.com': {
    name: 'Adobe Launch',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Adobe tag management and data collection',
  },
  'pardot.com': {
    name: 'Pardot (Salesforce)',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'B2B marketing automation and lead scoring',
  },
  'marketo.net': {
    name: 'Marketo (Adobe)',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Marketing automation and lead management',
  },
  'marketo.com': {
    name: 'Marketo (Adobe)',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Marketing automation and lead management',
  },
  'tealiumiq.com': {
    name: 'Tealium',
    purpose: 'analytics',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Customer data platform and tag management',
  },
  'cookiebot.com': {
    name: 'Cookiebot',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Cookie consent management platform',
  },
  'onetrust.com': {
    name: 'OneTrust',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Privacy and consent management platform',
  },
  'cookielaw.org': {
    name: 'OneTrust (CookieLaw)',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Cookie consent and compliance management',
  },

  // ─── SOCIAL: Social media widgets, share buttons, embeds ───

  'facebook.com': {
    name: 'Facebook',
    purpose: 'social',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'advertising',
    description: 'Facebook social plugins, login, and engagement tracking',
  },
  'twitter.com': {
    name: 'X (Twitter)',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    description: 'Twitter/X embed widgets and share tracking',
  },
  'platform.twitter.com': {
    name: 'X (Twitter)',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    description: 'Twitter/X embed widgets and share tracking',
  },
  'tiktok.com': {
    name: 'TikTok',
    purpose: 'social',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'advertising',
    description: 'TikTok pixel, embeds, and behavioral tracking',
  },
  'linkedin.com': {
    name: 'LinkedIn',
    purpose: 'social',
    confidence: 'medium',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'LinkedIn Insight Tag and professional network tracking',
  },
  'pinterest.com': {
    name: 'Pinterest',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Pinterest tag and visual discovery tracking',
  },
  'snapchat.com': {
    name: 'Snapchat',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    description: 'Snapchat social embed and pixel',
  },
  'instagram.com': {
    name: 'Instagram',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    secondaryPurpose: 'advertising',
    description: 'Instagram embeds and Meta tracking',
  },
  'reddit.com': {
    name: 'Reddit',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    description: 'Reddit embeds and conversion pixel',
  },
  'addthis.com': {
    name: 'AddThis',
    purpose: 'social',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'advertising',
    description: 'Social sharing toolbar with cross-site tracking',
  },
  'sharethis.com': {
    name: 'ShareThis',
    purpose: 'social',
    confidence: 'high',
    risk: 'medium',
    description: 'Social sharing buttons with analytics',
  },
  'disqus.com': {
    name: 'Disqus',
    purpose: 'social',
    confidence: 'high',
    risk: 'high',
    secondaryPurpose: 'advertising',
    description: 'Comment system with embedded advertising and tracking',
  },

  // ─── FINGERPRINTING: Browser/device fingerprinting ───

  'fingerprintjs.com': {
    name: 'FingerprintJS',
    purpose: 'fingerprinting',
    confidence: 'high',
    risk: 'high',
    description: 'Browser fingerprinting for fraud detection and identification',
  },
  'fpjs.io': {
    name: 'FingerprintJS',
    purpose: 'fingerprinting',
    confidence: 'high',
    risk: 'high',
    description: 'Browser fingerprinting service',
  },
  'iovation.com': {
    name: 'TransUnion iovation',
    purpose: 'fingerprinting',
    confidence: 'high',
    risk: 'high',
    description: 'Device fingerprinting for fraud prevention',
  },
  'threatmetrix.com': {
    name: 'ThreatMetrix (LexisNexis)',
    purpose: 'fingerprinting',
    confidence: 'high',
    risk: 'high',
    description: 'Device fingerprinting and identity verification',
  },
  'perimeterx.net': {
    name: 'PerimeterX',
    purpose: 'fingerprinting',
    confidence: 'high',
    risk: 'high',
    description: 'Bot detection via browser fingerprinting',
  },

  // ─── FUNCTIONAL: CDN, hosting, essential services ───

  'google.com': {
    name: 'Google',
    purpose: 'functional',
    confidence: 'medium',
    risk: 'low',
    description: 'Google services (fonts, reCAPTCHA, APIs)',
  },
  'googleapis.com': {
    name: 'Google APIs',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Google API infrastructure (fonts, maps, etc.)',
  },
  'gstatic.com': {
    name: 'Google Static',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Google static content delivery',
  },
  'cloudflare.com': {
    name: 'Cloudflare',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'CDN, DDoS protection, and DNS',
  },
  'cloudflareinsights.com': {
    name: 'Cloudflare Analytics',
    purpose: 'analytics',
    confidence: 'high',
    risk: 'low',
    description: 'Privacy-focused server-side analytics by Cloudflare',
  },
  'amazonaws.com': {
    name: 'Amazon AWS',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Amazon Web Services cloud infrastructure',
  },
  'cloudfront.net': {
    name: 'Amazon CloudFront',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Amazon content delivery network',
  },
  'akamaihd.net': {
    name: 'Akamai',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Content delivery network',
  },
  'akamai.net': {
    name: 'Akamai',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Content delivery network',
  },
  'fastly.net': {
    name: 'Fastly',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Edge cloud and CDN platform',
  },
  'jsdelivr.net': {
    name: 'jsDelivr',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Open source CDN for npm and GitHub',
  },
  'cdnjs.cloudflare.com': {
    name: 'cdnjs',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Open source JavaScript library CDN',
  },
  'unpkg.com': {
    name: 'unpkg',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'CDN for npm packages',
  },
  'bootstrapcdn.com': {
    name: 'Bootstrap CDN',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'CDN for Bootstrap framework',
  },
  'jquery.com': {
    name: 'jQuery CDN',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'CDN for jQuery library',
  },
  'wp.com': {
    name: 'WordPress.com',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'WordPress hosting infrastructure',
  },
  'wordpress.com': {
    name: 'WordPress.com',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'WordPress hosting infrastructure',
  },
  'shopify.com': {
    name: 'Shopify',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'E-commerce platform infrastructure',
  },
  'squarespace.com': {
    name: 'Squarespace',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Website builder platform',
  },
  'hcaptcha.com': {
    name: 'hCaptcha',
    purpose: 'functional',
    confidence: 'high',
    risk: 'low',
    description: 'Bot detection and CAPTCHA service',
  },
  'recaptcha.net': {
    name: 'reCAPTCHA',
    purpose: 'functional',
    confidence: 'high',
    risk: 'low',
    description: 'Google bot detection service',
  },
  'googlefonts.com': {
    name: 'Google Fonts',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Google web font delivery',
  },
  'typekit.net': {
    name: 'Adobe Fonts',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Adobe web font delivery (formerly Typekit)',
  },
  'stripe.com': {
    name: 'Stripe',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Payment processing infrastructure',
  },
  'paypal.com': {
    name: 'PayPal',
    purpose: 'functional',
    confidence: 'high',
    risk: 'low',
    description: 'Payment processing platform',
  },
  'braintreegateway.com': {
    name: 'Braintree (PayPal)',
    purpose: 'functional',
    confidence: 'high',
    risk: 'none',
    description: 'Payment processing gateway',
  },
};

// ============================================================
// LOOKUP & CLASSIFICATION
// ============================================================

/**
 * Classify a tracker domain by its purpose.
 * Tries exact match first, then normalized alias match.
 * Returns 'unknown' classification for unrecognized trackers.
 */
export function classifyTracker(domain: string): TrackerClassification {
  // 1. Exact match
  const exact = TRACKER_MAP[domain];
  if (exact) return exact;

  // 2. Try without leading subdomain (e.g., "connect.facebook.net" → "facebook.net")
  const parts = domain.split('.');
  if (parts.length > 2) {
    const parent = parts.slice(1).join('.');
    const parentMatch = TRACKER_MAP[parent];
    if (parentMatch) return parentMatch;
  }

  // 3. Try eTLD+1 pattern for deeply nested subdomains
  if (parts.length > 3) {
    const tldPlus1 = parts.slice(-2).join('.');
    const tldMatch = TRACKER_MAP[tldPlus1];
    if (tldMatch) return tldMatch;
  }

  // 4. Heuristic fallback: infer purpose from domain name patterns
  const lowered = domain.toLowerCase();
  if (/\b(ads?|adserv|advert|banner|sponsor|promo)\b/.test(lowered)) {
    return {
      name: domain,
      purpose: 'advertising',
      confidence: 'low',
      risk: 'high',
      description: 'Unclassified advertising-related tracker',
    };
  }
  if (/\b(track|pixel|beacon|collect|telemetry|metric|stat)\b/.test(lowered)) {
    return {
      name: domain,
      purpose: 'analytics',
      confidence: 'low',
      risk: 'medium',
      description: 'Unclassified analytics-related tracker',
    };
  }

  // 5. Unknown — graceful degradation
  return {
    name: domain,
    purpose: 'unknown',
    confidence: 'low',
    risk: 'medium',
    description: 'Third-party service not yet classified',
  };
}

/**
 * Get the canonical display name for a tracker domain.
 */
export function getTrackerName(domain: string): string {
  return classifyTracker(domain).name;
}

/**
 * Get the purpose category for a tracker domain.
 */
export function getTrackerPurpose(domain: string): TrackerPurpose {
  return classifyTracker(domain).purpose;
}

// ============================================================
// PURPOSE ANALYSIS
// ============================================================

/**
 * Analyze a set of tracker domains and produce a purpose breakdown
 * with dominant purpose, stack profile, and per-tracker classifications.
 *
 * This is the primary input for the narrative differentiation layer.
 */
export function analyzeTrackerPurposes(
  trackerDomains: string[]
): TrackerPurposeAnalysis {
  if (trackerDomains.length === 0) {
    return {
      breakdown: { advertising: 0, analytics: 0, social: 0, fingerprinting: 0, functional: 0, unknown: 0 },
      dominantPurpose: null,
      dominantPurposeShare: 0,
      unknownCount: 0,
      isSkewed: false,
      stackProfile: 'minimal',
      classified: [],
    };
  }

  const breakdown: PurposeBreakdown = {
    advertising: 0,
    analytics: 0,
    social: 0,
    fingerprinting: 0,
    functional: 0,
    unknown: 0,
  };

  const classified: Array<{ domain: string; classification: TrackerClassification }> = [];

  for (const domain of trackerDomains) {
    const classification = classifyTracker(domain);
    breakdown[classification.purpose]++;
    classified.push({ domain, classification });
  }

  // Sort by risk (high first), then by purpose relevance
  const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
  classified.sort((a, b) => (riskOrder[a.classification.risk] ?? 2) - (riskOrder[b.classification.risk] ?? 2));

  // Compute dominant purpose (excluding functional and unknown — those aren't "tracking")
  const privacyRelevant = {
    advertising: breakdown.advertising,
    analytics: breakdown.analytics,
    social: breakdown.social,
    fingerprinting: breakdown.fingerprinting,
  };

  const privacyTotal = Object.values(privacyRelevant).reduce((a, b) => a + b, 0);

  let dominantPurpose: TrackerPurpose | null = null;
  let dominantCount = 0;

  for (const [purpose, count] of Object.entries(privacyRelevant)) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantPurpose = purpose as TrackerPurpose;
    }
  }

  const dominantPurposeShare = privacyTotal > 0 ? dominantCount / privacyTotal : 0;

  // A stack is "skewed" if dominant purpose accounts for >60% of privacy-relevant trackers
  const isSkewed = dominantPurposeShare > 0.6 && privacyTotal >= 2;

  // Determine stack profile
  let stackProfile: TrackerPurposeAnalysis['stackProfile'];
  if (trackerDomains.length === 0) {
    stackProfile = 'minimal';
  } else if (privacyTotal === 0) {
    stackProfile = 'functional-only';
  } else if (privacyTotal <= 1) {
    stackProfile = 'minimal';
  } else if (isSkewed && dominantPurpose === 'advertising') {
    stackProfile = 'advertising-heavy';
  } else if (isSkewed && dominantPurpose === 'analytics') {
    stackProfile = 'analytics-heavy';
  } else if (isSkewed && dominantPurpose === 'social') {
    stackProfile = 'social-heavy';
  } else {
    stackProfile = 'mixed';
  }

  return {
    breakdown,
    dominantPurpose: privacyTotal > 0 ? dominantPurpose : null,
    dominantPurposeShare: Math.round(dominantPurposeShare * 100) / 100,
    unknownCount: breakdown.unknown,
    isSkewed,
    stackProfile,
    classified,
  };
}

// ============================================================
// RISK SUMMARY HELPERS
// ============================================================

/**
 * Risk level mapping by purpose (aligns with v2.technologies.ts RISK_BY_CATEGORY).
 */
export function purposeToRisk(purpose: TrackerPurpose): 'high' | 'medium' | 'low' | 'none' {
  switch (purpose) {
    case 'advertising': return 'high';
    case 'fingerprinting': return 'high';
    case 'social': return 'medium';
    case 'analytics': return 'medium';
    case 'functional': return 'none';
    case 'unknown': return 'medium';
  }
}

/**
 * Human-readable purpose label (for UI display).
 */
export function purposeLabel(purpose: TrackerPurpose): string {
  switch (purpose) {
    case 'advertising': return 'Advertising & Retargeting';
    case 'analytics': return 'Analytics & Measurement';
    case 'social': return 'Social Media';
    case 'fingerprinting': return 'Fingerprinting';
    case 'functional': return 'Functional / CDN';
    case 'unknown': return 'Uncategorized';
  }
}

/**
 * Describe what a dominant purpose means for the user.
 * Used by the narrative engine to generate interpretive text.
 */
export function dominantPurposeInterpretation(
  purpose: TrackerPurpose,
  share: number
): string {
  const pct = Math.round(share * 100);
  switch (purpose) {
    case 'advertising':
      return `Advertising technologies account for ${pct}% of detected trackers, indicating heavy ad monetization or retargeting activity`;
    case 'analytics':
      return `Analytics tools account for ${pct}% of detected trackers, suggesting a measurement-focused tracking approach`;
    case 'social':
      return `Social media integrations account for ${pct}% of detected trackers, primarily for sharing and engagement features`;
    case 'fingerprinting':
      return `Fingerprinting technologies account for ${pct}% of detected trackers, which is unusually high and indicates aggressive device identification`;
    default:
      return `The tracker stack shows a mixed composition with no single purpose dominating`;
  }
}
