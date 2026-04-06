/**
 * Domain Narrative Generation Engine (Phase A - SEO Architecture)
 *
 * Transforms domain report data into 500-900 word search-intent narratives
 * with structural variation to avoid Google's programmatic content detection.
 *
 * Variation system:
 * - 8 section orderings (deterministic per domain)
 * - 4 intro structure variants
 * - 5+ sentence-level variants per section
 * - 8 conditional sections (appear only when data triggers them)
 *
 * Editorial rules:
 * - Describe data, never issue verdicts
 * - No "safe"/"unsafe"/"risky" language
 * - Always show sample sizes
 * - All sentences must be falsifiable from data
 */

// ============================================================
// TYPES
// ============================================================

export interface DomainData {
  name: string;
  displayName: string;
  privacyScore: number;
  trackerCount: number;
  cookieCount: number;
  scanCount: number;
  stabilityTier: string;
  trend: string;
  categoryName: string | null;
  trackerPercentile?: number;
  scorePercentile?: number;
  categoryRank?: number;
  globalRank?: number;
  hasRareTracker: boolean;
  rarestTracker: string | null;
  rarestTrackerDomainCount: number | null;
  firstPartyCookies?: number;
  thirdPartyCookies?: number;
  trackers: Array<{ name: string; globalDomainCount: number }>;
  // Enriched fields from narrative differentiation
  purposeAnalysis?: {
    breakdown: { advertising: number; analytics: number; social: number; fingerprinting: number; functional: number; unknown: number };
    dominantPurpose: string | null;
    dominantPurposeShare: number;
    stackProfile: string;
    isSkewed: boolean;
    unknownCount: number;
    classified: Array<{ domain: string; classification: { name: string; purpose: string; risk: string; description: string } }>;
  };
  cookiePersistence?: {
    sessionCount: number;
    shortLivedCount: number;
    mediumLivedCount: number;
    longLivedCount: number;
    maxDaysObserved: number;
    persistenceBand: string;
  };
  categoryQuartile?: string | null;
  scoreDeltaVsCategoryMedian?: number | null;
}

export interface CategoryStats {
  categoryName: string;
  avgPrivacyScore: number;
  medianPrivacyScore?: number;
  avgTrackerCount: number;
  avgCookieCount: number;
  totalDomains: number;
  topDomain: string;
  topScore: number;
  bottomDomain: string;
  bottomScore: number;
  zeroTrackerCount: number;
  topTrackers?: Array<{ name: string; count: number }>;
}

export interface GlobalStats {
  totalDomains: number;
  avgPrivacyScore: number;
  avgTrackerCount: number;
  avgCookieCount: number;
  totalFindings: number;
}

export interface ScanHistory {
  date: string;
  privacyScore: number;
  trackerCount: number;
  trackers?: string[];
}

export interface DomainSummary {
  domain: string;
  displayName: string;
  privacyScore: number;
  trackerCount: number;
  relationReason?: string;
}

export interface ComparisonLink {
  otherDomain: string;
  otherDisplayName: string;
}

export type SectionKey = 'trackers' | 'cookies' | 'comparison' | 'history' | 'profile';

export interface Verdict {
  headline: string;
  keyFindings: string[];
  interpretation: string;
}

export interface DomainNarrative {
  verdict: Verdict;
  intro: string;
  trackerSection: string;
  cookieSection: string;
  comparisonSection: string;
  historySection: string;
  profileInterpretation: string;
  aboutSection: string;
  rareTrackerSection?: string;
  recentChangesSection?: string;
  categoryRankSection?: string;
  trackerDistributionSection?: string;
  zeroTrackerSection?: string;
  highCookieSection?: string;
  scoreImproveSection?: string;
  scoreDeclineSection?: string;
  freshnessSignal: {
    lastScanned: string;
    previousScan: string | null;
    scanCount: number;
    changesDetected: boolean;
    trackersAdded: string[];
    trackersRemoved: string[];
    scoreChange: { old: number; new: number } | null;
  };
  sectionOrder: SectionKey[];
  totalWordCount: number;
}

// ============================================================
// HELPERS
// ============================================================

function hashDomainToIndex(domain: string, poolSize: number): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) - hash) + domain.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % poolSize;
}

function pickVariant<T>(domain: string, pool: T[]): T {
  return pool[hashDomainToIndex(domain, pool.length)];
}

