/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from 'express';
import { requirePaidApiKey, type PaidApiRequest } from '../middleware/paidApiAuth.js';
import { getTierLimits } from '../services/lemonsqueezyService.js';
import { prisma } from '../prisma.js';
import { problem } from '../problem.js';
import { logger } from '../logger.js';

export const apiKeysV2Router = Router();

/**
 * Build usage response from an ApiKey record.
 */
function buildUsageResponse(apiKey: {
  tier: string;
  requestCount: number;
  requestLimit: number;
  active: boolean;
  expiresAt: Date | null;
  lastResetAt: Date | null;
  key: string;
  customerName: string | null;
}) {
  const tierLimits = getTierLimits();
  const requestLimit = tierLimits[apiKey.tier as keyof typeof tierLimits] ?? apiKey.requestLimit;
  const remaining = requestLimit === -1 ? -1 : Math.max(0, requestLimit - apiKey.requestCount);

  // Mask key: show prefix and last 8 chars only
  const maskedKey = apiKey.key.length > 11
    ? `${apiKey.key.slice(0, 3)}...${apiKey.key.slice(-8)}`
    : apiKey.key;

  return {
    tier: apiKey.tier,
    requestCount: apiKey.requestCount,
    requestLimit,
    remaining,
    active: apiKey.active,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    lastResetAt: apiKey.lastResetAt?.toISOString() ?? null,
    maskedKey,
    customerName: apiKey.customerName,
  };
}

/**
 * GET /api/v2/api-keys/usage
 *
 * Returns current usage stats for the authenticated API key.
 * Protected by requirePaidApiKey middleware (Authorization: Bearer <key>).
 */
apiKeysV2Router.get('/api-keys/usage', requirePaidApiKey, async (req, res) => {
  const paidReq = req as PaidApiRequest;
  const apiKey = paidReq.apiKey!;
  return res.json(buildUsageResponse(apiKey));
});

/**
 * GET /api/v2/api-keys/dashboard?token=xyz
 *
 * Returns usage stats via dashboard token (read-only, no API key exposure).
 * Dashboard tokens are generated at provisioning time and included in
 * post-purchase links so customers can access their dashboard without
 * pasting their API key.
 */
apiKeysV2Router.get('/api-keys/dashboard', async (req, res) => {
  const token = req.query.token as string | undefined;

  if (!token || typeof token !== 'string' || token.length < 10) {
    return problem(res, 401, 'Unauthorized', 'Dashboard token required.');
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { dashboardToken: token },
    });

    if (!apiKey) {
      return problem(res, 401, 'Unauthorized', 'Invalid dashboard token.');
    }

    if (!apiKey.active) {
      return problem(res, 403, 'Forbidden', 'API key is deactivated.');
    }

    logger.debug(
      { keyId: apiKey.id, tier: apiKey.tier },
      'Dashboard access via token',
    );

    return res.json(buildUsageResponse(apiKey));
  } catch (error) {
    logger.error({ error }, 'Dashboard token lookup failed');
    return problem(res, 500, 'Internal Server Error', 'Failed to load dashboard.');
  }
});
