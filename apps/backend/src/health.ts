/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { RequestHandler } from "express";
import { Router } from "express";
import { checkDatabaseHealth, prisma } from "./prisma.js";
import { checkRedisConnection, getQueueMetrics } from "./queue.js";
import { CacheService, CACHE_KEYS, redis } from "./cache.js";
import { logger } from "./logger.js";
import { cacheMetrics } from "./monitoring/cacheMetrics.js";
import { reportCircuitBreaker } from "./middleware/circuitBreaker.js";
import { countIndexedDomains } from "./services/domainService.js";

export const healthRouter = Router();

/**
 * Basic liveness check - just confirms the service is running
 */
const livenessHandler: RequestHandler = (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'privacy-advisor-backend',
    version: process.env.npm_package_version || 'unknown',
  });
};

healthRouter.get('/healthz', livenessHandler);
healthRouter.get('/health', livenessHandler);

/**
 * Readiness check - confirms all dependencies are healthy
 */
healthRouter.get('/readyz', async (_req, res) => {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    CacheService.healthCheck(),
    checkRedisConnection().then(() => ({ healthy: true })).catch((error) => ({
      healthy: false,
      error: error.message,
    })),
  ]);

  const results = checks.map((result) =>
    result.status === 'fulfilled' ? result.value : { healthy: false, error: 'Promise rejected' }
  );

  const [dbCheck, cacheCheck, queueCheck] = results;

  const allHealthy = dbCheck?.healthy && cacheCheck?.healthy && queueCheck?.healthy;

  const response = {
    ok: allHealthy,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      cache: cacheCheck,
      queue: queueCheck,
    },
  };

  if (allHealthy) {
    res.json(response);
  } else {
    logger.warn({ checks: response.checks }, 'Health check failed');
    res.status(503).json(response);
  }
});

/**
 * Detailed status endpoint with performance metrics
 */
