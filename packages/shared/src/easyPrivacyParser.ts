/*
SPDX-FileCopyrightText: 2026 Gecko Advisor contributors
SPDX-License-Identifier: MIT

Pure parser/validator for EasyPrivacy filter lists. No I/O — extracted so the
ingestion script (scripts/refresh-privacy-lists.ts) and worker runtime
(apps/worker/src/lists.ts) share one tested code path. The original 4-domain
demo fallback that silently shipped to prod (see
memory/project-tracker-detector-gate-bug.md) is exactly the failure class
these tests guard against.

Lives in @gecko-advisor/shared because both the backend container (which runs
the script via tsx) and the worker container (which classifies traffic
against the loaded list) ship this package.
*/
import { etldPlusOne } from './utils.js';

/**
 * Floor for a sane upstream ingestion. EasyPrivacy ships ~30K+ eTLD+1
 * domains; a count below this almost certainly means the upstream format
 * changed or the fetch was partial.
 */
export const MIN_INGEST_DOMAIN_COUNT = 5_000;

/**
 * Defense-in-depth floor enforced at WORKER read time. Lower than the ingest
 * floor on purpose: if someone manually edits the DB row or future ingestion
 * relaxes its floor, the worker still refuses to classify against a tiny
 * list. Anything below this would re-create the original 4-domain bug.
 */
export const MIN_RUNTIME_DOMAIN_COUNT = 1_000;

/**
 * Tent-pole trackers any working EasyPrivacy ingest must contain. If any
 * is missing, ingestion failed in a way that would ship broken data.
 */
export const CANARIES = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.net',
  'googlesyndication.com',
  'scorecardresearch.com',
] as const;

/**
 * Extract a canonical eTLD+1 domain from one EasyPrivacy filter line.
 * Returns null for anything that isn't a network block rule we can use.
 *
 * Supported (with various option suffixes after $):
 *   ||tracker.example.com^
 *   ||tracker.example.com/path
 *   ||tracker.example.com$script,third-party
 *   ||sub.tracker.example.com^$domain=foo.com
 *
 * Rejected:
 *   @@||...       (exceptions / allowlist)
 *   !...          (comments)
 *   [Adblock...]  (header lines)
 *   foo##.ad      (element hiding)
 *   foo#@#.ad     (element-hiding exceptions)
 *   /bar/         (regex rules)
 *   ||1.2.3.4^    (IP literal — psl rejects)
 *   ||*.foo.com^  (wildcard host)
 *   ||a.invalid^  (unknown TLD — psl rejects)
 */
export function parseEasyPrivacyLine(line: string): string | null {
  const t = line.trim();
  if (!t) return null;

  if (t.startsWith('!') || t.startsWith('[')) return null;
  if (t.startsWith('@@')) return null;
  if (/#[@?$]?#/.test(t)) return null;
  if (t.startsWith('/') && t.endsWith('/')) return null;
  if (!t.startsWith('||')) return null;

  const body = t.slice(2);
  const m = body.match(/^([a-z0-9][a-z0-9.\-_*]*?)(?:[\^/?$]|$)/i);
  if (!m || !m[1]) return null;

  const host = m[1].toLowerCase();

  if (host.includes('*') || host.startsWith('.') || host.includes('..')) return null;
  if (!host.includes('.')) return null;

  // Reject IPv4 literals explicitly. psl is happy to parse "1.2.3.4" as
  // "3.4" (treats the last segment as the TLD), which would silently
  // pollute the domain set if upstream ever shipped IP rules.
  if (/^\d+(\.\d+){3}$/.test(host)) return null;

  // psl.get() (via etldPlusOne) handles bare TLDs and length checks.
  // Note: psl IS permissive on unknown TLDs (returns the host unchanged
  // for things like "tracker.invalidtld"). Harmless in practice — those
  // extracted strings can't match real-evidence hostnames during
  // classification, and the validation step (5K floor + canary list)
  // catches any gross upstream-format breakage.
  return etldPlusOne(host);
}

export interface ParseStats {
  totalLines: number;
  blockRules: number;
  parsed: number;
}

export function parseList(text: string): {
  domains: Set<string>;
  stats: ParseStats;
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

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

export function validateList(domains: Set<string>): ValidationResult {
  const reasons: string[] = [];

  if (domains.size < MIN_INGEST_DOMAIN_COUNT) {
    reasons.push(
      `domain count ${domains.size} < floor ${MIN_INGEST_DOMAIN_COUNT} (upstream format change or partial fetch?)`,
    );
  }

  const missing = CANARIES.filter((c) => !domains.has(c));
  if (missing.length > 0) {
    reasons.push(`missing canary trackers: ${missing.join(', ')}`);
  }

  return { ok: reasons.length === 0, reasons };
}
