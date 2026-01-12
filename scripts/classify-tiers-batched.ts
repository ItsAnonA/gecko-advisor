/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Phase 2A: Batched Tier Classification Script
 *
 * Classifies domains into tiers A, B, C based on:
 * - Scan frequency (repeat scans = more valuable)
 * - GSC signals (clicks/impressions = proven traffic)
 * - Popular brand bonus (big tech, news, etc.)
 * - Scan quality (poor privacy = more interesting content)
 * - Tracker count (more trackers = richer evidence)
 *
 * Fixes applied:
 * - FIX #1: Batched updates (not slow loops)
 * - FIX #2: Rank-based Tier A cap enforcement
 * - FIX #3: Normalized brand matching
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// === CONFIGURATION ===
const TIER_A_TARGET = 5000; // Target size
const TIER_A_MAX = 7000; // Hard cap - NEVER exceed
const TIER_B_SITEMAP_LIMIT = 5000; // Only top 5K of B in sitemap initially
const BATCH_SIZE = 1000; // Process in batches of 1000

// === FIX #3: NORMALIZED BRAND LIST ===
// Store without www, match with normalization
const POPULAR_BRANDS = new Set([
  // Big tech
  'google.com',
  'youtube.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'amazon.com',
  'netflix.com',
  'spotify.com',
  'tiktok.com',
  'linkedin.com',
  'reddit.com',
  'twitch.tv',
  'discord.com',
  'whatsapp.com',
  'telegram.org',
  'microsoft.com',
  'apple.com',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'yahoo.com',
  'bing.com',
  'duckduckgo.com',
  // Ecommerce
  'ebay.com',
  'walmart.com',
  'target.com',
  'bestbuy.com',
  'etsy.com',
  'aliexpress.com',
  'alibaba.com',
  'shopify.com',
  'wish.com',
  'temu.com',
  // SaaS
  'zoom.us',
  'slack.com',
  'notion.so',
  'figma.com',
  'canva.com',
  'dropbox.com',
  'salesforce.com',
  'hubspot.com',
  // News
  'nytimes.com',
  'washingtonpost.com',
  'cnn.com',
  'bbc.com',
  'reuters.com',
  'forbes.com',
  'bloomberg.com',
  'techcrunch.com',
  'wired.com',
  'theverge.com',
  // Social
  'pinterest.com',
  'snapchat.com',
  'tumblr.com',
  'medium.com',
  // Entertainment
  'twitch.tv',
  'hulu.com',
  'disneyplus.com',
  'hbomax.com',
  'primevideo.com',
  // Utilities
  'weather.com',
  'maps.google.com',
  // Finance
  'paypal.com',
  'stripe.com',
  'coinbase.com',
  'robinhood.com',
]);

// Normalize domain for matching
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

// FIX #3: Check if domain matches any popular brand
function isPopularBrand(domain: string): boolean {
  const normalized = normalizeDomain(domain);

  // Exact match
  if (POPULAR_BRANDS.has(normalized)) return true;

  // Check if domain ends with a popular brand (for subdomains)
  for (const brand of POPULAR_BRANDS) {
    if (normalized === brand || normalized.endsWith('.' + brand)) {
      return true;
    }
  }

  // Check country TLDs (e.g., amazon.co.uk, google.de)
  const brandBase = normalized.split('.')[0];
  for (const brand of POPULAR_BRANDS) {
    const brandName = brand.split('.')[0];
    if (brandBase === brandName) return true;
  }

  return false;
}

interface ScoredDomain {
  id: string;
  domain: string;
  tierScore: number;
}

