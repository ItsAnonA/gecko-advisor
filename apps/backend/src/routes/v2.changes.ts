/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Changes API Routes (v2)
 *
 * Endpoints for querying privacy changes across domains.
 * Powers the "What changed?" feature and site-wide change feed.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import {
  getChangesForDomain,
  getRecentChanges,
  getChangeStats,
} from "../services/changeDetectionService.js";
import { normalizeDomain } from "../services/domainService.js";
import { isValidDomain, isBlockedDomain } from "@gecko-advisor/shared";

export const changesV2Router = Router();

// ============================================================================
// Schemas
// ============================================================================

const ChangeQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  types: z.string().optional(), // Comma-separated: "MINOR,MAJOR,CRITICAL"
  minSignificance: z.coerce.number().min(0).max(1).optional(),
});

const StatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v2/changes/domain/:domain
 * Get privacy changes for a specific domain.
 *
 * Query params:
 * - limit: Number of changes to return (1-100, default 10)
 * - offset: Pagination offset (default 0)
 * - types: Comma-separated change types (MINOR,MODERATE,MAJOR,CRITICAL)
 * - minSignificance: Minimum significance score (0-1)
 *
 * Response:
 * - 200: Array of changes
 * - 404: Invalid domain or no changes found
 * - 410: Blocked domain
 */
changesV2Router.get("/domain/:domain", async (req, res) => {
  const rawDomain = req.params.domain;

  // Validate domain
  const domain = normalizeDomain(rawDomain);
  if (!domain || !isValidDomain(domain)) {
    return problem(res, 404, "Invalid domain");
  }

  // Block adult content domains
  if (isBlockedDomain(domain)) {
    return res.status(410).json({
      type: "gone",
      status: 410,
      title: "Content Removed",
      detail: "This domain is not available due to content policy.",
    });
  }

  try {
    const parsed = ChangeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, "Invalid query parameters", parsed.error.flatten());
    }

    const { limit, offset, types, minSignificance } = parsed.data;

    // Parse change types
    const changeTypes = types
      ? (types.split(",").map((t) => t.trim().toUpperCase()) as Array<
          "NONE" | "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL"
        >)
      : undefined;

    const changes = await getChangesForDomain(prisma, domain, {
      limit,
      offset,
      changeTypes,
      minSignificance,
    });

    return res.json({
      domain,
      changes: changes.map((c) => ({
        id: c.id,
        scoreBefore: c.scoreBefore,
        scoreAfter: c.scoreAfter,
        scoreDelta: c.scoreDelta,
        trackerCountBefore: c.trackerCountBefore,
        trackerCountAfter: c.trackerCountAfter,
        trackersAdded: c.trackersAdded,
        trackersRemoved: c.trackersRemoved,
        fingerprintingBefore: c.fingerprintingBefore,
        fingerprintingAfter: c.fingerprintingAfter,
        fingerprintingChanged: c.fingerprintingChanged,
        changeType: c.changeType,
        significanceScore: c.significanceScore,
        changeReasons: c.changeReasons,
        detectedAt: c.detectedAt.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        count: changes.length,
      },
    });
  } catch (error) {
    logger.error({ error, domain }, "Error fetching domain changes");
    return problem(res, 500, "Failed to fetch changes");
  }
});

/**
 * GET /api/v2/changes/recent
 * Get recent changes across all domains.
 *
 * Query params:
 * - limit: Number of changes to return (1-100, default 20)
 * - offset: Pagination offset (default 0)
 * - types: Comma-separated change types
 * - minSignificance: Minimum significance score (0-1)
 *
 * Response: Array of changes with domain info
 */
changesV2Router.get("/recent", async (req, res) => {
  try {
    const parsed = ChangeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, "Invalid query parameters", parsed.error.flatten());
    }

    const { limit, offset, types, minSignificance } = parsed.data;

    const changeTypes = types
      ? (types.split(",").map((t) => t.trim().toUpperCase()) as Array<
          "NONE" | "MINOR" | "MODERATE" | "MAJOR" | "CRITICAL"
        >)
      : undefined;

    const changes = await getRecentChanges(prisma, {
      limit: limit || 20,
      offset,
      changeTypes,
      minSignificance,
    });

    return res.json({
      changes: changes.map((c) => ({
        id: c.id,
        domain: c.domain.domain,
        scoreBefore: c.scoreBefore,
        scoreAfter: c.scoreAfter,
        scoreDelta: c.scoreDelta,
        trackerCountBefore: c.trackerCountBefore,
        trackerCountAfter: c.trackerCountAfter,
        trackersAdded: c.trackersAdded,
        trackersRemoved: c.trackersRemoved,
        fingerprintingChanged: c.fingerprintingChanged,
        changeType: c.changeType,
        significanceScore: c.significanceScore,
        changeReasons: c.changeReasons,
        detectedAt: c.detectedAt.toISOString(),
      })),
      pagination: {
        limit: limit || 20,
        offset,
        count: changes.length,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching recent changes");
    return problem(res, 500, "Failed to fetch changes");
  }
});

/**
 * GET /api/v2/changes/stats
 * Get change statistics.
 *
 * Query params:
 * - days: Number of days to look back (1-90, default 30)
 *
 * Response: Aggregated statistics
 */
changesV2Router.get("/stats", async (req, res) => {
  try {
    const parsed = StatsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, "Invalid query parameters", parsed.error.flatten());
    }

    const { days } = parsed.data;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await getChangeStats(prisma, since);

    return res.json({
      period: {
        days,
        since: since.toISOString(),
      },
      stats: {
        totalChanges: stats.totalChanges,
        domainsWithChanges: stats.domainsWithChanges,
        avgScoreDelta: Math.round(stats.avgScoreDelta * 10) / 10,
        byType: stats.byType,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching change stats");
    return problem(res, 500, "Failed to fetch statistics");
  }
});
