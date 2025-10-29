// SPDX-License-Identifier: MIT
import type { Request, Response, NextFunction } from 'express';
import { RateLimitService, type RateLimitInfo } from '../services/rateLimitService.js';
import { prisma } from '../prisma.js';

const rateLimitService = new RateLimitService(prisma);

/**
 * Extended Request type with rate limit information
 * Note: Authentication has been removed - rate limiting is disabled
 */
export interface RequestWithRateLimit extends Request {
  rateLimit?: RateLimitInfo;
}

/**
 * Scan Rate Limiter Middleware
 *
 * DISABLED: Authentication removed - all scans are free and unlimited
 * This middleware is kept for future use but currently just passes through
 *
 * Original behavior:
 * - Enforced daily scan limits for free tier users (3 scans/day)
 * - Pro users with active subscriptions bypassed rate limiting
 * - Rate limits tracked by user ID or IP address
 */
export const scanRateLimiter = async (
  req: RequestWithRateLimit,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // DISABLED: No rate limiting - all scans are free and unlimited
  // Just pass through to next middleware
  next();
};

export { rateLimitService };
