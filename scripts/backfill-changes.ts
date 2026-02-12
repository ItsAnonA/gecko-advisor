#!/usr/bin/env npx ts-node

/**
 * BACKFILL DOMAIN CHANGES
 *
 * Detects and records privacy changes for historical scans.
 * Processes scans from the last 30 days (or specified period).
 *
 * SAFETY FEATURES:
 * - Resumable: Saves cursor to state file, can continue after crash
 * - Chunked: Processes 100 scans at a time with checkpoints
 * - Idempotent: Safe to run multiple times (skips already-recorded changes)
 * - Locked: Prevents concurrent runs
 *
 * Usage:
 *   npx ts-node scripts/backfill-changes.ts --dry-run
 *   npx ts-node scripts/backfill-changes.ts
 *   npx ts-node scripts/backfill-changes.ts --reset  # Clear state and start fresh
 *   npx ts-node scripts/backfill-changes.ts --days=60  # Look back 60 days
 */

import { PrismaClient, ChangeType, Scan } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// ============================================================
// STATE MANAGEMENT (Resume Support)
// ============================================================

const STATE_FILE = '/tmp/gecko-backfill-changes-state.json';
const LOCK_FILE = '/tmp/gecko-backfill-changes-lock.json';
const CHUNK_SIZE = 100;

const SCRIPT_VERSION = '1.0.0';
const SCHEMA_VERSION = '20260131';

interface BackfillState {
  scriptVersion: string;
  schemaVersion: string;
  totalRowsAtStart: number;
  lastCursor: string | null;
  processed: number;
  changesRecorded: number;
  skippedNoPrevious: number;
  skippedNoChange: number;
  skippedAlreadyExists: number;
  errors: number;
  startedAt: string;
  lastCheckpoint: string;
}

// ============================================================
// CHANGE DETECTION LOGIC
// ============================================================

const THRESHOLDS = {
  SKIP_DELTA: 2,
  SKIP_SIGNIFICANCE: 0.05,
  MINOR_MAX: 5,
  MODERATE_MAX: 15,
  MAJOR_MAX: 25,
};

interface ScanData {
  scanId: string;
  score: number;
  trackers: string[];
  trackerCount: number;
  hasFingerprinting: boolean;
  finishedAt: Date | null;
}

function extractScanData(
  scan: Scan & { evidence: Array<{ kind: string; details: unknown }> }
): ScanData {
  const trackers: string[] = [];
  let hasFingerprinting = false;

  for (const evidence of scan.evidence) {
    if (evidence.kind === 'tracker' || evidence.kind === 'third_party_tracker') {
      const details = evidence.details as { domain?: string; root?: string };
      const domain = details.domain || details.root;
      if (domain) {
        trackers.push(domain);
      }
    }

    if (
      evidence.kind === 'fingerprint'
    ) {
      hasFingerprinting = true;
    }
  }

  return {
    scanId: scan.id,
    score: scan.score ?? 0,
    trackers: [...new Set(trackers)],
    trackerCount: trackers.length,
    hasFingerprinting,
    finishedAt: scan.finishedAt,
  };
}

function classifyChange(
  scoreDelta: number,
  fingerprintingChanged: boolean,
  trackersAdded: number,
  trackersRemoved: number
): ChangeType {
  const absDelta = Math.abs(scoreDelta);

  if (absDelta > THRESHOLDS.MAJOR_MAX || fingerprintingChanged) {
    return 'CRITICAL';
  }
  if (absDelta > THRESHOLDS.MODERATE_MAX) {
    return 'MAJOR';
  }
  if (absDelta > THRESHOLDS.MINOR_MAX) {
    return 'MODERATE';
  }
  if (absDelta >= THRESHOLDS.SKIP_DELTA) {
    return 'MINOR';
  }
  if (trackersAdded >= 3 || trackersRemoved >= 3) {
    return 'MINOR';
  }
  return 'NONE';
}

function calculateSignificance(
  absScoreDelta: number,
  fingerprintingChanged: boolean,
  trackersAdded: number,
  trackersRemoved: number
): number {
  let score = 0;
  score += Math.min(absScoreDelta / 50, 0.5);
  if (fingerprintingChanged) {
    score += 0.3;
  }
  const trackerChanges = trackersAdded + trackersRemoved;
  score += Math.min(trackerChanges / 10, 0.2);
  return Math.min(score, 1);
}

