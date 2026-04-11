/*
SPDX-FileCopyrightText: 2026 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Featured Domains — Tier A authority concentration
 *
 * The 4 SEO authority hubs (privacy-index, most-tracked, least-private,
 * most-cookies) already render flat top-100 tables of Tier A domains. Every
 * row looks the same to Google, so authority is spread evenly across all 100
 * — no signal about which entries actually matter.
 *
 * This module carves a curated subset out of those 100 — the "featured" tier
 * — that the hub pages render *above* the existing table with stronger visual
 * weight, narrative copy, and intentional ordering. It's how we tell Google:
 * "these specific reports are the ones this hub is really voting for."
 *
 * Selection mix (per hub, capped at 12 entries total):
 *   - Extremes: domains at the top of the hub's native ranking (most-tracked
 *     uses highest tracker count, least-private uses lowest score, etc.).
 *     Drives the "shock factor" of the featured row.
 *   - Brands: globally recognizable domains anywhere in the top-100 — picked
 *     for the "wait, even THEM?" effect that drives clicks and trust.
 *   - Clean high-score (privacy-index hub only): a few exemplars at the top
 *     of the score distribution to balance the mixed hub.
 *
 * Order matters: extremes are emitted first so the top-3 cards on every hub
 * are the most attention-grabbing entries.
 *
 * Narratives are derived from the entry's own data — no LLM, no hardcoded
 * copy per domain. Each hub has its own narrative generator that frames the
 * entry's headline metric in human-readable terms.
 */

import type { RankingEntry, RankingsData, RankingType } from './rankings';

/** Globally recognizable consumer domains used for brand-mix selection.
 *
 * Hand-flattened from `scripts/classification/known-brands.ts` — kept here as
 * a flat Set rather than imported because:
 *   1. The script file is a backend classification utility (500+ entries with
 *      category metadata) and shouldn't be a frontend dependency.
 *   2. Featured-section selection only needs a yes/no membership check, not
 *      category labels.
 *   3. Bundle weight matters on hub pages (these are SEO-critical).
 *
 * If we need a richer list later, expand here or move to `packages/shared`. */
const RECOGNIZABLE_BRANDS: ReadonlySet<string> = new Set([
  // Social
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
  'tiktok.com', 'snapchat.com', 'reddit.com', 'pinterest.com', 'youtube.com',
  'threads.net', 'mastodon.social',
  // Streaming
  'netflix.com', 'hulu.com', 'disneyplus.com', 'spotify.com', 'twitch.tv',
  'hbomax.com', 'max.com', 'primevideo.com', 'paramountplus.com', 'peacocktv.com',
  'tv.apple.com', 'soundcloud.com',
  // Ecommerce
  'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'etsy.com',
  'shopify.com', 'alibaba.com', 'aliexpress.com', 'costco.com', 'bestbuy.com',
  'wayfair.com', 'homedepot.com', 'lowes.com', 'ikea.com', 'macys.com',
  // Big tech
  'google.com', 'microsoft.com', 'apple.com', 'adobe.com', 'oracle.com',
  'salesforce.com', 'ibm.com', 'intel.com', 'nvidia.com', 'amd.com',
  'meta.com', 'openai.com', 'anthropic.com',
  // News
  'cnn.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 'foxnews.com', 'reuters.com',
  'theguardian.com', 'washingtonpost.com', 'wsj.com', 'bloomberg.com',
  'forbes.com', 'businessinsider.com', 'npr.org', 'apnews.com', 'usatoday.com',
  'cnbc.com',
  // Finance
  'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com', 'paypal.com',
  'venmo.com', 'stripe.com', 'robinhood.com', 'coinbase.com', 'fidelity.com',
  'schwab.com', 'capitalone.com', 'americanexpress.com', 'visa.com', 'mastercard.com',
  'discover.com',
  // Travel
  'airbnb.com', 'booking.com', 'expedia.com', 'tripadvisor.com', 'kayak.com',
  'uber.com', 'lyft.com', 'hotels.com', 'priceline.com',
  // Productivity / SaaS
  'dropbox.com', 'zoom.us', 'slack.com', 'notion.so', 'atlassian.com',
  'github.com', 'gitlab.com', 'figma.com', 'canva.com', 'asana.com',
  'trello.com', 'monday.com', 'hubspot.com',
  // Gaming
  'steampowered.com', 'epicgames.com', 'playstation.com', 'xbox.com',
  'nintendo.com', 'blizzard.com', 'ea.com', 'ubisoft.com', 'minecraft.net',
  'roblox.com',
  // Search / portals / tools
  'yahoo.com', 'bing.com', 'duckduckgo.com', 'wikipedia.org', 'imdb.com',
  'quora.com', 'stackoverflow.com', 'medium.com', 'wordpress.com', 'tumblr.com',
]);

