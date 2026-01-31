/**
 * Weekly Report Service (Phase 3C)
 *
 * Generates weekly privacy reports with narratives.
 * Aggregates insights, category trends, and tracker movements.
 */

import type { PrismaClient } from '@prisma/client';
import { generateInsights, persistInsights } from './insightGeneratorService.js';
import { getCategoryRankings } from './categoryIntelligenceService.js';
import { getTrackerMovers } from './trackerEvolutionService.js';
import { getDomainsByTrend } from './stabilityService.js';

interface ReportData {
  changesDetected: number;
  avgScoreChange: number;
  categoryRankings: {
    improving: Array<{ category: { name: string }; scoreChange: number }>;
    declining: Array<{ category: { name: string }; scoreChange: number }>;
  };
  trackerMovers: {
    growing: Array<{ tracker: string; net: number }>;
    declining: Array<{ tracker: string; net: number }>;
  };
  keyInsights: Array<{ type: string; title: string; summary: string; severity: string }>;
}

/**
 * Build narrative summary from report data.
 */
function buildNarrative(data: ReportData): string {
  const lines: string[] = [];

  // Opening
  if (data.avgScoreChange > 1) {
    lines.push(
      `This week saw overall privacy improvements across the web, with an average score increase of ${data.avgScoreChange.toFixed(1)} points.`
    );
  } else if (data.avgScoreChange < -1) {
    lines.push(
      `This week saw privacy degradation across the web, with an average score decrease of ${Math.abs(data.avgScoreChange).toFixed(1)} points.`
    );
  } else {
    lines.push(
      `This week saw mixed privacy changes across the web, with ${data.changesDetected} significant changes detected.`
    );
  }

  // Category highlights
  const topImproving = data.categoryRankings.improving[0];
  if (topImproving) {
    lines.push(
      `${topImproving.category.name} led improvements with a ${topImproving.scoreChange.toFixed(1)}% privacy score increase.`
    );
  }

  const topDeclining = data.categoryRankings.declining[0];
  if (topDeclining) {
    lines.push(
      `${topDeclining.category.name} showed the largest decline at ${Math.abs(topDeclining.scoreChange).toFixed(1)}%.`
    );
  }

  // Tracker highlights
  const topGrowingTracker = data.trackerMovers.growing[0];
  if (topGrowingTracker) {
    lines.push(`${topGrowingTracker.tracker} saw the highest adoption increase with ${topGrowingTracker.net} new sites.`);
  }

  // Key insight
  const topInsight = data.keyInsights[0];
  if (topInsight) {
    lines.push(topInsight.summary);
  }

  return lines.join(' ');
}

/**
 * Generate weekly privacy report.
 * Run every Monday.
 */
export async function generateWeeklyReport(prisma: PrismaClient): Promise<{
  id: string;
  weekStart: Date;
  weekEnd: Date;
  domainsScanned: number;
  changesDetected: number;
  avgScoreChange: number;
  narrativeSummary: string | null;
}> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Aggregate stats
  const [changesDetected, categoryRankings, trackerMovers, improving, declining] =
    await Promise.all([
      prisma.domainChange.count({ where: { detectedAt: { gte: weekStart } } }),
      getCategoryRankings(prisma, 'WEEKLY'),
      getTrackerMovers(prisma, 'WEEKLY'),
      getDomainsByTrend(prisma, 'IMPROVING', { limit: 10 }),
      getDomainsByTrend(prisma, 'DECLINING', { limit: 10 }),
    ]);

  // Get scans count
  const domainsScanned = await prisma.scan.count({
    where: {
      status: 'done',
      finishedAt: { gte: weekStart },
    },
  });

  // Average score change
  const avgChange = await prisma.domainChange.aggregate({
    where: { detectedAt: { gte: weekStart } },
    _avg: { scoreDelta: true },
  });

  // Generate insights
  const insights = await generateInsights(prisma, 7);
  await persistInsights(prisma, insights, weekStart);

  const keyInsights = insights.filter((i) => i.magnitude > 60).slice(0, 10);

  // Build narrative
  const narrative = buildNarrative({
    changesDetected,
    avgScoreChange: avgChange._avg.scoreDelta || 0,
    categoryRankings,
    trackerMovers,
    keyInsights: keyInsights.map((i) => ({
      type: i.type,
      title: i.title,
      summary: i.summary,
      severity: i.severity,
    })),
  });

  // Create report
  const report = await prisma.weeklyReport.create({
    data: {
      weekStart,
      weekEnd: now,
      domainsScanned,
      changesDetected,
      avgScoreChange: avgChange._avg.scoreDelta || 0,
      topImprovements: improving.map((d) => ({
        domain: d.domain.domain,
        trend: d.trend,
        trendStrength: d.trendStrength,
      })),
      topRegressions: declining.map((d) => ({
        domain: d.domain.domain,
        trend: d.trend,
        trendStrength: d.trendStrength,
      })),
      categorySummary: {
        improving: categoryRankings.improving.map((c) => ({
          name: c.category.name,
          change: c.scoreChange,
        })),
        declining: categoryRankings.declining.map((c) => ({
          name: c.category.name,
          change: c.scoreChange,
        })),
      },
      trackerSummary: {
        growing: trackerMovers.growing.slice(0, 10).map((t) => ({
          tracker: t.tracker,
          additions: t.additions,
          removals: t.removals,
          net: t.net,
        })),
        declining: trackerMovers.declining.slice(0, 10).map((t) => ({
          tracker: t.tracker,
          additions: t.additions,
          removals: t.removals,
          net: t.net,
        })),
      },
      keyInsights: keyInsights.map((i) => ({
        type: i.type,
        title: i.title,
        summary: i.summary,
        severity: i.severity,
      })),
      narrativeSummary: narrative,
    },
  });

  return report;
}

/**
 * Get latest weekly report.
 */
export async function getLatestWeeklyReport(prisma: PrismaClient): Promise<{
  id: string;
  weekStart: Date;
  weekEnd: Date;
  domainsScanned: number;
  changesDetected: number;
  avgScoreChange: number;
  topImprovements: unknown;
  topRegressions: unknown;
  categorySummary: unknown;
  trackerSummary: unknown;
  keyInsights: unknown;
  narrativeSummary: string | null;
  isPublished: boolean;
  createdAt: Date;
} | null> {
  return prisma.weeklyReport.findFirst({
    orderBy: { weekEnd: 'desc' },
  });
}

/**
 * Get report for a specific week.
 */
export async function getWeeklyReportByDate(
  prisma: PrismaClient,
  weekStart: Date
): Promise<{
  id: string;
  weekStart: Date;
  weekEnd: Date;
  domainsScanned: number;
  changesDetected: number;
  narrativeSummary: string | null;
} | null> {
  return prisma.weeklyReport.findUnique({
    where: { weekStart },
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      domainsScanned: true,
      changesDetected: true,
      narrativeSummary: true,
    },
  });
}

/**
 * List recent weekly reports.
 */
export async function listWeeklyReports(
  prisma: PrismaClient,
  limit: number = 10
): Promise<
  Array<{
    id: string;
    weekStart: Date;
    weekEnd: Date;
    domainsScanned: number;
    changesDetected: number;
    avgScoreChange: number;
    isPublished: boolean;
    createdAt: Date;
  }>
> {
  return prisma.weeklyReport.findMany({
    orderBy: { weekEnd: 'desc' },
    take: limit,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      domainsScanned: true,
      changesDetected: true,
      avgScoreChange: true,
      isPublished: true,
      createdAt: true,
    },
  });
}
