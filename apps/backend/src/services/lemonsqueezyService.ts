/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import crypto from 'node:crypto';
import type { ApiKeyTier } from '@prisma/client';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';

/**
 * LemonSqueezy Payment Integration Service
 *
 * Handles webhook verification, API key provisioning, monthly resets,
 * and key deactivation for paid API subscriptions.
 */

const TIER_LIMITS: Record<ApiKeyTier, number> = {
  EVALUATION: 1_000,
  OPERATIONAL: 10_000,
  BULK_INTELLIGENCE: -1,
  ENTERPRISE: -1,
};

/**
 * Verify LemonSqueezy webhook signature using HMAC-SHA256.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');

    const digestBuffer = Buffer.from(digest, 'utf-8');
    const signatureBuffer = Buffer.from(signature, 'utf-8');

    if (digestBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
  } catch (error) {
    logger.error({ err: error }, '[LemonSqueezy] Signature verification failed');
    return false;
  }
}

/**
 * Provision a new API key for a paid customer.
 *
 * Idempotent: if an ApiKey with the same orderId already exists, returns the existing key.
 * Generates a key in the format: ga_ + 48 hex chars (24 random bytes).
 */
export async function provisionApiKey(
  email: string,
  tier: ApiKeyTier,
  orderId: string,
  subscriptionId: string | null,
  customerId: string,
  customerName?: string,
): Promise<{ key: string; isNew: boolean }> {
  // Idempotency: check if this order already provisioned a key
  const existing = await prisma.apiKey.findFirst({
    where: { lemonSqueezyOrderId: orderId },
  });

  if (existing) {
    logger.info(
      { orderId, keyId: existing.id },
      '[LemonSqueezy] Order already provisioned, returning existing key',
    );
    return { key: existing.key, isNew: false };
  }

  const requestLimit = TIER_LIMITS[tier] ?? 1_000;
  const key = `ga_${crypto.randomBytes(24).toString('hex')}`;

  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      customerEmail: email.toLowerCase().trim(),
      tier,
      requestLimit,
      active: true,
      lemonSqueezyCustomerId: customerId,
      lemonSqueezySubscriptionId: subscriptionId,
      lemonSqueezyOrderId: orderId,
      customerName: customerName ?? null,
      lastResetAt: new Date(),
    },
  });

  logger.info(
    { keyId: apiKey.id, tier, orderId, customerId },
    '[LemonSqueezy] New API key provisioned',
  );

  return { key, isNew: true };
}

/**
 * Reset monthly usage for a subscription after renewal payment.
 * Sets requestCount to 0 and updates lastResetAt.
 */
export async function resetMonthlyUsage(subscriptionId: string): Promise<void> {
  const result = await prisma.apiKey.updateMany({
    where: { lemonSqueezySubscriptionId: subscriptionId, active: true },
    data: { requestCount: 0, lastResetAt: new Date() },
  });

  logger.info(
    { subscriptionId, updated: result.count },
    '[LemonSqueezy] Monthly usage reset',
  );
}

/**
 * Deactivate all API keys for a cancelled or expired subscription.
 */
export async function deactivateKey(subscriptionId: string): Promise<void> {
  const result = await prisma.apiKey.updateMany({
    where: { lemonSqueezySubscriptionId: subscriptionId },
    data: { active: false },
  });

  logger.info(
    { subscriptionId, deactivated: result.count },
    '[LemonSqueezy] API key(s) deactivated',
  );
}

/**
 * Return the tier-to-limit mapping for display or validation.
 */
export function getTierLimits(): Record<ApiKeyTier, number> {
  return { ...TIER_LIMITS };
}
