/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { Request, Response, NextFunction } from 'express';
import type { ApiKey } from '@prisma/client';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

// Extend Request to carry the authenticated API key
export interface PaidApiRequest extends Request {
  apiKey?: ApiKey;
}

/**
 * Paid API key authentication middleware.
 *
 * Validates Bearer token from Authorization header against the ApiKey table.
 * Checks: active, not expired, under request limit.
 * Increments requestCount on each successful call.
 * Sets X-RateLimit-* headers.
 */
export async function requirePaidApiKey(
  req: PaidApiRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      problem(res, 401, 'Unauthorized', 'API key required. Provide Authorization: Bearer <key> header.');
      return;
    }

    const token = authHeader.slice(7); // Strip "Bearer "

    // Validate key format: ga_ + 48 hex chars = 51 chars
    if (!token.startsWith('ga_') || token.length !== 51) {
      problem(res, 401, 'Unauthorized', 'Invalid API key format.');
      return;
    }

    // Look up key
    const apiKey = await prisma.apiKey.findUnique({ where: { key: token } });

    if (!apiKey) {
      problem(res, 401, 'Unauthorized', 'Unknown API key.');
      return;
    }

    // Check active
    if (!apiKey.active) {
      problem(res, 403, 'Forbidden', 'API key is deactivated. Contact api@geckoadvisor.com.');
      return;
    }

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      problem(res, 403, 'Forbidden', 'API key has expired. Contact api@geckoadvisor.com to renew.');
      return;
    }

    // Check request limit (-1 = unlimited)
    if (apiKey.requestLimit !== -1 && apiKey.requestCount >= apiKey.requestLimit) {
      res.setHeader('X-RateLimit-Limit', apiKey.requestLimit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      problem(
        res,
        429,
        'Too Many Requests',
        `Request limit of ${apiKey.requestLimit} reached. Upgrade at https://geckoadvisor.com/api-access`
      );
      return;
    }

    // Increment request count
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { requestCount: { increment: 1 } },
    });

    // Set rate limit headers
    const remaining = apiKey.requestLimit === -1
      ? 'unlimited'
      : String(apiKey.requestLimit - apiKey.requestCount - 1);
    res.setHeader('X-RateLimit-Limit', apiKey.requestLimit === -1 ? 'unlimited' : apiKey.requestLimit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining);
    if (apiKey.expiresAt) {
      res.setHeader('X-RateLimit-Reset', apiKey.expiresAt.toISOString());
    }

    logger.debug(
      { keyId: apiKey.id, tier: apiKey.tier, count: apiKey.requestCount + 1 },
      'Paid API call authenticated'
    );

    // Attach to request
    req.apiKey = { ...apiKey, requestCount: apiKey.requestCount + 1 };

    next();
    return;
  } catch (error) {
    logger.error({ error, url: req.url }, 'Paid API key authentication error');
    problem(res, 500, 'Internal Server Error', 'Authentication failed');
    return;
  }
}
