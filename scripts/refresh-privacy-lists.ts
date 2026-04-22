#!/usr/bin/env tsx
/*
 * Refresh tracker signature lists from upstream sources.
 *
 * EasyPrivacy ingestion replaces the prior 4-domain demo fallback that was
 * silently running in production. See memory/project-tracker-detector-gate-bug.md
 * and session notes dated 2026-04-22/23.
 *
 * What this does:
 *   1. Fetch https://easylist.to/easylist/easyprivacy.txt
 *   2. Parse Adblock Plus filter syntax — extract blocking rules only
 *   3. Normalize extracted hostnames to eTLD+1 via tldts
 *   4. Validate: must have >= MIN_DOMAIN_COUNT, must include canary trackers
 *   5. Version + hash, write to CachedList (source="easyprivacy")
 *   6. Seed whotracks from demo JSON if missing (preserves current behavior)
 *
 * Usage:
 *   tsx scripts/refresh-privacy-lists.ts                # fetch + validate + write
 *   tsx scripts/refresh-privacy-lists.ts --dry-run      # parse + validate only
 *   tsx scripts/refresh-privacy-lists.ts --source=URL   # alternate upstream
 *
 * Exit codes:
 *   0 success
 *   1 fetch / runtime error
 *   2 validation failure (fewer than MIN_DOMAIN_COUNT, or canary missing)
 *
 * Schedule suggestion: daily at 03:00 (before update-stability / other jobs
 * that rely on consistent tracker counts).
 */
import { PrismaClient } from '@prisma/client';
import { getDomain } from 'tldts';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// ============================================================
// Configuration
// ============================================================

const EASYPRIVACY_URL =
  process.env.EASYPRIVACY_URL ?? 'https://easylist.to/easylist/easyprivacy.txt';

/**
 * Floor for a sane list. EasyPrivacy ships ~10K domains; a dramatic drop
 * probably means upstream format changed or fetch was partial.
 */
const MIN_DOMAIN_COUNT = 5_000;

/**
 * Canary trackers that MUST be present. If any is missing the ingestion
 * failed in a way that would ship broken data. These are the tent-pole
 * trackers any working EasyPrivacy ingestion will contain.
 */
const CANARIES = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.net',
  'googlesyndication.com',
  'scorecardresearch.com',
];

// ============================================================
// Parser
// ============================================================

/**
 * Extract a canonical eTLD+1 domain from one EasyPrivacy filter line.
 * Returns null for anything that isn't a network block rule we can use.
 *
 * Supported forms (all with various option suffixes after $):
 *   ||tracker.example.com^
 *   ||tracker.example.com/path
 *   ||tracker.example.com$script,third-party
 *   ||sub.tracker.example.com^$domain=foo.com
 *
 * Rejected:
 *   @@||...       (exceptions / allowlist)
 *   !...          (comments, headers)
 *   [Adblock...]  (header lines)
 *   foo##.ad      (element hiding)
 *   foo#@#.ad     (element hiding exceptions)
 *   /bar/         (regex rules)
 */
export function parseEasyPrivacyLine(line: string): string | null {
  const t = line.trim();
  if (!t) return null;

  // Comments and metadata
  if (t.startsWith('!') || t.startsWith('[')) return null;

  // Allowlist exceptions — we're only interested in BLOCK rules
  if (t.startsWith('@@')) return null;

  // Element-hiding / scriptlet rules (not network blocks)
  if (/#[@?$]?#/.test(t)) return null;

  // Regex rules — skip for Phase 1
  if (t.startsWith('/') && t.endsWith('/')) return null;

  // Network block rules start with ||
  if (!t.startsWith('||')) return null;

  // Strip leading ||, cut at the first of ^ / $ ? or whitespace
  const body = t.slice(2);
  const m = body.match(/^([a-z0-9][a-z0-9.\-_*]*?)(?:[\^/?$]|$)/i);
  if (!m) return null;

  let host = m[1].toLowerCase();

  // Reject pure wildcards and leading-dot / double-dot patterns
  if (host.includes('*') || host.startsWith('.') || host.includes('..')) return null;
  if (!host.includes('.')) return null;

  // Normalize to eTLD+1 via public suffix list
  const root = getDomain(host);
  return root || null;
}

export function parseList(text: string): {
  domains: Set<string>;
  stats: { totalLines: number; blockRules: number; parsed: number };
} {
  const domains = new Set<string>();
  let blockRules = 0;
  let parsed = 0;
  let totalLines = 0;

  for (const line of text.split('\n')) {
    totalLines++;
    if (line.trim().startsWith('||')) blockRules++;
    const d = parseEasyPrivacyLine(line);
    if (d) {
      parsed++;
      domains.add(d);
    }
  }

  return { domains, stats: { totalLines, blockRules, parsed } };
}

// ============================================================
// Validation
// ============================================================

export function validateList(domains: Set<string>): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (domains.size < MIN_DOMAIN_COUNT) {
    reasons.push(
      `domain count ${domains.size} < floor ${MIN_DOMAIN_COUNT} (upstream format change or partial fetch?)`,
    );
  }

  const missing = CANARIES.filter((c) => !domains.has(c));
  if (missing.length > 0) {
    reasons.push(`missing canary trackers: ${missing.join(', ')}`);
  }

  return { ok: reasons.length === 0, reasons };
}

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
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const url =
    args.find((a) => a.startsWith('--source='))?.slice(9) ?? EASYPRIVACY_URL;

  console.log(`[refresh] source: ${url}`);
  const t0 = Date.now();
  const text = await fetchUpstream(url);
  console.log(`[refresh] fetched ${text.length.toLocaleString()} bytes in ${Date.now() - t0}ms`);

  const { domains, stats } = parseList(text);
  console.log(
    `[refresh] parsed: ${stats.totalLines} lines, ${stats.blockRules} block rules, ` +
      `${stats.parsed} extracted, ${domains.size} unique eTLD+1 domains`,
  );

  const sorted = [...domains].sort();
  const sha = crypto
    .createHash('sha256')
    .update(sorted.join('\n'))
    .digest('hex')
    .slice(0, 12);
  const version = `${new Date().toISOString().slice(0, 10)}-${sha}`;
  console.log(`[refresh] version: ${version}`);

  // Canary and floor checks
  const validation = validateList(domains);
  if (!validation.ok) {
    console.error('[refresh] VALIDATION FAILED:');
    for (const r of validation.reasons) console.error('  -', r);
    console.error(
      `\nSample parsed domains (first 15): ${sorted.slice(0, 15).join(', ')}`,
    );
    process.exit(2);
  }

  // Reassurance sample — show ~10 canaries + 5 random
  const sample = sorted.slice(0, 10).concat(sorted.slice(Math.floor(sorted.length / 2), Math.floor(sorted.length / 2) + 5));
  console.log('[refresh] validation passed. Sample:', sample.join(', '));

  if (dryRun) {
    console.log('[refresh] --dry-run: skipping DB write');
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.cachedList.deleteMany({ where: { source: 'easyprivacy' } });
      await tx.cachedList.create({
        data: {
          source: 'easyprivacy',
          version,
          data: { domains: sorted, version, count: sorted.length, fetchedAt: new Date().toISOString() },
        },
      });
    });
    console.log(
      `[refresh] wrote CachedList(source="easyprivacy", version="${version}", domains=${sorted.length})`,
    );
    await seedWhoTracksIfMissing(prisma);
  } finally {
    await prisma.$disconnect();
  }

  console.log('[refresh] done. Worker will pick up new list on next 5-minute cache expiry, or restart worker to force.');
}

main().catch((err) => {
  console.error('[refresh] FATAL:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
