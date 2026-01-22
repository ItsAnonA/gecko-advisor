/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { buildReportPayload, isBlockedDomain } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { findLatestScanForDomain, normalizeDomain } from "../services/domainService.js";

export const domainV2Router = Router();

/**
 * GET /api/domain/:domain
 * Fetch the latest completed scan for a domain.
 * Used by the /privacy-policy/:domain canonical route.
 *
 * Example: GET /api/domain/example.com
 */
domainV2Router.get('/domain/:domain', async (req, res) => {
  try {
    const rawDomain = req.params.domain;

    // Normalize the domain input
    const domain = normalizeDomain(rawDomain);

    if (!domain || domain.length < 3) {
      return problem(res, 400, 'Invalid domain', 'Please provide a valid domain name');
    }

    // Return 410 Gone for blocked domains (adult content)
    // This helps Google de-index these pages faster
    if (isBlockedDomain(domain)) {
      logger.info({ domain }, 'Blocked domain report requested - returning 410 Gone');
      res.status(410).json({
        type: 'gone',
        status: 410,
        title: 'Report Removed',
        detail: 'This report has been removed due to content policy.',
      });
      return;
    }

    // Find the latest scan for this domain
    const scan = await findLatestScanForDomain(prisma, domain);

    if (!scan) {
      return problem(res, 404, 'No report found', `No privacy report exists for ${domain}. You can scan it from the homepage.`);
    }

    // Build the report payload
    const payload = buildReportPayload(scan, {
      evidence: (scan.evidence ?? []) as Parameters<typeof buildReportPayload>[1]['evidence'],
      issues: (scan.issues ?? []) as Parameters<typeof buildReportPayload>[1]['issues'],
    });

    // Add canonical URL info for SEO
    const response = {
      ...payload,
      canonical: {
        domain,
        url: `https://geckoadvisor.com/privacy-policy/${domain}`,
        slug: scan.slug,
        slugUrl: `https://geckoadvisor.com/r/${scan.slug}`,
      },
      // Phase 2B: Include category if domain has been classified
      category: scan.category || null,
    };

    res.json(response);
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error fetching domain report');
    return problem(res, 500, 'Failed to load domain report');
  }
});

/**
 * GET /api/domain/:domain/exists
 * Quick check if a domain has been scanned.
 * Returns minimal data for fast lookups.
 */
domainV2Router.get('/domain/:domain/exists', async (req, res) => {
  try {
    const rawDomain = req.params.domain;
    const domain = normalizeDomain(rawDomain);

    if (!domain || domain.length < 3) {
      return res.json({ exists: false, domain: rawDomain });
    }

    const domainRecord = await prisma.domain.findUnique({
      where: { domain },
      select: {
        domain: true,
        lastScanned: true,
        latestScan: {
          select: {
            slug: true,
            score: true,
            label: true,
          },
        },
      },
    });

    if (!domainRecord || !domainRecord.latestScan) {
      return res.json({ exists: false, domain });
    }

    res.json({
      exists: true,
      domain,
      slug: domainRecord.latestScan.slug,
      score: domainRecord.latestScan.score,
      label: domainRecord.latestScan.label,
      lastScanned: domainRecord.lastScanned,
    });
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error checking domain existence');
    return res.json({ exists: false, domain: req.params.domain });
  }
});
