#!/usr/bin/env tsx
/**
 * P0 #2: Shadow Score Comparison
 *
 * Compares DDG Tracker Radar shadow data against production tracker lists
 * for recent scans. Writes results to ShadowScoreComparison table.
 *
 * This does NOT change any production scores. It only records what the
 * score difference would be if we used DDG data.
 *
 * Usage: npx tsx scripts/shadow-score-comparison.ts [--limit 50] [--dry-run]
 *
 * Phase 3C Safe: Read-only on production data, writes to shadow tables only.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Types
// ============================================================================

interface ComparisonResult {
  scanId: string;
  domainId: string;
  domain: string;
  productionScore: number;
  productionTrackers: number;
  shadowTrackers: number;
  trackerDelta: number;
  newTrackersFound: string[];
}

interface ComparisonStats {
  scansProcessed: number;
  comparisonsRecorded: number;
  avgTrackerDelta: number;
  maxTrackerDelta: number;
  domainsWithNewTrackers: number;
  duration: number;
}

// ============================================================================
// Load Shadow Data
// ============================================================================

async function loadShadowDomains(): Promise<Set<string>> {
  const shadowTrackers = await prisma.shadowTracker.findMany({
    where: { source: { name: 'ddg-tracker-radar' } },
    select: { domain: true },
  });

  const domains = new Set(shadowTrackers.map((t) => t.domain.toLowerCase()));
  console.log(`Loaded ${domains.size} shadow tracker domains from DDG Tracker Radar`);
  return domains;
}

// ============================================================================
// Load Production Data
// ============================================================================

async function loadProductionTrackerDomains(): Promise<Set<string>> {
  // Try CachedList first (production source)
  const cachedLists = await prisma.cachedList.findMany();
  const domains = new Set<string>();

  for (const list of cachedLists) {
    const data = list.data as Record<string, unknown>;

    // EasyPrivacy domains
    if (Array.isArray(data.domains)) {
      for (const d of data.domains) {
        if (typeof d === 'string') domains.add(d.toLowerCase());
      }
    }

    // WhoTracks.me trackers
    if (Array.isArray(data.trackers)) {
      for (const t of data.trackers) {
        if (typeof t === 'object' && t !== null && 'domain' in t) {
          const tracker = t as { domain: string };
          if (typeof tracker.domain === 'string') {
            domains.add(tracker.domain.toLowerCase());
          }
        }
      }
    }

    // WhoTracks.me fingerprinting
    if (Array.isArray(data.fingerprinting)) {
      for (const d of data.fingerprinting) {
        if (typeof d === 'string') domains.add(d.toLowerCase());
      }
    }
  }

  if (domains.size === 0) {
    console.log('CachedList empty, falling back to demo JSON files...');
    // Fallback: this would require reading the files but in this script
    // we just note the gap
    console.warn('  Warning: Production tracker list is empty. Comparison will show all shadow trackers as "new".');
  }

  console.log(`Loaded ${domains.size} production tracker domains`);
  return domains;
}

// ============================================================================
// Compare Scans
// ============================================================================

async function compareScans(
  limit: number,
  dryRun: boolean,
  shadowDomains: Set<string>,
  productionDomains: Set<string>
): Promise<ComparisonResult[]> {
  // Get recent completed scans with evidence
  const recentScans = await prisma.scan.findMany({
    where: {
      status: 'done',
      score: { not: null },
      domainId: { not: null },
    },
    orderBy: { finishedAt: 'desc' },
    take: limit,
    include: {
      evidence: {
        select: { kind: true, details: true },
      },
      domain: {
        select: { domain: true },
      },
    },
  });

  console.log(`\nProcessing ${recentScans.length} recent scans...`);

  const results: ComparisonResult[] = [];

  for (const scan of recentScans) {
    if (!scan.domainId || !scan.domain) continue;

    // Extract tracker domains from evidence (using kind, not type)
    const productionTrackers = new Set<string>();
    for (const ev of scan.evidence) {
      if (ev.kind === 'tracker' || ev.kind === 'third_party_tracker') {
        const details = ev.details as { domain?: string; root?: string };
        const domain = details.domain || details.root;
        if (domain) productionTrackers.add(domain.toLowerCase());
      }
    }

    // Find what DDG shadow data would additionally flag
    // Get all third-party domains from evidence
    const allThirdPartyDomains = new Set<string>();
    for (const ev of scan.evidence) {
      if (ev.kind === 'thirdparty') {
        const details = ev.details as { domain?: string };
        if (details.domain) allThirdPartyDomains.add(details.domain.toLowerCase());
      }
    }

    // Check which third-party domains DDG would flag as trackers
    const shadowFlagged = new Set<string>();
    for (const domain of allThirdPartyDomains) {
      if (shadowDomains.has(domain)) {
        shadowFlagged.add(domain);
      }
      // Also check parent domain (e.g., cdn.facebook.com → facebook.com)
      const parts = domain.split('.');
      if (parts.length > 2) {
        const parent = parts.slice(-2).join('.');
        if (shadowDomains.has(parent)) {
          shadowFlagged.add(domain);
        }
      }
    }

    // Trackers found by shadow but not production
    const newTrackers = [...shadowFlagged].filter(
      (d) => !productionTrackers.has(d) && !productionDomains.has(d)
    );

    const result: ComparisonResult = {
      scanId: scan.id,
      domainId: scan.domainId,
      domain: scan.domain.domain,
      productionScore: scan.score ?? 0,
      productionTrackers: productionTrackers.size,
      shadowTrackers: productionTrackers.size + newTrackers.length,
      trackerDelta: newTrackers.length,
      newTrackersFound: newTrackers,
    };

    results.push(result);
  }

  // Write to ShadowScoreComparison table (unless dry run)
  if (!dryRun) {
    for (const result of results) {
      // Estimate shadow score (rough: 5 pts per additional tracker)
      const estimatedPenaltyIncrease = Math.min(result.trackerDelta * 5, 50);
      const shadowScore = Math.max(0, result.productionScore - estimatedPenaltyIncrease);

      await prisma.shadowScoreComparison.create({
        data: {
          scanId: result.scanId,
          domainId: result.domainId,
          productionScore: result.productionScore,
          productionTrackers: result.productionTrackers,
          shadowScore,
          shadowTrackers: result.shadowTrackers,
          scoreDelta: shadowScore - result.productionScore,
          trackerDelta: result.trackerDelta,
          newTrackersFound: result.newTrackersFound,
        },
      });
    }
  }

  return results;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const dryRun = args.includes('--dry-run');

  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? '50', 10) : 50;

  console.log('=== Shadow Score Comparison ===\n');
  console.log(`Limit: ${limit} scans`);
  console.log(`Dry run: ${dryRun}\n`);

  const startTime = Date.now();

  // Step 1: Load shadow data
  const shadowDomains = await loadShadowDomains();
  if (shadowDomains.size === 0) {
    console.error('\nNo shadow tracker data found. Run ingest-ddg-radar.ts first.');
    process.exit(1);
  }

  // Step 2: Load production data
  const productionDomains = await loadProductionTrackerDomains();

  // Step 3: Compare
  const results = await compareScans(limit, dryRun, shadowDomains, productionDomains);

  // Step 4: Statistics
  const duration = Date.now() - startTime;
  const withNewTrackers = results.filter((r) => r.trackerDelta > 0);
  const totalDelta = results.reduce((sum, r) => sum + r.trackerDelta, 0);
  const maxDelta = Math.max(0, ...results.map((r) => r.trackerDelta));

  const stats: ComparisonStats = {
    scansProcessed: results.length,
    comparisonsRecorded: dryRun ? 0 : results.length,
    avgTrackerDelta: results.length > 0 ? totalDelta / results.length : 0,
    maxTrackerDelta: maxDelta,
    domainsWithNewTrackers: withNewTrackers.length,
    duration,
  };

  console.log('\n=== Comparison Results ===');
  console.log(`  Scans processed: ${stats.scansProcessed}`);
  console.log(`  Comparisons recorded: ${stats.comparisonsRecorded}`);
  console.log(`  Avg tracker delta: ${stats.avgTrackerDelta.toFixed(1)}`);
  console.log(`  Max tracker delta: ${stats.maxTrackerDelta}`);
  console.log(`  Domains with new trackers: ${stats.domainsWithNewTrackers}`);
  console.log(`  Duration: ${(stats.duration / 1000).toFixed(1)}s`);

  // Show top gaps
  const sorted = results.sort((a, b) => b.trackerDelta - a.trackerDelta);
  const top10 = sorted.slice(0, 10);

  if (top10.length > 0 && top10[0]!.trackerDelta > 0) {
    console.log('\nTop coverage gaps (most new trackers found by DDG):');
    for (const r of top10) {
      if (r.trackerDelta === 0) break;
      console.log(
        `  ${r.domain}: +${r.trackerDelta} trackers (production: ${r.productionTrackers}, shadow: ${r.shadowTrackers})`
      );
      if (r.newTrackersFound.length <= 5) {
        console.log(`    New: ${r.newTrackersFound.join(', ')}`);
      } else {
        console.log(`    New: ${r.newTrackersFound.slice(0, 5).join(', ')} (+${r.newTrackersFound.length - 5} more)`);
      }
    }
  } else {
    console.log('\nNo coverage gaps found (DDG found no additional trackers).');
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Comparison failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
