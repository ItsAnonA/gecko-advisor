/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from 'express';
import { isValidDomain } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
import { normalizeDomain } from '../services/domainService.js';
import { requirePaidApiKey } from '../middleware/paidApiAuth.js';

export const domainV1Router = Router();

/**
 * GET /api/v1/domain/:domain
 *
 * Paid API endpoint — returns a privacy risk summary for a domain.
 * Gated by requirePaidApiKey middleware (Bearer token in Authorization header).
 */
domainV1Router.get('/domain/:domain', requirePaidApiKey, async (req, res) => {
  try {
    const rawDomain = decodeURIComponent(req.params.domain as string);
    const domain = normalizeDomain(rawDomain);

    if (!domain || !isValidDomain(domain)) {
      return problem(res, 400, 'Invalid domain', 'Please provide a valid domain name.');
    }

    // Fetch domain record with stability and latest scan
    const domainRecord = await prisma.domain.findUnique({
      where: { domain },
      include: {
        stability: true,
        latestScan: {
          select: {
            id: true,
            score: true,
            finishedAt: true,
            evidence: {
              where: { kind: 'tracker' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!domainRecord || !domainRecord.latestScan) {
      return problem(
        res,
        404,
        'Domain not found',
        `No data for "${domain}". Email api@geckoadvisor.com to request coverage.`
      );
    }

    const scan = domainRecord.latestScan;
    const stability = domainRecord.stability;

    // Calculate data age
    const scannedAt = scan.finishedAt ?? domainRecord.lastScanned;
    let dataAge = 'unknown';
    if (scannedAt) {
      const hoursAgo = Math.round((Date.now() - scannedAt.getTime()) / 3_600_000);
      if (hoursAgo < 1) dataAge = '<1h';
      else if (hoursAgo < 24) dataAge = `${hoursAgo}h`;
      else dataAge = `${Math.round(hoursAgo / 24)}d`;
    }

    res.json({
      domain,
      privacyScore: scan.score ?? null,
      scannedAt: scannedAt?.toISOString() ?? null,
      stabilityTier: stability?.confidenceTier ?? 'PROVISIONAL',
      volatilityIndex: stability?.volatilityIndex ?? null,
      trend: stability?.trend ?? null,
      scanConfidence: domainRecord.scanConfidence ?? null,
      trackerCount: scan.evidence.length,
      scanCount: domainRecord.scanCount,
      dataAge,
    });
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Paid API domain lookup error');
    return problem(res, 500, 'Internal Server Error', 'Failed to fetch domain data.');
  }
});