function buildChangeReasons(
  scoreDelta: number,
  fingerprintingChanged: boolean,
  currentFingerprinting: boolean,
  trackersAdded: string[],
  trackersRemoved: string[]
): string[] {
  const reasons: string[] = [];

  if (scoreDelta !== 0) {
    const direction = scoreDelta > 0 ? 'improved' : 'decreased';
    reasons.push(`Privacy score ${direction} by ${Math.abs(scoreDelta)} points`);
  }

  if (fingerprintingChanged) {
    if (currentFingerprinting) {
      reasons.push('Fingerprinting techniques detected');
    } else {
      reasons.push('Fingerprinting techniques removed');
    }
  }

  if (trackersAdded.length > 0) {
    if (trackersAdded.length <= 3) {
      reasons.push(`Added trackers: ${trackersAdded.join(', ')}`);
    } else {
      reasons.push(
        `Added ${trackersAdded.length} trackers including ${trackersAdded.slice(0, 2).join(', ')}`
      );
    }
  }

  if (trackersRemoved.length > 0) {
    if (trackersRemoved.length <= 3) {
      reasons.push(`Removed trackers: ${trackersRemoved.join(', ')}`);
    } else {
      reasons.push(`Removed ${trackersRemoved.length} trackers`);
    }
  }

  return reasons;
}

// ============================================================
// STATE MANAGEMENT FUNCTIONS
// ============================================================

