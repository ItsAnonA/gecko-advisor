#!/usr/bin/env tsx
/**
 * P0 #2: DDG Tracker Radar Shadow Ingestion
 *
 * Downloads DuckDuckGo Tracker Radar data and ingests it into shadow tables.
 * Shadow data is used for comparison against production lists only.
 *
 * DDG Tracker Radar format:
 * - Repo: https://github.com/duckduckgo/tracker-radar
 * - Entity map: build-data/generated/entity_list.json
 * - Domain data: domains/{country}/{domain}.json
 *   Each file: { owner, categories, prevalence, fingerprinting (0-3), cookies, resources }
 *
 * Usage: npx tsx scripts/ingest-ddg-radar.ts [--country US] [--limit 1000]
 *
 * Phase 3C Safe: Writes only to shadow tables. No production impact.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { readdir, readFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const prisma = new PrismaClient();

// ============================================================================
// Configuration
// ============================================================================

const DDG_REPO = 'https://github.com/duckduckgo/tracker-radar.git';
const CLONE_DIR = '/tmp/ddg-tracker-radar';
const DEFAULT_COUNTRY = 'US';
const DEFAULT_LIMIT = 0; // 0 = no limit

// ============================================================================
// Types
// ============================================================================

interface DDGDomainData {
  domain: string;
  owner?: {
    name?: string;
    displayName?: string;
    ownedBy?: string;
  };
  categories?: string[];
  prevalence?: number;
  fingerprinting?: number; // 0-3
  cookies?: number;
  resources?: unknown[];
  [key: string]: unknown;
}

interface IngestStats {
  totalFiles: number;
  ingested: number;
  skipped: number;
  errors: number;
  duration: number;
}

// ============================================================================
// Clone / Update Repo
// ============================================================================

async function ensureRepo(): Promise<string> {
  const domainsDir = path.join(CLONE_DIR, 'domains');

  if (existsSync(domainsDir)) {
    console.log('DDG Tracker Radar repo already cloned. Pulling latest...');
    try {
      execSync('git pull --ff-only', { cwd: CLONE_DIR, stdio: 'pipe' });
    } catch {
      console.log('Pull failed, re-cloning...');
      await rm(CLONE_DIR, { recursive: true, force: true });
    }
  }

  if (!existsSync(domainsDir)) {
    console.log('Cloning DDG Tracker Radar (sparse checkout, domains only)...');
    execSync(`git clone --depth 1 --filter=blob:none --sparse "${DDG_REPO}" "${CLONE_DIR}"`, {
      stdio: 'pipe',
    });
    execSync('git sparse-checkout set domains build-data/generated', {
      cwd: CLONE_DIR,
      stdio: 'pipe',
    });
  }

  return CLONE_DIR;
}

// ============================================================================
// Read Domain Files
// ============================================================================

async function readDomainFiles(
  repoDir: string,
  country: string,
  limit: number
): Promise<DDGDomainData[]> {
  const countryDir = path.join(repoDir, 'domains', country);

  try {
    await stat(countryDir);
  } catch {
    console.error(`Country directory not found: ${countryDir}`);
    console.log('Available countries:');
    const countries = await readdir(path.join(repoDir, 'domains'));
    console.log(countries.filter((d) => !d.startsWith('.')).join(', '));
    process.exit(1);
  }

  const files = await readdir(countryDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} domain files in ${country}/`);

  const filesToProcess = limit > 0 ? jsonFiles.slice(0, limit) : jsonFiles;
  const domains: DDGDomainData[] = [];

  for (const file of filesToProcess) {
    try {
      const content = await readFile(path.join(countryDir, file), 'utf8');
      const data = JSON.parse(content) as DDGDomainData;

      // Use filename as domain if not in data
      if (!data.domain) {
        data.domain = file.replace('.json', '');
      }

      domains.push(data);
    } catch (error) {
      console.warn(`Failed to parse ${file}: ${error}`);
    }
  }

  return domains;
}

// ============================================================================
// Get Version Info
// ============================================================================

function getRepoVersion(repoDir: string): string {
  try {
    const hash = execSync('git rev-parse --short HEAD', {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    const date = execSync('git log -1 --format=%cd --date=short', {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    return `${date}-${hash}`;
  } catch {
    return `manual-${new Date().toISOString().split('T')[0]}`;
  }
}

// ============================================================================
// Ingest to Shadow Tables
// ============================================================================

async function ingestToShadow(
  domains: DDGDomainData[],
  version: string
): Promise<IngestStats> {
  const startTime = Date.now();
  const stats: IngestStats = {
    totalFiles: domains.length,
    ingested: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
  };

  // Upsert the source record
  const source = await prisma.shadowTrackerSource.upsert({
    where: { name: 'ddg-tracker-radar' },
    update: {
      version,
      lastUpdated: new Date(),
      trackerCount: domains.length,
      metadata: {
        repo: DDG_REPO,
        ingestedAt: new Date().toISOString(),
      },
    },
    create: {
      name: 'ddg-tracker-radar',
      version,
      lastUpdated: new Date(),
      trackerCount: domains.length,
      metadata: {
        repo: DDG_REPO,
        ingestedAt: new Date().toISOString(),
      },
    },
  });

  // Clear existing trackers for this source (full refresh)
  await prisma.shadowTracker.deleteMany({
    where: { sourceId: source.id },
  });

  // Batch insert trackers
  const BATCH_SIZE = 100;
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);

    try {
      await prisma.shadowTracker.createMany({
        data: batch.map((d) => ({
          sourceId: source.id,
          domain: d.domain,
          owner: d.owner?.displayName ?? d.owner?.name ?? null,
          category: d.categories?.[0] ?? null,
          prevalence: d.prevalence ?? null,
          fingerprinting: d.fingerprinting ?? null,
          cookies: d.cookies ?? null,
          metadata: {
            categories: d.categories,
            ownerFull: d.owner,
            resourceCount: d.resources?.length ?? 0,
          },
        })),
      });
      stats.ingested += batch.length;
    } catch (error) {
      console.error(`Batch ${i}-${i + BATCH_SIZE} failed:`, error);
      stats.errors += batch.length;
    }

    // Progress
    if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= domains.length) {
      console.log(`  Ingested ${Math.min(i + BATCH_SIZE, domains.length)}/${domains.length}`);
    }
  }

  // Update source with actual count
  await prisma.shadowTrackerSource.update({
    where: { id: source.id },
    data: { trackerCount: stats.ingested },
  });

  stats.duration = Date.now() - startTime;
  return stats;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const countryIdx = args.indexOf('--country');
  const limitIdx = args.indexOf('--limit');

  const country = countryIdx >= 0 ? args[countryIdx + 1] ?? DEFAULT_COUNTRY : DEFAULT_COUNTRY;
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? '0', 10) : DEFAULT_LIMIT;

  console.log('=== DDG Tracker Radar Shadow Ingestion ===\n');
  console.log(`Country: ${country}`);
  console.log(`Limit: ${limit || 'none'}\n`);

  // Step 1: Ensure repo is cloned
  const repoDir = await ensureRepo();
  const version = getRepoVersion(repoDir);
  console.log(`\nRepo version: ${version}\n`);

  // Step 2: Read domain files
  const domains = await readDomainFiles(repoDir, country, limit);
  console.log(`\nLoaded ${domains.length} domain entries\n`);

  // Step 3: Ingest to shadow tables
  console.log('Ingesting to shadow tables...');
  const stats = await ingestToShadow(domains, version);

  // Step 4: Report
  console.log('\n=== Ingestion Complete ===');
  console.log(`  Total files: ${stats.totalFiles}`);
  console.log(`  Ingested: ${stats.ingested}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Duration: ${(stats.duration / 1000).toFixed(1)}s`);

  // Step 5: Sample output
  const sample = await prisma.shadowTracker.findMany({
    take: 5,
    orderBy: { prevalence: 'desc' },
    where: { source: { name: 'ddg-tracker-radar' } },
  });

  console.log('\nTop 5 by prevalence:');
  for (const t of sample) {
    console.log(
      `  ${t.domain} (owner: ${t.owner ?? 'unknown'}, prevalence: ${t.prevalence ?? 'N/A'}, fp: ${t.fingerprinting ?? 'N/A'})`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Ingestion failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