async function classifyTiers() {
  console.log('=== BATCHED TIER CLASSIFICATION ===\n');
  console.log(`Tier A target: ${TIER_A_TARGET}, max: ${TIER_A_MAX}`);
  console.log(`Tier B sitemap limit: ${TIER_B_SITEMAP_LIMIT}`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);

  // Step 1: Fetch all domains with scan data
  console.log('Fetching domains...');
  const domains = await prisma.domain.findMany({
    include: {
      latestScan: {
        select: {
          score: true,
          evidence: {
            select: { kind: true },
          },
        },
      },
    },
  });
  console.log(`Found ${domains.length} domains\n`);

  if (domains.length === 0) {
    console.log('No domains to classify. Exiting.');
    return;
  }

  // Step 2: Calculate tier scores in memory
  console.log('Calculating tier scores...');
  const scoredDomains: ScoredDomain[] = domains.map((d) => {
    const scan = d.latestScan;
    let tierScore = 0;

    // Scan frequency signals
    if (d.scanCount >= 5) tierScore += 50;
    else if (d.scanCount >= 3) tierScore += 30;
    else if (d.scanCount >= 2) tierScore += 15;

    // GSC signals (highest weight)
    if (d.gscClicks > 0) tierScore += 100;
    if (d.gscImpressions > 100) tierScore += 50;
    else if (d.gscImpressions > 10) tierScore += 25;

    // Popular brand bonus
    if (isPopularBrand(d.domain)) tierScore += 80;

    // Scan quality signals
    if (scan) {
      // Poor privacy = more interesting content
      if (scan.score !== null && scan.score < 40) tierScore += 40;
      else if (scan.score !== null && scan.score < 60) tierScore += 20;

      // More evidence = richer content
      const evidenceCount = scan.evidence?.length ?? 0;
      if (evidenceCount > 15) tierScore += 35;
      else if (evidenceCount > 10) tierScore += 20;
      else if (evidenceCount > 5) tierScore += 10;

      // Check for fingerprinting (high interest topic)
      const hasFingerprinting = scan.evidence?.some(
        (e) => e.kind === 'fingerprinting' || e.kind === 'canvas_fingerprinting'
      );
      if (hasFingerprinting) tierScore += 30;
    }

    return {
      id: d.id,
      domain: d.domain,
      tierScore,
    };
  });

  // Step 3: Sort by tier score descending
  scoredDomains.sort((a, b) => b.tierScore - a.tierScore);

  // Step 4: FIX #2 - Assign tiers by RANK (not threshold)
  console.log('Assigning tiers by rank...\n');

  const tierAssignments: { A: string[]; B: string[]; C: string[] } = {
    A: [],
    B: [],
    C: [],
  };

  scoredDomains.forEach((d, rank) => {
    // Top TIER_A_TARGET get Tier A
    if (rank < TIER_A_TARGET) {
      tierAssignments.A.push(d.id);
    }
    // Allow overflow to TIER_A_MAX only if score is high enough
    else if (rank < TIER_A_MAX && d.tierScore >= 50) {
      tierAssignments.A.push(d.id);
    }
    // Next batch gets Tier B (if score >= 10)
    else if (d.tierScore >= 10) {
      tierAssignments.B.push(d.id);
    }
    // Rest is Tier C
    else {
      tierAssignments.C.push(d.id);
    }
  });

  console.log(
    `Tier A: ${tierAssignments.A.length} (target: ${TIER_A_TARGET}, max: ${TIER_A_MAX})`
  );
  console.log(`Tier B: ${tierAssignments.B.length}`);
  console.log(`Tier C: ${tierAssignments.C.length}\n`);

  // Validate Tier A cap
  if (tierAssignments.A.length > TIER_A_MAX) {
    console.log('WARNING: Tier A exceeds max! Trimming...');
    const excess = tierAssignments.A.splice(TIER_A_MAX);
    tierAssignments.B.unshift(...excess);
  }

  // Step 5: FIX #1 - Batch update using transactions
  console.log('Updating database in batches...\n');

  const now = new Date();

  for (const [tier, ids] of Object.entries(tierAssignments)) {
    console.log(`Updating Tier ${tier} (${ids.length} domains)...`);

    // Process in batches
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((id, batchIndex) => {
          const globalRank = i + batchIndex;
          const domainData = scoredDomains.find((d) => d.id === id);

          return prisma.domain.update({
            where: { id },
            data: {
              indexTier: tier,
              tierScore: domainData?.tierScore || 0,
              tierRank: tier === 'A' ? globalRank : null,
              tierCalculatedAt: now,
            },
          });
        })
      );

      console.log(
        `  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ids.length / BATCH_SIZE)} complete`
      );
    }
  }

  // Step 6: Print summary
  console.log('\n=== CLASSIFICATION COMPLETE ===\n');

  const finalCounts = await prisma.domain.groupBy({
    by: ['indexTier'],
    _count: true,
  });

  console.log('Final counts:');
  finalCounts.forEach((c) => {
    console.log(`  Tier ${c.indexTier}: ${c._count}`);
  });

  // Show top 10 Tier A
  console.log('\nTop 10 Tier A domains:');
  const topA = scoredDomains.slice(0, 10);
  topA.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.domain} (score: ${d.tierScore})`);
  });

  // Show tier score distribution
  console.log('\nTier score distribution:');
  const scoreRanges = [
    { min: 100, max: Infinity, label: '100+' },
    { min: 50, max: 99, label: '50-99' },
    { min: 20, max: 49, label: '20-49' },
    { min: 10, max: 19, label: '10-19' },
    { min: 0, max: 9, label: '0-9' },
  ];

  for (const range of scoreRanges) {
    const count = scoredDomains.filter(
      (d) => d.tierScore >= range.min && d.tierScore <= range.max
    ).length;
    console.log(`  ${range.label}: ${count}`);
  }
}

classifyTiers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
