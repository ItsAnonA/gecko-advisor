/**
 * Transparency Report Service (Phase 0 - Authority Brand Infrastructure)
 *
 * Provides read-only access to transparency reports.
 * No delete function exists. No delete endpoint. We did not implement delete.
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Get ALL reports for archive completeness.
 * Missing months = error row in frontend, DRAFT = visible with status.
 * Scars visible. No filtering.
 */
export async function getAllReports(prisma: PrismaClient) {
  return prisma.transparencyReport.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      scheduledFor: true,
      publishedAt: true,
      autoPublished: true,
      keyFinding: true,
      revisionNote: true,
      quotables: true,
      createdAt: true,
    },
    orderBy: { slug: 'desc' },
  });
}

/**
 * Get a single report by slug (e.g., "2026-02").
 * Returns frozen metricsSnapshot + content.
 */
export async function getReportBySlug(prisma: PrismaClient, slug: string) {
  return prisma.transparencyReport.findUnique({
    where: { slug },
  });
}
