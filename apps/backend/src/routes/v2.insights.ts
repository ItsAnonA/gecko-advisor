/**
 * Insights API Routes (Phase 3C)
 *
 * Provides access to precomputed insights, stability data,
 * category rankings, tracker trends, weekly reports, and predictions.
 *
 * Phase 3C Hardening: Added prediction, quality, and narrative endpoints.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import type { DomainTrend, PeriodType } from '@prisma/client';
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

const prisma = new PrismaClient();

export const insightsV2Router = Router();

/**
 * GET /api/v2/insights/stability/unstable
 * Get domains with high volatility (unstable privacy scores).
 */
insightsV2Router.get('/stability/unstable', async (req, res) => {
  try {
    const { tier, minVolatility = '50', limit = '20' } = req.query;
    const result = await getUnstableDomains(prisma, {
      tier: tier as string | undefined,
      minVolatility: parseFloat(minVolatility as string),
      limit: parseInt(limit as string, 10),
    });
    res.json({ domains: result });
  } catch (error) {
    console.error('Error fetching unstable domains:', error);
    res.status(500).json({ error: 'Failed to fetch unstable domains' });
  }
});

/**
 * GET /api/v2/insights/stability/trend/:trend
 * Get domains by trend (IMPROVING, STABLE, DECLINING, VOLATILE).
 */
insightsV2Router.get('/stability/trend/:trend', async (req, res) => {
  try {
    const { trend } = req.params;
    const { tier, minStrength = '0.3', limit = '20' } = req.query;

    const validTrends: DomainTrend[] = ['IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE'];
    if (!validTrends.includes(trend as DomainTrend)) {
      return res.status(400).json({ error: 'Invalid trend. Must be IMPROVING, STABLE, DECLINING, or VOLATILE' });
    }

    const result = await getDomainsByTrend(prisma, trend as DomainTrend, {
      tier: tier as string | undefined,
      minStrength: parseFloat(minStrength as string),
      limit: parseInt(limit as string, 10),
    });
    res.json({ domains: result });
  } catch (error) {
    console.error('Error fetching domains by trend:', error);
    res.status(500).json({ error: 'Failed to fetch domains by trend' });
  }
});

/**
 * GET /api/v2/insights/categories/rankings
 * Get category rankings by privacy trend.
 */
insightsV2Router.get('/categories/rankings', async (req, res) => {
  try {
    const { period = 'WEEKLY' } = req.query;

    const validPeriods: PeriodType[] = ['WEEKLY', 'MONTHLY'];
    if (!validPeriods.includes(period as PeriodType)) {
      return res.status(400).json({ error: 'Invalid period. Must be WEEKLY or MONTHLY' });
    }

    const result = await getCategoryRankings(prisma, period as PeriodType);
    res.json(result);
  } catch (error) {
    console.error('Error fetching category rankings:', error);
    res.status(500).json({ error: 'Failed to fetch category rankings' });
  }
});

/**
 * GET /api/v2/insights/trackers/movers
 * Get top growing and declining trackers.
 */
insightsV2Router.get('/trackers/movers', async (req, res) => {
  try {
    const { period = 'WEEKLY' } = req.query;

    const validPeriods: PeriodType[] = ['WEEKLY', 'MONTHLY'];
    if (!validPeriods.includes(period as PeriodType)) {
      return res.status(400).json({ error: 'Invalid period. Must be WEEKLY or MONTHLY' });
    }

    const result = await getTrackerMovers(prisma, period as PeriodType);
    res.json(result);
  } catch (error) {
    console.error('Error fetching tracker movers:', error);
    res.status(500).json({ error: 'Failed to fetch tracker movers' });
  }
});

/**
 * GET /api/v2/insights
 * Get publishable insights.
 */
