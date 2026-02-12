/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from 'express';
import { z } from 'zod';
import { buildReportPayload, isBlockedDomain, isValidComparableDomain, isPublicSuffix } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { adminGuard } from '../middleware/admin.js';
import { findLatestScanForDomain, normalizeDomain } from '../services/domainService.js';
import { createContextService } from '../services/contextService.js';
import { createComparisonService } from '../services/comparisonService.js';
import { createAnalyticsService } from '../services/analyticsService.js';
import {
  journeyTrackingService,
  type JourneyEvent,
} from '../services/journeyTrackingService.js';

export const contextV2Router = Router();

// Create service instances
const analyticsService = createAnalyticsService(prisma);
const contextService = createContextService(prisma, analyticsService);
const comparisonService = createComparisonService(prisma, analyticsService);

// =============================================================================
// CONTEXT API
// =============================================================================

/**
 * GET /api/v2/context/:domain
 * Get contextual interpretation data for a domain's privacy report
 *
 * Response includes:
 * - Percentile position relative to all scanned sites
 * - Unusual findings (fingerprinting, excessive trackers, etc.)
 * - Category-by-category interpretations
 * - Prevalence statistics
 */
contextV2Router.get('/v2/context/:domain', async (req, res) => {
  try {
    const rawDomain = req.params.domain;
    const domain = normalizeDomain(rawDomain);

    if (!domain || domain.length < 3) {
      return problem(res, 400, 'Invalid domain', 'Please provide a valid domain name');
    }

    // Return 404 for blocked domains
    if (isBlockedDomain(domain)) {
      return problem(res, 404, 'Domain not found', 'This domain cannot be analyzed');
    }

    // Find the latest scan for this domain
    const scan = await findLatestScanForDomain(prisma, domain);

    if (!scan) {
      return problem(
        res,
        404,
        'No report found',
        `No privacy report exists for ${domain}. Scan it first.`
      );
    }

    // Build report payload for context analysis
    const reportPayload = buildReportPayload(scan, {
      evidence: (scan.evidence ?? []) as Parameters<typeof buildReportPayload>[1]['evidence'],
      issues: (scan.issues ?? []) as Parameters<typeof buildReportPayload>[1]['issues'],
    });

    // Extract data needed for context analysis
    const score = reportPayload.scan.score ?? 0;
    const label = reportPayload.scan.label ?? 'Unknown';

    // Check for fingerprinting in evidence
    const hasFingerprinting = reportPayload.evidence.some(
      (e) => e.kind === 'fingerprint' || (e.details && typeof e.details === 'object' && (e.details as Record<string, unknown>).fingerprinting === true)
    );

    // Map to ReportDataForContext
    const reportDataForContext = {
      score,
      trackerCount: reportPayload.meta.trackerCount,
      cookieCount: reportPayload.meta.cookieCount,
      thirdPartyCount: reportPayload.meta.thirdPartyCount,
      hasFingerprinting,
      hasPolicyLink: reportPayload.evidence.some((e) => e.kind === 'policy'),
      isHttpOnly: reportPayload.meta.isHttpOnly ?? false,
      tlsGrade: reportPayload.meta.tlsGrade,
      penalties: reportPayload.meta.penalties,
      // trackerCategories not currently available in TrackerInsights
    };

    // Get contextual data
    const context = await contextService.getContext(domain, reportDataForContext);

    // Set cache headers (6 hour cache)
    res.set('Cache-Control', 'public, max-age=21600');

    res.json({
      domain,
      score,
      label,
      context,
    });
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error fetching context data');
    return problem(res, 500, 'Failed to load context data');
  }
});

// =============================================================================
// COMPARISON API
// =============================================================================

/**
 * GET /api/v2/compare/:domainA/:domainB
 * Compare two domains' privacy profiles
 *
 * Returns side-by-side comparison including:
 * - Score and label for each domain
 * - Key metric differences
 * - Common and unique trackers
 * - Summary text
 */
contextV2Router.get('/v2/compare/:domainA/:domainB', async (req, res) => {
  try {
    const domainA = normalizeDomain(req.params.domainA);
    const domainB = normalizeDomain(req.params.domainB);

    // Validate both domains are real registrable domains, not TLDs or public suffixes
    if (!domainA || !isValidComparableDomain(domainA)) {
      const isTLD = domainA && isPublicSuffix(domainA);
      return problem(
        res,
        404,
        'Invalid comparison',
        isTLD
          ? `"${domainA}" is a TLD or public suffix, not a scannable domain`
          : 'Please provide a valid domain name for domain A'
      );
    }
    if (!domainB || !isValidComparableDomain(domainB)) {
      const isTLD = domainB && isPublicSuffix(domainB);
      return problem(
        res,
        404,
        'Invalid comparison',
        isTLD
          ? `"${domainB}" is a TLD or public suffix, not a scannable domain`
          : 'Please provide a valid domain name for domain B'
      );
    }

    // Normalize order for consistent caching
    const [first, second] = domainA.localeCompare(domainB) < 0 ? [domainA, domainB] : [domainB, domainA];

    const comparison = await comparisonService.compareDomains(first, second);

    if (!comparison) {
      return problem(
        res,
        404,
        'Comparison not available',
        'One or both domains have not been scanned yet.'
      );
    }

    // Track comparison for suggestions
    await comparisonService.trackComparisonPair(first, second);

    // Set cache headers (1 hour cache)
    res.set('Cache-Control', 'public, max-age=3600');

    res.json(comparison);
  } catch (error) {
    logger.error(
      { error, domainA: req.params.domainA, domainB: req.params.domainB },
      'Error comparing domains'
    );
    return problem(res, 500, 'Failed to compare domains');
  }
});

