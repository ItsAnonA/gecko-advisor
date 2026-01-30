#!/usr/bin/env npx ts-node

/**
 * TRANCO RANK SEEDING
 *
 * Seeds Tranco ranks into existing Domain records for initial tier assignment.
 * Tranco is a research-grade domain popularity list combining Alexa, Majestic,
 * Umbrella, and Quantcast.
 *
 * SAFETY FEATURES:
 * - Auto-downloads if file missing or stale (>30 days)
 * - Fallback to existing file if download fails
 * - Validates file has minimum domains before using
 * - Alerts on critical failures
 *
 * Usage:
 *   npx ts-node scripts/seed-tranco.ts
 *   npx ts-node scripts/seed-tranco.ts --dry-run
 *   npx ts-node scripts/seed-tranco.ts --force-download  # Re-download even if recent
 */

import { PrismaClient } from '@prisma/client';
import { createReadStream, existsSync, statSync, writeFileSync, unlinkSync } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { TRANCO_TIERS, TIER_CONFIG } from '../apps/backend/src/config/tier-config';

const prisma = new PrismaClient();
const TRANCO_FILE = './data/tranco-top-1m.csv';
const TRANCO_BACKUP = './data/tranco-top-1m.csv.backup';
const TRANCO_META = './data/tranco-meta.json';
const TRANCO_URL = 'https://tranco-list.eu/download/X4ZJW/1000000';
const MAX_FILE_AGE_DAYS = 30;
const MIN_VALID_DOMAINS = 500000;

// Drift detection thresholds
const MAX_OVERLAP_DRIFT = 0.15; // Alert if <85% overlap with previous list
const MAX_RANK_VARIANCE = 0.20; // Alert if >20% of top 10K ranks shifted significantly

interface TrancoMeta {
  lastChecksum: string;
  lastDomainCount: number;
  lastTop10K: string[]; // Sample for overlap detection
  lastTop10KRanks: Record<string, number>; // domain -> rank mapping for variance detection
  lastUpdated: string;
}

