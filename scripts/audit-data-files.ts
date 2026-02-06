#!/usr/bin/env tsx
/**
 * P0 #1: Data File Audit Script
 *
 * Read-only audit of privacy list data files and CachedList table.
 * Reports file sizes, entry counts, coverage gaps, and staleness warnings.
 *
 * Usage: npx tsx scripts/audit-data-files.ts
 * Output: docs/data-audit-report.json
 *
 * Phase 3C Safe: No writes to production data.
 */

import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

interface FileAudit {
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  lastModified: string | null;
  version: string | null;
  entryCount: number | null;
  entryType: string;
  entries?: unknown;
}

interface CachedListAudit {
  source: string;
  version: string;
  fetchedAt: string;
  entryCount: number;
  dataSample: unknown;
}

interface AuditWarning {
  level: 'critical' | 'high' | 'medium' | 'info';
  source: string;
  message: string;
}

interface AuditReport {
  generatedAt: string;
  files: FileAudit[];
  cachedLists: CachedListAudit[];
  warnings: AuditWarning[];
  summary: {
    totalFiles: number;
    totalCachedSources: number;
    totalWarnings: number;
    criticalWarnings: number;
    demoFilesDetected: boolean;
    productionDataPresent: boolean;
  };
}

// ============================================================================
// Audit Functions
// ============================================================================

async function auditFile(
  relativePath: string,
  entryType: string,
  countFn: (data: Record<string, unknown>) => number
): Promise<FileAudit> {
  const fullPath = path.resolve(process.cwd(), relativePath);

  try {
    const fileStat = await stat(fullPath);
    const content = await readFile(fullPath, 'utf8');
    const parsed = JSON.parse(content) as Record<string, unknown>;

    return {
      path: relativePath,
      exists: true,
      sizeBytes: fileStat.size,
      lastModified: fileStat.mtime.toISOString(),
      version: (parsed.version as string) ?? null,
      entryCount: countFn(parsed),
      entryType,
    };
  } catch (error) {
    return {
      path: relativePath,
      exists: false,
      sizeBytes: null,
      lastModified: null,
      version: null,
      entryCount: null,
      entryType,
    };
  }
}

async function auditCachedLists(prisma: PrismaClient): Promise<CachedListAudit[]> {
  try {
    const lists = await prisma.cachedList.findMany();
    return lists.map((list) => {
      const data = list.data as Record<string, unknown>;
      let entryCount = 0;

      if (Array.isArray(data.domains)) entryCount += data.domains.length;
      if (Array.isArray(data.fingerprinting)) entryCount += data.fingerprinting.length;
      if (Array.isArray(data.trackers)) entryCount += data.trackers.length;
      if (Array.isArray(data.entries)) entryCount += data.entries.length;

      // Build a safe sample (first 3 entries of each array)
      const sample: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          sample[key] = `${value.length} entries (first 3: ${JSON.stringify(value.slice(0, 3))})`;
        } else {
          sample[key] = value;
        }
      }

      return {
        source: list.source,
        version: list.version,
        fetchedAt: list.fetchedAt.toISOString(),
        entryCount,
        dataSample: sample,
      };
    });
  } catch {
    return [];
  }
}

