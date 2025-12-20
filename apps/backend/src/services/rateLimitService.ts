/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { PrismaClient } from '@prisma/client';
import { redis } from '../cache.js';
import { logger } from '../logger.js';

/**
 * Rate Limit Service
 *
 * Manages scan rate limits with two layers:
 * 1. Burst protection: 1 scan per minute per IP (Redis-based)
 * 2. Daily limit: 10 scans per day per IP (database-based)
 *
 * Pro users bypass rate limiting entirely.
 *
 * Rate limits are tracked by:
 * - User ID (for authenticated users)
 * - IP address (for anonymous users)
 */

export interface RateLimitInfo {
  allowed: boolean;
  scansUsed: number;
  scansRemaining: number;
  resetAt: Date;
  burstLimited?: boolean;
  retryAfterSeconds?: number;
}

export class RateLimitService {
  private static readonly FREE_TIER_LIMIT = 10;
  private static readonly BURST_WINDOW_SECONDS = 60; // 1 minute

  constructor(private prisma: PrismaClient) {}

  /**
   * Check if the identifier has exceeded their rate limits
   * Checks both burst (1/min) and daily (10/day) limits
   *
   * @param identifier - User ID or IP address
   * @returns Rate limit information
   */
  async checkRateLimit(identifier: string): Promise<RateLimitInfo> {
    const today = this.getTodayString();
    const resetAt = this.getTomorrowMidnight();

    // Check burst limit first (faster, Redis-based)
    const burstKey = `rate_limit:burst:${identifier}`;
    try {
      const ttl = await redis.ttl(burstKey);
      if (ttl > 0) {
        // Burst limited - must wait
        logger.debug({ identifier, ttl }, 'Burst rate limit hit');
        return {
          allowed: false,
          scansUsed: 0,
          scansRemaining: 0,
          resetAt,
          burstLimited: true,
          retryAfterSeconds: ttl,
        };
      }
    } catch (error) {
      // Redis error - continue to daily limit check
      logger.warn({ error, identifier }, 'Failed to check burst rate limit');
    }

    // Get or create today's rate limit record
    const rateLimit = await this.prisma.rateLimit.upsert({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
      update: {},
      create: {
        identifier,
        date: today,
        scansCount: 0,
      },
    });

    const scansUsed = rateLimit.scansCount;
    const scansRemaining = Math.max(0, RateLimitService.FREE_TIER_LIMIT - scansUsed);
    const allowed = scansUsed < RateLimitService.FREE_TIER_LIMIT;

    return {
      allowed,
      scansUsed,
      scansRemaining,
      resetAt,
    };
  }

  /**
   * Increment the scan count for the identifier
   * Sets both the burst limit (1 min) and increments daily count
   *
   * @param identifier - User ID or IP address
   */
  async incrementScan(identifier: string): Promise<void> {
    const today = this.getTodayString();

    // Set burst limit key (1 minute window)
    const burstKey = `rate_limit:burst:${identifier}`;
    try {
      await redis.setex(burstKey, RateLimitService.BURST_WINDOW_SECONDS, '1');
    } catch (error) {
      logger.warn({ error, identifier }, 'Failed to set burst rate limit');
    }

    // Increment daily count
    await this.prisma.rateLimit.upsert({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
      update: {
        scansCount: {
          increment: 1,
        },
      },
      create: {
        identifier,
        date: today,
        scansCount: 1,
      },
    });
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0] || '';
  }

  /**
   * Get rate limit status for the identifier
   * Alias for checkRateLimit() for backward compatibility
   *
   * @param identifier - User ID or IP address
   * @returns Rate limit information
   */
  async getRateLimitStatus(identifier: string): Promise<RateLimitInfo> {
    return this.checkRateLimit(identifier);
  }

  /**
   * Get tomorrow's midnight UTC as a Date object
   */
  private getTomorrowMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }
}
