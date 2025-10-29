// SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
// SPDX-License-Identifier: MIT
import { Router, type Request, type Response } from 'express';
import { problem } from '../problem.js';
import { logger } from '../logger.js';
// DISABLED: Authentication removed - these routes are not registered
// import { requirePro } from '../middleware/auth.js';
// import type { SafeUser } from '../services/authService.js';

// Stub type for SafeUser to maintain TypeScript compatibility
// NOTE: This entire file is legacy code - authentication has been removed
type SafeUser = {
  id: string;
  email: string;
};

const requirePro = (_req: Request, _res: Response, next: () => void) => next();

export const apiRouter = Router();

/**
 * Generate new API key for Pro user
 *
 * POST /api/api-keys/generate
 * Requires: Pro subscription
 * Body: {} (empty)
 * Returns: { apiKey, usage: { callsThisMonth, limit, resetAt } }
 *
 * Generates a new API key in format: pa_[32 random hex chars]
 * Replaces existing API key if one exists
 */
apiRouter.post('/generate', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // LEGACY: API key generation has been disabled - authentication removed
    logger.warn({ userId: user.id }, 'API key generation disabled - authentication removed');
    return problem(res, 501, 'Not Implemented', 'API key generation has been removed');
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to generate API key');
    return problem(res, 500, 'Internal Server Error', 'Failed to generate API key');
  }
});

/**
 * Get current API key and usage statistics
 *
 * GET /api/api-keys/usage
 * Requires: Pro subscription
 * Returns: { apiKey, usage: { callsThisMonth, limit, resetAt } }
 */
apiRouter.get('/usage', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // LEGACY: API key usage tracking has been disabled - authentication removed
    logger.warn({ userId: user.id }, 'API key usage tracking disabled - authentication removed');
    return problem(res, 501, 'Not Implemented', 'API key usage tracking has been removed');
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to get API key usage');
    return problem(res, 500, 'Internal Server Error', 'Failed to get API key usage');
  }
});

/**
 * Revoke API key
 *
 * DELETE /api/api-keys/revoke
 * Requires: Pro subscription
 * Returns: { success: true }
 */
apiRouter.delete('/revoke', requirePro, async (req: Request, res: Response) => {
  const user = (req as Request & { user?: SafeUser }).user;

  if (!user) {
    return problem(res, 401, 'Unauthorized', 'User not authenticated');
  }

  try {
    // LEGACY: API key revocation has been disabled - authentication removed
    logger.warn({ userId: user.id }, 'API key revocation disabled - authentication removed');
    return problem(res, 501, 'Not Implemented', 'API key revocation has been removed');
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to revoke API key');
    return problem(res, 500, 'Internal Server Error', 'Failed to revoke API key');
  }
});
