#!/usr/bin/env npx ts-node

/**
 * ELIGIBILITY DECAY
 *
 * Weekly cleanup job that manages domain scan eligibility.
 * Applies two-stage decay to zero-signal Tier C domains:
 * 1. 180 days: Deprioritize (reduce rescan priority to 20)
 * 2. 365 days: Suspend (set eligibleForScan = false)
 *
 * Also reactivates suspended domains that now show signals.
 *
 * Safeguards (never suspend if):
 * - In Tranco top 1M
 * - Has ANY impressions
 * - Is category top 50
 * - Has tier score >= 60
 *
 * Usage:
 *   npx tsx scripts/eligibility-decay.ts
 *   npx tsx scripts/eligibility-decay.ts --dry-run  # Preview only
 *   npx tsx scripts/eligibility-decay.ts --json     # Output as JSON
 *
 * Schedule: Weekly (Sundays at 2 AM UTC)
 *   0 2 * * 0 docker exec ga-backend npx tsx /app/scripts/eligibility-decay.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  applyEligibilityDecay,
  bulkReactivateFromGSC,
  getEligibilityStats,
} from '../apps/backend/src/services/eligibilityService';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
const outputJson = process.argv.includes('--json');

interface DecayReport {
  date: string;
  dryRun: boolean;
  decay: {
    deprioritized: number;
    suspended: number;
    preserved: number;
    suspensionSamples: Array<{ domain: string; reason: string }>;
  };
  reactivation: {
    reactivated: number;
  };
  stats: {
    total: number;
    eligible: number;
    suspended: number;
    deprioritized: number;
    byTier: Record<string, { eligible: number; suspended: number }>;
  };
  duration: number;
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const report: DecayReport = {
    date: new Date().toISOString().split('T')[0] || '',
    dryRun: isDryRun,
    decay: { deprioritized: 0, suspended: 0, preserved: 0, suspensionSamples: [] },
    reactivation: { reactivated: 0 },
    stats: { total: 0, eligible: 0, suspended: 0, deprioritized: 0, byTier: {} },
    duration: 0,
  };

  if (!outputJson) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║            WEEKLY ELIGIBILITY DECAY JOB                      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Date: ${report.date}`);
    console.log(`  Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
    console.log('');
  }

  try {
    // Step 1: Get pre-run stats
    const preStats = await getEligibilityStats(prisma);

    if (!outputJson) {
      console.log('────────────────────────────────────────────────────────────');
      console.log('PRE-RUN STATS');
      console.log(`  Total domains: ${preStats.total.toLocaleString()}`);
      console.log(`  Eligible: ${preStats.eligible.toLocaleString()}`);
      console.log(`  Suspended: ${preStats.suspended.toLocaleString()}`);
      console.log(`  Deprioritized: ${preStats.deprioritized.toLocaleString()}`);
      console.log('');
    }

    // Step 2: Apply eligibility decay (skip if dry run)
    if (!isDryRun) {
      if (!outputJson) {
        console.log('────────────────────────────────────────────────────────────');
        console.log('APPLYING DECAY...');
      }

      const decayResult = await applyEligibilityDecay(prisma);
      report.decay = decayResult;

      if (!outputJson) {
        console.log('');
      }
    } else {
      if (!outputJson) {
        console.log('────────────────────────────────────────────────────────────');
        console.log('DRY RUN: Decay would be applied here');
        console.log('');
      }
    }

    // Step 3: Reactivate domains with new signals (skip if dry run)
    if (!isDryRun) {
      if (!outputJson) {
        console.log('────────────────────────────────────────────────────────────');
        console.log('REACTIVATING DOMAINS WITH SIGNALS...');
      }

      const reactivated = await bulkReactivateFromGSC(prisma);
      report.reactivation.reactivated = reactivated;

      if (!outputJson) {
        console.log(`  Reactivated: ${reactivated}`);
        console.log('');
      }
    }

    // Step 4: Get post-run stats
    const postStats = await getEligibilityStats(prisma);
    report.stats = postStats;

    if (!outputJson) {
      console.log('────────────────────────────────────────────────────────────');
      console.log('POST-RUN STATS');
      console.log(`  Total domains: ${postStats.total.toLocaleString()}`);
      console.log(`  Eligible: ${postStats.eligible.toLocaleString()}`);
      console.log(`  Suspended: ${postStats.suspended.toLocaleString()}`);
      console.log(`  Deprioritized: ${postStats.deprioritized.toLocaleString()}`);
      console.log('');
      console.log('  By Tier:');
      for (const [tier, stats] of Object.entries(postStats.byTier)) {
        console.log(`    ${tier}: ${stats.eligible.toLocaleString()} eligible, ${stats.suspended.toLocaleString()} suspended`);
      }
      console.log('');
    }

    // Step 5: Summary
    report.duration = Date.now() - startTime;

    if (!outputJson) {
      console.log('────────────────────────────────────────────────────────────');
      console.log('SUMMARY');
      if (!isDryRun) {
        console.log(`  Deprioritized: ${report.decay.deprioritized}`);
        console.log(`  Suspended: ${report.decay.suspended}`);
        console.log(`  Preserved (safeguards): ${report.decay.preserved}`);
        console.log(`  Reactivated: ${report.reactivation.reactivated}`);

        // Show sample suspensions for review
        if (report.decay.suspensionSamples.length > 0) {
          console.log('');
          console.log('  Sample suspensions (review these):');
          report.decay.suspensionSamples.slice(0, 10).forEach((s) => {
            console.log(`    - ${s.domain}: ${s.reason}`);
          });
        }
      } else {
        console.log('  No changes made (dry run)');
      }
      console.log('');
      console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
      console.log('');

      // Alert thresholds
      const suspensionRate = report.decay.suspended / Math.max(preStats.total, 1);
      if (suspensionRate > 0.01) {
        console.log('⚠️  WARNING: Suspension rate > 1% - review suspension samples!');
      }

      if (report.decay.suspended > 100) {
        console.log('⚠️  WARNING: High suspension count - verify safeguards are working');
      }
    }

    // Step 6: Save report to database (skip if dry run)
    if (!isDryRun) {
      await prisma.systemState.upsert({
        where: { key: 'eligibility_decay_report' },
        create: {
          key: 'eligibility_decay_report',
          value: report as unknown as Record<string, unknown>,
        },
        update: {
          value: report as unknown as Record<string, unknown>,
        },
      });

      if (!outputJson) {
        console.log('✅ Report saved to database');
      }
    }

    // Output JSON if requested
    if (outputJson) {
      console.log(JSON.stringify(report, null, 2));
    }
  } catch (error) {
    console.error('❌ Eligibility decay failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
