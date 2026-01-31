/**
 * Insights API Routes (Phase 3C)
 *
 * Provides access to precomputed insights, stability data,
 * category rankings, tracker trends, and weekly reports.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import type { DomainTrend, PeriodType } from '@prisma/client';
import { getUnstableDomains, getDomainsByTrend } from '../services/stabilityService.js';
import { getCategoryRankings } from '../services/categoryIntelligenceService.js';
import { getTrackerMovers } from '../services/trackerEvolutionService.js';
import { getPublishableInsights } from '../services/insightGeneratorService.js';
import { getLatestWeeklyReport, listWeeklyReports } from '../services/weeklyReportService.js';

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
