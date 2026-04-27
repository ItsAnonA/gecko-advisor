/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from './logger.js';
import { MIN_RUNTIME_DOMAIN_COUNT } from '@gecko-advisor/shared';

export interface Lists {
  easyprivacy: EasyList;
  /**
   * EasyList — covers the AdTech ecosystem (amazon-adsystem, adnxs,
   * adsafeprotected, indexww, etc.) that EasyPrivacy doesn't.
   * Optional during the transition: pre-ingestion deploys see no row
   * and continue with EasyPrivacy only. Post-ingestion, the worker
   * unions both domain sets at classification time.
   */
  easylist?: EasyList;
  whotracks: WhoTracksList;
}

type EasyList = {
  domains: string[];
};

type WhoTracksList = {
  fingerprinting?: string[];
  trackers?: { domain: string; category: string }[];
};

type JsonList = {
  domains?: unknown;
  fingerprinting?: unknown;
  trackers?: unknown;
  [key: string]: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeEasyList = (raw: unknown): EasyList | null => {
  if (!isRecord(raw)) return null;
  const domains = Array.isArray(raw.domains)
    ? raw.domains.filter((item): item is string => typeof item === 'string')
    : [];
  return { domains };
};

const normalizeWhoTracksList = (raw: unknown): WhoTracksList | null => {
  if (!isRecord(raw)) return null;

  const fingerprinting = Array.isArray(raw.fingerprinting)
    ? raw.fingerprinting.filter((item): item is string => typeof item === 'string')
    : undefined;

  const trackers = Array.isArray(raw.trackers)
    ? raw.trackers
        .map((entry) =>
          isRecord(entry) && typeof entry.domain === 'string' && typeof entry.category === 'string'
            ? { domain: entry.domain, category: entry.category }
            : null,
        )
        .filter((entry): entry is { domain: string; category: string } => entry !== null)
    : undefined;

  return { fingerprinting, trackers };
};

async function readJson(relativePath: string): Promise<JsonList> {
  const absolute = path.resolve(process.cwd(), relativePath);
  const content = await readFile(absolute, 'utf8');
  return JSON.parse(content) as JsonList;
}

// In-memory cache for privacy lists (refreshed every 5 minutes)
let listsCache: { data: Lists; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getLists(prisma: PrismaClient): Promise<Lists> {
  // Return cached lists if still fresh
  if (listsCache && Date.now() - listsCache.timestamp < CACHE_TTL_MS) {
    return listsCache.data;
  }

  const lists = await prisma.cachedList.findMany();
  const easyStored = lists.find((list) => list.source === 'easyprivacy')?.data;
  const easylistStored = lists.find((list) => list.source === 'easylist')?.data;
  const whoStored = lists.find((list) => list.source === 'whotracks')?.data;

  const easy = normalizeEasyList(easyStored);
  const easylist = normalizeEasyList(easylistStored);
  const who = normalizeWhoTracksList(whoStored);

  // Gap 2: defense-in-depth runtime guard. The original 4-domain bug shipped
  // because nothing refused to classify against a tiny list. If the row exists
  // but has fewer than MIN_RUNTIME_DOMAIN_COUNT domains, treat it as missing —
  // far better to fail loudly than to silently classify against garbage.
  const easyValid =
    easy !== null && easy.domains.length >= MIN_RUNTIME_DOMAIN_COUNT;

  if (easy !== null && !easyValid) {
    logger.error(
      { domainCount: easy.domains.length, floor: MIN_RUNTIME_DOMAIN_COUNT },
      'easyprivacy list in DB is below runtime floor — refusing to use it',
    );
  }

  // EasyList is OPTIONAL — the worker functions with EasyPrivacy alone if
  // the easylist row is missing (pre-ingestion transition state). Once the
  // row is present, it must clear the same runtime floor.
  const easylistValid =
    easylist !== null && easylist.domains.length >= MIN_RUNTIME_DOMAIN_COUNT;

  if (easylist !== null && !easylistValid) {
    logger.error(
      { domainCount: easylist.domains.length, floor: MIN_RUNTIME_DOMAIN_COUNT },
      'easylist row in DB is below runtime floor — ignoring it',
    );
  }

  let result: Lists;

  if (easyValid && who) {
    result = {
      easyprivacy: easy,
      whotracks: who,
      ...(easylistValid ? { easylist } : {}),
    };
    if (!easylistValid) {
      logger.warn(
        'easylist row missing or invalid — running with EasyPrivacy only (AdTech coverage gap; run refresh-privacy-lists.ts --easylist)',
      );
    }
  } else {
    // Gap 4: in production, demo fallback is poison. Refuse rather than ship
    // a 4-domain classifier silently. Demo is dev/test only.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Tracker list missing or invalid in production; refusing demo fallback. ' +
          'Run scripts/refresh-privacy-lists.ts to repopulate CachedList.',
      );
    }

    logger.warn(
      'easyprivacy/whotracks list missing or below floor — falling back to demo fixture (NODE_ENV != production)',
    );

    const fallbackEasy = normalizeEasyList(await readJson('packages/shared/data/easyprivacy-demo.json'));
    const fallbackWho = normalizeWhoTracksList(await readJson('packages/shared/data/whotracks-demo.json'));

    if (!fallbackEasy || !fallbackWho) {
      throw new Error('Failed to load privacy lists');
    }

    result = { easyprivacy: fallbackEasy, whotracks: fallbackWho };
  }

  // Cache the result
  listsCache = { data: result, timestamp: Date.now() };
  return result;
}
