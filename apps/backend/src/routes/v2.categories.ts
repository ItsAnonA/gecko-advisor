/**
 * Categories API (Phase 2B)
 *
 * Provides category data for hub pages:
 * - List all categories with benchmarks
 * - Get single category with top/worst domains
 * - Sample comparisons (UX only, NOT for SEO)
 */

import { Router } from 'express';
import type { Category, Domain, Scan } from '@prisma/client';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

// HARD LIMIT: Never return more than 3 samples per category
// This is UX scaffolding, NOT SEO content
const MAX_SAMPLES_PER_CATEGORY = 3;

// Type for category with selected fields
type CategoryWithBenchmarks = Pick<Category, 'slug' | 'name' | 'description' | 'benchmarks' | 'benchmarksCalculatedAt'>;

// Type for domain with latest scan
type DomainWithScan = Pick<Domain, 'domain'> & {
  latestScan: Pick<Scan, 'score' | 'meta'> | null;
};

export const categoriesV2Router = Router();

/**
 * GET /api/v2/categories
 * List all categories with their benchmarks
 */
categoriesV2Router.get('/v2/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        benchmarksCalculatedAt: { not: null },
      },
      orderBy: { name: 'asc' },
      select: {
        slug: true,
        name: true,
        description: true,
        benchmarks: true,
        benchmarksCalculatedAt: true,
      },
    });

    // Transform benchmarks for frontend
    const transformed = categories.map((cat: CategoryWithBenchmarks) => ({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      benchmarks: cat.benchmarks
        ? {
            avgScore: (cat.benchmarks as Record<string, unknown>).avgScore,
            sampleSize: (cat.benchmarks as Record<string, unknown>).sampleSize,
            avgTrackers: (cat.benchmarks as Record<string, unknown>).avgTrackers,
            fingerprintingRate: (cat.benchmarks as Record<string, unknown>).fingerprintingRate,
          }
        : null,
    }));

    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.json({ categories: transformed });
  } catch (error) {
    logger.error({ error }, 'Error fetching categories');
    return problem(res, 500, 'Failed to fetch categories');
  }
});

/**
 * GET /api/v2/categories/:slug
 * Get single category with top/worst domains
 */
categoriesV2Router.get('/v2/categories/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        benchmarks: true,
        benchmarksCalculatedAt: true,
        // Include sample comparisons (UX only, NOT for SEO)
        sampleComparisons: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          take: MAX_SAMPLES_PER_CATEGORY, // Hard limit enforced at query level
          select: {
            id: true,
            domainA: true,
            domainB: true,
            label: true,
            description: true,
          },
        },
      },
    });

    if (!category) {
      return problem(res, 404, 'Category not found');
    }

    if (!category.benchmarks) {
      return problem(res, 404, 'Category benchmarks not yet calculated');
    }

    // Get top 10 domains by score (Tier A only)
    const topDomains = await prisma.domain.findMany({
      where: {
        categoryId: category.id,
        indexTier: 'A',
        latestScan: {
          status: 'done',
          score: { not: null },
        },
      },
      select: {
        domain: true,
        latestScan: {
          select: {
            score: true,
            meta: true,
          },
        },
      },
      orderBy: {
        latestScan: {
          score: 'desc',
        },
      },
      take: 10,
    });

    // Get bottom 10 domains by score (Tier A only)
    const worstDomains = await prisma.domain.findMany({
      where: {
        categoryId: category.id,
        indexTier: 'A',
        latestScan: {
          status: 'done',
          score: { not: null },
        },
      },
      select: {
        domain: true,
        latestScan: {
          select: {
            score: true,
            meta: true,
          },
        },
      },
      orderBy: {
        latestScan: {
          score: 'asc',
        },
      },
      take: 10,
    });

    // Transform domain data
    const transformDomains = (domains: DomainWithScan[]) =>
      domains
        .filter((d): d is DomainWithScan & { latestScan: NonNullable<DomainWithScan['latestScan']> } => d.latestScan !== null)
        .map((d) => ({
          domain: d.domain,
          score: d.latestScan.score || 0,
          trackers: ((d.latestScan.meta as Record<string, unknown>)?.trackerCount as number) || 0,
        }));

    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.json({
      slug: category.slug,
      name: category.name,
      description: category.description,
      benchmarks: category.benchmarks,
      topDomains: transformDomains(topDomains),
      worstDomains: transformDomains(worstDomains),
      // Sample comparisons (UX only, NOT for SEO)
      sampleComparisons: category.sampleComparisons || [],
    });
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error fetching category');
    return problem(res, 500, 'Failed to fetch category');
  }
});