function generateWarnings(
  files: FileAudit[],
  cachedLists: CachedListAudit[]
): AuditWarning[] {
  const warnings: AuditWarning[] = [];

  // Check for missing files
  for (const file of files) {
    if (!file.exists) {
      warnings.push({
        level: 'critical',
        source: file.path,
        message: `File not found: ${file.path}`,
      });
    }
  }

  // Check demo file sizes
  const easyFile = files.find((f) => f.path.includes('easyprivacy-demo'));
  if (easyFile?.exists && easyFile.entryCount !== null) {
    if (easyFile.entryCount < 100) {
      warnings.push({
        level: 'high',
        source: easyFile.path,
        message: `EasyPrivacy demo has only ${easyFile.entryCount} domains. Production EasyPrivacy has ~20K+ entries. This is a demo subset used as fallback only.`,
      });
    }
  }

  const whoFile = files.find((f) => f.path.includes('whotracks-demo'));
  if (whoFile?.exists && whoFile.entryCount !== null) {
    if (whoFile.entryCount < 100) {
      warnings.push({
        level: 'high',
        source: whoFile.path,
        message: `WhoTracks.me demo has only ${whoFile.entryCount} entries. Production WhoTracks.me has ~10K+ entries. This is a demo subset used as fallback only.`,
      });
    }
  }

  const pslFile = files.find((f) => f.path.includes('psl-demo'));
  if (pslFile?.exists && pslFile.entryCount !== null) {
    if (pslFile.entryCount < 100) {
      warnings.push({
        level: 'medium',
        source: pslFile.path,
        message: `PSL demo has only ${pslFile.entryCount} TLD entries. Full PSL has ~9K+ entries. This is a demo subset.`,
      });
    }
  }

  // Check CachedList table
  if (cachedLists.length === 0) {
    warnings.push({
      level: 'critical',
      source: 'CachedList table',
      message: 'No entries in CachedList table. Worker will fall back to demo JSON files with minimal coverage.',
    });
  } else {
    // Check for staleness (>30 days old)
    for (const cached of cachedLists) {
      const fetchedAt = new Date(cached.fetchedAt);
      const daysSinceFetch = Math.floor(
        (Date.now() - fetchedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysSinceFetch > 30) {
        warnings.push({
          level: 'high',
          source: `CachedList:${cached.source}`,
          message: `${cached.source} data is ${daysSinceFetch} days old (fetched ${cached.fetchedAt}). Consider refreshing via POST /admin/refresh-lists.`,
        });
      }

      if (cached.entryCount < 100) {
        warnings.push({
          level: 'medium',
          source: `CachedList:${cached.source}`,
          message: `${cached.source} has only ${cached.entryCount} entries in CachedList. May be demo data loaded into the table.`,
        });
      }
    }

    // Check for missing sources
    const sources = cachedLists.map((c) => c.source);
    if (!sources.includes('easyprivacy')) {
      warnings.push({
        level: 'high',
        source: 'CachedList table',
        message: 'No easyprivacy source in CachedList. Worker will fall back to demo JSON.',
      });
    }
    if (!sources.includes('whotracks')) {
      warnings.push({
        level: 'high',
        source: 'CachedList table',
        message: 'No whotracks source in CachedList. Worker will fall back to demo JSON.',
      });
    }
  }

  // Check for DDG Tracker Radar (shadow source, not yet expected)
  warnings.push({
    level: 'info',
    source: 'DDG Tracker Radar',
    message: 'DDG Tracker Radar not yet integrated. P0 #2 will add shadow mode ingestion for comparison.',
  });

  return warnings;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('=== Gecko Advisor Data File Audit ===\n');

  // Audit demo JSON files
  const files = await Promise.all([
    auditFile(
      'packages/shared/data/easyprivacy-demo.json',
      'tracker domains',
      (data) => (Array.isArray(data.domains) ? data.domains.length : 0)
    ),
    auditFile(
      'packages/shared/data/whotracks-demo.json',
      'fingerprinting + tracker entries',
      (data) => {
        let count = 0;
        if (Array.isArray(data.fingerprinting)) count += data.fingerprinting.length;
        if (Array.isArray(data.trackers)) count += data.trackers.length;
        return count;
      }
    ),
    auditFile(
      'packages/shared/data/psl-demo.json',
      'TLD entries',
      (data) => (Array.isArray(data.entries) ? data.entries.length : 0)
    ),
  ]);

  console.log('Files audited:');
  for (const file of files) {
    const status = file.exists ? 'OK' : 'MISSING';
    console.log(
      `  [${status}] ${file.path} - ${file.entryCount ?? 'N/A'} ${file.entryType} (${file.sizeBytes ?? 0} bytes)`
    );
  }

  // Audit CachedList table
  let cachedLists: CachedListAudit[] = [];
  let dbConnected = false;

  try {
    const prisma = new PrismaClient();
    cachedLists = await auditCachedLists(prisma);
    dbConnected = true;
    await prisma.$disconnect();
  } catch {
    console.log('\n  [WARN] Could not connect to database. Skipping CachedList audit.');
  }

  if (dbConnected) {
    console.log(`\nCachedList table: ${cachedLists.length} source(s)`);
    for (const cached of cachedLists) {
      console.log(
        `  [${cached.source}] v${cached.version} - ${cached.entryCount} entries (fetched ${cached.fetchedAt})`
      );
    }
  }

  // Generate warnings
  const warnings = generateWarnings(files, cachedLists);

  console.log(`\nWarnings: ${warnings.length}`);
  for (const warning of warnings) {
    const icon =
      warning.level === 'critical' ? 'CRIT' :
      warning.level === 'high' ? 'HIGH' :
      warning.level === 'medium' ? 'MED' : 'INFO';
    console.log(`  [${icon}] ${warning.source}: ${warning.message}`);
  }

  // Build report
  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    files,
    cachedLists,
    warnings,
    summary: {
      totalFiles: files.length,
      totalCachedSources: cachedLists.length,
      totalWarnings: warnings.length,
      criticalWarnings: warnings.filter((w) => w.level === 'critical').length,
      demoFilesDetected: files.some(
        (f) => f.exists && f.entryCount !== null && f.entryCount < 100
      ),
      productionDataPresent: cachedLists.some((c) => c.entryCount >= 100),
    },
  };

  // Write report
  const reportPath = path.resolve(process.cwd(), 'docs/data-audit-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport written to: ${reportPath}`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`  Files: ${report.summary.totalFiles}`);
  console.log(`  CachedList sources: ${report.summary.totalCachedSources}`);
  console.log(`  Warnings: ${report.summary.totalWarnings} (${report.summary.criticalWarnings} critical)`);
  console.log(`  Demo files detected: ${report.summary.demoFilesDetected}`);
  console.log(`  Production data present: ${report.summary.productionDataPresent}`);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
