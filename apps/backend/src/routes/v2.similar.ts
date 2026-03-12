/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Similarity API (Phase C3 - Query-First SEO)
 *
 * Finds domains similar to a given domain based on:
 * - Same category (40 points)
 * - Score proximity (up to 30 points)
 * - Shared trackers (up to 30 points)
 */

import { Router } from 'express';
import { labelForScore, slugifyTracker } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { CacheService } from '../cache.js';

export const similarV2Router = Router();

const CACHE_TTL = 3600;
const MIN_SIMILAR = 3; // minimum results needed to render page
const MIN_SCAN_COUNT = 3; // quality gate for source domain

interface RawSourceRow {
  id: string;
  domain: string;
  display_name: string | null;
  score: number;
  label: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  scan_count: number;
  is_indexed: boolean;
}

interface RawCandidateRow {
  id: string;
  domain: string;
  display_name: string | null;
  score: number;
  label: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  scan_count: number;
}

interface RawTrackerRow {
  domain_id: string;
  title: string;
}

interface RawEligibleRow {
  domain: string;
  last_scanned: Date | null;
}

/**
 * GET /api/v2/similar/:domain — top 20 similar domains
 */
similarV2Router.get('/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const cacheKey = `similar:${domain}`;

    const cached = await CacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch source domain
    const sourceRows = await prisma.$queryRaw<RawSourceRow[]>`
      SELECT
        d.id, d.domain, d."displayName" as display_name,
        s.score, s.label,
        d."categoryId" as category_id,
        c.name as category_name, c.slug as category_slug,
        d."scanCount" as scan_count, d."isIndexed" as is_indexed
      FROM "Domain" d
      JOIN "Scan" s ON d."latestScanId" = s.id
      LEFT JOIN "Category" c ON d."categoryId" = c.id
      WHERE d.domain = ${domain} AND s.status = 'done'
      LIMIT 1
    `;

    if (sourceRows.length === 0 || !sourceRows[0]) {
      return problem(res, 404, 'Domain not found');
    }

    const source = sourceRows[0];

    // Quality gate
    if (source.scan_count < MIN_SCAN_COUNT || !source.is_indexed) {
      return problem(res, 404, 'Domain does not meet quality requirements');
    }

    // Fetch candidates (same category first, then by score proximity)
    // Split query to avoid Prisma sending null::uuid cast which PostgreSQL rejects
    const candidates = source.category_id
      ? await prisma.$queryRaw<RawCandidateRow[]>`
          SELECT
            d.id, d.domain, d."displayName" as display_name,
            s.score, s.label,
            d."categoryId" as category_id,
            c.name as category_name, c.slug as category_slug,
            d."scanCount" as scan_count
          FROM "Domain" d
          JOIN "Scan" s ON d."latestScanId" = s.id
          LEFT JOIN "Category" c ON d."categoryId" = c.id
          WHERE d.domain != ${domain}
            AND s.status = 'done'
            AND d."scanCount" >= 2
            AND d."isIndexed" = true
            AND ABS(s.score - ${source.score}) <= 30
          ORDER BY
            CASE WHEN d."categoryId" = ${source.category_id}::uuid THEN 0 ELSE 1 END,
            ABS(s.score - ${source.score}) ASC
          LIMIT 100
        `
      : await prisma.$queryRaw<RawCandidateRow[]>`
          SELECT
            d.id, d.domain, d."displayName" as display_name,
            s.score, s.label,
            d."categoryId" as category_id,
            c.name as category_name, c.slug as category_slug,
            d."scanCount" as scan_count
          FROM "Domain" d
          JOIN "Scan" s ON d."latestScanId" = s.id
          LEFT JOIN "Category" c ON d."categoryId" = c.id
          WHERE d.domain != ${domain}
            AND s.status = 'done'
            AND d."scanCount" >= 2
            AND d."isIndexed" = true
            AND ABS(s.score - ${source.score}) <= 30
          ORDER BY
            ABS(s.score - ${source.score}) ASC
          LIMIT 100
        `;

    if (candidates.length < MIN_SIMILAR) {
      return problem(res, 404, 'Not enough similar domains found');
    }

    // Fetch trackers for source domain
    const sourceTrackers = await prisma.$queryRaw<RawTrackerRow[]>`
      SELECT d.id as domain_id, e.title
      FROM "Evidence" e
      JOIN "Scan" s ON e."scanId" = s.id
      JOIN "Domain" d ON d."latestScanId" = s.id
      WHERE d.domain = ${domain}
        AND e.kind IN ('tracker', 'third_party_tracker')
        AND s.status = 'done'
    `;
    const sourceTrackerSet = new Set(sourceTrackers.map((t) => t.title));

    // Fetch trackers for candidate domains (batch)
    const candidateIds = candidates.map((c) => c.id);
    const candidateTrackers = candidateIds.length > 0
      ? await prisma.$queryRaw<RawTrackerRow[]>`
          SELECT d.id as domain_id, e.title
          FROM "Evidence" e
          JOIN "Scan" s ON e."scanId" = s.id
          JOIN "Domain" d ON d."latestScanId" = s.id
          WHERE d.id = ANY(${candidateIds}::uuid[])
            AND e.kind IN ('tracker', 'third_party_tracker')
            AND s.status = 'done'
        `
      : [];

    // Build tracker map per domain
    const trackerMap = new Map<string, Set<string>>();
    for (const t of candidateTrackers) {
      if (!trackerMap.has(t.domain_id)) trackerMap.set(t.domain_id, new Set());
      trackerMap.get(t.domain_id)!.add(t.title);
    }

    // Score candidates
    const scored = candidates.map((c) => {
      const categoryScore = c.category_id === source.category_id ? 40 : 0;
      const scoreProximity = 30 - Math.abs(c.score - source.score);
      const candidateTrackerSet = trackerMap.get(c.id) || new Set<string>();
      const sharedCount = [...sourceTrackerSet].filter((t) => candidateTrackerSet.has(t)).length;
      const trackerScore = Math.min(30, sharedCount * 5);
      const sharedTrackers = [...sourceTrackerSet].filter((t) => candidateTrackerSet.has(t));

      return {
        domain: c.domain,
        displayName: c.display_name || c.domain,
        score: c.score,
        label: c.label || labelForScore(c.score),
        category: c.category_name,
        categorySlug: c.category_slug,
        similarityScore: categoryScore + Math.max(0, scoreProximity) + trackerScore,
        sharedTrackers: sharedTrackers.map((t) => ({ name: t, slug: slugifyTracker(t) })),
        scanCount: c.scan_count,
      };
    });

    // Sort by similarity and take top 20
    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    const top20 = scored.slice(0, 20);

    const result = {
      source: {
        domain: source.domain,
        displayName: source.display_name || source.domain,
        score: source.score,
        label: source.label || labelForScore(source.score),
        category: source.category_name,
        categorySlug: source.category_slug,
        trackerCount: sourceTrackerSet.size,
      },
      similar: top20,
      totalCandidates: scored.length,
    };

    await CacheService.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Failed to fetch similar domains');
    return problem(res, 500, 'Internal Server Error');
  }
});

/**
 * GET /api/v2/similar/eligible — paginated list of eligible domains (for sitemap)
 */
similarV2Router.get('/eligible/list', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const cacheKey = `similar:eligible:${offset}:${limit}`;
    const cached = await CacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const rows = await prisma.$queryRaw<RawEligibleRow[]>`
      SELECT d.domain, s."finishedAt" as last_scanned
      FROM "Domain" d
      JOIN "Scan" s ON d."latestScanId" = s.id
      WHERE d."scanCount" >= ${MIN_SCAN_COUNT}
        AND d."isIndexed" = true
        AND s.status = 'done'
      ORDER BY d."scanCount" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*)::bigint as total
      FROM "Domain" d
      WHERE d."scanCount" >= ${MIN_SCAN_COUNT} AND d."isIndexed" = true
    `;

    const result = {
      domains: rows.map((r) => ({
        domain: r.domain,
        lastScanned: r.last_scanned?.toISOString() || null,
      })),
      total: Number(countResult[0].total),
    };

    await CacheService.set(cacheKey, result, CACHE_TTL);
    return res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch eligible similar domains');
    return problem(res, 500, 'Internal Server Error');
  }
});