export function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return 'unknown date';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'unknown date';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ============================================================
// DISPLAY NAME
// ============================================================

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'twitter.com': 'Twitter',
  'x.com': 'X',
  'reddit.com': 'Reddit',
  'tiktok.com': 'TikTok',
  'youtube.com': 'YouTube',
  'google.com': 'Google',
  'bing.com': 'Bing',
  'yahoo.com': 'Yahoo',
  'amazon.com': 'Amazon',
  'ebay.com': 'eBay',
  'walmart.com': 'Walmart',
  'netflix.com': 'Netflix',
  'spotify.com': 'Spotify',
  'apple.com': 'Apple',
  'microsoft.com': 'Microsoft',
  'linkedin.com': 'LinkedIn',
  'whatsapp.com': 'WhatsApp',
  'telegram.org': 'Telegram',
  'signal.org': 'Signal',
  'discord.com': 'Discord',
  'slack.com': 'Slack',
  'openai.com': 'OpenAI',
  'chatgpt.com': 'ChatGPT',
  'anthropic.com': 'Anthropic',
  'github.com': 'GitHub',
  'stackoverflow.com': 'Stack Overflow',
  'wikipedia.org': 'Wikipedia',
  'pinterest.com': 'Pinterest',
  'snapchat.com': 'Snapchat',
  'twitch.tv': 'Twitch',
  'duckduckgo.com': 'DuckDuckGo',
  'proton.me': 'Proton',
  'nordvpn.com': 'NordVPN',
  'expressvpn.com': 'ExpressVPN',
  'coinbase.com': 'Coinbase',
  'binance.com': 'Binance',
  'paypal.com': 'PayPal',
  'stripe.com': 'Stripe',
  'shopify.com': 'Shopify',
  'etsy.com': 'Etsy',
  'airbnb.com': 'Airbnb',
  'uber.com': 'Uber',
  'zoom.us': 'Zoom',
  'dropbox.com': 'Dropbox',
  'notion.so': 'Notion',
  'figma.com': 'Figma',
  'canva.com': 'Canva',
  'cloudflare.com': 'Cloudflare',
  'hulu.com': 'Hulu',
  'disneyplus.com': 'Disney+',
  'threads.net': 'Threads',
  'bluesky.social': 'Bluesky',
  'mastodon.social': 'Mastodon',
  'brave.com': 'Brave',
  'vivaldi.com': 'Vivaldi',
  'mozilla.org': 'Mozilla',
  'temu.com': 'Temu',
  'shein.com': 'Shein',
  'aliexpress.com': 'AliExpress',
  'wish.com': 'Wish',
  'target.com': 'Target',
  'bestbuy.com': 'Best Buy',
  'cnn.com': 'CNN',
  'bbc.com': 'BBC',
  'nytimes.com': 'New York Times',
  'washingtonpost.com': 'Washington Post',
  'reuters.com': 'Reuters',
  'foxnews.com': 'Fox News',
  'chase.com': 'Chase',
  'bankofamerica.com': 'Bank of America',
  'wellsfargo.com': 'Wells Fargo',
  'tinder.com': 'Tinder',
  'bumble.com': 'Bumble',
  'match.com': 'Match',
  'roblox.com': 'Roblox',
  'epicgames.com': 'Epic Games',
  'ea.com': 'EA',
  'steam.com': 'Steam',
  'steampowered.com': 'Steam',
  'midjourney.com': 'Midjourney',
  'perplexity.ai': 'Perplexity',
};

