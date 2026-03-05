/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from 'express';
import express from 'express';
import type { ApiKeyTier } from '@prisma/client';
import { logger } from '../logger.js';
import { problem } from '../problem.js';
import {
  verifyWebhookSignature,
  provisionApiKey,
  resetMonthlyUsage,
  deactivateKey,
} from '../services/lemonsqueezyService.js';

export const lemonSqueezyWebhookRouter = Router();

/**
 * Map LemonSqueezy variant names to ApiKeyTier enum values.
 * Case-insensitive matching on the variant_name from the order payload.
 */
const VARIANT_TO_TIER: Record<string, ApiKeyTier> = {
  evaluation: 'EVALUATION',
  operational: 'OPERATIONAL',
  'bulk intelligence': 'BULK_INTELLIGENCE',
  bulk_intelligence: 'BULK_INTELLIGENCE',
  enterprise: 'ENTERPRISE',
};

function resolveTier(variantName: string): ApiKeyTier {
  const normalized = variantName.toLowerCase().trim();
  return VARIANT_TO_TIER[normalized] ?? 'EVALUATION';
}

/**
 * POST /api/v2/webhooks/lemonsqueezy
 *
 * LemonSqueezy webhook handler. Uses raw body parsing (express.raw)
 * so the signature can be verified against the unparsed payload.
 *
 * Handled events:
 *   - order_created          -> Provision API key
 *   - subscription_payment_success -> Reset monthly usage
 *   - subscription_cancelled -> Deactivate key
 *   - subscription_expired   -> Deactivate key
 *   - subscription_updated   -> Deactivate if status is cancelled/expired
 *
 * Returns 200 for all valid payloads (including unknown events) to prevent retries.
 * Returns 401 for invalid signature.
 */
lemonSqueezyWebhookRouter.post(
  '/webhooks/lemonsqueezy',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-signature'] as string | undefined;

    if (!signature) {
      return problem(res, 401, 'Unauthorized', 'Missing X-Signature header');
    }

    const rawBody = req.body as Buffer;
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[LemonSqueezy] Invalid webhook signature');
      return problem(res, 401, 'Unauthorized', 'Invalid signature');
    }

    let payload: LemonSqueezyWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf-8')) as LemonSqueezyWebhookPayload;
    } catch {
      logger.warn('[LemonSqueezy] Failed to parse webhook payload');
      return problem(res, 400, 'Bad Request', 'Invalid JSON');
    }

    const eventName = payload.meta?.event_name;
    if (!eventName) {
      logger.warn('[LemonSqueezy] Webhook missing event_name');
      // Return 200 to prevent retries
      return res.status(200).json({ received: true });
    }

    logger.info(
      { event: eventName, dataType: payload.data?.type, dataId: payload.data?.id },
      '[LemonSqueezy] Webhook received',
    );

    try {
      switch (eventName) {
        case 'order_created':
          await handleOrderCreated(payload);
          break;

        case 'subscription_payment_success':
          await handleSubscriptionPaymentSuccess(payload);
          break;

        case 'subscription_cancelled':
        case 'subscription_expired':
          await handleSubscriptionDeactivation(payload);
          break;

        case 'subscription_updated':
          await handleSubscriptionUpdated(payload);
          break;

        default:
          logger.debug({ event: eventName }, '[LemonSqueezy] Unhandled event, ignoring');
      }
    } catch (error) {
      logger.error({ err: error, event: eventName }, '[LemonSqueezy] Error processing webhook');
      // Return 200 even on error to avoid infinite retries.
      // Errors are tracked via Sentry/Pino.
    }

    return res.status(200).json({ received: true });
  },
);

// --- Event Handlers ---

async function handleOrderCreated(payload: LemonSqueezyWebhookPayload): Promise<void> {
  const attrs = payload.data?.attributes;
  if (!attrs) {
    logger.warn('[LemonSqueezy] order_created missing attributes');
    return;
  }

  const email = attrs.user_email;
  const orderId = String(payload.data.id);
  const customerId = String(attrs.customer_id);
  const customerName = attrs.user_name ?? undefined;
  const variantName = attrs.first_order_item?.variant_name ?? 'Evaluation';
  const tier = resolveTier(variantName);

  // For orders with subscriptions, extract subscription ID from relationships
  const subscriptionId = attrs.first_order_item?.variant_id
    ? String(attrs.first_order_item.variant_id)
    : null;

  const result = await provisionApiKey(email, tier, orderId, subscriptionId, customerId, customerName);

  logger.info(
    { email, tier, orderId, isNew: result.isNew },
    '[LemonSqueezy] order_created processed',
  );
}

async function handleSubscriptionPaymentSuccess(payload: LemonSqueezyWebhookPayload): Promise<void> {
  const subscriptionId = String(payload.data?.id);
  if (!subscriptionId) {
    logger.warn('[LemonSqueezy] subscription_payment_success missing subscription ID');
    return;
  }

  await resetMonthlyUsage(subscriptionId);
}

async function handleSubscriptionDeactivation(payload: LemonSqueezyWebhookPayload): Promise<void> {
  const subscriptionId = String(payload.data?.id);
  if (!subscriptionId) {
    logger.warn('[LemonSqueezy] subscription deactivation missing subscription ID');
    return;
  }

  await deactivateKey(subscriptionId);
}

async function handleSubscriptionUpdated(payload: LemonSqueezyWebhookPayload): Promise<void> {
  const attrs = payload.data?.attributes;
  const status = attrs?.status;

  if (status === 'cancelled' || status === 'expired') {
    await handleSubscriptionDeactivation(payload);
  } else {
    logger.debug(
      { status, subscriptionId: payload.data?.id },
      '[LemonSqueezy] subscription_updated with non-terminal status, ignoring',
    );
  }
}

// --- Payload Types ---

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: Record<string, unknown>;
  };
  data: {
    id: string;
    type: string;
    attributes: {
      status?: string;
      customer_id: number;
      user_email: string;
      user_name?: string;
      order_id?: number;
      first_order_item?: {
        variant_name: string;
        variant_id: number;
      };
      urls?: {
        receipt?: string;
      };
    };
    relationships?: Record<string, unknown>;
  };
}