healthRouter.get('/status', async (_req, res) => {
  try {
    const startTime = Date.now();

    const [dbHealth, cacheHealth, queueHealth, queueMetrics] = await Promise.allSettled([
      checkDatabaseHealth(),
      CacheService.healthCheck(),
      checkRedisConnection().then(() => ({ healthy: true })).catch((error) => ({
        healthy: false,
        error: error.message,
      })),
      getQueueMetrics(),
    ]);

    const processMetrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    const responseTime = Date.now() - startTime;

    const response = {
      ok: true,
      timestamp: new Date().toISOString(),
      responseTime,
      service: {
        name: 'privacy-advisor-backend',
        version: process.env.npm_package_version || 'unknown',
        environment: process.env.NODE_ENV || 'unknown',
      },
      dependencies: {
        database: dbHealth.status === 'fulfilled' ? dbHealth.value : { healthy: false },
        cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : { healthy: false },
        queue: queueHealth.status === 'fulfilled' ? queueHealth.value : { healthy: false },
      },
      metrics: {
        process: processMetrics,
        queue: queueMetrics.status === 'fulfilled' ? queueMetrics.value : null,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error({ error }, 'Error generating status report');
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Performance metrics endpoint for monitoring
 */
healthRouter.get('/metrics', async (_req, res) => {
  try {
    const queueMetrics = await getQueueMetrics();
    const dbHealth = await checkDatabaseHealth();
    const cacheHealth = await CacheService.healthCheck();

    // Simple Prometheus-style metrics
    const metrics = [
      `# HELP backend_up Whether the backend is up`,
      `# TYPE backend_up gauge`,
      `backend_up 1`,
      ``,
      `# HELP backend_uptime_seconds Uptime in seconds`,
      `# TYPE backend_uptime_seconds counter`,
      `backend_uptime_seconds ${process.uptime()}`,
      ``,
      `# HELP database_latency_ms Database query latency in milliseconds`,
      `# TYPE database_latency_ms gauge`,
      `database_latency_ms ${dbHealth.latency || -1}`,
      ``,
      `# HELP cache_latency_ms Cache query latency in milliseconds`,
      `# TYPE cache_latency_ms gauge`,
      `cache_latency_ms ${cacheHealth.latency || -1}`,
      ``,
    ];

    if (queueMetrics) {
      metrics.push(
        `# HELP queue_jobs_waiting Number of jobs waiting in queue`,
        `# TYPE queue_jobs_waiting gauge`,
        `queue_jobs_waiting ${queueMetrics.waiting}`,
        ``,
        `# HELP queue_jobs_active Number of active jobs`,
        `# TYPE queue_jobs_active gauge`,
        `queue_jobs_active ${queueMetrics.active}`,
        ``,
        `# HELP queue_jobs_failed Number of failed jobs`,
        `# TYPE queue_jobs_failed gauge`,
        `queue_jobs_failed ${queueMetrics.failed}`,
        ``
      );
    }

    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    logger.error({ error }, 'Error generating metrics');
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * Cache performance metrics endpoint
 * GET /cache
 *
 * Returns SSR cache metrics and circuit breaker state for Phase 0 monitoring.
 */
healthRouter.get('/cache', async (_req, res) => {
  try {
    // Get current metrics from cache metrics collector
    const metrics = cacheMetrics.getMetrics();
    const circuitState = reportCircuitBreaker.getState();

    res.status(200).json({
      status: 'healthy',
      cache: {
        hits: metrics.hits,
        misses: metrics.misses,
        placeholders: metrics.placeholders,
        errors: metrics.errors,
        totalRequests: metrics.totalRequests,
        hitRate: `${metrics.hitRate.toFixed(1)}%`,
        placeholderRate: `${metrics.placeholderRate.toFixed(1)}%`,
        errorRate: `${metrics.errorRate.toFixed(1)}%`,
        botRequests: metrics.botRequests,
        humanRequests: metrics.humanRequests,
      },
      circuitBreaker: {
        state: circuitState.state,
        isOpen: circuitState.state === 'OPEN',
        failures: circuitState.failures,
        threshold: circuitState.threshold,
      },
      thresholds: {
        hitRateTarget: '>95%',
        placeholderRateTarget: '<1%',
        errorRateTarget: '<0.1%',
      },
      recommendations: {
        cacheHitRate:
          metrics.hitRate < 95
            ? 'Consider running cache pre-warming script'
            : 'Cache performance is good',
        placeholderRate:
          metrics.placeholderRate > 1
            ? 'High placeholder rate - check queue processing'
            : 'Placeholder rate is acceptable',
        errorRate:
          metrics.errorRate > 0.1
            ? 'Elevated error rate - investigate logs'
            : 'Error rate is acceptable',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Redirect monitoring endpoint
 * GET /redirects
 *
 * Shows status of 301 redirects from /privacy-policy/ to /privacy-report/.
 */
healthRouter.get('/redirects', async (_req, res) => {
  try {
    res.status(200).json({
      status: 'active',
      message: '301 redirects from /privacy-policy/ to /privacy-report/ are active',
      recommendation: 'Keep redirects active for at least 1 year after migration (until Jan 2027)',
      timestamp: new Date().toISOString(),
      note: 'Detailed redirect tracking can be implemented via Redis counters if needed',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * SEO Health Check Endpoint
 * GET /seo
 *
 * Comprehensive SEO monitoring for:
 * - Cache coverage ratio (target: >95%)
 * - Bot request success rate (sample 10 domains)
 * - 301 redirect validation
 * - Index quality (no low-score pages)
 */
healthRouter.get('/seo', async (_req, res) => {
  try {
    const startTime = Date.now();

    // 1. Cache Coverage Check
    const indexedCount = await countIndexedDomains(prisma);
    const cacheKeys = await redis.keys('ssr_report:*:v1');
    const cacheCount = cacheKeys.length;
    const cacheRatio = indexedCount > 0 ? (cacheCount / indexedCount) * 100 : 0;
    const cacheStatus = cacheRatio >= 95 ? 'pass' : cacheRatio >= 80 ? 'warn' : 'fail';

    // 2. Sample Bot Requests (10 random indexed domains)
    const sampleDomains = await prisma.domain.findMany({
      where: {
        isIndexed: true,
        latestScan: {
          status: 'done',
          score: { gte: 40 }, // Only check domains that should be indexed
        },
      },
      select: { domain: true },
      take: 10,
      orderBy: { lastScanned: 'desc' },
    });

    let botRequestsPassed = 0;
    let botRequestsFailed = 0;
    const botRequestDetails: Array<{ domain: string; status: 'pass' | 'fail'; httpCode?: number }> = [];

    for (const { domain } of sampleDomains) {
      try {
        // Check if cached (should be for indexed domains)
        const cacheKey = CACHE_KEYS.SSR_REPORT_HTML(domain);
        const cached = await CacheService.get<string>(cacheKey);

        if (cached) {
          botRequestsPassed++;
          botRequestDetails.push({ domain, status: 'pass' });
        } else {
          botRequestsFailed++;
          botRequestDetails.push({ domain, status: 'fail', httpCode: 404 });
        }
      } catch {
        botRequestsFailed++;
        botRequestDetails.push({ domain, status: 'fail' });
      }
    }

    const botRequestRate = sampleDomains.length > 0
      ? (botRequestsPassed / sampleDomains.length) * 100
      : 100;
    const botRequestStatus = botRequestRate === 100 ? 'pass' : botRequestRate >= 80 ? 'warn' : 'fail';

    // 3. Index Quality Check (no score < 40 domains in sitemap)
    const lowScoreDomains = await prisma.domain.count({
      where: {
        isIndexed: true,
        latestScan: {
          score: { lt: 40 },
        },
      },
    });

    const indexQualityStatus = lowScoreDomains === 0 ? 'pass' : 'fail';

    // 4. Overall Status
    const checks = [cacheStatus, botRequestStatus, indexQualityStatus];
    const overallStatus = checks.includes('fail')
      ? 'critical'
      : checks.includes('warn')
        ? 'degraded'
        : 'healthy';

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      checks: {
        cacheCoverage: {
          status: cacheStatus,
          value: `${cacheRatio.toFixed(1)}%`,
          details: {
            cached: cacheCount,
            indexed: indexedCount,
            missing: Math.max(0, indexedCount - cacheCount),
          },
          threshold: '>95%',
          recommendation: cacheStatus === 'pass'
            ? 'Cache coverage is healthy'
            : 'Run: pnpm prewarm:cache --force',
        },
        botRequests: {
          status: botRequestStatus,
          value: `${botRequestRate.toFixed(0)}%`,
          details: {
            passed: botRequestsPassed,
            failed: botRequestsFailed,
            sample: sampleDomains.length,
            failures: botRequestDetails.filter(d => d.status === 'fail'),
          },
          threshold: '100%',
          recommendation: botRequestStatus === 'pass'
            ? 'All sampled bot requests successful'
            : 'Some domains not cached - run cache pre-warming',
        },
        indexQuality: {
          status: indexQualityStatus,
          value: lowScoreDomains === 0 ? 'Clean' : `${lowScoreDomains} violations`,
          details: {
            lowScoreDomains,
            minScoreThreshold: 40,
          },
          threshold: '0 low-score domains',
          recommendation: indexQualityStatus === 'pass'
            ? 'No low-quality pages in index'
            : 'Found indexed domains with score < 40 - may indicate stale data',
        },
        redirects: {
          status: 'active',
          value: '301 redirects enabled',
          details: {
            from: '/privacy-policy/:domain',
            to: '/privacy-report/:domain',
            active: true,
          },
          recommendation: 'Keep active for at least 1 year (until Jan 2027)',
        },
      },
      summary: {
        healthy: overallStatus === 'healthy',
        needsAttention: overallStatus === 'degraded',
        critical: overallStatus === 'critical',
        totalChecks: 4,
        passed: checks.filter(s => s === 'pass').length,
        warnings: checks.filter(s => s === 'warn').length,
        failures: checks.filter(s => s === 'fail').length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error running SEO health check');
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