export function getDomainDisplayName(domain: string): string {
  if (DISPLAY_NAME_OVERRIDES[domain]) return DISPLAY_NAME_OVERRIDES[domain];
  const base = domain.replace(/\.(com|org|net|io|co|ai|app|me|dev|xyz|tv|gg|us|social)$/i, '');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// ============================================================
// VARIATION POOLS
// ============================================================

const TRACKER_INTRO_VARIANTS = [
  (d: string, n: number) => `${d} loads ${n} detected third-party trackers.`,
  (d: string, n: number) => `${n} third-party trackers were detected on ${d}.`,
  (d: string, n: number) => `Our scan detected ${n} third-party trackers on ${d}.`,
  (d: string, n: number) => `${d} includes ${n} third-party tracking technologies.`,
  (d: string, n: number) => `A total of ${n} third-party trackers were identified on ${d}.`,
];

const COOKIE_INTRO_VARIANTS = [
  (d: string, n: number) => `${d} sets ${n} cookies.`,
  (d: string, n: number) => `${n} cookies were detected on ${d}.`,
  (d: string, n: number) => `Our scan identified ${n} cookies on ${d}.`,
  (d: string, n: number) => `${d} uses ${n} cookies based on our most recent scan.`,
];

const SCAN_INTRO_VARIANTS = [
  (d: string, n: number, first: string, last: string) =>
    `${d} has been scanned ${n} times between ${first} and ${last}.`,
  (d: string, n: number, first: string, last: string) =>
    `GeckoAdvisor has scanned ${d} ${n} times, from ${first} to ${last}.`,
  (d: string, n: number, first: string, last: string) =>
    `Over the period from ${first} to ${last}, ${d} was scanned ${n} times.`,
  (d: string, n: number, first: string, last: string) =>
    `${d} has ${n} scans on record, spanning ${first} to ${last}.`,
];

const STABILITY_VOLATILE_VARIANTS = [
  (_d: string) => `Privacy configuration has changed across scans.`,
  (d: string) => `The privacy configuration of ${d} has varied between scans.`,
  (d: string) => `${d} has shown configuration changes across its scan history.`,
];

const STABILITY_STABLE_VARIANTS = [
  (_d: string) => `Privacy configuration has been consistent across scans.`,
  (d: string) => `${d} has maintained a consistent privacy configuration across scans.`,
  (d: string) => `The privacy setup of ${d} has remained steady across its scan history.`,
];

// ============================================================
// SECTION ORDERINGS
// ============================================================

const SECTION_ORDERINGS: SectionKey[][] = [
  ['trackers', 'cookies', 'comparison', 'history', 'profile'],
  ['comparison', 'trackers', 'cookies', 'history', 'profile'],
  ['trackers', 'history', 'cookies', 'comparison', 'profile'],
  ['history', 'trackers', 'comparison', 'cookies', 'profile'],
  ['trackers', 'comparison', 'history', 'cookies', 'profile'],
  ['trackers', 'comparison', 'history', 'cookies', 'profile'],
  ['cookies', 'trackers', 'comparison', 'profile', 'history'],
  ['comparison', 'history', 'trackers', 'cookies', 'profile'],
];

function getSectionOrder(domain: string): SectionKey[] {
  return pickVariant(domain, SECTION_ORDERINGS);
}

// ============================================================
// INTRO STRUCTURE VARIANTS
// ============================================================

type IntroGenerator = (
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats,
  scanHistory: ScanHistory[]
) => string;

const INTRO_STRUCTURE_VARIANTS: IntroGenerator[] = [
  // Type A: Scan-first
  (domain, catStats, globalStats, history) => {
    const n = history.length;
    let text = pickVariant(domain.name, SCAN_INTRO_VARIANTS)(
      domain.displayName, n,
      formatDate(history[history.length - 1]?.date),
      formatDate(history[0]?.date)
    );
    text += ` It currently has a privacy score of ${domain.privacyScore} out of 100 and loads ${domain.trackerCount} detected third-party trackers.`;
    if (catStats) text += ` The average privacy score for ${catStats.categoryName} sites in our dataset is ${catStats.avgPrivacyScore.toFixed(1)}.`;
    if (domain.globalRank) text += ` By privacy score, ${domain.displayName} ranks ${domain.globalRank.toLocaleString()} out of ${globalStats.totalDomains.toLocaleString()} domains in the dataset.`;
    return text;
  },
  // Type B: Category-rank-first
  (domain, catStats, _globalStats, history) => {
    let text = '';
    if (catStats && domain.categoryRank) {
      text = `Among ${catStats.totalDomains} ${catStats.categoryName} sites in our dataset, ${domain.displayName} ranks ${domain.categoryRank} by privacy score.`;
    } else {
      text = `${domain.displayName} has a privacy score of ${domain.privacyScore} out of 100.`;
    }
    text += ` It loads ${domain.trackerCount} third-party trackers and sets ${domain.cookieCount} cookies.`;
    text += ` GeckoAdvisor has scanned ${domain.displayName} ${history.length} times.`;
    return text;
  },
  // Type C: History-first
  (domain, catStats, _globalStats, history) => {
    const n = history.length;
    const oldest = history[history.length - 1];
    const newest = history[0];
    let text = `Across ${n} scans between ${formatDate(oldest?.date)} and ${formatDate(newest?.date)}, ${domain.displayName}'s tracker count has `;
    const counts = history.map(s => s.trackerCount);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    text += min === max ? `remained at ${min}.` : `ranged from ${min} to ${max}.`;
    text += ` ${domain.displayName} currently has a privacy score of ${domain.privacyScore} out of 100.`;
    if (catStats) text += ` The ${catStats.categoryName} average is ${catStats.avgPrivacyScore.toFixed(1)}.`;
    return text;
  },
  // Type D: Score-first
  (domain, catStats, globalStats, history) => {
    let text = `${domain.displayName} has a privacy score of ${domain.privacyScore} out of 100, based on ${history.length} scans.`;
    text += ` The global average across ${globalStats.totalDomains.toLocaleString()} domains is ${globalStats.avgPrivacyScore.toFixed(1)}.`;
    text += ` ${domain.displayName} loads ${domain.trackerCount} third-party trackers.`;
    if (catStats) text += ` The average for ${catStats.categoryName} sites is ${catStats.avgTrackerCount.toFixed(1)} trackers.`;
    return text;
  },
];

// ============================================================
// TITLE GENERATION
// ============================================================

// ============================================================
// TITLE GENERATION — Score + key insight in every title
// ============================================================

type TitleGenerator = (d: DomainData) => string;

function getScoreInsight(d: DomainData): string {
  const pa = d.purposeAnalysis;
  if (d.trackerCount === 0) return 'No Trackers';
  if (pa?.isSkewed && pa.dominantPurpose === 'advertising') return 'Ad-Heavy';
  if (pa?.isSkewed && pa.dominantPurpose === 'analytics') return 'Analytics-Heavy';
  if (d.trackerCount > 10) return `${d.trackerCount} Trackers`;
  return `${d.trackerCount} Tracker${d.trackerCount > 1 ? 's' : ''}`;
}

const TITLE_GENERATORS: TitleGenerator[] = [
  (d) => `${d.displayName} Privacy Score: ${d.privacyScore}/100 (${getScoreInsight(d)})`,
  (d) => `${d.displayName}: ${d.privacyScore}/100 Privacy Score — ${getScoreInsight(d)}`,
  (d) => `${d.displayName} Privacy Report: ${d.privacyScore}/100, ${getScoreInsight(d)}`,
  (d) => `${d.displayName} Tracking Report: Score ${d.privacyScore}/100 (${getScoreInsight(d)})`,
  (d) => `How Private Is ${d.displayName}? Score ${d.privacyScore}/100, ${getScoreInsight(d)}`,
  (d) => `${d.displayName} Privacy Check: ${d.privacyScore}/100 — ${getScoreInsight(d)}`,
];

export function generateDomainTitle(domain: DomainData): string {
  const generator = pickVariant(domain.name, TITLE_GENERATORS);
  return generator(domain);
}

export function generateDomainDescription(
  domain: DomainData,
  categoryStats: CategoryStats | null
): string {
  // Lead with the key insight, not just counts
  const pa = domain.purposeAnalysis;
  let desc = `${domain.displayName} privacy score: ${domain.privacyScore}/100.`;

  if (domain.trackerCount === 0) {
    desc += ' No third-party trackers detected.';
  } else if (pa?.isSkewed && pa.dominantPurpose === 'advertising') {
    desc += ` ${domain.trackerCount} trackers detected, mostly advertising.`;
  } else if (pa?.isSkewed && pa.dominantPurpose === 'analytics') {
    desc += ` ${domain.trackerCount} trackers detected, mostly analytics.`;
  } else {
    desc += ` ${domain.trackerCount} third-party trackers detected.`;
  }

  if (categoryStats) {
    const median = categoryStats.medianPrivacyScore ?? categoryStats.avgPrivacyScore;
    const delta = domain.privacyScore - median;
    if (delta > 5) {
      desc += ` Above the ${categoryStats.categoryName} median.`;
    } else if (delta < -5) {
      desc += ` Below the ${categoryStats.categoryName} median.`;
    }
  }

  // Truncate to 155 chars
  if (desc.length > 155) {
    desc = desc.substring(0, 152) + '...';
  }
  return desc;
}

// ============================================================
// H2 SECTION TITLE GENERATION
// ============================================================

export function getTrackerSectionTitle(domain: DomainData): string {
  return `How Many Trackers Does ${domain.displayName} Use?`;
}

export function getCookieSectionTitle(domain: DomainData): string {
  return `${domain.displayName} Cookie Analysis`;
}

export function getComparisonSectionTitle(domain: DomainData): string {
  return domain.categoryName
    ? `${domain.displayName} vs Other ${domain.categoryName} Sites`
    : `${domain.displayName} Compared to Other Sites`;
}

export function getHistorySectionTitle(domain: DomainData): string {
  return `${domain.displayName} Privacy History`;
}

export function getProfileSectionTitle(domain: DomainData): string {
  return `What ${domain.displayName}'s Privacy Profile Means`;
}

// ============================================================
// SUB-GENERATORS
// ============================================================

function generateIntro(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats,
  scanHistory: ScanHistory[]
): string {
  const generator = pickVariant(domain.name, INTRO_STRUCTURE_VARIANTS);
  let text = generator(domain, categoryStats, globalStats, scanHistory);
  text += ` This report covers ${domain.displayName}'s tracker usage, cookie behavior, privacy history, and how it compares to other`;
  if (categoryStats) text += ` ${categoryStats.categoryName}`;
  text += ` sites.`;
  return text;
}

function generateTrackerNarrative(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats
): string {
  let text = pickVariant(domain.name, TRACKER_INTRO_VARIANTS)(domain.displayName, domain.trackerCount);

  // Relative context with category comparison
  if (categoryStats) {
    const diff = domain.trackerCount - categoryStats.avgTrackerCount;
    if (diff > 3) {
      text += ` This is ${Math.round(diff)} more than the ${categoryStats.categoryName} average of ${categoryStats.avgTrackerCount.toFixed(1)}.`;
    } else if (diff < -3) {
      text += ` This is ${Math.abs(Math.round(diff))} fewer than the ${categoryStats.categoryName} average of ${categoryStats.avgTrackerCount.toFixed(1)}.`;
    } else {
      text += ` This is close to the ${categoryStats.categoryName} average of ${categoryStats.avgTrackerCount.toFixed(1)}.`;
    }
  }

  // Purpose composition — the key differentiator
  const pa = domain.purposeAnalysis;
  if (pa && domain.trackerCount > 0) {
    const parts: string[] = [];
    if (pa.breakdown.advertising > 0) parts.push(`${pa.breakdown.advertising} advertising`);
    if (pa.breakdown.analytics > 0) parts.push(`${pa.breakdown.analytics} analytics`);
    if (pa.breakdown.social > 0) parts.push(`${pa.breakdown.social} social media`);
    if (pa.breakdown.fingerprinting > 0) parts.push(`${pa.breakdown.fingerprinting} fingerprinting`);
    if (pa.breakdown.functional > 0) parts.push(`${pa.breakdown.functional} functional`);
    if (pa.breakdown.unknown > 0) parts.push(`${pa.breakdown.unknown} uncategorized`);

    if (parts.length > 0) {
      text += ` By purpose: ${parts.join(', ')}.`;
    }

    // Interpret dominant purpose
    if (pa.isSkewed && pa.dominantPurpose === 'advertising') {
      text += ` The tracker stack is advertising-heavy, primarily serving retargeting and programmatic ad networks.`;
    } else if (pa.isSkewed && pa.dominantPurpose === 'analytics') {
      text += ` The tracker stack is analytics-focused, with most tools measuring on-site behavior rather than cross-site tracking.`;
    } else if (pa.stackProfile === 'mixed') {
      text += ` The tracker stack spans multiple purposes, combining analytics, advertising, and content delivery.`;
    }

    // Name high-risk trackers specifically
    const highRisk = pa.classified.filter(c => c.classification.risk === 'high').slice(0, 5);
    if (highRisk.length > 0) {
      const names = highRisk.map(t => `${t.classification.name} (${t.classification.purpose})`);
      text += ` Notable high-risk trackers: ${names.join(', ')}.`;
    }
  } else if (domain.trackerCount === 0) {
    text += ` No third-party trackers were detected during the most recent scan.`;
    if (categoryStats) {
      const pct = ((categoryStats.zeroTrackerCount / categoryStats.totalDomains) * 100).toFixed(0);
      text += ` Only ${pct}% of ${categoryStats.categoryName} sites share this zero-tracker profile.`;
    }
  }

  if (domain.hasRareTracker && domain.rarestTracker) {
    text += ` One unusual detection: ${domain.rarestTracker}, found on only ${domain.rarestTrackerDomainCount?.toLocaleString()} other domains in the dataset.`;
  }

  return text;
}

function generateCookieNarrative(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats
): string {
  let text = pickVariant(domain.name, COOKIE_INTRO_VARIANTS)(domain.displayName, domain.cookieCount);

  if (categoryStats) {
    const diff = domain.cookieCount - categoryStats.avgCookieCount;
    if (diff > 5) {
      text += ` This is notably above the ${categoryStats.categoryName} average of ${categoryStats.avgCookieCount.toFixed(1)}.`;
    } else if (diff < -5) {
      text += ` This is below the ${categoryStats.categoryName} average of ${categoryStats.avgCookieCount.toFixed(1)}.`;
    } else {
      text += ` This is close to the ${categoryStats.categoryName} average of ${categoryStats.avgCookieCount.toFixed(1)}.`;
    }
  }

  // Cookie persistence — the differentiator
  const cp = domain.cookiePersistence;
  if (cp) {
    if (cp.persistenceBand === 'long-lived') {
      text += ` Most cookies are long-lived (persisting over 30 days), which enables cross-session visitor identification.`;
      if (cp.maxDaysObserved > 0) {
        text += ` The longest cookie observed persists for ${cp.maxDaysObserved} days.`;
      }
    } else if (cp.persistenceBand === 'session-only') {
      text += ` All cookies are session-based — they expire when the browser closes and do not persist between visits.`;
    } else if (cp.persistenceBand === 'short-lived') {
      text += ` Most cookies are short-lived (under 24 hours), limiting persistent tracking ability.`;
    } else {
      // mixed
      const parts: string[] = [];
      if (cp.sessionCount > 0) parts.push(`${cp.sessionCount} session`);
      if (cp.shortLivedCount > 0) parts.push(`${cp.shortLivedCount} short-lived`);
      if (cp.mediumLivedCount > 0) parts.push(`${cp.mediumLivedCount} medium-lived`);
      if (cp.longLivedCount > 0) parts.push(`${cp.longLivedCount} long-lived`);
      if (parts.length > 1) {
        text += ` Cookie persistence is mixed: ${parts.join(', ')}.`;
      }
    }
  }

  return text;
}

function generateComparisonNarrative(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  _relatedDomains: DomainSummary[],
  comparisonPages: ComparisonLink[]
): string {
  let text = '';

  if (categoryStats && domain.categoryRank) {
    // Quartile framing instead of raw rank
    const quartileLabels: Record<string, string> = {
      top: 'in the top quartile',
      upper: 'in the upper half',
      lower: 'in the lower half',
      bottom: 'in the bottom quartile',
    };
    const quartileLabel = domain.categoryQuartile
      ? quartileLabels[domain.categoryQuartile] || ''
      : '';

    text += `Among ${categoryStats.totalDomains} ${categoryStats.categoryName} sites, ${domain.displayName} ranks ${domain.categoryRank} by privacy score`;
    if (quartileLabel) text += ` (${quartileLabel})`;
    text += '.';

    // Use median for comparison when available
    const median = categoryStats.medianPrivacyScore ?? categoryStats.avgPrivacyScore;
    const delta = domain.privacyScore - median;
    if (Math.abs(delta) > 5) {
      text += ` Its score of ${domain.privacyScore} is ${Math.abs(Math.round(delta))} points ${delta > 0 ? 'above' : 'below'} the category median of ${Math.round(median)}.`;
    }

    text += ` The top-scoring site is ${categoryStats.topDomain} (${categoryStats.topScore}), the lowest is ${categoryStats.bottomDomain} (${categoryStats.bottomScore}).`;
  } else {
    text += `${domain.displayName} has a privacy score of ${domain.privacyScore} out of 100.`;
  }

  if (comparisonPages.length > 0) {
    text += ` Head-to-head comparisons:`;
    for (const comp of comparisonPages.slice(0, 3)) {
      text += ` ${domain.displayName} vs ${comp.otherDisplayName}.`;
    }
  }

  return text;
}

function generateHistoryNarrative(
  domain: DomainData,
  scanHistory: ScanHistory[]
): string {
  const scanCount = scanHistory.length;
  let text = `${domain.displayName} has been scanned ${scanCount} times.`;
  text += ` Its stability classification is ${domain.stabilityTier}, based on observed configuration changes across scans.`;

  if (scanCount >= 3) {
    const scores = scanHistory.map(s => s.privacyScore);
    const trackerCounts = scanHistory.map(s => s.trackerCount);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const minTrackers = Math.min(...trackerCounts);
    const maxTrackers = Math.max(...trackerCounts);

    if (domain.trend === 'VOLATILE' || domain.stabilityTier === 'VOLATILE') {
      text += ` ${pickVariant(domain.name, STABILITY_VOLATILE_VARIANTS)(domain.displayName)}`;
      text += ` The tracker count has ranged from ${minTrackers} to ${maxTrackers}. The privacy score has ranged from ${minScore} to ${maxScore}.`;
    } else {
      text += ` ${pickVariant(domain.name, STABILITY_STABLE_VARIANTS)(domain.displayName)}`;
      text += ` The tracker count has remained between ${minTrackers} and ${maxTrackers}. The privacy score has stayed within ${minScore} to ${maxScore}.`;
    }

    const oldestScore = scores[scores.length - 1];
    const newestScore = scores[0];
    if (newestScore > oldestScore) {
      text += ` The privacy score has increased from ${oldestScore} to ${newestScore} over the scan period.`;
    } else if (newestScore < oldestScore) {
      text += ` The privacy score has decreased from ${oldestScore} to ${newestScore} over the scan period.`;
    }
  }

  return text;
}

// ============================================================
// VERDICT GENERATOR (above-the-fold insight)
// ============================================================

function generateVerdict(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats
): Verdict {
  const findings: string[] = [];
  let headline = '';

  // ── Headline: one sentence that captures what's unusual ──
  if (categoryStats) {
    const ratio = categoryStats.avgTrackerCount > 0
      ? domain.trackerCount / categoryStats.avgTrackerCount
      : 0;

    if (domain.trackerCount === 0) {
      headline = `No third-party trackers detected — uncommon for ${categoryStats.categoryName} sites`;
    } else if (ratio >= 2.5) {
      headline = `Significantly higher tracker load than most ${categoryStats.categoryName} sites`;
    } else if (ratio >= 1.5) {
      headline = `Above-average tracker presence for ${categoryStats.categoryName} sites`;
    } else if (ratio <= 0.5 && domain.trackerCount > 0) {
      headline = `Lower tracker footprint than most ${categoryStats.categoryName} sites`;
    } else {
      headline = `Typical tracking profile for ${categoryStats.categoryName} sites`;
    }
  } else {
    if (domain.trackerCount === 0) {
      headline = 'No third-party trackers detected';
    } else if (domain.trackerCount > globalStats.avgTrackerCount * 2) {
      headline = 'Above-average third-party tracker presence';
    } else {
      headline = `${domain.trackerCount} third-party trackers detected`;
    }
  }

  // ── Key findings (3-5 bullets) ──

  // Finding 1: Tracker count vs category
  if (categoryStats && categoryStats.avgTrackerCount > 0) {
    const ratio = domain.trackerCount / categoryStats.avgTrackerCount;
    if (ratio >= 2) {
      findings.push(`${domain.trackerCount} third-party trackers — ${ratio.toFixed(1)}× the ${categoryStats.categoryName} average`);
    } else if (ratio <= 0.5 && domain.trackerCount > 0) {
      findings.push(`Only ${domain.trackerCount} trackers — well below the ${categoryStats.categoryName} average of ${categoryStats.avgTrackerCount.toFixed(1)}`);
    } else {
      findings.push(`${domain.trackerCount} third-party trackers detected (${categoryStats.categoryName} average: ${categoryStats.avgTrackerCount.toFixed(1)})`);
    }
  } else {
    findings.push(`${domain.trackerCount} third-party trackers detected (global average: ${globalStats.avgTrackerCount.toFixed(1)})`);
  }

  // Finding 2: Purpose composition (if available)
  const pa = domain.purposeAnalysis;
  if (pa && pa.dominantPurpose && pa.isSkewed) {
    const pctLabel = Math.round(pa.dominantPurposeShare * 100);
    const purposeLabels: Record<string, string> = {
      advertising: 'advertising',
      analytics: 'analytics',
      social: 'social media',
      fingerprinting: 'fingerprinting',
    };
    const label = purposeLabels[pa.dominantPurpose] || pa.dominantPurpose;
    findings.push(`Tracker stack dominated by ${label} technologies (${pctLabel}% of detected trackers)`);
  } else if (pa && pa.stackProfile === 'mixed' && domain.trackerCount >= 3) {
    findings.push('Mixed tracker stack spanning advertising, analytics, and social purposes');
  } else if (pa && pa.stackProfile === 'functional-only') {
    findings.push('All detected third-party resources are functional (CDN, hosting) — no tracking-purpose technologies');
  }

  // Finding 3: Cookie persistence (if available)
  const cp = domain.cookiePersistence;
  if (cp) {
    if (cp.persistenceBand === 'long-lived') {
      findings.push(`Long-lived cookies detected (up to ${cp.maxDaysObserved} days) — indicates cross-session tracking`);
    } else if (cp.persistenceBand === 'session-only') {
      findings.push('Cookies are session-only — no persistent cross-visit tracking detected');
    } else if (cp.longLivedCount > 0) {
      findings.push(`${cp.longLivedCount} long-lived cookie${cp.longLivedCount > 1 ? 's' : ''} detected alongside ${cp.sessionCount + cp.shortLivedCount} short-lived/session cookies`);
    }
  }

  // Finding 4: Category ranking
  if (domain.categoryQuartile && categoryStats) {
    const quartileLabels: Record<string, string> = {
      top: 'top quartile',
      upper: 'upper half',
      lower: 'lower half',
      bottom: 'bottom quartile',
    };
    const label = quartileLabels[domain.categoryQuartile] || domain.categoryQuartile;
    findings.push(`Privacy score ranks in the ${label} of ${categoryStats.categoryName} sites`);
  }

  // ── Interpretation ──
  let interpretation = '';
  if (pa && pa.isSkewed && pa.dominantPurpose === 'advertising') {
    interpretation = `${domain.displayName}'s privacy profile is driven primarily by advertising and retargeting technologies. `;
    interpretation += 'Users visiting this site should expect their browsing behavior to be tracked for ad targeting across multiple networks.';
  } else if (pa && pa.isSkewed && pa.dominantPurpose === 'analytics') {
    interpretation = `${domain.displayName} primarily uses analytics and measurement tools. `;
    interpretation += 'While these track user behavior on-site, they are generally lower risk than advertising trackers that share data across sites.';
  } else if (domain.trackerCount === 0) {
    interpretation = `${domain.displayName} operates with no detected third-party trackers, indicating a minimal data-sharing footprint.`;
  } else {
    interpretation = `${domain.displayName} uses a mix of third-party technologies for analytics, advertising, and content delivery. `;
    if (categoryStats) {
      const median = categoryStats.medianPrivacyScore ?? categoryStats.avgPrivacyScore;
      if (domain.privacyScore < median - 10) {
        interpretation += `Its privacy score is notably below the ${categoryStats.categoryName} median, suggesting heavier third-party instrumentation than peers.`;
      } else if (domain.privacyScore > median + 10) {
        interpretation += `Its privacy score is above the ${categoryStats.categoryName} median, indicating lighter third-party instrumentation than peers.`;
      } else {
        interpretation += `Its privacy profile is comparable to the typical ${categoryStats.categoryName} site.`;
      }
    }
  }

  return { headline, keyFindings: findings, interpretation };
}

// ============================================================
// PROFILE INTERPRETATION (replaces "Is X Safe?")
// ============================================================

function generateProfileInterpretation(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats,
  scanHistory: ScanHistory[]
): string {
  let text = '';

  // Score context with quartile framing
  if (categoryStats && domain.categoryQuartile) {
    const median = categoryStats.medianPrivacyScore ?? categoryStats.avgPrivacyScore;
    const delta = domain.privacyScore - median;
    const direction = delta > 0 ? 'above' : 'below';
    text += `${domain.displayName}'s privacy score of ${domain.privacyScore} places it ${Math.abs(Math.round(delta))} points ${direction} the ${categoryStats.categoryName} median of ${Math.round(median)}.`;
  } else {
    text += `${domain.displayName} has a privacy score of ${domain.privacyScore} out of 100.`;
    text += ` The global average across ${globalStats.totalDomains.toLocaleString()} domains is ${globalStats.avgPrivacyScore.toFixed(1)}.`;
  }

  // Purpose-driven interpretation
  const pa = domain.purposeAnalysis;
  if (pa && pa.isSkewed && pa.dominantPurpose === 'advertising') {
    text += ` The majority of its tracker stack consists of advertising technologies, which share user data across ad networks for retargeting.`;
    text += ` Privacy-conscious users should be aware of cross-site tracking on this domain.`;
  } else if (pa && pa.isSkewed && pa.dominantPurpose === 'analytics') {
    text += ` Its tracker stack is primarily analytics-focused, which typically involves on-site behavior measurement rather than cross-site tracking.`;
  } else if (pa && pa.stackProfile === 'mixed') {
    text += ` The third-party stack spans multiple purposes including analytics, advertising, and social integrations.`;
  }

  // Cookie persistence interpretation
  const cp = domain.cookiePersistence;
  if (cp && cp.persistenceBand === 'long-lived') {
    text += ` Cookie persistence is notably high, with cookies lasting up to ${cp.maxDaysObserved} days, enabling long-term visitor identification.`;
  } else if (cp && cp.persistenceBand === 'session-only') {
    text += ` Cookies are session-based and do not persist between visits.`;
  }

  // Stability context
  if (scanHistory.length >= 3) {
    text += ` Across ${scanHistory.length} scans, ${domain.displayName}'s privacy configuration has been ${domain.stabilityTier.toLowerCase()}.`;
  }

  text += ` For details on scoring methodology, see our methodology page.`;
  return text;
}

function generateAboutSection(globalStats: GlobalStats): string {
  return `This report is part of GeckoAdvisor's dataset covering ${globalStats.totalDomains.toLocaleString()} domains with ${globalStats.totalFindings.toLocaleString()} findings. GeckoAdvisor scans domains to detect third-party trackers, cookies, and privacy-relevant configuration changes. For details on scanning methodology and known limitations, see our methodology page.`;
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function generateDomainNarrative(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats,
  scanHistory: ScanHistory[],
  relatedDomains: DomainSummary[],
  comparisonPages: ComparisonLink[]
): DomainNarrative {
  const verdict = generateVerdict(domain, categoryStats, globalStats);
  const intro = generateIntro(domain, categoryStats, globalStats, scanHistory);
  const trackerSection = generateTrackerNarrative(domain, categoryStats, globalStats);
  const cookieSection = generateCookieNarrative(domain, categoryStats, globalStats);
  const comparisonSection = generateComparisonNarrative(domain, categoryStats, relatedDomains, comparisonPages);
  const historySection = generateHistoryNarrative(domain, scanHistory);
  const profileInterpretation = generateProfileInterpretation(domain, categoryStats, globalStats, scanHistory);
  const aboutSection = generateAboutSection(globalStats);

  // ============================================================
  // CONDITIONAL SECTIONS A-H
  // ============================================================

  // A: Rare tracker
  let rareTrackerSection: string | undefined;
  if (domain.hasRareTracker && domain.rarestTracker && categoryStats) {
    const topTrackers = categoryStats.topTrackers?.slice(0, 3).map(t => t.name).join(', ') || 'common analytics tools';
    rareTrackerSection = `${domain.displayName} uses ${domain.rarestTracker}, a technology found on only ${domain.rarestTrackerDomainCount?.toLocaleString()} other domains in our dataset. This is uncommon among ${categoryStats.categoryName} sites, where the most prevalent trackers are ${topTrackers}.`;
  }

  // B: Recent changes
  let recentChangesSection: string | undefined;
  if (scanHistory.length >= 2) {
    const latest = scanHistory[0];
    const previous = scanHistory[1];
    const added = latest.trackers?.filter(t => !previous.trackers?.includes(t)) || [];
    const removed = previous.trackers?.filter(t => !latest.trackers?.includes(t)) || [];
    if (added.length > 0 || removed.length > 0) {
      let changeText = `Between ${formatDate(previous.date)} and ${formatDate(latest.date)}, ${domain.displayName}'s tracking configuration changed.`;
      if (added.length > 0) changeText += ` ${added.length} tracker(s) were added: ${added.join(', ')}.`;
      if (removed.length > 0) changeText += ` ${removed.length} tracker(s) were removed: ${removed.join(', ')}.`;
      if (latest.privacyScore !== previous.privacyScore) {
        changeText += ` The privacy score moved from ${previous.privacyScore} to ${latest.privacyScore}.`;
      }
      recentChangesSection = changeText;
    }
  }

  // C: Category rank (top 10)
  let categoryRankSection: string | undefined;
  if (categoryStats && domain.categoryRank && domain.categoryRank <= 10) {
    const pct = ((domain.categoryRank / categoryStats.totalDomains) * 100).toFixed(1);
    categoryRankSection = `${domain.displayName} ranks ${domain.categoryRank} out of ${categoryStats.totalDomains} ${categoryStats.categoryName} sites by privacy score, placing it in the top ${pct}% of the category.`;
  }

  // D: Tracker distribution (deferred until tracker type classification exists)
  const trackerDistributionSection: string | undefined = undefined;

  // E: Zero tracker profile
  let zeroTrackerSection: string | undefined;
  if (domain.trackerCount === 0 && categoryStats) {
    zeroTrackerSection = `${domain.displayName} loads zero detected third-party trackers, placing it among ${categoryStats.zeroTrackerCount} domains in the ${categoryStats.categoryName} category with no trackers. ${((categoryStats.zeroTrackerCount / categoryStats.totalDomains) * 100).toFixed(1)}% of ${categoryStats.categoryName} sites also load zero trackers.`;
  }

  // F: High cookie count
  let highCookieSection: string | undefined;
  if (categoryStats && domain.cookieCount > categoryStats.avgCookieCount * 2) {
    highCookieSection = `${domain.displayName} sets ${domain.cookieCount} cookies, more than double the ${categoryStats.categoryName} average of ${categoryStats.avgCookieCount.toFixed(1)}.`;
    if (domain.thirdPartyCookies !== undefined) {
      highCookieSection += ` ${domain.thirdPartyCookies} of these are third-party cookies.`;
    }
  }

  // G: Score improvement (>= 10 points)
  let scoreImproveSection: string | undefined;
  const oldestScore = scanHistory.length >= 3 ? scanHistory[scanHistory.length - 1].privacyScore : null;
  const newestScore = scanHistory.length >= 3 ? scanHistory[0].privacyScore : null;
  if (oldestScore !== null && newestScore !== null && newestScore - oldestScore >= 10) {
    scoreImproveSection = `${domain.displayName}'s privacy score has improved from ${oldestScore} to ${newestScore} over the scan period, an increase of ${newestScore - oldestScore} points.`;
  }

  // H: Score decline (>= 10 points)
  let scoreDeclineSection: string | undefined;
  if (oldestScore !== null && newestScore !== null && oldestScore - newestScore >= 10) {
    scoreDeclineSection = `${domain.displayName}'s privacy score has decreased from ${oldestScore} to ${newestScore} over the scan period, a drop of ${oldestScore - newestScore} points.`;
  }

  // ============================================================
  // FRESHNESS SIGNAL
  // ============================================================
  const latestScan = scanHistory[0];
  const previousScan = scanHistory[1] || null;
  const trackersAdded = previousScan
    ? (latestScan.trackers?.filter(t => !previousScan.trackers?.includes(t)) || [])
    : [];
  const trackersRemoved = previousScan
    ? (previousScan.trackers?.filter(t => !latestScan.trackers?.includes(t)) || [])
    : [];
  const scoreChanged = previousScan && latestScan.privacyScore !== previousScan.privacyScore;

  const freshnessSignal = {
    lastScanned: latestScan?.date || new Date().toISOString(),
    previousScan: previousScan?.date || null,
    scanCount: scanHistory.length,
    changesDetected: trackersAdded.length > 0 || trackersRemoved.length > 0 || !!scoreChanged,
    trackersAdded,
    trackersRemoved,
    scoreChange: scoreChanged
      ? { old: previousScan.privacyScore, new: latestScan.privacyScore }
      : null,
  };

  // Section ordering
  const sectionOrder = getSectionOrder(domain.name);

  // Word count
  const allSections = [
    verdict.interpretation, intro, trackerSection, cookieSection, comparisonSection,
    historySection, profileInterpretation, aboutSection,
    rareTrackerSection, recentChangesSection, categoryRankSection,
    trackerDistributionSection, zeroTrackerSection, highCookieSection,
    scoreImproveSection, scoreDeclineSection,
  ].filter(Boolean);
  const totalWordCount = allSections.join(' ').split(/\s+/).length;

  return {
    verdict,
    intro,
    trackerSection,
    cookieSection,
    comparisonSection,
    historySection,
    profileInterpretation,
    aboutSection,
    rareTrackerSection,
    recentChangesSection,
    categoryRankSection,
    trackerDistributionSection,
    zeroTrackerSection,
    highCookieSection,
    scoreImproveSection,
    scoreDeclineSection,
    freshnessSignal,
    sectionOrder,
    totalWordCount,
  };
}
