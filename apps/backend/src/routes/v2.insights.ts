/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Insights API Routes (Phase 3C)
 *
 * Provides access to precomputed insights, stability data,
 * category rankings, tracker trends, weekly reports, and predictions.
 *
 * Phase 3C Hardening: Added prediction, quality, and narrative endpoints.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { DomainTrend, PeriodType } from '@prisma/client';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { getUnstableDomains, getDomainsByTrend, getStabilityCoverage } from '../services/stabilityService.js';
import { getCategoryRankings } from '../services/categoryIntelligenceService.js';
import { getTrackerMovers } from '../services/trackerEvolutionService.js';
import { getPublishableInsights, generateTieredInsights, INSIGHT_TIERS } from '../services/insightGeneratorService.js';
import { getLatestWeeklyReport, listWeeklyReports } from '../services/weeklyReportService.js';
import { calculateMomentum, detectEarlyWarnings, predictTrackerSaturation, getPredictionSummary } from '../services/predictiveService.js';
import { getQualityDistribution, getTopQualityInsights } from '../services/insightQualityService.js';
import { generateWeeklyDigest, getAvailableTemplates } from '../services/narrativeService.js';
import {
  validateHedgeLanguage,
  validateRetractionTone,
  analyzeTopicDistribution,
  calculateMethodologyMetrics,
  getConfidenceDisplay,
  TOPIC_GUIDANCE,
} from '../services/credibilityService.js';

export const insightsV2Router = Router();

// ============================================================================
// Schemas
// ============================================================================