/** A featured entry — a ranking row plus a narrative reason it was picked.
 *
 * The `kind` field drives card styling (extreme entries get the "hero" treatment;
 * brand entries get a brand badge; clean entries get a positive accent). */
export interface FeaturedDomain {
  rank: number;
  domain: string;
  /** Display-formatted domain (lowercase, eTLD+1). */
  displayName: string;
  /** Privacy score 0-100. */
  score: number;
  /** Number of trackers detected on the latest scan. */
  trackers: number;
  /** Number of cookies set on the latest scan. */
  cookies: number;
  /** Letter grade (A+ through F). */
  grade: string;
  /** One-sentence narrative explaining why this domain is interesting on this hub. */
  narrative: string;
  /** Selection bucket — used for visual differentiation in the rendered cards. */
  kind: 'extreme' | 'brand' | 'clean';
}

/** Format a domain for display — strip protocol, lowercase, and humanize the
 * eTLD+1 portion (e.g., "facebook.com" → "Facebook"). Keeps `.com`-style
 * suffixes off the headline so brand cards read naturally. */
function getDisplayName(domain: string): string {
  const stripped = domain.toLowerCase().replace(/^www\./, '');
  const root = stripped.split('.')[0];
  if (!root) return stripped;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

/** Narrative generator for `/most-tracked-websites`.
 *
 * Frames the entry's tracker count in terms of either "highest measured"
 * (if it's near the top) or "well above the average" (otherwise). The hub-stats
 * average is required so we can produce a relative comparison. */
function narrativeForMostTracked(entry: RankingEntry, averageTrackers: number): string {
  const display = getDisplayName(entry.domain);
  if (entry.rank <= 5) {
    return `${display} runs ${entry.trackers} third-party trackers — one of the highest counts we've ever measured.`;
  }
  if (entry.rank <= 15) {
    return `${display} loads ${entry.trackers} trackers on a single visit — among the most tracker-heavy sites we monitor.`;
  }
  const delta = Math.round(entry.trackers - averageTrackers);
  return `${display} runs ${entry.trackers} trackers — about ${delta} more than the average website.`;
}

/** Narrative generator for `/least-private-websites`.
 *
 * Leads with the score (the headline number for this hub) and frames the gap
 * to the average so readers immediately understand the magnitude. */
function narrativeForLeastPrivate(entry: RankingEntry, averageScore: number): string {
  const display = getDisplayName(entry.domain);
  const gap = Math.max(1, Math.round(averageScore - entry.score));
  if (entry.rank <= 5) {
    return `${display} scores just ${entry.score}/100 — among the worst privacy ratings we've issued.`;
  }
  if (entry.rank <= 15) {
    return `${display} scores ${entry.score}/100, ${gap} points below the average website.`;
  }
  return `${display} scores ${entry.score}/100 — ${gap} points below average, with ${entry.trackers} trackers detected.`;
}

/** Narrative generator for `/websites-with-most-cookies`.
 *
 * Cookie counts vary wildly across the web, so we lean on rank language for
 * the top entries and gap-to-average for the rest. */
function narrativeForMostCookies(entry: RankingEntry, averageCookies: number): string {
  const display = getDisplayName(entry.domain);
  if (entry.rank <= 5) {
    return `${display} sets ${entry.cookies} cookies on a single visit — one of the heaviest cookie footprints we track.`;
  }
  if (entry.rank <= 15) {
    return `${display} drops ${entry.cookies} cookies per visit — well above what most websites set.`;
  }
  const delta = Math.round(entry.cookies - averageCookies);
  return `${display} sets ${entry.cookies} cookies, about ${delta} more than the average website.`;
}

/** Narrative generator for `/privacy-index` (the mixed canonical hub).
 *
 * Picks whichever signal on the entry is most extreme — lowest score, highest
 * tracker count, or highest cookie count — and frames a one-line takeaway. For
 * "clean" entries (high score), we flip the polarity to a positive note. */
function narrativeForPrivacyIndex(
  entry: RankingEntry,
  kind: FeaturedDomain['kind'],
  stats: { averageScore: number; averageTrackers: number; averageCookies: number }
): string {
  const display = getDisplayName(entry.domain);
  if (kind === 'clean') {
    return `${display} earns ${entry.score}/100 — a strong privacy score with only ${entry.trackers} trackers.`;
  }
  // For extremes/brands, pick the most-extreme signal on this entry to lead with.
  const trackerExcess = entry.trackers - stats.averageTrackers;
  const scoreDeficit = stats.averageScore - entry.score;
  const cookieExcess = entry.cookies - stats.averageCookies;
  // Normalize each signal to a comparable scale (rough heuristic — purely for
  // ranking which framing is most "interesting" for this entry). The constants
  // weight each axis so a 1-point score gap weighs roughly the same as a single
  // tracker or 2 cookies.
  const trackerScore = trackerExcess;
  const scoreScore = scoreDeficit * 1.5;
  const cookieScore = cookieExcess * 0.5;

  const max = Math.max(trackerScore, scoreScore, cookieScore);
  if (max === scoreScore && entry.score < stats.averageScore) {
    const gap = Math.max(1, Math.round(scoreDeficit));
    return `${display} scores ${entry.score}/100 — ${gap} points below the average website.`;
  }
  if (max === cookieScore && entry.cookies > stats.averageCookies) {
    return `${display} sets ${entry.cookies} cookies per visit — among the cookie-heaviest sites we track.`;
  }
  // Default: tracker framing
  return `${display} loads ${entry.trackers} third-party trackers on a single visit.`;
}

/** Pick the right narrative generator for a given hub type. */
function buildNarrative(
  entry: RankingEntry,
  hubType: RankingType,
  kind: FeaturedDomain['kind'],
  stats: { averageScore: number; averageTrackers: number; averageCookies: number }
): string {
  switch (hubType) {
    case 'most-tracked':
      return narrativeForMostTracked(entry, stats.averageTrackers);
    case 'least-private':
      return narrativeForLeastPrivate(entry, stats.averageScore);
    case 'most-cookies':
      return narrativeForMostCookies(entry, stats.averageCookies);
    case 'privacy-index':
      return narrativeForPrivacyIndex(entry, kind, stats);
  }
}

/** Selection algorithm — carve a curated featured tier from the top-100 rankings.
 *
 * Approach (intentional bias, not fairness):
 *   1. EXTREMES first — take the top N entries from the hub's native sort.
 *      These are the "shock factor" entries that earn the top-3 hero cards.
 *   2. BRANDS next — append entries whose domain is in `RECOGNIZABLE_BRANDS`.
 *      Skipped if already picked as an extreme. Drives the "wait, even THEM?"
 *      response that earns clicks.
 *   3. CLEAN HIGH-SCORE (privacy-index only) — append a few high-score entries
 *      so the canonical hub balances the mixed view.
 *
 * Output is capped at 12 entries and emitted in the order extremes → brands →
 * clean, so visual hierarchy on the page maps directly to selection priority.
 *
 * Why client-side: the rankings API already returns the full top-100. Computing
 * featured selection on the frontend means zero backend changes, instant ISR
 * cache reuse, and full reversibility. */
export function selectFeaturedDomains(
  rankings: RankingsData,
  hubType: RankingType
): FeaturedDomain[] {
  const entries = rankings.rankings;
  if (entries.length === 0) return [];

  const stats = {
    averageScore: rankings.stats.averageScore,
    averageTrackers: rankings.stats.averageTrackers,
    averageCookies: rankings.stats.averageCookies,
  };

  // Track picked domains to dedupe across buckets.
  const pickedDomains = new Set<string>();
  const result: FeaturedDomain[] = [];

  const pushEntry = (entry: RankingEntry, kind: FeaturedDomain['kind']) => {
    if (pickedDomains.has(entry.domain)) return;
    pickedDomains.add(entry.domain);
    result.push({
      rank: entry.rank,
      domain: entry.domain,
      displayName: getDisplayName(entry.domain),
      score: entry.score,
      trackers: entry.trackers,
      cookies: entry.cookies,
      grade: entry.grade,
      narrative: buildNarrative(entry, hubType, kind, stats),
      kind,
    });
  };

  // 1. Extremes — top of the hub's native ranking (entries are already sorted
  //    by the backend per ranking type, so position in the array IS the extreme).
  const extremeCount = hubType === 'privacy-index' ? 5 : 6;
  for (const entry of entries.slice(0, extremeCount)) {
    pushEntry(entry, 'extreme');
  }

  // 2. Brands — recognizable domains anywhere in the top-100 (skipping those
  //    already picked as extremes).
  const brandCount = hubType === 'privacy-index' ? 5 : 6;
  let brandsAdded = 0;
  for (const entry of entries) {
    if (brandsAdded >= brandCount) break;
    if (!RECOGNIZABLE_BRANDS.has(entry.domain.toLowerCase())) continue;
    if (pickedDomains.has(entry.domain)) continue;
    pushEntry(entry, 'brand');
    brandsAdded += 1;
  }

  // 3. Clean high-score — only on the privacy-index hub, where the mixed view
  //    benefits from some positive exemplars.
  if (hubType === 'privacy-index') {
    const cleanCandidates = [...entries]
      .filter((e) => e.score >= 80 && !pickedDomains.has(e.domain))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    for (const entry of cleanCandidates) {
      pushEntry(entry, 'clean');
    }
  }

  // Cap at 12 — tighter than the user-facing top-100 but enough for a
  // visually substantial featured row + supporting grid.
  return result.slice(0, 12);
}
