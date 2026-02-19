#!/usr/bin/env npx ts-node

/**
 * CREATE API KEY
 *
 * Provisions a paid API key for a customer.
 *
 * Usage:
 *   npx tsx scripts/create-api-key.ts --email customer@example.com --tier EVALUATION
 *   npx tsx scripts/create-api-key.ts --email customer@example.com --tier OPERATIONAL --days 90
 */

import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TIER_LIMITS: Record<string, number> = {
  EVALUATION: 1000,
  OPERATIONAL: 10000,
  BULK_INTELLIGENCE: -1,
  ENTERPRISE: -1,
};

const VALID_TIERS = Object.keys(TIER_LIMITS);

function parseArgs() {
  const args = process.argv.slice(2);
  let email = '';
  let tier = 'EVALUATION';
  let days = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--tier' && args[i + 1]) {
      tier = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { email, tier, days };
}

async function main() {
  const { email, tier, days } = parseArgs();

  if (!email) {
    console.error('Usage: npx tsx scripts/create-api-key.ts --email <email> [--tier EVALUATION|OPERATIONAL|BULK_INTELLIGENCE|ENTERPRISE] [--days 30]');
    process.exit(1);
  }

  if (!VALID_TIERS.includes(tier)) {
    console.error(`Invalid tier: ${tier}. Valid: ${VALID_TIERS.join(', ')}`);
    process.exit(1);
  }

  // Generate key: ga_ + 48 hex chars = 51 total
  const key = `ga_${randomBytes(24).toString('hex')}`;
  const requestLimit = TIER_LIMITS[tier];
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      customerEmail: email,
      tier: tier as 'EVALUATION' | 'OPERATIONAL' | 'BULK_INTELLIGENCE' | 'ENTERPRISE',
      requestLimit,
      expiresAt,
    },
  });

  console.log('\n=== API Key Created ===\n');
  console.log(`  Key:      ${apiKey.key}`);
  console.log(`  Email:    ${apiKey.customerEmail}`);
  console.log(`  Tier:     ${apiKey.tier}`);
  console.log(`  Limit:    ${requestLimit === -1 ? 'Unlimited' : requestLimit.toLocaleString()}`);
  console.log(`  Expires:  ${expiresAt.toISOString().slice(0, 10)}`);
  console.log(`  ID:       ${apiKey.id}`);
  console.log('\n  Test with:');
  console.log(`  curl -H "Authorization: Bearer ${apiKey.key}" https://api.geckoadvisor.com/api/v1/domain/google.com`);
  console.log('');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
