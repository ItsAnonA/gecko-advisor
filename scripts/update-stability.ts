#!/usr/bin/env npx ts-node

/**
 * UPDATE DOMAIN STABILITY SCORES
 *
 * Daily job to calculate stability metrics for all domains.
 * Identifies volatile, improving, declining, and stable domains.
 *
 * Usage:
 *   npx tsx scripts/update-stability.ts
 *   npx tsx scripts/update-stability.ts --json     # Output as JSON
 *
 * Schedule: Daily (3 AM UTC)
 *   0 3 * * * docker exec ga-backend npx tsx /app/scripts/update-stability.ts
 */

import { PrismaClient } from '@prisma/client';
import { updateAllDomainStability, updateAllDomainStabilityV2 } from '../apps/backend/src/services/stabilityService';

const prisma = new PrismaClient();
const outputJson = process.argv.includes('--json');
const useTiered = process.argv.includes('--tiered') || process.argv.includes('--v2');

interface StabilityReport {
  date: string;
  processed: number;
  updated: number;
  errors: number;
  duration: number;
  // V2 tiered fields
  full?: number;
  partial?: number;
  provisional?: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║              DAILY STABILITY SCORE UPDATE                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
    console.log('');
  }

  try {
    if (!outputJson) {
      console.log(`Processing domains${useTiered ? ' (tiered coverage)' : ''}...`);
    }

    let report: StabilityReport;

    if (useTiered) {
      // Use V2 tiered function for higher coverage
      const result = await updateAllDomainStabilityV2(prisma);
      report = {
        date: new Date().toISOString().split('T')[0] || '',
        processed: result.total + result.skipped,
        updated: result.total,
        errors: result.errors,
        duration: Date.now() - startTime,
        full: result.full,
        partial: result.partial,
        provisional: result.provisional,
      };
    } else {
      // Use original function (high confidence only)
      const result = await updateAllDomainStability(prisma);
      report = {
        date: new Date().toISOString().split('T')[0] || '',
        processed: result.processed,
        updated: result.updated,
        errors: result.errors,
        duration: Date.now() - startTime,
      };
    }

    if (!outputJson) {
      console.log('');
      console.log('────────────────────────────────────────────────────────────');
      console.log('SUMMARY');
      console.log(`  Processed: ${report.processed}`);
      console.log(`  Updated: ${report.updated}`);
      if (useTiered && report.full !== undefined) {
        console.log(`    Full confidence: ${report.full}`);
        console.log(`    Partial confidence: ${report.partial}`);
        console.log(`    Provisional: ${report.provisional}`);
      }
      console.log(`  Errors: ${report.errors}`);
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');
      console.log('✅ Stability update complete');
    } else {
      console.log(JSON.stringify(report, null, 2));
    }

    // Save report to database
    await prisma.systemState.upsert({
      where: { key: 'stability_update_report' },
      create: {
        key: 'stability_update_report',
        value: report as unknown as Record<string, unknown>,
      },
      update: {
        value: report as unknown as Record<string, unknown>,
      },
    });
  } catch (error) {
    console.error('❌ Stability update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
