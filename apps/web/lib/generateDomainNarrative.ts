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
}

export interface CategoryStats {
  categoryName: string;
  avgPrivacyScore: number;
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
}

export interface ComparisonLink {
  otherDomain: string;
  otherDisplayName: string;
}

export type SectionKey = 'trackers' | 'cookies' | 'comparison' | 'history' | 'safety';

export interface DomainNarrative {
  intro: string;
  trackerSection: string;
  cookieSection: string;
  comparisonSection: string;
  historySection: string;
  safetySection: string;
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
  ['trackers', 'cookies', 'comparison', 'history', 'safety'],
  ['comparison', 'trackers', 'cookies', 'history', 'safety'],
  ['trackers', 'history', 'cookies', 'comparison', 'safety'],
  ['history', 'trackers', 'comparison', 'cookies', 'safety'],
  ['safety', 'trackers', 'cookies', 'comparison', 'history'],
  ['trackers', 'comparison', 'history', 'cookies', 'safety'],
  ['cookies', 'trackers', 'comparison', 'safety', 'history'],
  ['comparison', 'history', 'trackers', 'cookies', 'safety'],
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

const TITLE_VARIANTS = [
  (name: string, n: number) => `${name} Privacy Analysis: ${n} Trackers, Cookies & Score`,
  (name: string, n: number) => `${name} Tracking Analysis: ${n} Trackers Detected`,
  (name: string, n: number) => `Does ${name} Track Users? ${n} Trackers Detected`,
  (name: string, _n: number) => `${name} Privacy Score & Tracker Report`,
  (name: string, n: number) => `How ${name} Tracks Visitors: ${n} Trackers Found`,
  (name: string, _n: number) => `${name} Cookie & Tracker Report: Privacy Analysis`,
  (name: string, n: number) => `${name} Privacy Score Explained: ${n} Trackers`,
  (name: string, n: number) => `Is ${name} Safe? Privacy Score & ${n} Trackers Analyzed`,
];

export function generateDomainTitle(domain: DomainData): string {
  const variant = pickVariant(domain.name, TITLE_VARIANTS);
  return `${variant(domain.displayName, domain.trackerCount)} | GeckoAdvisor`;
}

export function generateDomainDescription(
  domain: DomainData,
  categoryStats: CategoryStats | null
): string {
  let desc = `${domain.displayName} loads ${domain.trackerCount} third-party trackers and has a privacy score of ${domain.privacyScore}/100.`;
  if (categoryStats) {
    desc += ` Compare to the ${categoryStats.categoryName} average of ${categoryStats.avgTrackerCount.toFixed(1)} trackers.`;
  }
  desc += ` Scanned ${domain.scanCount} times.`;
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

export function getSafetySectionTitle(domain: DomainData): string {
  return `Is ${domain.displayName} Safe for Privacy?`;
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

  // Relative context with percentiles
  if (categoryStats && domain.trackerPercentile !== undefined) {
    if (domain.trackerPercentile >= 90) {
      text += ` This places it among the most heavily instrumented ${categoryStats.categoryName} sites in the dataset (top ${100 - domain.trackerPercentile}% by tracker count).`;
    } else if (domain.trackerPercentile <= 10) {
      text += ` This places it among the least instrumented ${categoryStats.categoryName} sites in the dataset (bottom ${domain.trackerPercentile}% by tracker count).`;
    } else {
      const diff = domain.trackerCount - categoryStats.avgTrackerCount;
      if (diff > 0) {
        text += ` This is ${Math.round(diff)} more than the average for ${categoryStats.categoryName} sites (${categoryStats.avgTrackerCount.toFixed(1)}).`;
      } else if (diff < 0) {
        text += ` This is ${Math.abs(Math.round(diff))} fewer than the average for ${categoryStats.categoryName} sites (${categoryStats.avgTrackerCount.toFixed(1)}).`;
      } else {
        text += ` This matches the average for ${categoryStats.categoryName} sites.`;
      }
    }
  } else if (categoryStats) {
    const diff = domain.trackerCount - categoryStats.avgTrackerCount;
    if (diff > 0) {
      text += ` This is ${Math.round(diff)} more than the average for ${categoryStats.categoryName} sites (${categoryStats.avgTrackerCount.toFixed(1)}).`;
    } else if (diff < 0) {
      text += ` This is ${Math.abs(Math.round(diff))} fewer than the average for ${categoryStats.categoryName} sites (${categoryStats.avgTrackerCount.toFixed(1)}).`;
    } else {
      text += ` This matches the average for ${categoryStats.categoryName} sites.`;
    }
  }

  text += ` The global average across all ${globalStats.totalDomains.toLocaleString()} scanned domains is ${globalStats.avgTrackerCount.toFixed(1)} trackers.`;

  if (domain.hasRareTracker && domain.rarestTracker) {
    text += ` One notable detection: ${domain.rarestTracker}, which appears on only ${domain.rarestTrackerDomainCount?.toLocaleString()} other domains in the dataset.`;
  }

  if (domain.trackers && domain.trackers.length > 0) {
    text += ` The following trackers were detected:`;
    for (const tracker of domain.trackers) {
      text += ` ${tracker.name} (found on ${tracker.globalDomainCount.toLocaleString()} other domains).`;
    }
  } else {
    text += ` No third-party trackers were detected on ${domain.displayName} during the most recent scan.`;
    if (categoryStats) {
      text += ` ${categoryStats.zeroTrackerCount} out of ${categoryStats.totalDomains} scanned domains in the ${categoryStats.categoryName} category also load zero trackers.`;
    }
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
    text += ` The average for ${categoryStats.categoryName} sites is ${categoryStats.avgCookieCount.toFixed(1)} cookies.`;
  }

  text += ` The global average across all scanned domains is ${globalStats.avgCookieCount.toFixed(1)} cookies.`;

  if (domain.firstPartyCookies !== undefined && domain.thirdPartyCookies !== undefined) {
    text += ` Of these, ${domain.firstPartyCookies} are first-party cookies and ${domain.thirdPartyCookies} are third-party cookies.`;
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
    text += `Among ${categoryStats.totalDomains} ${categoryStats.categoryName} sites in our dataset, ${domain.displayName} ranks ${domain.categoryRank} by privacy score.`;
    text += ` The highest-scoring ${categoryStats.categoryName} site is ${categoryStats.topDomain} with a score of ${categoryStats.topScore}.`;
    text += ` The lowest-scoring is ${categoryStats.bottomDomain} with a score of ${categoryStats.bottomScore}.`;
  } else {
    text += `${domain.displayName} has a privacy score of ${domain.privacyScore} out of 100.`;
  }

  if (comparisonPages.length > 0) {
    text += ` Direct comparisons are available for ${domain.displayName} against:`;
    for (const comp of comparisonPages.slice(0, 3)) {
      text += ` ${comp.otherDisplayName} (comparison report).`;
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

// SAFETY RULE: This function MUST NEVER output verdicts.
// It states: score, average, tracker count, stability. Period.
function generateSafetyNarrative(
  domain: DomainData,
  categoryStats: CategoryStats | null,
  globalStats: GlobalStats,
  scanHistory: ScanHistory[]
): string {
  let text = `${domain.displayName} has a privacy score of ${domain.privacyScore} out of 100.`;
  text += ` The average score across all ${globalStats.totalDomains.toLocaleString()} scanned domains is ${globalStats.avgPrivacyScore.toFixed(1)}.`;

  if (categoryStats) {
    text += ` The average for ${categoryStats.categoryName} sites is ${categoryStats.avgPrivacyScore.toFixed(1)}.`;
  }

  text += ` ${domain.displayName} loads ${domain.trackerCount} third-party trackers, compared to a`;
  if (categoryStats) {
    text += ` category average of ${categoryStats.avgTrackerCount.toFixed(1)} and a`;
  }
  text += ` global average of ${globalStats.avgTrackerCount.toFixed(1)}.`;

  text += ` ${domain.displayName} has been scanned ${scanHistory.length} times. Its stability classification is ${domain.stabilityTier}, based on observed configuration changes across scans.`;
  text += ` For details on how scores are calculated, see our methodology.`;

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
  const intro = generateIntro(domain, categoryStats, globalStats, scanHistory);
  const trackerSection = generateTrackerNarrative(domain, categoryStats, globalStats);
  const cookieSection = generateCookieNarrative(domain, categoryStats, globalStats);
  const comparisonSection = generateComparisonNarrative(domain, categoryStats, relatedDomains, comparisonPages);
  const historySection = generateHistoryNarrative(domain, scanHistory);
  const safetySection = generateSafetyNarrative(domain, categoryStats, globalStats, scanHistory);
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
    intro, trackerSection, cookieSection, comparisonSection,
    historySection, safetySection, aboutSection,
    rareTrackerSection, recentChangesSection, categoryRankSection,
    trackerDistributionSection, zeroTrackerSection, highCookieSection,
    scoreImproveSection, scoreDeclineSection,
  ].filter(Boolean);
  const totalWordCount = allSections.join(' ').split(/\s+/).length;

  return {
    intro,
    trackerSection,
    cookieSection,
    comparisonSection,
    historySection,
    safetySection,
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
