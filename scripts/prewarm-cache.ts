#!/usr/bin/env tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Cache Pre-warming Script
 *
 * Generates and caches SSR report HTML for all indexed domains.
 * This ensures high cache hit rates and prevents bot-triggered 5xx errors.
 *
 * Usage:
 *   pnpm prewarm:cache                    # Pre-warm all indexed domains
 *   pnpm prewarm:cache --force            # Re-generate even if cached
 *   pnpm prewarm:cache --concurrency 50   # Custom concurrency
 *   pnpm prewarm:cache --limit 100        # Only process first 100 domains
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { generateReportHTML, type ReportSummary } from '../apps/backend/src/templates/report.js';
import { buildReportPayload } from '@gecko-advisor/shared';
import { getRelatedDomains } from '../apps/backend/src/services/domainService.js';

/**
 * Simple concurrency limiter without external dependencies
 */
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

// Configuration
const config = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  concurrency: Number.parseInt(process.env.CONCURRENCY ?? '20', 10),
  force: process.argv.includes('--force'),
  limit: process.argv.includes('--limit')
    ? Number.parseInt(process.argv[process.argv.indexOf('--limit') + 1] ?? '0', 10)
    : undefined,
  batchSize: 100, // Log progress every N domains
};

// Override concurrency from CLI
const concurrencyFlag = process.argv.indexOf('--concurrency');
if (concurrencyFlag !== -1 && process.argv[concurrencyFlag + 1]) {
  config.concurrency = Number.parseInt(process.argv[concurrencyFlag + 1], 10);
}

const prisma = new PrismaClient();
const redis = new Redis(config.redisUrl);

interface Stats {
  total: number;
  processed: number;
  cached: number;
  skipped: number;
  failed: number;
  startTime: number;
}

const stats: Stats = {
  total: 0,
  processed: 0,
  cached: 0,
  skipped: 0,
  failed: 0,
  startTime: Date.now(),
};

/**
 * Generate cache key for a domain (matches backend logic)
 */
function getCacheKey(domain: string): string {
  return `ssr_report:${domain}:v1`;
}

/**
 * Generate and cache report HTML for a single domain
 */
async function prewarmDomain(domain: string): Promise<void> {
  try {
    const cacheKey = getCacheKey(domain);

    // Check if already cached (unless --force)
    if (!config.force) {
      const exists = await redis.exists(cacheKey);
      if (exists) {
        stats.skipped++;
        return;
      }
    }

    // Find latest completed scan for this domain
    const scan = await prisma.scan.findFirst({
      where: {
        input: {
          contains: domain,
        },
        status: 'done',
      },
      orderBy: {
        finishedAt: 'desc',
      },
      select: {
        id: true,
        score: true,
        label: true,
        input: true,
        createdAt: true,
        finishedAt: true,
        evidence: true,
        issues: true,
      },
    });

    if (!scan) {
      console.warn(`⚠️  No completed scan found for ${domain}`);
      stats.failed++;
      return;
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

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, html);

    stats.cached++;
  } catch (error) {
    console.error(`❌ Failed to pre-warm ${domain}:`, error instanceof Error ? error.message : String(error));
    stats.failed++;
  } finally {
    stats.processed++;

    // Log progress every batch
    if (stats.processed % config.batchSize === 0) {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.processed / elapsed;
      const remaining = stats.total - stats.processed;
      const eta = remaining / rate;

      console.log(
        `📊 Progress: ${stats.processed}/${stats.total} (${Math.round((stats.processed / stats.total) * 100)}%) | ` +
        `Cached: ${stats.cached} | Skipped: ${stats.skipped} | Failed: ${stats.failed} | ` +
        `Rate: ${rate.toFixed(1)}/s | ETA: ${Math.round(eta)}s`
      );
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting cache pre-warming...\n');
  console.log('Configuration:');
  console.log(`  - Concurrency: ${config.concurrency}`);
  console.log(`  - Force refresh: ${config.force}`);
  console.log(`  - Limit: ${config.limit ?? 'none'}`);
  console.log('');

  try {
    // Fetch all indexed domains
    const domains = await prisma.domain.findMany({
      where: {
        isIndexed: true,
      },
      select: {
        domain: true,
      },
      orderBy: {
        lastScanned: 'desc', // Most recently scanned first
      },
      take: config.limit,
    });

    stats.total = domains.length;

    if (stats.total === 0) {
      console.log('ℹ️  No indexed domains found to pre-warm.');
      return;
    }

    console.log(`📋 Found ${stats.total} indexed domains to pre-warm\n`);

    // Create concurrency limiter
    const limiter = new ConcurrencyLimiter(config.concurrency);

    // Process domains in parallel with concurrency control
    await Promise.all(
      domains.map(({ domain }) =>
        limiter.run(() => prewarmDomain(domain))
      )
    );

    // Final summary
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = stats.processed / elapsed;

    console.log('\n✅ Cache pre-warming complete!\n');
    console.log('Summary:');
    console.log(`  - Total domains: ${stats.total}`);
    console.log(`  - Cached: ${stats.cached}`);
    console.log(`  - Skipped (already cached): ${stats.skipped}`);
    console.log(`  - Failed: ${stats.failed}`);
    console.log(`  - Total time: ${elapsed.toFixed(1)}s`);
    console.log(`  - Average rate: ${rate.toFixed(1)} domains/s`);
    console.log(`  - Cache hit rate (estimated): ${Math.round(((stats.cached + stats.skipped) / stats.total) * 100)}%`);

    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} domains failed. Check logs above for details.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during pre-warming:', error);
    process.exit(1);
  } finally {
    await redis.quit();
    await prisma.$disconnect();
  }
}

// Handle SIGINT gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted by user. Cleaning up...');

  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log('\nPartial results:');
  console.log(`  - Processed: ${stats.processed}/${stats.total}`);
  console.log(`  - Cached: ${stats.cached}`);
  console.log(`  - Skipped: ${stats.skipped}`);
  console.log(`  - Failed: ${stats.failed}`);
  console.log(`  - Time: ${elapsed.toFixed(1)}s`);

  await redis.quit();
  await prisma.$disconnect();
  process.exit(130);
});

// Run main
main();