async function loadState(
  lookbackDays: number
): Promise<{ state: BackfillState; isResume: boolean; versionMismatch: boolean }> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as BackfillState;
      const versionMismatch =
        saved.scriptVersion !== SCRIPT_VERSION || saved.schemaVersion !== SCHEMA_VERSION;
      return { state: saved, isResume: true, versionMismatch };
    }
  } catch (e) {
    console.warn('Could not load state, starting fresh');
  }

  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const totalRows = await prisma.scan.count({
    where: {
      status: 'done',
      score: { not: null },
      domainId: { not: null },
      finishedAt: { gte: cutoffDate },
    },
  });

  return {
    state: {
      scriptVersion: SCRIPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      totalRowsAtStart: totalRows,
      lastCursor: null,
      processed: 0,
      changesRecorded: 0,
      skippedNoPrevious: 0,
      skippedNoChange: 0,
      skippedAlreadyExists: 0,
      errors: 0,
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
      if (lockAge < 60 * 60 * 1000) {
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

// ============================================================
// MAIN BACKFILL LOGIC
// ============================================================

async function backfillChanges(dryRun: boolean, reset: boolean, lookbackDays: number): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BACKFILL DOMAIN CHANGES                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (reset) {
    clearState();
    console.log('🔄 State cleared, starting fresh\n');
  }

  const { state, isResume, versionMismatch } = await loadState(lookbackDays);

  if (versionMismatch && !reset) {
    console.error('❌ CANNOT RESUME: Version mismatch detected');
    console.error('   Run with --reset to start fresh');
    process.exit(1);
  }

  if (isResume && state.lastCursor) {
    console.log('📋 RESUMING from previous run');
    console.log(`   Started: ${state.startedAt}`);
    console.log(`   Last checkpoint: ${state.lastCheckpoint}`);
    console.log(`   Processed so far: ${state.processed}`);
    console.log('');
  }

  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  console.log(`Looking back ${lookbackDays} days (since ${cutoffDate.toISOString().split('T')[0]})`);
  console.log(`Total scans to process: ${state.totalRowsAtStart}\n`);

  let cursor: string | undefined = state.lastCursor ?? undefined;

  console.log('Processing scans...');

  while (true) {
    // Get next batch of scans with domainId
    const scans = await prisma.scan.findMany({
      where: {
        status: 'done',
        score: { not: null },
        domainId: { not: null },
        finishedAt: { gte: cutoffDate },
      },
      include: {
        evidence: {
          select: { kind: true, details: true },
        },
      },
      take: CHUNK_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
    });

    if (scans.length === 0) break;

    for (const scan of scans) {
      state.processed++;

      try {
        // Find previous scan for this domain
        const previousScan = await prisma.scan.findFirst({
          where: {
            domainId: scan.domainId!,
            status: 'done',
            score: { not: null },
            id: { not: scan.id },
            finishedAt: { lt: scan.finishedAt ?? new Date() },
          },
          orderBy: { finishedAt: 'desc' },
          include: {
            evidence: {
              select: { kind: true, details: true },
            },
          },
        });

        if (!previousScan) {
          state.skippedNoPrevious++;
          continue;
        }

        // Extract data
        const currentData = extractScanData(scan as Scan & { evidence: Array<{ kind: string; details: unknown }> });
        const previousData = extractScanData(previousScan as Scan & { evidence: Array<{ kind: string; details: unknown }> });

        // Calculate changes
        const scoreDelta = currentData.score - previousData.score;
        const absScoreDelta = Math.abs(scoreDelta);
        const trackersAdded = currentData.trackers.filter((t) => !previousData.trackers.includes(t));
        const trackersRemoved = previousData.trackers.filter((t) => !currentData.trackers.includes(t));
        const fingerprintingChanged = currentData.hasFingerprinting !== previousData.hasFingerprinting;

        const changeType = classifyChange(scoreDelta, fingerprintingChanged, trackersAdded.length, trackersRemoved.length);
        const significanceScore = calculateSignificance(absScoreDelta, fingerprintingChanged, trackersAdded.length, trackersRemoved.length);

        // Skip insignificant changes
        if (changeType === 'NONE' && absScoreDelta < THRESHOLDS.SKIP_DELTA && significanceScore < THRESHOLDS.SKIP_SIGNIFICANCE) {
          state.skippedNoChange++;
          continue;
        }

        // Check if already recorded
        const existingChange = await prisma.domainChange.findUnique({
          where: {
            domainId_scanId: {
              domainId: scan.domainId!,
              scanId: scan.id,
            },
          },
        });

        if (existingChange) {
          state.skippedAlreadyExists++;
          continue;
        }

        // Record change
        if (!dryRun) {
          const changeReasons = buildChangeReasons(
            scoreDelta,
            fingerprintingChanged,
            currentData.hasFingerprinting,
            trackersAdded,
            trackersRemoved
          );

          await prisma.domainChange.create({
            data: {
              domainId: scan.domainId!,
              scanId: scan.id,
              previousScanId: previousScan.id,
              scoreBefore: previousData.score,
              scoreAfter: currentData.score,
              scoreDelta,
              trackerCountBefore: previousData.trackerCount,
              trackerCountAfter: currentData.trackerCount,
              trackersAdded,
              trackersRemoved,
              fingerprintingBefore: previousData.hasFingerprinting,
              fingerprintingAfter: currentData.hasFingerprinting,
              fingerprintingChanged,
              changeType,
              significanceScore,
              changeReasons,
              detectedAt: scan.finishedAt ?? new Date(),
            },
          });
        }

        state.changesRecorded++;
      } catch (e) {
        state.errors++;
        console.error(`\n  Error processing scan ${scan.id}:`, e);
      }
    }

    cursor = scans[scans.length - 1]?.id;
    state.lastCursor = cursor ?? null;

    if (!dryRun) {
      saveState(state);
    }

    process.stdout.write(
      `\r  Processed: ${state.processed} | Recorded: ${state.changesRecorded} | No previous: ${state.skippedNoPrevious} | No change: ${state.skippedNoChange} | Exists: ${state.skippedAlreadyExists} | Errors: ${state.errors}`
    );
  }

  console.log('\n');
  console.log('─'.repeat(60));
  console.log('SUMMARY');
  console.log(`  Total processed: ${state.processed}`);
  console.log(`  Changes recorded: ${state.changesRecorded}`);
  console.log(`  Skipped (no previous scan): ${state.skippedNoPrevious}`);
  console.log(`  Skipped (no significant change): ${state.skippedNoChange}`);
  console.log(`  Skipped (already exists): ${state.skippedAlreadyExists}`);
  console.log(`  Errors: ${state.errors}`);

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Backfill complete');
    clearState();
  }
}

// ============================================================
// MAIN
// ============================================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reset = args.includes('--reset');
const daysArg = args.find((a) => a.startsWith('--days='));
const lookbackDays = daysArg ? parseInt(daysArg.split('=')[1] ?? '30', 10) : 30;

if (!dryRun && !acquireLock()) {
  process.exit(1);
}

process.on('SIGINT', () => {
  releaseLock();
  process.exit(130);
});
process.on('SIGTERM', () => {
  releaseLock();
  process.exit(143);
});

backfillChanges(dryRun, reset, lookbackDays)
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
