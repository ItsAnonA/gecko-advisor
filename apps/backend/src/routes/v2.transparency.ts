/**
 * Transparency Report Routes (Phase 0 - Authority Brand Infrastructure)
 *
 * 2 endpoints. No delete. No create (seed only for Phase 0).
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { getAllReports, getReportBySlug } from '../services/transparencyReportService.js';

export const transparencyV2Router = Router();

const SlugSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Slug must be YYYY-MM format');

/**
 * GET /api/v2/transparency/reports
 * All reports for archive completeness (status visible).
 * Missing months = error row in frontend.
 */
transparencyV2Router.get('/reports', async (_req, res) => {
  try {
    const reports = await getAllReports(prisma);
    res.json({ items: reports });
  } catch (error) {
    logger.error({ error }, 'Error fetching transparency reports');
    return problem(res, 500, 'Failed to load transparency reports');
  }
});

/**
 * GET /api/v2/transparency/reports/:slug
 * Frozen metricsSnapshot + content for a single report.
 */
transparencyV2Router.get('/reports/:slug', async (req, res) => {
  try {
    const parsed = SlugSchema.safeParse(req.params.slug);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid report slug');
    }

    const report = await getReportBySlug(prisma, parsed.data);
    if (!report) {
      return problem(res, 404, 'Transparency report not found');
    }

    res.json(report);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error fetching transparency report');
    return problem(res, 500, 'Failed to load transparency report');
  }
});