/**
 * GET /api/v2/suggestions/:domain
 * Get suggested domains to compare with the given domain
 *
 * Suggestions are based on:
 * - Popular comparison pairs
 * - Similar score ranges
 * - Same or related categories (future)
 */
contextV2Router.get('/v2/suggestions/:domain', async (req, res) => {
  try {
    const rawDomain = req.params.domain;
    const domain = normalizeDomain(rawDomain);

    if (!domain || domain.length < 3) {
      return problem(res, 400, 'Invalid domain', 'Please provide a valid domain name');
    }

    const suggestions = await comparisonService.getSuggestedComparisons(domain);

    // Set cache headers (30 minute cache)
    res.set('Cache-Control', 'public, max-age=1800');

    res.json({
      domain,
      suggestions,
    });
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error fetching suggestions');
    return problem(res, 500, 'Failed to load suggestions');
  }
});

// =============================================================================
// JOURNEY TRACKING API
// =============================================================================

/**
 * Journey event schema for validation
 */
const JourneyEventSchema = z.object({
  type: z.enum([
    'page_view',
    'scroll',
    'interaction',
    'search',
    'navigation',
    'tab_switch',
    'expand',
    'share',
  ] as const),
  page: z.string().min(1).max(500),
  sessionId: z.string().min(1).max(100),
  timestamp: z.number().int().positive(),
  data: z
    .object({
      scrollDepth: z.number().int().min(0).max(100).optional(),
      targetPage: z.string().max(500).optional(),
      timeOnPage: z.number().int().min(0).optional(),
      element: z.string().max(200).optional(),
      searchQuery: z.string().max(500).optional(),
      referrer: z.string().max(500).optional(),
    })
    .optional(),
});

const JourneyBatchSchema = z.object({
  events: z.array(JourneyEventSchema).min(1).max(50),
});

/**
 * POST /api/v2/track/journey
 * Track user journey events (fire-and-forget)
 *
 * Accepts single event or batch of events
 * Used by frontend JourneyTracker component
 *
 * Returns 204 No Content on success
 */
contextV2Router.post('/v2/track/journey', async (req, res) => {
  try {
    // Check if batch or single event
    if (req.body.events) {
      // Batch mode
      const parsed = JourneyBatchSchema.safeParse(req.body);
      if (!parsed.success) {
        // Silently drop invalid events - fire-and-forget
        logger.debug({ errors: parsed.error.flatten() }, 'Invalid journey batch');
        return res.status(204).end();
      }

      // Track events asynchronously - don't wait
      journeyTrackingService.trackEvents(parsed.data.events as JourneyEvent[]).catch((error) => {
        logger.warn({ error }, 'Failed to track journey batch');
      });
    } else {
      // Single event mode
      const parsed = JourneyEventSchema.safeParse(req.body);
      if (!parsed.success) {
        logger.debug({ errors: parsed.error.flatten() }, 'Invalid journey event');
        return res.status(204).end();
      }

      // Track event asynchronously - don't wait
      journeyTrackingService.trackEvent(parsed.data as JourneyEvent).catch((error) => {
        logger.warn({ error }, 'Failed to track journey event');
      });
    }

    // Always return 204 (fire-and-forget)
    res.status(204).end();
  } catch (error) {
    // Never fail for tracking - just log and return 204
    logger.warn({ error }, 'Journey tracking error');
    res.status(204).end();
  }
});

/**
 * GET /api/v2/journey/metrics
 * Get aggregated journey metrics (admin only)
 *
 * Query params:
 * - range: '24h' | '7d' | '30d' (default: '7d')
 */
contextV2Router.get('/v2/journey/metrics', adminGuard, async (req, res) => {
  try {
    const range = (req.query.range as '24h' | '7d' | '30d') || '7d';

    // Validate range
    if (!['24h', '7d', '30d'].includes(range)) {
      return problem(res, 400, 'Invalid range', 'Range must be 24h, 7d, or 30d');
    }

    const metrics = await journeyTrackingService.getMetrics(range);

    res.json(metrics);
  } catch (error) {
    logger.error({ error }, 'Error fetching journey metrics');
    return problem(res, 500, 'Failed to load metrics');
  }
});

/**
 * GET /api/v2/journey/health
 * Health check for journey tracking system (admin only)
 */
contextV2Router.get('/v2/journey/health', adminGuard, async (_req, res) => {
  try {
    const health = await journeyTrackingService.healthCheck();
    res.json(health);
  } catch (error) {
    logger.error({ error }, 'Journey health check failed');
    res.json({ healthy: false, error: 'Health check failed' });
  }
});

// =============================================================================
// BENCHMARKS API (Public)
// =============================================================================

/**
 * GET /api/v2/benchmarks
 * Get global benchmark data for the benchmarks page
 *
 * Returns:
 * - Total domains scanned
 * - Score distribution
 * - Average metrics
 * - Top trackers
 */
contextV2Router.get('/v2/benchmarks', async (_req, res) => {
  try {
    // Get global stats
    const [stats, prevalence] = await Promise.all([
      contextService.getGlobalStats(),
      contextService.getPrevalenceStats(),
    ]);

    // Set cache headers (5 minute cache)
    res.set('Cache-Control', 'public, max-age=300');

    res.json({
      totalDomainsScanned: stats.totalScans,
      scoreDistribution: stats.distribution,
      averageScore: stats.averageScore,
      averageTrackerCount: stats.averageTrackerCount,
      averageCookieCount: stats.averageCookieCount,
      prevalence,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching benchmarks');
    return problem(res, 500, 'Failed to load benchmarks');
  }
});
