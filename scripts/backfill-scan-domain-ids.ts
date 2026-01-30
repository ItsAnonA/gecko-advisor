#!/usr/bin/env npx ts-node

/**
 * BACKFILL SCAN DOMAIN IDS
 *
 * Populates the domainId field on Scan records by matching
 * normalizedInput to Domain.domain.
 *
 * This is required for the volatility service to work efficiently.
 *
 * SAFETY FEATURES:
 * - Resumable: Saves cursor to state file, can continue after crash
 * - Chunked: Processes 500 scans at a time with checkpoints
 * - Idempotent: Safe to run multiple times
 * - Locked: Prevents concurrent runs
 *
 * Usage:
 *   npx ts-node scripts/backfill-scan-domain-ids.ts --dry-run
 *   npx ts-node scripts/backfill-scan-domain-ids.ts
 *   npx ts-node scripts/backfill-scan-domain-ids.ts --reset  # Clear state and start fresh
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// ============================================================
// STATE MANAGEMENT (Resume Support)
// ============================================================

const STATE_FILE = '/tmp/gecko-backfill-scan-domains-state.json';
const LOCK_FILE = '/tmp/gecko-backfill-scan-domains-lock.json';
const CHUNK_SIZE = 500;

// Version tracking - bump when logic changes
const SCRIPT_VERSION = '1.0.0';
const SCHEMA_VERSION = '20260130'; // Migration date

interface BackfillState {
  // Version tracking (for safe resume)
  scriptVersion: string;
  schemaVersion: string;
  totalRowsAtStart: number;

  // Progress
  lastCursor: string | null;
  processed: number;
  updated: number;
  notMatched: number;
  startedAt: string;
  lastCheckpoint: string;
}

async function loadState(): Promise<{ state: BackfillState; isResume: boolean; versionMismatch: boolean }> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as BackfillState;

      // Check for version mismatch
      const versionMismatch =
        saved.scriptVersion !== SCRIPT_VERSION || saved.schemaVersion !== SCHEMA_VERSION;

      if (versionMismatch) {
        console.warn('⚠️  VERSION MISMATCH DETECTED');
        console.warn(`   Saved: script=${saved.scriptVersion}, schema=${saved.schemaVersion}`);
        console.warn(`   Current: script=${SCRIPT_VERSION}, schema=${SCHEMA_VERSION}`);
        return { state: saved, isResume: true, versionMismatch: true };
      }

      return { state: saved, isResume: true, versionMismatch: false };
    }
  } catch (e) {
    console.warn('Could not load state, starting fresh');
  }

  // Get total rows for new state
  const totalRows = await prisma.scan.count({
    where: { domainId: null, normalizedInput: { not: null } },
  });

  return {
    state: {
      scriptVersion: SCRIPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      totalRowsAtStart: totalRows,
      lastCursor: null,
      processed: 0,
      updated: 0,
      notMatched: 0,
      startedAt: new Date().toISOString(),
      lastCheckpoint: new Date().toISOString(),
    },
    isResume: false,
    versionMismatch: false,
  };
}

function saveState(state: BackfillState): void {
  state.lastCheckpoint = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clearState(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

function acquireLock(): boolean {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
      const lockAge = Date.now() - new Date(lock.startedAt).getTime();
      if (lockAge < 30 * 60 * 1000) {
        console.error('❌ BACKFILL ALREADY RUNNING');
        console.error(`   PID: ${lock.pid}, Started: ${lock.startedAt}`);
        return false;
      }
    }
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return true;
  } catch (e) {
    return false;
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {
    // Ignore
  }
}

// Extract domain from URL (matches normalizeDomain in domainService.ts)
function extractDomain(url: string): string {
  let hostname = url.toLowerCase().trim();

  // Strip protocol if present
  hostname = hostname.replace(/^https?:\/\//, '');

  // Strip www. prefix
  hostname = hostname.replace(/^www\./, '');

  // Strip path, query, fragment
  hostname = hostname.split('/')[0] ?? hostname;
  hostname = hostname.split('?')[0] ?? hostname;
  hostname = hostname.split('#')[0] ?? hostname;

  // Strip port if present
  hostname = hostname.split(':')[0] ?? hostname;

  return hostname;
}

async function backfillScanDomainIds(dryRun: boolean, reset: boolean): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BACKFILL SCAN DOMAIN IDS                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Handle reset
  if (reset) {
    clearState();
    console.log('🔄 State cleared, starting fresh\n');
  }

  // Load or initialize state
  const { state, isResume, versionMismatch } = await loadState();

  // Handle version mismatch
  if (versionMismatch && !reset) {
    console.error('');
    console.error('❌ CANNOT RESUME: Version mismatch detected');
    console.error('   The schema or script has changed since the last run.');
    console.error('   Resuming could cause data corruption.');
    console.error('');
    console.error('   Options:');
    console.error('   1. Run with --reset to start fresh (recommended)');
    console.error('   2. Verify data integrity and manually clear state file');
    console.error('');
    process.exit(1);
  }

  if (isResume && state.lastCursor) {
    console.log('📋 RESUMING from previous run');
    console.log(`   Started: ${state.startedAt}`);
    console.log(`   Last checkpoint: ${state.lastCheckpoint}`);
    console.log(`   Processed so far: ${state.processed}`);
    console.log(`   Version: script=${state.scriptVersion}, schema=${state.schemaVersion}`);
    console.log('');
  }

  // Get all domains for lookup
  console.log('Loading domains...');
  const domains = await prisma.domain.findMany({
    select: { id: true, domain: true },
  });
  const domainMap = new Map(domains.map((d) => [d.domain, d.id]));
  console.log(`  Loaded ${domainMap.size} domains\n`);

  // Get scans without domainId
  console.log('Finding scans without domainId...');
  const scansWithoutDomainId = await prisma.scan.count({
    where: { domainId: null, normalizedInput: { not: null } },
  });
  console.log(`  Found ${scansWithoutDomainId} scans to process\n`);

  if (scansWithoutDomainId === 0) {
    console.log('✅ All scans already have domainId set');
    clearState();
    return;
  }

  // Process in chunks with checkpoints
  let cursor: string | undefined = state.lastCursor ?? undefined;

  console.log('Processing scans...');

  while (true) {
    const scans = await prisma.scan.findMany({
      where: { domainId: null, normalizedInput: { not: null } },
      take: CHUNK_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      select: { id: true, normalizedInput: true },
    });

    if (scans.length === 0) break;

    const updates: { id: string; domainId: string }[] = [];

    for (const scan of scans) {
      if (!scan.normalizedInput) continue;

      const domain = extractDomain(scan.normalizedInput);
      const domainId = domainMap.get(domain);

      if (domainId) {
        updates.push({ id: scan.id, domainId });
      } else {
        state.notMatched++;
      }
    }

    if (!dryRun && updates.length > 0) {
      // Update in a transaction
      await prisma.$transaction(
        updates.map((u) =>
          prisma.scan.update({
            where: { id: u.id },
            data: { domainId: u.domainId },
          })
        )
      );
      state.updated += updates.length;
    } else if (dryRun) {
      state.updated += updates.length;
    }

    state.processed += scans.length;
    cursor = scans[scans.length - 1]?.id;
    state.lastCursor = cursor ?? null;

    // Save checkpoint every chunk
    if (!dryRun) {
      saveState(state);
    }

    process.stdout.write(
      `\r  Processed: ${state.processed} | Updated: ${state.updated} | No match: ${state.notMatched}`
    );
  }

  console.log('\n');
  console.log('─'.repeat(60));
  console.log('SUMMARY');
  console.log(`  Total processed: ${state.processed}`);
  console.log(`  Updated with domainId: ${state.updated}`);
  console.log(`  No matching domain: ${state.notMatched}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Backfill complete');
    clearState(); // Clean up on success
  }
}

async function backfillHistoricalPeakScores(dryRun: boolean): Promise<void> {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BACKFILL HISTORICAL PEAK SCORES                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Find domains without historical peak score
  const domainsToUpdate = await prisma.domain.count({
    where: { historicalPeakScore: null },
  });

  console.log(`Found ${domainsToUpdate} domains without historicalPeakScore\n`);

  if (domainsToUpdate === 0) {
    console.log('✅ All domains already have historicalPeakScore set');
    return;
  }

  // Update historical peak scores using raw query for efficiency
  if (!dryRun) {
    const result = await prisma.$executeRaw`
      UPDATE "Domain" d
      SET
        "historicalPeakScore" = subq.max_score,
        "historicalPeakDate" = subq.peak_date
      FROM (
        SELECT
          s."domainId",
          MAX(s.score) as max_score,
          (
            SELECT "finishedAt"
            FROM "Scan" s2
            WHERE s2."domainId" = s."domainId"
              AND s2.score = MAX(s.score)
            ORDER BY "finishedAt" DESC
            LIMIT 1
          ) as peak_date
        FROM "Scan" s
        WHERE s."domainId" IS NOT NULL
          AND s.status = 'done'
          AND s.score IS NOT NULL
        GROUP BY s."domainId"
      ) subq
      WHERE d.id = subq."domainId"
        AND d."historicalPeakScore" IS NULL
    `;

    console.log(`✅ Updated ${result} domains with historical peak scores`);
  } else {
    // Count how many would be updated
    const wouldUpdate = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT s."domainId") as count
      FROM "Scan" s
      JOIN "Domain" d ON d.id = s."domainId"
      WHERE s.status = 'done'
        AND s.score IS NOT NULL
        AND d."historicalPeakScore" IS NULL
    `;

    console.log(`🔍 Would update ${wouldUpdate[0]?.count ?? 0} domains`);
    console.log('   Run without --dry-run to apply changes');
  }
}

// Main
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reset = args.includes('--reset');

// Acquire lock (skip for dry-run)
if (!dryRun && !acquireLock()) {
  process.exit(1);
}

// Ensure lock is released on exit
process.on('SIGINT', () => {
  releaseLock();
  process.exit(130);
});
process.on('SIGTERM', () => {
  releaseLock();
  process.exit(143);
});

Promise.resolve()
  .then(() => backfillScanDomainIds(dryRun, reset))
  .then(() => backfillHistoricalPeakScores(dryRun))
  .then(() => {
    releaseLock();
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error('Error:', e);
    releaseLock();
    prisma.$disconnect();
    process.exit(1);
  });