const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const UnstableQuerySchema = z.object({
  tier: z.string().optional(),
  minVolatility: z.coerce.number().min(0).max(100).optional().default(50),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const TrendQuerySchema = z.object({
  tier: z.string().optional(),
  minStrength: z.coerce.number().min(0).max(1).optional().default(0.3),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const PeriodQuerySchema = z.object({
  period: z.enum(['WEEKLY', 'MONTHLY']).optional().default('WEEKLY'),
});

const DaysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
});

const SignalQuerySchema = z.object({
  signal: z.string().optional(),
});

const StatusQuerySchema = z.object({
  status: z.string().optional(),
});

const ValidateTextSchema = z.object({
  text: z.string().min(1),
});

// ============================================================================
// Stability Routes
// ============================================================================

/**
 * GET /api/v2/insights/stability/unstable
 * Get domains with high volatility (unstable privacy scores).
 */
insightsV2Router.get('/stability/unstable', async (req, res) => {
  try {
    const parsed = UnstableQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const { tier, minVolatility, limit } = parsed.data;
    const result = await getUnstableDomains(prisma, {
      tier,
      minVolatility,
      limit,
    });
    res.json({ domains: result });
  } catch (error) {
    logger.error({ error }, 'Error fetching unstable domains');
    return problem(res, 500, 'Failed to fetch unstable domains');
  }
});

/**
 * GET /api/v2/insights/stability/trend/:trend
 * Get domains by trend (IMPROVING, STABLE, DECLINING, VOLATILE).
 */
insightsV2Router.get('/stability/trend/:trend', async (req, res) => {
  try {
    const { trend } = req.params;

    const validTrends: DomainTrend[] = ['IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE'];
    if (!validTrends.includes(trend as DomainTrend)) {
      return problem(res, 400, 'Invalid trend', 'Must be IMPROVING, STABLE, DECLINING, or VOLATILE');
    }

    const parsed = TrendQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const { tier, minStrength, limit } = parsed.data;

    const result = await getDomainsByTrend(prisma, trend as DomainTrend, {
      tier,
      minStrength,
      limit,
    });
    res.json({ domains: result });
  } catch (error) {
    logger.error({ error, trend: req.params.trend }, 'Error fetching domains by trend');
    return problem(res, 500, 'Failed to fetch domains by trend');
  }
});

/**
 * GET /api/v2/insights/stability/coverage
 * Get stability coverage statistics.
 */
insightsV2Router.get('/stability/coverage', async (_req, res) => {
  try {
    const coverage = await getStabilityCoverage(prisma);
    res.json(coverage);
  } catch (error) {
    logger.error({ error }, 'Error fetching stability coverage');
    return problem(res, 500, 'Failed to fetch stability coverage');
  }
});

// ============================================================================
// Category & Tracker Routes
// ============================================================================

/**
 * GET /api/v2/insights/categories/rankings
 * Get category rankings by privacy trend.
 */
insightsV2Router.get('/categories/rankings', async (req, res) => {
  try {
    const parsed = PeriodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const result = await getCategoryRankings(prisma, parsed.data.period as PeriodType);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Error fetching category rankings');
    return problem(res, 500, 'Failed to fetch category rankings');
  }
});

/**
 * GET /api/v2/insights/trackers/movers
 * Get top growing and declining trackers.
 */
insightsV2Router.get('/trackers/movers', async (req, res) => {
  try {
    const parsed = PeriodQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const result = await getTrackerMovers(prisma, parsed.data.period as PeriodType);
    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Error fetching tracker movers');
    return problem(res, 500, 'Failed to fetch tracker movers');
  }
});

// ============================================================================
// Insights Routes
// ============================================================================

/**
 * GET /api/v2/insights
 * Get publishable insights.
 */
insightsV2Router.get('/', async (req, res) => {
  try {
    const parsed = LimitQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const result = await getPublishableInsights(prisma, parsed.data.limit);
    res.json({ insights: result });
  } catch (error) {
    logger.error({ error }, 'Error fetching insights');
    return problem(res, 500, 'Failed to fetch insights');
  }
});

/**
 * GET /api/v2/insights/tiered
 * Get insights organized by tier (breaking, notable, emerging).
 */
insightsV2Router.get('/tiered', async (req, res) => {
  try {
    const parsed = DaysQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const result = await generateTieredInsights(prisma, parsed.data.days);
    res.json({
      ...result,
      tiers: INSIGHT_TIERS,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching tiered insights');
    return problem(res, 500, 'Failed to fetch tiered insights');
  }
});

// ============================================================================
// Weekly Reports
// ============================================================================

/**
 * GET /api/v2/insights/reports/weekly/latest
 * Get the most recent weekly report.
 */
insightsV2Router.get('/reports/weekly/latest', async (_req, res) => {
  try {
    const report = await getLatestWeeklyReport(prisma);
    if (!report) {
      return problem(res, 404, 'No weekly reports available');
    }
    res.json({ report });
  } catch (error) {
    logger.error({ error }, 'Error fetching latest weekly report');
    return problem(res, 500, 'Failed to fetch weekly report');
  }
});

/**
 * GET /api/v2/insights/reports/weekly
 * List recent weekly reports.
 */
insightsV2Router.get('/reports/weekly', async (req, res) => {
  try {
    const parsed = LimitQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const reports = await listWeeklyReports(prisma, parsed.data.limit);
    res.json({ reports });
  } catch (error) {
    logger.error({ error }, 'Error fetching weekly reports');
    return problem(res, 500, 'Failed to fetch weekly reports');
  }
});

// ============================================================
// PREDICTIONS
// ============================================================

/**
 * GET /api/v2/insights/predictions/summary
 * Get prediction summary statistics.
 */
insightsV2Router.get('/predictions/summary', async (_req, res) => {
  try {
    const summary = await getPredictionSummary(prisma);
    res.json(summary);
  } catch (error) {
    logger.error({ error }, 'Error fetching prediction summary');
    return problem(res, 500, 'Failed to fetch prediction summary');
  }
});

/**
 * GET /api/v2/insights/predictions/warnings
 * Get early warning signals.
 */
insightsV2Router.get('/predictions/warnings', async (req, res) => {
  try {
    const parsed = SignalQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    let warnings = await detectEarlyWarnings(prisma);

    if (parsed.data.signal) {
      warnings = warnings.filter((w) => w.signal === parsed.data.signal);
    }

    res.json({ warnings, count: warnings.length });
  } catch (error) {
    logger.error({ error }, 'Error fetching early warnings');
    return problem(res, 500, 'Failed to fetch early warnings');
  }
});

/**
 * GET /api/v2/insights/predictions/momentum/:domainId
 * Get momentum metrics for a domain.
 */
insightsV2Router.get('/predictions/momentum/:domainId', async (req, res) => {
  try {
    const { domainId } = req.params;
    const momentum = await calculateMomentum(prisma, domainId);

    if (!momentum) {
      return problem(res, 404, 'Not enough data for momentum calculation');
    }

    res.json({ momentum });
  } catch (error) {
    logger.error({ error, domainId: req.params.domainId }, 'Error fetching momentum');
    return problem(res, 500, 'Failed to fetch momentum');
  }
});

/**
 * GET /api/v2/insights/predictions/trackers/saturation
 * Get tracker saturation predictions.
 */
insightsV2Router.get('/predictions/trackers/saturation', async (req, res) => {
  try {
    const parsed = StatusQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    let predictions = await predictTrackerSaturation(prisma);

    if (parsed.data.status) {
      predictions = predictions.filter((p) => p.status === parsed.data.status);
    }

    res.json({ predictions, count: predictions.length });
  } catch (error) {
    logger.error({ error }, 'Error fetching tracker saturation');
    return problem(res, 500, 'Failed to fetch tracker saturation');
  }
});

// ============================================================
// QUALITY
// ============================================================

/**
 * GET /api/v2/insights/quality/distribution
 * Get quality distribution for recent insights.
 */
insightsV2Router.get('/quality/distribution', async (_req, res) => {
  try {
    const distribution = await getQualityDistribution(prisma);
    res.json(distribution);
  } catch (error) {
    logger.error({ error }, 'Error fetching quality distribution');
    return problem(res, 500, 'Failed to fetch quality distribution');
  }
});

/**
 * GET /api/v2/insights/quality/top
 * Get top quality insights for publishing.
 */
insightsV2Router.get('/quality/top', async (req, res) => {
  try {
    const parsed = LimitQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const insights = await getTopQualityInsights(prisma, parsed.data.limit);
    res.json({ insights });
  } catch (error) {
    logger.error({ error }, 'Error fetching top quality insights');
    return problem(res, 500, 'Failed to fetch top quality insights');
  }
});

// ============================================================
// NARRATIVES
// ============================================================

/**
 * GET /api/v2/insights/narratives/templates
 * Get available narrative templates.
 */
insightsV2Router.get('/narratives/templates', async (_req, res) => {
  try {
    const templates = getAvailableTemplates();
    res.json({ templates });
  } catch (error) {
    logger.error({ error }, 'Error fetching narrative templates');
    return problem(res, 500, 'Failed to fetch narrative templates');
  }
});

/**
 * GET /api/v2/insights/narratives/weekly-digest
 * Generate weekly digest narrative.
 */
insightsV2Router.get('/narratives/weekly-digest', async (_req, res) => {
  try {
    // Get data for weekly digest
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Total changes
    const totalChanges = await prisma.domainChange.count({
      where: { detectedAt: { gte: sevenDaysAgo } },
    });

    // Average score change
    const avgChange = await prisma.domainChange.aggregate({
      where: { detectedAt: { gte: sevenDaysAgo } },
      _avg: { scoreDelta: true },
    });

    // Top improvement
    const topImprovement = await prisma.domainChange.findFirst({
      where: { detectedAt: { gte: sevenDaysAgo }, scoreDelta: { gt: 0 } },
      orderBy: { scoreDelta: 'desc' },
      include: { domain: { select: { domain: true } } },
    });

    // Top regression
    const topRegression = await prisma.domainChange.findFirst({
      where: { detectedAt: { gte: sevenDaysAgo }, scoreDelta: { lt: 0 } },
      orderBy: { scoreDelta: 'asc' },
      include: {
        domain: {
          select: { domain: true, category: { select: { name: true } } },
        },
      },
    });

    // Top tracker
    const topTracker = await prisma.trackerTrend.findFirst({
      where: { periodType: 'WEEKLY' },
      orderBy: { netChange: 'desc' },
    });

    // Fingerprinting stats
    const fingerprintingStarted = await prisma.domainChange.count({
      where: {
        detectedAt: { gte: sevenDaysAgo },
        fingerprintingChanged: true,
        fingerprintingAfter: true,
      },
    });

    const fingerprintingStopped = await prisma.domainChange.count({
      where: {
        detectedAt: { gte: sevenDaysAgo },
        fingerprintingChanged: true,
        fingerprintingAfter: false,
      },
    });

    const digest = generateWeeklyDigest({
      totalChanges,
      avgScoreChange: avgChange._avg.scoreDelta ?? 0,
      topImprovement: topImprovement
        ? {
            domain: topImprovement.domain.domain,
            delta: topImprovement.scoreDelta,
            trackersRemoved: topImprovement.trackersRemoved.length,
            fingerprintingStopped:
              topImprovement.fingerprintingBefore && !topImprovement.fingerprintingAfter,
          }
        : undefined,
      topRegression: topRegression
        ? {
            domain: topRegression.domain.domain,
            delta: topRegression.scoreDelta,
            category: topRegression.domain.category?.name,
            trackersAdded: topRegression.trackersAdded.length,
            fingerprintingStarted:
              !topRegression.fingerprintingBefore && topRegression.fingerprintingAfter,
          }
        : undefined,
      topTracker: topTracker
        ? {
            tracker: topTracker.trackerDomain,
            netChange: topTracker.netChange,
          }
        : undefined,
      fingerprintingStats:
        fingerprintingStarted > 0 || fingerprintingStopped > 0
          ? {
              started: fingerprintingStarted,
              stopped: fingerprintingStopped,
            }
          : undefined,
    });

    res.json({
      digest,
      stats: {
        totalChanges,
        avgScoreChange: Math.round((avgChange._avg.scoreDelta ?? 0) * 10) / 10,
        fingerprintingStarted,
        fingerprintingStopped,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error generating weekly digest');
    return problem(res, 500, 'Failed to generate weekly digest');
  }
});

// ============================================================
// CREDIBILITY & GOVERNANCE (Phase 3C Final)
// ============================================================

/**
 * GET /api/v2/insights/methodology
 * Public methodology disclosure for transparency.
 */
insightsV2Router.get('/methodology', async (req, res) => {
  try {
    const parsed = DaysQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const metrics = await calculateMethodologyMetrics(prisma, parsed.data.days);

    res.json({
      methodology: {
        version: '3.0',
        lastUpdated: new Date().toISOString(),
        scanningApproach: 'Automated privacy analysis of web domains',
        scoringFactors: [
          'Third-party trackers detected',
          'Browser fingerprinting presence',
          'Cookie policies',
          'Security headers (HTTPS, CSP, HSTS)',
          'Third-party resource loading',
        ],
        confidenceLevels: {
          high: 'Confidence ≥80% - Strong evidence supports conclusion',
          medium: 'Confidence 60-79% - Moderate uncertainty, additional data may change conclusions',
          low: 'Confidence <60% - Preliminary assessment, treat as early signal only',
        },
        hedgeLanguage: {
          note: 'All insights use hedge language to avoid overstating certainty',
          forbiddenPatterns: ['caused by', 'result of', 'proves that', 'confirms that'],
        },
        topicGuidance: TOPIC_GUIDANCE,
      },
      recentMetrics: metrics,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching methodology');
    return problem(res, 500, 'Failed to fetch methodology');
  }
});

/**
 * GET /api/v2/insights/accuracy
 * Public accuracy track record.
 */
insightsV2Router.get('/accuracy', async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get insight counts
    const totalInsights30d = await prisma.insight.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const totalInsights90d = await prisma.insight.count({
      where: { createdAt: { gte: ninetyDaysAgo } },
    });

    // Get average confidence
    const avgConfidence = await prisma.insight.aggregate({
      where: { createdAt: { gte: thirtyDaysAgo } },
      _avg: { confidence: true },
    });

    // Get insights by severity
    const bySeverity30d = await prisma.insight.groupBy({
      by: ['severity'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    });

    // Calculate publishable rate
    const publishable30d = await prisma.insight.count({
      where: { createdAt: { gte: thirtyDaysAgo }, isPublishable: true },
    });

    res.json({
      period: {
        last30Days: {
          totalInsights: totalInsights30d,
          publishableInsights: publishable30d,
          publishableRate: totalInsights30d > 0 ? Math.round((publishable30d / totalInsights30d) * 100) : 0,
          avgConfidence: Math.round((avgConfidence._avg.confidence ?? 0) * 100),
          bySeverity: bySeverity30d.reduce((acc, s) => {
            acc[s.severity] = s._count;
            return acc;
          }, {} as Record<string, number>),
        },
        last90Days: {
          totalInsights: totalInsights90d,
        },
      },
      // Corrections/retractions tracking (will be populated once we have retraction data)
      corrections: {
        total: 0,
        last30Days: 0,
        correctionRate: 0,
        avgTimeToCorrection: null,
        note: 'Correction tracking will populate as predictions are validated',
      },
      disclaimer: 'Accuracy metrics reflect automated analysis. External validation pending.',
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching accuracy');
    return problem(res, 500, 'Failed to fetch accuracy');
  }
});

/**
 * GET /api/v2/insights/corrections
 * Public correction history.
 */
insightsV2Router.get('/corrections', async (_req, res) => {
  try {
    // For now, return structure for future corrections
    // Will be populated as insights are validated and corrections made
    res.json({
      corrections: [],
      total: 0,
      message: 'Correction history will populate as predictions are validated and corrections made.',
      policy: {
        sla: '48 hours from detection to correction',
        visibility: 'All corrections are permanently visible',
        language: 'Direct ownership of errors, no defensive framing',
        archive: 'Historical versions remain accessible',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching corrections');
    return problem(res, 500, 'Failed to fetch corrections');
  }
});

/**
 * GET /api/v2/insights/governance/topic-distribution
 * Topic distribution analysis (diagnostic only, not suppression).
 */
insightsV2Router.get('/governance/topic-distribution', async (req, res) => {
  try {
    const parsed = DaysQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid query parameters', parsed.error.flatten());
    }

    const periodStart = new Date(Date.now() - parsed.data.days * 24 * 60 * 60 * 1000);

    const insights = await prisma.insight.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { insightType: true },
    });

    const distribution = analyzeTopicDistribution(insights);

    res.json({
      period: `Last ${parsed.data.days} days`,
      totalInsights: insights.length,
      distribution,
      policy: {
        note: 'Topic distribution is DIAGNOSTIC only. If reality is 60% tracker changes, we report 60% tracker insights.',
        action: 'Imbalance triggers investigation, not suppression.',
      },
      guidance: TOPIC_GUIDANCE,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching topic distribution');
    return problem(res, 500, 'Failed to fetch topic distribution');
  }
});

/**
 * POST /api/v2/insights/validate/hedge
 * Validate narrative for hedge language compliance.
 */
insightsV2Router.post('/validate/hedge', async (req, res) => {
  try {
    const parsed = ValidateTextSchema.safeParse(req.body);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid request body', parsed.error.flatten());
    }

    const validation = validateHedgeLanguage(parsed.data.text);

    res.json(validation);
  } catch (error) {
    logger.error({ error }, 'Error validating hedge language');
    return problem(res, 500, 'Failed to validate hedge language');
  }
});

/**
 * POST /api/v2/insights/validate/retraction
 * Validate retraction tone.
 */
insightsV2Router.post('/validate/retraction', async (req, res) => {
  try {
    const parsed = ValidateTextSchema.safeParse(req.body);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid request body', parsed.error.flatten());
    }

    const validation = validateRetractionTone(parsed.data.text);

    res.json(validation);
  } catch (error) {
    logger.error({ error }, 'Error validating retraction tone');
    return problem(res, 500, 'Failed to validate retraction tone');
  }
});

/**
 * GET /api/v2/insights/confidence/:insightId
 * Get confidence display information for an insight.
 */
insightsV2Router.get('/confidence/:insightId', async (req, res) => {
  try {
    const { insightId } = req.params;

    const insight = await prisma.insight.findUnique({
      where: { id: insightId },
      select: { confidence: true, title: true, summary: true },
    });

    if (!insight) {
      return problem(res, 404, 'Insight not found');
    }

    const display = getConfidenceDisplay(insight.confidence);

    res.json({
      insightId,
      confidence: insight.confidence,
      display,
    });
  } catch (error) {
    logger.error({ error, insightId: req.params.insightId }, 'Error fetching confidence');
    return problem(res, 500, 'Failed to fetch confidence');
  }
});
