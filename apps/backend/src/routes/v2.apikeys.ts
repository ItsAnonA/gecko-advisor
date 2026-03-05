/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from 'express';
import { requirePaidApiKey, type PaidApiRequest } from '../middleware/paidApiAuth.js';
import { getTierLimits } from '../services/lemonsqueezyService.js';

export const apiKeysV2Router = Router();

/**
 * GET /api/v2/api-keys/usage
 *
 * Returns current usage stats for the authenticated API key.
 * Protected by requirePaidApiKey middleware (Authorization: Bearer <key>).
 */
apiKeysV2Router.get('/api-keys/usage', requirePaidApiKey, async (req, res) => {
  const paidReq = req as PaidApiRequest;
  const apiKey = paidReq.apiKey!;

  const tierLimits = getTierLimits();
  const requestLimit = tierLimits[apiKey.tier] ?? apiKey.requestLimit;
  const remaining = requestLimit === -1 ? -1 : Math.max(0, requestLimit - apiKey.requestCount);

  // Mask key: show prefix and last 8 chars only
  const maskedKey = apiKey.key.length > 11
    ? `${apiKey.key.slice(0, 3)}...${ apiKey.key.slice(-8)}`
    : apiKey.key;

  return res.json({
    tier: apiKey.tier,
    requestCount: apiKey.requestCount,
    requestLimit,
    remaining,
    active: apiKey.active,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    lastResetAt: apiKey.lastResetAt?.toISOString() ?? null,
    maskedKey,
  });
});