insightsV2Router.get('/', async (req, res) => {
  try {
    const { limit = '20' } = req.query;
    const result = await getPublishableInsights(prisma, parseInt(limit as string, 10));
    res.json({ insights: result });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

/**
 * GET /api/v2/insights/reports/weekly/latest
 * Get the most recent weekly report.
 */
insightsV2Router.get('/reports/weekly/latest', async (req, res) => {
  try {
    const report = await getLatestWeeklyReport(prisma);
    if (!report) {
      return res.status(404).json({ error: 'No weekly reports available' });
    }
    res.json({ report });
  } catch (error) {
    console.error('Error fetching latest weekly report:', error);
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
});

/**
 * GET /api/v2/insights/reports/weekly
 * List recent weekly reports.
 */
insightsV2Router.get('/reports/weekly', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const reports = await listWeeklyReports(prisma, parseInt(limit as string, 10));
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    res.status(500).json({ error: 'Failed to fetch weekly reports' });
  }
});

// ============================================================
// TIERED INSIGHTS (Gap 1)
// ============================================================

/**
 * GET /api/v2/insights/tiered
 * Get insights organized by tier (breaking, notable, emerging).
 */
insightsV2Router.get('/tiered', async (req, res) => {
  try {
    const { days = '7' } = req.query;
    const result = await generateTieredInsights(prisma, parseInt(days as string, 10));
    res.json({
      ...result,
      tiers: INSIGHT_TIERS,
    });
  } catch (error) {
    console.error('Error fetching tiered insights:', error);
    res.status(500).json({ error: 'Failed to fetch tiered insights' });
  }
});

// ============================================================
// STABILITY COVERAGE (Gap 2)
// ============================================================

/**
 * GET /api/v2/insights/stability/coverage
 * Get stability coverage statistics.
 */
insightsV2Router.get('/stability/coverage', async (req, res) => {
  try {
    const coverage = await getStabilityCoverage(prisma);
    res.json(coverage);
  } catch (error) {
    console.error('Error fetching stability coverage:', error);
    res.status(500).json({ error: 'Failed to fetch stability coverage' });
  }
});

// ============================================================
// PREDICTIONS (Gap 3)
// ============================================================

/**
 * GET /api/v2/insights/predictions/summary
 * Get prediction summary statistics.
 */
insightsV2Router.get('/predictions/summary', async (req, res) => {
  try {
    const summary = await getPredictionSummary(prisma);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching prediction summary:', error);
    res.status(500).json({ error: 'Failed to fetch prediction summary' });
  }
});

/**
 * GET /api/v2/insights/predictions/warnings
 * Get early warning signals.
 */
insightsV2Router.get('/predictions/warnings', async (req, res) => {
  try {
    const { signal } = req.query;
    let warnings = await detectEarlyWarnings(prisma);

    if (signal) {
      warnings = warnings.filter((w) => w.signal === signal);
    }

    res.json({ warnings, count: warnings.length });
  } catch (error) {
    console.error('Error fetching early warnings:', error);
    res.status(500).json({ error: 'Failed to fetch early warnings' });
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
      return res.status(404).json({ error: 'Not enough data for momentum calculation' });
    }

    res.json({ momentum });
  } catch (error) {
    console.error('Error fetching momentum:', error);
    res.status(500).json({ error: 'Failed to fetch momentum' });
  }
});

/**
 * GET /api/v2/insights/predictions/trackers/saturation
 * Get tracker saturation predictions.
 */
insightsV2Router.get('/predictions/trackers/saturation', async (req, res) => {
  try {
    const { status } = req.query;
    let predictions = await predictTrackerSaturation(prisma);

    if (status) {
      predictions = predictions.filter((p) => p.status === status);
    }

    res.json({ predictions, count: predictions.length });
  } catch (error) {
    console.error('Error fetching tracker saturation:', error);
    res.status(500).json({ error: 'Failed to fetch tracker saturation' });
  }
});

// ============================================================
// QUALITY (Gap 4)
// ============================================================

/**
 * GET /api/v2/insights/quality/distribution
 * Get quality distribution for recent insights.
 */
insightsV2Router.get('/quality/distribution', async (req, res) => {
  try {
    const distribution = await getQualityDistribution(prisma);
    res.json(distribution);
  } catch (error) {
    console.error('Error fetching quality distribution:', error);
    res.status(500).json({ error: 'Failed to fetch quality distribution' });
  }
});

/**
 * GET /api/v2/insights/quality/top
 * Get top quality insights for publishing.
 */
insightsV2Router.get('/quality/top', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const insights = await getTopQualityInsights(prisma, parseInt(limit as string, 10));
    res.json({ insights });
  } catch (error) {
    console.error('Error fetching top quality insights:', error);
    res.status(500).json({ error: 'Failed to fetch top quality insights' });
  }
});

