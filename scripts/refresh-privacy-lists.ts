#!/usr/bin/env tsx
/*
 * Refresh tracker signature lists from upstream sources.
 *
 * Two sources, same Adblock-Plus parser, different canary sets:
 *   - EasyPrivacy (https://easylist.to/easylist/easyprivacy.txt)
 *       Tracking/analytics rules. ~36K eTLD+1 domains.
 *   - EasyList    (https://easylist.to/easylist/easylist.txt)
 *       AdTech ecosystem (amazon-adsystem, adnxs, adsafeprotected,
 *       indexww, criteo, taboola, etc.) that EasyPrivacy doesn't cover.
 *       Validation surfaced this gap on 2026-04-27 — tracker counts on
 *       Tier-A sites were ~50% of expected because the AdTech stack
 *       wasn't classified.
 *
 * What this does (per source):
 *   1. Fetch upstream filter list
 *   2. Parse Adblock Plus syntax — extract block rules; skip exceptions,
 *      element-hiding, regex, $domain=, $~third-party, $1p modifiers
 *   3. Normalize hostnames to eTLD+1 via psl
 *   4. Validate: floor + source-specific canary set; hard-exit on fail
 *   5. Version (ISO date + sha256[12]); write CachedList row
 *
 * Worker unions both rows at classification time; EasyList absent during
 * transition is OK (warns but continues with EasyPrivacy only).
 *
 * Usage:
 *   tsx scripts/refresh-privacy-lists.ts                 # both sources
 *   tsx scripts/refresh-privacy-lists.ts --easyprivacy   # EasyPrivacy only
 *   tsx scripts/refresh-privacy-lists.ts --easylist      # EasyList only
 *   tsx scripts/refresh-privacy-lists.ts --dry-run       # parse + validate, no DB write
 *
 * Exit codes:
 *   0 success
 *   1 fetch / runtime error
 *   2 validation failure (any source below floor or missing canary)
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseList,
  validateList,
  EASYPRIVACY_CANARIES,
  EASYLIST_CANARIES,
} from '@gecko-advisor/shared';

// ============================================================
// Configuration
// ============================================================

interface SourceConfig {
  /** CachedList.source key */
  key: 'easyprivacy' | 'easylist';
  /** Display label for logs */
  label: string;
  /** Upstream URL (env-overridable) */
  url: string;
  /** Required canary domains for this source */
  canaries: readonly string[];
}

const SOURCES: SourceConfig[] = [
  {
    key: 'easyprivacy',
    label: 'EasyPrivacy',
    url:
      process.env.EASYPRIVACY_URL ??
      'https://easylist.to/easylist/easyprivacy.txt',
    canaries: EASYPRIVACY_CANARIES,
  },
  {
    key: 'easylist',
    label: 'EasyList',
    url:
      process.env.EASYLIST_URL ??
      'https://easylist.to/easylist/easylist.txt',
    canaries: EASYLIST_CANARIES,
  },
];

// ============================================================
// I/O
// ============================================================

async function fetchUpstream(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'gecko-advisor-privacy-list-refresh/1.0 (+https://geckoadvisor.com)',
      Accept: 'text/plain',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText} from ${url}`);
  }
  return res.text();
}

async function seedWhoTracksIfMissing(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.cachedList.findFirst({
    where: { source: 'whotracks' },
  });
  if (existing) {
    console.log('[refresh] whotracks already present in DB — skipping seed');
    return;
  }

  const demoPath = path.resolve(
    process.cwd(),
    'packages/shared/data/whotracks-demo.json',
  );
  const raw = await readFile(demoPath, 'utf8');
  const data = JSON.parse(raw);
  await prisma.cachedList.create({
    data: {
      source: 'whotracks',
      version: `demo-${new Date().toISOString().slice(0, 10)}`,
      data,
    },
  });
  console.log('[refresh] seeded whotracks from demo fixture (no upstream ingestion yet)');
}

// ============================================================
// Per-source ingestion
// ============================================================

interface IngestResult {
  source: SourceConfig;
  domains: string[];
  version: string;
}

async function ingestSource(source: SourceConfig): Promise<IngestResult> {
  console.log(`\n=== ${source.label} ===`);
  console.log(`[${source.key}] source: ${source.url}`);
  const t0 = Date.now();
  const text = await fetchUpstream(source.url);
  console.log(
    `[${source.key}] fetched ${text.length.toLocaleString()} bytes in ${Date.now() - t0}ms`,
  );

  const { domains, stats } = parseList(text);
  console.log(
    `[${source.key}] parsed: ${stats.totalLines} lines, ${stats.blockRules} block rules, ` +
      `${stats.parsed} extracted, ${domains.size} unique eTLD+1 domains`,
  );

  const sorted = [...domains].sort();
  const sha = crypto
    .createHash('sha256')
    .update(sorted.join('\n'))
    .digest('hex')
    .slice(0, 12);
  const version = `${new Date().toISOString().slice(0, 10)}-${sha}`;
  console.log(`[${source.key}] version: ${version}`);

  const validation = validateList(domains, { canaries: source.canaries });
  if (!validation.ok) {
    console.error(`[${source.key}] VALIDATION FAILED:`);
    for (const r of validation.reasons) console.error('  -', r);
    console.error(
      `\nSample parsed domains (first 15): ${sorted.slice(0, 15).join(', ')}`,
    );
    process.exit(2);
  }

  const sample = sorted
    .slice(0, 10)
    .concat(
      sorted.slice(
        Math.floor(sorted.length / 2),
        Math.floor(sorted.length / 2) + 5,
      ),
    );
  console.log(`[${source.key}] validation passed. Sample:`, sample.join(', '));

  return { source, domains: sorted, version };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Source selection: explicit flag wins, otherwise both.
  const onlyEasyPrivacy = args.includes('--easyprivacy');
  const onlyEasyList = args.includes('--easylist');
  const selected = SOURCES.filter((s) => {
    if (onlyEasyPrivacy && !onlyEasyList) return s.key === 'easyprivacy';
    if (onlyEasyList && !onlyEasyPrivacy) return s.key === 'easylist';
    return true;
  });

  console.log(
    `[refresh] sources: ${selected.map((s) => s.key).join(', ')}` +
      (dryRun ? ' (dry-run)' : ''),
  );

  // Ingest each source. validateList() hard-exits the process on failure
  // so a partial write can't happen — we either get all results or none.
  const results: IngestResult[] = [];
  for (const s of selected) {
    results.push(await ingestSource(s));
  }

  if (dryRun) {
    console.log('\n[refresh] --dry-run: skipping DB write');
    return;
  }

  console.log('\n=== writing to DB ===');
  const prisma = new PrismaClient();
  try {
    for (const r of results) {
      await prisma.$transaction(async (tx) => {
        await tx.cachedList.deleteMany({ where: { source: r.source.key } });
        await tx.cachedList.create({
          data: {
            source: r.source.key,
            version: r.version,
            data: {
              domains: r.domains,
              version: r.version,
              count: r.domains.length,
              fetchedAt: new Date().toISOString(),
            },
          },
        });
      });
      console.log(
        `[refresh] wrote CachedList(source="${r.source.key}", version="${r.version}", domains=${r.domains.length})`,
      );
    }
    await seedWhoTracksIfMissing(prisma);
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    '\n[refresh] done. Worker will pick up new lists on next 5-minute cache expiry, or restart worker to force.',
  );
}

main().catch((err) => {
  console.error('[refresh] FATAL:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
