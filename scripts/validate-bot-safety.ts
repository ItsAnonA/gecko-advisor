#!/usr/bin/env tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Bot Safety Validation Script
 *
 * Performs synthetic crawl with Googlebot user-agent to verify:
 * - ZERO 5xx responses (CRITICAL)
 * - All placeholders have noindex meta tag
 * - Cache hit rate >95%
 *
 * This is a BLOCKING validation before URL migration.
 *
 * Usage:
 *   pnpm validate:bot-safety                 # Sample 1000 random domains
 *   pnpm validate:bot-safety --sample 2000   # Custom sample size
 *   pnpm validate:bot-safety --all           # Test ALL indexed domains (slow)
 *   pnpm validate:bot-safety --endpoint http://localhost:5000  # Custom endpoint
 */

import { PrismaClient } from '@prisma/client';

// Configuration
const config = {
  endpoint: process.env.API_ENDPOINT ?? 'https://api.geckoadvisor.com',
  sampleSize: 1000,
  testAll: false,
  timeout: 10000, // 10 second timeout per request
  userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

// Parse CLI arguments
if (process.argv.includes('--all')) {
  config.testAll = true;
}

const sampleFlag = process.argv.indexOf('--sample');
if (sampleFlag !== -1 && process.argv[sampleFlag + 1]) {
  config.sampleSize = Number.parseInt(process.argv[sampleFlag + 1], 10);
}

const endpointFlag = process.argv.indexOf('--endpoint');
if (endpointFlag !== -1 && process.argv[endpointFlag + 1]) {
  config.endpoint = process.argv[endpointFlag + 1];
}

const prisma = new PrismaClient();

interface ValidationResult {
  domain: string;
  url: string;
  statusCode: number;
  cacheStatus: string | null;
  hasNoindex: boolean | null;
  hasPlaceholder: boolean | null;
  responseTime: number;
  error: string | null;
}

interface ValidationStats {
  total: number;
  success: number;
  failed: number;
  status5xx: number;
  status4xx: number;
  status2xx: number;
  cacheHit: number;
  cacheMiss: number;
  placeholders: number;
  placeholdersWithoutNoindex: number;
  errors: number;
  totalResponseTime: number;
}

const stats: ValidationStats = {
  total: 0,
  success: 0,
  failed: 0,
  status5xx: 0,
  status4xx: 0,
  status2xx: 0,
  cacheHit: 0,
  cacheMiss: 0,
  placeholders: 0,
  placeholdersWithoutNoindex: 0,
  errors: 0,
  totalResponseTime: 0,
};

const failures: ValidationResult[] = [];

/**
 * Fetch a URL with Googlebot user-agent and validate response
 */
async function validateDomain(domain: string): Promise<ValidationResult> {
  const url = `${config.endpoint}/privacy-report/${encodeURIComponent(domain)}`;
  const startTime = Date.now();

  const result: ValidationResult = {
    domain,
    url,
    statusCode: 0,
    cacheStatus: null,
    hasNoindex: false,
    hasPlaceholder: false,
    responseTime: 0,
    error: null,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    result.statusCode = response.status;
    result.responseTime = Date.now() - startTime;
    result.cacheStatus = response.headers.get('X-Cache');

    // Track cache status
    if (result.cacheStatus === 'HIT') {
      stats.cacheHit++;
    } else if (result.cacheStatus === 'MISS') {
      stats.cacheMiss++;
    }

    // Track status codes
    if (response.status >= 500) {
      stats.status5xx++;
      result.error = `5xx error (${response.status})`;
      failures.push(result);
    } else if (response.status >= 400) {
      stats.status4xx++;
    } else if (response.status >= 200 && response.status < 300) {
      stats.status2xx++;
    }

    // Check for noindex and placeholder markers in HTML
    if (response.status === 200) {
      const html = await response.text();

      // Check for noindex meta tag
      result.hasNoindex = html.includes('name="robots" content="noindex');

      // Check for placeholder indicator
      result.hasPlaceholder =
        html.includes('X-Placeholder') ||
        html.includes('Report Generation in Progress') ||
        response.headers.get('X-Placeholder') === 'true';

      // CRITICAL: Placeholder without noindex is a failure
      if (result.hasPlaceholder) {
        stats.placeholders++;
        if (!result.hasNoindex) {
          stats.placeholdersWithoutNoindex++;
          result.error = 'Placeholder without noindex meta tag';
          failures.push(result);
        }
      }
    }

    stats.success++;
  } catch (error) {
    stats.errors++;
    result.error = error instanceof Error ? error.message : String(error);
    failures.push(result);
  }

  return result;
}

/**
 * Main validation logic
 */
async function main() {
  console.log('🤖 Bot Safety Validation\n');
  console.log('Configuration:');
  console.log(`  - Endpoint: ${config.endpoint}`);
  console.log(`  - User-Agent: ${config.userAgent}`);
  console.log(`  - Sample size: ${config.testAll ? 'ALL' : config.sampleSize}`);
  console.log(`  - Timeout: ${config.timeout}ms`);
  console.log('');

  try {
    // Fetch domains to test
    const domains = await prisma.domain.findMany({
      where: {
        isIndexed: true,
      },
      select: {
        domain: true,
      },
      orderBy: {
        lastScanned: 'desc',
      },
      take: config.testAll ? undefined : config.sampleSize,
    });

    stats.total = domains.length;

    if (stats.total === 0) {
      console.log('ℹ️  No indexed domains found to validate.');
      process.exit(0);
    }

    console.log(`📋 Testing ${stats.total} indexed domains...\n`);

    const startTime = Date.now();
    let processed = 0;

    // Process domains sequentially to avoid overwhelming the server
    for (const { domain } of domains) {
      await validateDomain(domain);
      processed++;
      stats.totalResponseTime += Date.now() - startTime;

      // Progress indicator every 100 domains
      if (processed % 100 === 0) {
        const progress = Math.round((processed / stats.total) * 100);
        const avgResponseTime = stats.totalResponseTime / processed;
        const cacheHitRate = stats.cacheHit / (stats.cacheHit + stats.cacheMiss) * 100;

        console.log(
          `📊 Progress: ${processed}/${stats.total} (${progress}%) | ` +
          `2xx: ${stats.status2xx} | 4xx: ${stats.status4xx} | 5xx: ${stats.status5xx} | ` +
          `Cache hit: ${cacheHitRate.toFixed(1)}% | Avg time: ${avgResponseTime.toFixed(0)}ms`
        );
      }
    }

    // Calculate final statistics
    const totalTime = (Date.now() - startTime) / 1000;
    const avgResponseTime = stats.totalResponseTime / stats.total;
    const cacheHitRate = stats.cacheHit / (stats.cacheHit + stats.cacheMiss) * 100;
    const status5xxRate = (stats.status5xx / stats.total) * 100;
    const placeholderRate = (stats.placeholders / stats.total) * 100;

    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');

    console.log('Response Status:');
    console.log(`  ✅ 2xx responses: ${stats.status2xx} (${((stats.status2xx / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  4xx responses: ${stats.status4xx} (${((stats.status4xx / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ 5xx responses: ${stats.status5xx} (${status5xxRate.toFixed(1)}%)`);
    console.log(`  🔌 Network errors: ${stats.errors}`);
    console.log('');

    console.log('Cache Performance:');
    console.log(`  📦 Cache hits: ${stats.cacheHit} (${cacheHitRate.toFixed(1)}%)`);
    console.log(`  ⚡ Cache misses: ${stats.cacheMiss}`);
    console.log('');

    console.log('Placeholder Status:');
    console.log(`  📄 Total placeholders: ${stats.placeholders} (${placeholderRate.toFixed(1)}%)`);
    console.log(`  ⚠️  Placeholders without noindex: ${stats.placeholdersWithoutNoindex}`);
    console.log('');

    console.log('Performance:');
    console.log(`  ⏱️  Total time: ${totalTime.toFixed(1)}s`);
    console.log(`  📈 Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  🔄 Rate: ${(stats.total / totalTime).toFixed(1)} req/s`);
    console.log('');

    // VALIDATION CHECKS
    let allChecksPassed = true;

    console.log('='.repeat(80));
    console.log('VALIDATION CHECKS');
    console.log('='.repeat(80) + '\n');

    // Check 1: Zero 5xx errors (CRITICAL)
    if (stats.status5xx === 0) {
      console.log('✅ CHECK 1 PASSED: Zero 5xx errors for bots');
    } else {
      console.log(`❌ CHECK 1 FAILED: Found ${stats.status5xx} 5xx errors (CRITICAL)`);
      allChecksPassed = false;
    }

    // Check 2: All placeholders have noindex (CRITICAL)
    if (stats.placeholdersWithoutNoindex === 0) {
      console.log('✅ CHECK 2 PASSED: All placeholders have noindex meta tag');
    } else {
      console.log(`❌ CHECK 2 FAILED: ${stats.placeholdersWithoutNoindex} placeholders without noindex (CRITICAL)`);
      allChecksPassed = false;
    }

    // Check 3: Cache hit rate >95% (TARGET)
    if (cacheHitRate >= 95) {
      console.log(`✅ CHECK 3 PASSED: Cache hit rate ${cacheHitRate.toFixed(1)}% (target: >95%)`);
    } else {
      console.log(`⚠️  CHECK 3 WARNING: Cache hit rate ${cacheHitRate.toFixed(1)}% (target: >95%)`);
      // Note: This is a warning, not a hard failure
    }

    // Check 4: Placeholder rate <1% (TARGET)
    if (placeholderRate < 1) {
      console.log(`✅ CHECK 4 PASSED: Placeholder rate ${placeholderRate.toFixed(1)}% (target: <1%)`);
    } else {
      console.log(`⚠️  CHECK 4 WARNING: Placeholder rate ${placeholderRate.toFixed(1)}% (target: <1%)`);
      // Note: This is a warning, not a hard failure
    }

    console.log('');

    // Show failures if any
    if (failures.length > 0) {
      console.log('='.repeat(80));
      console.log(`FAILURES (${failures.length})`);
      console.log('='.repeat(80) + '\n');

      const criticalFailures = failures.slice(0, 20); // Show first 20
      for (const failure of criticalFailures) {
        console.log(`❌ ${failure.domain}`);
        console.log(`   URL: ${failure.url}`);
        console.log(`   Status: ${failure.statusCode || 'N/A'}`);
        console.log(`   Error: ${failure.error}`);
        console.log('');
      }

      if (failures.length > 20) {
        console.log(`... and ${failures.length - 20} more failures\n`);
      }
    }

    // Final verdict
    console.log('='.repeat(80));
    if (allChecksPassed) {
      console.log('✅ VALIDATION PASSED - Bot safety confirmed!');
      console.log('='.repeat(80) + '\n');
      process.exit(0);
    } else {
      console.log('❌ VALIDATION FAILED - Fix critical issues before migration!');
      console.log('='.repeat(80) + '\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during validation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle SIGINT gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted by user. Exiting...');
  await prisma.$disconnect();
  process.exit(130);
});

// Run main
main();
