/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * SSR Report Generation Service
 *
 * Generates full HTML for SSR privacy report pages.
 * This service is wrapped by the circuit breaker to prevent cascading failures.
 */

import { buildReportPayload } from '@gecko-advisor/shared';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { findLatestScanForDomain, getRelatedDomains } from './domainService.js';
import { generateReportHTML, type ReportSummary } from '../templates/report.js';

/**
 * Generate SSR report HTML for a domain.
 *
 * This function wraps the FULL pipeline:
 * 1. Database query for latest scan
 * 2. Evidence/issue aggregation
 * 3. Template rendering
 *
 * @param domain - Normalized domain name
 * @returns HTML string or null if no scan found
 * @throws Error on database or rendering failures
 */
export async function generateSSRReportHTML(domain: string): Promise<string | null> {
  logger.debug({ domain }, 'Generating SSR report HTML');

  // Find the latest scan for this domain
  const scan = await findLatestScanForDomain(prisma, domain);

  if (!scan) {
    logger.debug({ domain }, 'No scan found for domain');
    return null;
  }

  // Build report payload for meta data
  const payload = buildReportPayload(scan, {
    evidence: (scan.evidence ?? []) as Parameters<typeof buildReportPayload>[1]['evidence'],
    issues: (scan.issues ?? []) as Parameters<typeof buildReportPayload>[1]['issues'],
  });

  // Extract counts from evidence
  const evidence = scan.evidence as Array<{ kind: string; details: unknown }> | null;
  const trackerDomains = new Set<string>();
  const thirdPartyDomains = new Set<string>();
  let cookieCount = 0;

  if (evidence) {
    for (const e of evidence) {
      const details = e.details as Record<string, unknown> | null;
      const evidenceDomain = details?.domain as string | undefined;

      if (e.kind === 'tracker' && evidenceDomain) {
        trackerDomains.add(evidenceDomain);
      } else if (e.kind === 'thirdparty' && evidenceDomain) {
        thirdPartyDomains.add(evidenceDomain);
      } else if (e.kind === 'cookie') {
        cookieCount++;
      }
    }
  }

  // Extract TLS grade
  let tlsGrade: string | null = null;
  if (evidence) {
    const tlsEvidence = evidence.find(e => e.kind === 'tls');
    if (tlsEvidence && typeof tlsEvidence.details === 'object' && tlsEvidence.details) {
      const details = tlsEvidence.details as Record<string, unknown>;
      if (typeof details.grade === 'string') {
        tlsGrade = details.grade;
      }
    }
  }

  // Fetch related domains for internal linking (SEO improvement)
  const relatedDomains = await getRelatedDomains(
    prisma,
    domain,
    scan.score ?? 50, // Use 50 as default if score is null
    5 // Limit to 5 related domains
  );

  // Create report summary
  const reportSummary: ReportSummary = {
    domain,
    score: scan.score ?? 0,
    label: scan.label ?? 'Unknown',
    trackerCount: trackerDomains.size,
    thirdPartyCount: thirdPartyDomains.size,
    cookieCount,
    tlsGrade,
    summary: payload.meta.dataSharing
      ? `This site has ${trackerDomains.size} trackers and ${thirdPartyDomains.size} third-party connections. Data sharing risk: ${payload.meta.dataSharing}.`
      : null,
    createdAt: scan.createdAt.toISOString(),
    updatedAt: (scan.finishedAt ?? scan.createdAt).toISOString(),
    relatedDomains: relatedDomains.length > 0 ? relatedDomains : undefined,
  };

  // Generate HTML
  const html = generateReportHTML(domain, reportSummary, '/privacy-policy');

  logger.info(
    {
      domain,
      score: scan.score,
      trackers: trackerDomains.size,
      thirdParties: thirdPartyDomains.size,
    },
    'SSR report HTML generated successfully'
  );

  return html;
}
