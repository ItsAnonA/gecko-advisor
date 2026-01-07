/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Cache Metrics Monitoring
 *
 * Tracks SSR cache performance metrics for monitoring and alerting.
 * Metrics include: hits, misses, placeholders, errors, and rates.
 */

import { logger } from '../logger.js';

interface CacheMetricsData {
  hits: number;
  misses: number;
  placeholders: number;
  errors: number;
  totalRequests: number;
  botRequests: number;
  humanRequests: number;
}

class CacheMetrics {
  private metrics: CacheMetricsData = {
    hits: 0,
    misses: 0,
    placeholders: 0,
    errors: 0,
    totalRequests: 0,
    botRequests: 0,
    humanRequests: 0,
  };

  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 60000; // Flush every 60 seconds

  /**
   * Record a cache hit
   */
  recordHit(isBot: boolean): void {
    this.metrics.hits++;
    this.metrics.totalRequests++;
    if (isBot) {
      this.metrics.botRequests++;
    } else {
      this.metrics.humanRequests++;
    }
  }

  /**
   * Record a cache miss
   */
  recordMiss(isBot: boolean): void {
    this.metrics.misses++;
    this.metrics.totalRequests++;
    if (isBot) {
      this.metrics.botRequests++;
    } else {
      this.metrics.humanRequests++;
    }
  }

  /**
   * Record a placeholder served
   */
  recordPlaceholder(isBot: boolean): void {
    this.metrics.placeholders++;
    this.metrics.totalRequests++;
    if (isBot) {
      this.metrics.botRequests++;
    } else {
      this.metrics.humanRequests++;
    }
  }

  /**
   * Record an error
   */
  recordError(isBot: boolean): void {
    this.metrics.errors++;
    this.metrics.totalRequests++;
    if (isBot) {
      this.metrics.botRequests++;
    } else {
      this.metrics.humanRequests++;
    }
  }

  /**
   * Calculate cache hit rate
   */
  getHitRate(): number {
    const cached = this.metrics.hits + this.metrics.misses;
    if (cached === 0) return 0;
    return (this.metrics.hits / cached) * 100;
  }

  /**
   * Calculate placeholder rate
   */
  getPlaceholderRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.placeholders / this.metrics.totalRequests) * 100;
  }

  /**
   * Calculate error rate
   */
  getErrorRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.errors / this.metrics.totalRequests) * 100;
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): CacheMetricsData & {
    hitRate: number;
    placeholderRate: number;
    errorRate: number;
  } {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      placeholderRate: this.getPlaceholderRate(),
      errorRate: this.getErrorRate(),
    };
  }

  /**
   * Reset metrics (called after flush)
   */
  private reset(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      placeholders: 0,
      errors: 0,
      totalRequests: 0,
      botRequests: 0,
      humanRequests: 0,
    };
  }

  /**
   * Flush metrics to logs
   */
  private flush(): void {
    if (this.metrics.totalRequests === 0) {
      // No activity in this period - skip logging
      return;
    }

    const metrics = this.getMetrics();

    logger.info(
      {
        cacheMetrics: {
          hits: metrics.hits,
          misses: metrics.misses,
          placeholders: metrics.placeholders,
          errors: metrics.errors,
          totalRequests: metrics.totalRequests,
          botRequests: metrics.botRequests,
          humanRequests: metrics.humanRequests,
          hitRate: metrics.hitRate.toFixed(2) + '%',
          placeholderRate: metrics.placeholderRate.toFixed(2) + '%',
          errorRate: metrics.errorRate.toFixed(2) + '%',
        },
      },
      'SSR Cache Metrics'
    );

    // Alert if hit rate is below target
    if (metrics.hitRate < 95 && metrics.hits + metrics.misses > 100) {
      logger.warn(
        {
          hitRate: metrics.hitRate.toFixed(2) + '%',
          target: '95%',
        },
        '⚠️  Cache hit rate below target - consider pre-warming'
      );
    }

    // Alert if placeholder rate is above target
    if (metrics.placeholderRate > 1) {
      logger.warn(
        {
          placeholderRate: metrics.placeholderRate.toFixed(2) + '%',
          target: '<1%',
        },
        '⚠️  Placeholder rate above target - queue may be backed up'
      );
    }

    // Alert if error rate is concerning
    if (metrics.errorRate > 0.1) {
      logger.error(
        {
          errorRate: metrics.errorRate.toFixed(2) + '%',
          errors: metrics.errors,
        },
        '🚨 SSR error rate above acceptable threshold'
      );
    }

    // Reset for next period
    this.reset();
  }

  /**
   * Start periodic metrics flushing
   */
  startFlushing(): void {
    if (this.flushInterval) {
      logger.warn('Cache metrics flushing already started');
      return;
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);

    logger.info(
      { flushIntervalMs: this.FLUSH_INTERVAL_MS },
      'Cache metrics flushing started'
    );
  }

  /**
   * Stop periodic metrics flushing
   */
  stopFlushing(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;

      // Flush final metrics before stopping
      this.flush();

      logger.info('Cache metrics flushing stopped');
    }
  }
}

/**
 * Singleton instance for global metrics tracking
 */
export const cacheMetrics = new CacheMetrics();