// ============================================================
// NARRATIVES (Gap 5)
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
    console.error('Error fetching narrative templates:', error);
    res.status(500).json({ error: 'Failed to fetch narrative templates' });
  }
});

/**
 * GET /api/v2/insights/narratives/weekly-digest
 * Generate weekly digest narrative.
 */
insightsV2Router.get('/narratives/weekly-digest', async (req, res) => {
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
    console.error('Error generating weekly digest:', error);
    res.status(500).json({ error: 'Failed to generate weekly digest' });
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
    const { days = '7' } = req.query;
    const metrics = await calculateMethodologyMetrics(prisma, parseInt(days as string, 10));

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
    console.error('Error fetching methodology:', error);
    res.status(500).json({ error: 'Failed to fetch methodology' });
  }
});

/**
 * GET /api/v2/insights/accuracy
 * Public accuracy track record.
 */
insightsV2Router.get('/accuracy', async (req, res) => {
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
    console.error('Error fetching accuracy:', error);
    res.status(500).json({ error: 'Failed to fetch accuracy' });
  }
});

/**
 * GET /api/v2/insights/corrections
 * Public correction history.
 */
insightsV2Router.get('/corrections', async (req, res) => {
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
    console.error('Error fetching corrections:', error);
    res.status(500).json({ error: 'Failed to fetch corrections' });
  }
});

/**
 * GET /api/v2/insights/governance/topic-distribution
 * Topic distribution analysis (diagnostic only, not suppression).
 */
insightsV2Router.get('/governance/topic-distribution', async (req, res) => {
  try {
    const { days = '7' } = req.query;
    const periodStart = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const insights = await prisma.insight.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { insightType: true },
    });

    const distribution = analyzeTopicDistribution(insights);

    res.json({
      period: `Last ${days} days`,
      totalInsights: insights.length,
      distribution,
      policy: {
        note: 'Topic distribution is DIAGNOSTIC only. If reality is 60% tracker changes, we report 60% tracker insights.',
        action: 'Imbalance triggers investigation, not suppression.',
      },
      guidance: TOPIC_GUIDANCE,
    });
  } catch (error) {
    console.error('Error fetching topic distribution:', error);
    res.status(500).json({ error: 'Failed to fetch topic distribution' });
  }
});

/**
 * POST /api/v2/insights/validate/hedge
 * Validate narrative for hedge language compliance.
 */
insightsV2Router.post('/validate/hedge', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const validation = validateHedgeLanguage(text);

    res.json(validation);
  } catch (error) {
    console.error('Error validating hedge language:', error);
    res.status(500).json({ error: 'Failed to validate hedge language' });
  }
});

/**
 * POST /api/v2/insights/validate/retraction
 * Validate retraction tone.
 */
insightsV2Router.post('/validate/retraction', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const validation = validateRetractionTone(text);

    res.json(validation);
  } catch (error) {
    console.error('Error validating retraction tone:', error);
    res.status(500).json({ error: 'Failed to validate retraction tone' });
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
      return res.status(404).json({ error: 'Insight not found' });
    }

    const display = getConfidenceDisplay(insight.confidence);

    res.json({
      insightId,
      confidence: insight.confidence,
      display,
    });
  } catch (error) {
    console.error('Error fetching confidence:', error);
    res.status(500).json({ error: 'Failed to fetch confidence' });
  }
});
