// SPDX-License-Identifier: MIT
import type { Request, Response, NextFunction } from 'express';
import { RateLimitService, type RateLimitInfo } from '../services/rateLimitService.js';
import { prisma } from '../prisma.js';

const rateLimitService = new RateLimitService(prisma);

/**
 * Extended Request type with rate limit information
 */
export interface RequestWithRateLimit extends Request {
  rateLimit?: RateLimitInfo;
}

/**
 * Scan Rate Limiter Middleware
 *
 * Enforces rate limits with two layers:
 * 1. Burst protection: 1 scan per minute per IP
 * 2. Daily limit: 10 scans per day per IP
 *
 * Rate limits are tracked by IP address.
 *
 * Returns 429 error if limit exceeded with:
 * - For burst: retryAfterSeconds
 * - For daily: scansUsed, scansRemaining, resetAt
 */
export const scanRateLimiter = async (
  req: RequestWithRateLimit,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = req.ip || 'unknown';

    // Check rate limit
    const rateLimit = await rateLimitService.checkRateLimit(identifier);

    if (!rateLimit.allowed) {
      // Different response for burst vs daily limit
      if (rateLimit.burstLimited) {
        res.set('Retry-After', String(rateLimit.retryAfterSeconds || 60));
        res.status(429).json({
          type: 'rate_limit_exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Please wait before scanning again. Rate limit: 1 scan per minute.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      } else {
        res.status(429).json({
          type: 'rate_limit_exceeded',
          title: 'Daily Limit Reached',
          status: 429,
          detail: 'You have reached the daily limit of 10 free scans.',
          scansUsed: rateLimit.scansUsed,
          scansRemaining: rateLimit.scansRemaining,
          resetAt: rateLimit.resetAt,
        });
      }
      return;
    }

    // Attach rate limit info to request for use in response
    req.rateLimit = rateLimit;
    next();
  } catch (error) {
    next(error);
  }
};

export { rateLimitService };