function computeChecksum(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

function loadTrancoMeta(): TrancoMeta | null {
  try {
    if (existsSync(TRANCO_META)) {
      return JSON.parse(require('fs').readFileSync(TRANCO_META, 'utf-8'));
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function saveTrancoMeta(meta: TrancoMeta): void {
  require('fs').writeFileSync(TRANCO_META, JSON.stringify(meta, null, 2));
}

interface DriftAnalysis {
  hasDrift: boolean;
  warnings: string[];
  metrics: {
    overlapPercent: number;
    countVariance: number;
    medianRankDelta: number;
    maxRankSpike: number;
    domainsWithMajorRankChange: number;
  };
}

async function detectDataDrift(
  currentList: Map<string, number>,
  previousMeta: TrancoMeta | null
): Promise<DriftAnalysis> {
  const warnings: string[] = [];
  const metrics = {
    overlapPercent: 100,
    countVariance: 0,
    medianRankDelta: 0,
    maxRankSpike: 0,
    domainsWithMajorRankChange: 0,
  };

  if (!previousMeta) {
    return { hasDrift: false, warnings: ['First run - no baseline for drift detection'], metrics };
  }

  // Check overlap with previous top 10K
  let overlap = 0;
  if (previousMeta.lastTop10K && previousMeta.lastTop10K.length > 0) {
    for (const domain of previousMeta.lastTop10K) {
      if (currentList.has(domain)) {
        overlap++;
      }
    }
    metrics.overlapPercent = (overlap / previousMeta.lastTop10K.length) * 100;

    if (metrics.overlapPercent < (1 - MAX_OVERLAP_DRIFT) * 100) {
      warnings.push(
        `⚠️  LOW OVERLAP: Only ${metrics.overlapPercent.toFixed(1)}% of previous top 10K still present`
      );
    }
  }

  // Check domain count variance
  const countDiff = Math.abs(currentList.size - previousMeta.lastDomainCount);
  metrics.countVariance = countDiff / previousMeta.lastDomainCount;
  if (metrics.countVariance > 0.10) {
    warnings.push(
      `⚠️  COUNT VARIANCE: ${currentList.size} vs ${previousMeta.lastDomainCount} (${(metrics.countVariance * 100).toFixed(1)}% change)`
    );
  }

  // ENHANCED: Rank variance analysis
  const previousRanks = previousMeta.lastTop10KRanks || {};
  const rankDeltas: number[] = [];

  // Build current top 10K for comparison
  const currentTop10K = Array.from(currentList.entries())
    .filter(([, rank]) => rank <= 10000)
    .sort((a, b) => a[1] - b[1])
    .map(([domain]) => domain);

  for (const domain of currentTop10K) {
    const currentRank = currentList.get(domain);
    const previousRank = previousRanks[domain];

    if (previousRank !== undefined && currentRank !== undefined) {
      const delta = Math.abs(currentRank - previousRank);
      rankDeltas.push(delta);

      if (delta > metrics.maxRankSpike) {
        metrics.maxRankSpike = delta;
      }

      // Major change: moved more than 5000 positions or 50% of previous rank
      if (delta > 5000 || delta > previousRank * 0.5) {
        metrics.domainsWithMajorRankChange++;
      }
    }
  }

  // Calculate median rank delta
  if (rankDeltas.length > 0) {
    rankDeltas.sort((a, b) => a - b);
    metrics.medianRankDelta = rankDeltas[Math.floor(rankDeltas.length / 2)];
  }

  // Warn if median rank delta is high
  if (metrics.medianRankDelta > 500) {
    warnings.push(`⚠️  MEDIAN RANK DELTA: ${metrics.medianRankDelta} positions (threshold: 500)`);
  }

  // Warn if max spike is extreme
  if (metrics.maxRankSpike > 50000) {
    warnings.push(`⚠️  MAX RANK SPIKE: ${metrics.maxRankSpike} positions`);
  }

  // Warn if many domains had major rank changes
  if (metrics.domainsWithMajorRankChange > 100) {
    warnings.push(
      `⚠️  MAJOR RANK CHANGES: ${metrics.domainsWithMajorRankChange} domains (>5000 positions or >50%)`
    );
  }

  // Check top 100 specifically (most important)
  const top100Changes: string[] = [];
  for (let i = 0; i < Math.min(100, currentTop10K.length); i++) {
    const domain = currentTop10K[i];
    const previousRank = previousRanks[domain];

    if (previousRank !== undefined && previousRank > 200) {
      // Domain jumped into top 100 from outside top 200
      top100Changes.push(`${domain}: ${previousRank} → ${i + 1}`);
    }
  }

  if (top100Changes.length > 10) {
    warnings.push(
      `⚠️  TOP 100 CHURN: ${top100Changes.length} domains jumped into top 100 from outside top 200`
    );
  }

  // Check rank stability for anchor domains
  const anchorDomains = ['google.com', 'facebook.com', 'youtube.com', 'amazon.com', 'twitter.com'];
  for (const domain of anchorDomains) {
    const rank = currentList.get(domain);
    if (rank && rank > 1000) {
      warnings.push(`⚠️  ANCHOR ANOMALY: ${domain} dropped to rank ${rank}`);
    }
  }

  return {
    hasDrift: warnings.some(
      (w) =>
        w.includes('LOW OVERLAP') ||
        w.includes('ANCHOR ANOMALY') ||
        w.includes('MEDIAN RANK DELTA') ||
        w.includes('TOP 100 CHURN')
    ),
    warnings,
    metrics,
  };
}

async function downloadTrancoList(force: boolean): Promise<boolean> {
  // Check if we need to download
  let needsDownload = force || !existsSync(TRANCO_FILE);

  if (!needsDownload && existsSync(TRANCO_FILE)) {
    const stats = statSync(TRANCO_FILE);
    const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > MAX_FILE_AGE_DAYS) {
      console.log(`⚠️  Tranco file is ${Math.round(ageInDays)} days old, downloading fresh copy`);
      needsDownload = true;
    }
  }

  if (!needsDownload) {
    return true; // Existing file is fine
  }

  console.log('📥 Downloading Tranco list...');

  // Backup existing file
  if (existsSync(TRANCO_FILE)) {
    try {
      execSync(`cp "${TRANCO_FILE}" "${TRANCO_BACKUP}"`);
      console.log('   Backed up existing file');
    } catch (e) {
      console.warn('   Could not backup existing file');
    }
  }

  // Download new file
  try {
    execSync(`curl -f -s -o "${TRANCO_FILE}.tmp" "${TRANCO_URL}"`, { timeout: 120000 });

    // Validate downloaded file
    const lineCount = parseInt(execSync(`wc -l < "${TRANCO_FILE}.tmp"`).toString().trim(), 10);
    if (lineCount < MIN_VALID_DOMAINS) {
      console.error(`❌ Downloaded file has only ${lineCount} domains (expected ${MIN_VALID_DOMAINS}+)`);
      unlinkSync(`${TRANCO_FILE}.tmp`);
      return useBackup();
    }

    // Replace old file with new
    execSync(`mv "${TRANCO_FILE}.tmp" "${TRANCO_FILE}"`);
    console.log(`   Downloaded ${lineCount.toLocaleString()} domains`);
    return true;
  } catch (e) {
    console.error('❌ Failed to download Tranco list:', (e as Error).message);
    return useBackup();
  }
}

function useBackup(): boolean {
  if (existsSync(TRANCO_BACKUP)) {
    console.log('⚠️  Using backup file');
    execSync(`cp "${TRANCO_BACKUP}" "${TRANCO_FILE}"`);
    return true;
  }
  if (existsSync(TRANCO_FILE)) {
    console.log('⚠️  Using existing (possibly stale) file');
    return true;
  }
  return false;
}

async function seedTranco(dryRun: boolean, forceDownload: boolean): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     TRANCO RANK SEEDING                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Download/verify Tranco file
  const hasFile = await downloadTrancoList(forceDownload);
  if (!hasFile) {
    console.error('');
    console.error('❌ CRITICAL: No Tranco file available');
    console.error('   Manual download: curl -o data/tranco-top-1m.csv https://tranco-list.eu/download/X4ZJW/1000000');
    console.error('');
    console.error('   ⚠️  ALERT: Tranco seeding skipped - tier assignments may be suboptimal');
    process.exit(1);
  }
  console.log('');

  // Load Tranco list
  console.log('Loading Tranco list...');
  const trancoMap = new Map<string, number>();
  const top10K: string[] = [];
  const fileStream = createReadStream(TRANCO_FILE);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const [rankStr, domain] = line.split(',');
    if (!rankStr || !domain) continue;
    const rank = parseInt(rankStr, 10);
    if (!isNaN(rank)) {
      const normalizedDomain = domain.toLowerCase().trim();
      trancoMap.set(normalizedDomain, rank);
      if (rank <= 10000) {
        top10K.push(normalizedDomain);
      }
    }
  }

  console.log(`  Loaded ${trancoMap.size.toLocaleString()} domains from Tranco`);

  // Drift detection
  const previousMeta = loadTrancoMeta();
  const { hasDrift, warnings, metrics } = await detectDataDrift(trancoMap, previousMeta);

  if (warnings.length > 0) {
    console.log('');
    console.log('Data integrity checks:');
    warnings.forEach((w) => console.log(`  ${w}`));
  }

  // Always print metrics summary if we have baseline
  if (previousMeta) {
    console.log('');
    console.log('Drift metrics:');
    console.log(`  Overlap: ${metrics.overlapPercent.toFixed(1)}%`);
    console.log(`  Count variance: ${(metrics.countVariance * 100).toFixed(1)}%`);
    console.log(`  Median rank delta: ${metrics.medianRankDelta}`);
    console.log(`  Max rank spike: ${metrics.maxRankSpike}`);
    console.log(`  Major rank changes: ${metrics.domainsWithMajorRankChange}`);
  }

  if (hasDrift && !forceDownload) {
    console.log('');
    console.error('❌ SIGNIFICANT DATA DRIFT DETECTED');
    console.error('   The Tranco list has changed substantially.');
    console.error('   This could indicate methodology changes or data issues.');
    console.error('');
    console.error('   Options:');
    console.error('   1. Review changes and run with --force-download to accept');
    console.error('   2. Restore backup: cp data/tranco-top-1m.csv.backup data/tranco-top-1m.csv');
    console.error('');
    process.exit(1);
  }

  // Build rank mapping for top 10K (for variance detection)
  const top10KRanks: Record<string, number> = {};
  for (const domain of top10K) {
    const rank = trancoMap.get(domain);
    if (rank !== undefined) {
      top10KRanks[domain] = rank;
    }
  }

  // Save metadata for next run
  const fileContent = require('fs').readFileSync(TRANCO_FILE, 'utf-8');
  saveTrancoMeta({
    lastChecksum: computeChecksum(fileContent),
    lastDomainCount: trancoMap.size,
    lastTop10K: top10K.slice(0, 1000), // Save top 1K for overlap detection
    lastTop10KRanks: top10KRanks, // Save rank mapping for variance detection
    lastUpdated: new Date().toISOString(),
  });

  console.log('');

  // Get all domains and update
  const now = new Date();
  let updated = 0;
  let matched = 0;
  let cursor: string | undefined;

  console.log('Matching domains...');

  while (true) {
    const domains = await prisma.domain.findMany({
      take: 1000,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      select: { id: true, domain: true, trancoRank: true },
    });

    if (domains.length === 0) break;

    const updates = domains
      .map((d) => ({ id: d.id, rank: trancoMap.get(d.domain.toLowerCase()) }))
      .filter((u) => u.rank !== undefined && u.rank !== null);

    matched += updates.length;

    if (updates.length > 0 && !dryRun) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.domain.update({
            where: { id: u.id },
            data: { trancoRank: u.rank, trancoLastUpdated: now },
          })
        )
      );
      updated += updates.length;
    }

    cursor = domains[domains.length - 1]?.id;
    process.stdout.write(`\r  Processed: ${cursor ? domains.length : 0} | Matched: ${matched}`);
  }

  console.log('\n');

  // Assign initial tiers based on Tranco rank (respecting caps)
  console.log('Assigning initial tiers from Tranco...');

  // Check current tier counts
  const currentTierA = await prisma.domain.count({
    where: { indexTier: 'A', eligibleForScan: true },
  });
  const tierACapacity = TIER_CONFIG.A.maxCount ? Math.max(0, TIER_CONFIG.A.maxCount - currentTierA) : Infinity;

  console.log(`  Current Tier A: ${currentTierA} (cap: ${TIER_CONFIG.A.maxCount ?? 'unlimited'})`);
  console.log(`  Available slots: ${tierACapacity === Infinity ? 'unlimited' : tierACapacity}`);

  // Promote to Tier A: Top 10K (respecting cap)
  if (!dryRun) {
    // Get candidates ordered by Tranco rank
    const tierACandidates = await prisma.domain.findMany({
      where: {
        trancoRank: { lte: TRANCO_TIERS.tierAThreshold },
        indexTier: { not: 'A' },
        eligibleForScan: true,
      },
      orderBy: { trancoRank: 'asc' },
      take: tierACapacity === Infinity ? undefined : tierACapacity,
      select: { id: true },
    });

    if (tierACandidates.length > 0) {
      const tierA = await prisma.domain.updateMany({
        where: { id: { in: tierACandidates.map((c) => c.id) } },
        data: { indexTier: 'A' },
      });
      console.log(`  Promoted to Tier A (≤${TRANCO_TIERS.tierAThreshold.toLocaleString()}): ${tierA.count}`);

      if (tierACapacity !== Infinity) {
        const waitlisted = await prisma.domain.count({
          where: {
            trancoRank: { lte: TRANCO_TIERS.tierAThreshold },
            indexTier: { not: 'A' },
            eligibleForScan: true,
          },
        });
        if (waitlisted > 0) {
          console.log(`  ⚠️  ${waitlisted} domains waitlisted (Tier A at capacity)`);
        }
      }
    } else {
      console.log(`  Promoted to Tier A: 0`);
    }

    // Promote to Tier B: 10K-100K (no cap for Tier B in current config)
    const tierB = await prisma.domain.updateMany({
      where: {
        trancoRank: { gt: TRANCO_TIERS.tierAThreshold, lte: TRANCO_TIERS.tierBThreshold },
        indexTier: 'C',
        eligibleForScan: true,
      },
      data: { indexTier: 'B' },
    });
    console.log(
      `  Promoted to Tier B (${TRANCO_TIERS.tierAThreshold.toLocaleString()}-${TRANCO_TIERS.tierBThreshold.toLocaleString()}): ${tierB.count}`
    );
  } else {
    // Count what would be promoted
    const wouldTierA = await prisma.domain.count({
      where: {
        trancoRank: { lte: TRANCO_TIERS.tierAThreshold },
        indexTier: { not: 'A' },
        eligibleForScan: true,
      },
    });
    const wouldTierB = await prisma.domain.count({
      where: {
        trancoRank: { gt: TRANCO_TIERS.tierAThreshold, lte: TRANCO_TIERS.tierBThreshold },
        indexTier: 'C',
        eligibleForScan: true,
      },
    });
    const actualTierA = Math.min(wouldTierA, tierACapacity === Infinity ? wouldTierA : tierACapacity);
    console.log(`  Would promote to Tier A: ${actualTierA}${wouldTierA > actualTierA ? ` (${wouldTierA - actualTierA} waitlisted)` : ''}`);
    console.log(`  Would promote to Tier B: ${wouldTierB}`);
  }

  // Summary
  console.log('');
  console.log('─'.repeat(60));
  console.log('SUMMARY');
  console.log(`  Domains in Tranco: ${trancoMap.size.toLocaleString()}`);
  console.log(`  Matched in database: ${matched.toLocaleString()}`);
  console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${dryRun ? matched : updated}`);

  // Final tier distribution
  const tierCounts = await prisma.domain.groupBy({
    by: ['indexTier'],
    where: { eligibleForScan: true },
    _count: true,
  });

  console.log('');
  console.log('Tier distribution:');
  tierCounts
    .sort((a, b) => a.indexTier.localeCompare(b.indexTier))
    .forEach((t) => {
      console.log(`  Tier ${t.indexTier}: ${t._count.toLocaleString()}`);
    });

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceDownload = args.includes('--force-download');

seedTranco(dryRun, forceDownload)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
