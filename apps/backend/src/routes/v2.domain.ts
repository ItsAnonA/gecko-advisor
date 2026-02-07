/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { buildReportPayload, isBlockedDomain, isValidDomain } from "@gecko-advisor/shared";
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
 * Response codes:
 * - 200: Report found (GET returns JSON, HEAD returns empty)
 * - 404: Domain invalid or no scan exists (expected, not an error)
 * - 410: Domain blocked (adult content)
 * - 500: Real error (DB failure, code exception)
 *
 * Example: GET /api/domain/example.com
 */
domainV2Router.get('/domain/:domain', async (req, res) => {
  const rawDomain = req.params.domain;

  // Guard 1: Validate domain format BEFORE any DB query
  // This rejects garbage like "837fy38r2", unicode noise, bot-invented paths
  const domain = normalizeDomain(rawDomain);
  if (!domain || !isValidDomain(domain)) {
    // Expected state - don't log as error
    return res.status(404).json({
      type: 'about:blank',
      status: 404,
      title: 'Invalid domain',
      detail: 'Please provide a valid domain name',
    });
  }

  // Guard 2: Return 410 Gone for blocked domains (adult content)
  // This helps Google de-index these pages faster
  if (isBlockedDomain(domain)) {
    logger.debug({ domain }, 'Blocked domain report requested - returning 410 Gone');
    return res.status(410).json({
      type: 'gone',
      status: 410,
      title: 'Report Removed',
      detail: 'This report has been removed due to content policy.',
    });
  }

  try {
    // Find the latest scan for this domain
    const scan = await findLatestScanForDomain(prisma, domain);

    // Guard 3: No scan found - return 404 (expected state, not an error)
    if (!scan) {
      // Debug level only - this is expected for domains never scanned
      logger.debug({ domain }, 'No scan found for domain');
      return res.status(404).json({
        type: 'about:blank',
        status: 404,
        title: 'No report found',
        detail: `No privacy report exists for ${domain}. You can scan it from the homepage.`,
      });
    }

    // Guard 4: HEAD requests - return 200 without building expensive response
    // Bots use HEAD aggressively to check if pages exist
    if (req.method === 'HEAD') {
      return res.status(200).end();
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
        url: `https://geckoadvisor.com/privacy-report/${domain}`,
        slug: scan.slug,
        slugUrl: `https://geckoadvisor.com/r/${scan.slug}`,
      },
      // Phase 2B: Include category if domain has been classified
      category: scan.category || null,
    };

    return res.json(response);
  } catch (error) {
    // Real errors (DB failure, code exception) - log as error
    logger.error({ error, domain }, 'Error fetching domain report');
    return problem(res, 500, 'Failed to load domain report');
  }
});

/**
 * GET /api/domain/:domain/exists
 * Quick check if a domain has been scanned.
 * Returns minimal data for fast lookups.
 *
 * Response states for 404 cleanup strategy:
 * 1. exists=true, hasScan=true → Normal report page
 * 2. exists=true, hasScan=false, category set → Redirect to category hub
 * 3. exists=false → True 404 (domain never scanned)
 */
domainV2Router.get('/domain/:domain/exists', async (req, res) => {
  try {
    const rawDomain = req.params.domain;
    const domain = normalizeDomain(rawDomain);

    if (!domain || domain.length < 3) {
      return res.json({ exists: false, hasScan: false, domain: rawDomain });
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
        // Include category for smart redirects when scan is pruned
        category: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    // Domain never scanned - true 404
    if (!domainRecord) {
      return res.json({ exists: false, hasScan: false, domain });
    }

    // Domain exists but scan was pruned - redirect to category or /reports
    if (!domainRecord.latestScan) {
      return res.json({
        exists: true,
        hasScan: false,
        domain,
        category: domainRecord.category || null,
        lastScanned: domainRecord.lastScanned,
      });
    }

    // Domain and scan both exist - normal report
    res.json({
      exists: true,
      hasScan: true,
      domain,
      slug: domainRecord.latestScan.slug,
      score: domainRecord.latestScan.score,
      label: domainRecord.latestScan.label,
      lastScanned: domainRecord.lastScanned,
      category: domainRecord.category || null,
    });
  } catch (error) {
    logger.error({ error, domain: req.params.domain }, 'Error checking domain existence');
    return res.json({ exists: false, hasScan: false, domain: req.params.domain });
  }
});
