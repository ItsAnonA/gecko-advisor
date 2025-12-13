/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { PrismaClient, Scan, Domain } from "@prisma/client";
import { etldPlusOne } from "@gecko-advisor/shared";

/**
 * Normalize a URL or hostname to its effective domain (eTLD+1).
 * Examples:
 *   - "https://www.example.com/path" → "example.com"
 *   - "subdomain.example.co.uk" → "example.co.uk"
 *   - "example.com" → "example.com"
 */
export function normalizeDomain(input: string): string {
  let hostname = input.toLowerCase().trim();

  // Strip protocol if present
  hostname = hostname.replace(/^https?:\/\//, '');

  // Strip www. prefix
  hostname = hostname.replace(/^www\./, '');

  // Strip path, query, fragment
  hostname = hostname.split('/')[0] ?? hostname;
  hostname = hostname.split('?')[0] ?? hostname;
  hostname = hostname.split('#')[0] ?? hostname;

  // Strip port if present
  hostname = hostname.split(':')[0] ?? hostname;

  // Get effective TLD+1 (e.g., sub.example.com → example.com)
  return etldPlusOne(hostname);
}

/**
 * Find a domain record by normalized domain name.
 */
export async function findDomainByName(
  prisma: PrismaClient,
  domain: string
): Promise<Domain | null> {
  const normalized = normalizeDomain(domain);
  return prisma.domain.findUnique({
    where: { domain: normalized },
  });
}

/**
 * Find the latest completed scan for a domain.
 * Returns the scan with all evidence and issues if found.
 */
export async function findLatestScanForDomain(
  prisma: PrismaClient,
  domain: string
): Promise<(Scan & { evidence: unknown[]; issues: unknown[] }) | null> {
  const normalized = normalizeDomain(domain);

  // First, try to find via Domain record (fastest path)
  const domainRecord = await prisma.domain.findUnique({
    where: { domain: normalized },
    include: {
      latestScan: {
        include: {
          evidence: true,
          issues: true,
        },
      },
    },
  });

  if (domainRecord?.latestScan) {
    return domainRecord.latestScan as Scan & { evidence: unknown[]; issues: unknown[] };
  }

  // Fallback: Query Scan table directly by normalizedInput
  // This handles cases where Domain record doesn't exist yet
  const scan = await prisma.scan.findFirst({
    where: {
      normalizedInput: {
        contains: normalized,
      },
      status: 'done',
    },
    orderBy: {
      finishedAt: 'desc',
    },
    include: {
      evidence: true,
      issues: true,
    },
  });

  return scan;
}

/**
 * Upsert a domain record when a scan completes.
 * Called by the worker after successful scan completion.
 */
export async function upsertDomainOnScanComplete(
  prisma: PrismaClient,
  scan: Scan
): Promise<Domain> {
  // Extract domain from the scan's input URL
  const domain = normalizeDomain(scan.input);

  // Upsert the domain record
  return prisma.domain.upsert({
    where: { domain },
    create: {
      domain,
      latestScanId: scan.id,
      firstScanned: scan.finishedAt ?? new Date(),
      lastScanned: scan.finishedAt ?? new Date(),
      scanCount: 1,
      isIndexed: true,
    },
    update: {
      latestScanId: scan.id,
      lastScanned: scan.finishedAt ?? new Date(),
      scanCount: { increment: 1 },
    },
  });
}

/**
 * Get all indexed domains for sitemap generation.
 */
export async function getIndexedDomains(
  prisma: PrismaClient,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<Array<{ domain: string; lastScanned: Date | null }>> {
  const { limit = 5000, offset = 0 } = options;

  const domains = await prisma.domain.findMany({
    where: {
      isIndexed: true,
    },
    select: {
      domain: true,
      lastScanned: true,
    },
    orderBy: {
      lastScanned: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return domains;
}

/**
 * Count total indexed domains (for sitemap pagination).
 */
export async function countIndexedDomains(prisma: PrismaClient): Promise<number> {
  return prisma.domain.count({
    where: {
      isIndexed: true,
    },
  });
}

/**
 * Mark a domain as not indexed (exclude from sitemap).
 * Used for opt-out requests.
 */
export async function setDomainIndexed(
  prisma: PrismaClient,
  domain: string,
  isIndexed: boolean
): Promise<Domain | null> {
  const normalized = normalizeDomain(domain);

  try {
    return await prisma.domain.update({
      where: { domain: normalized },
      data: { isIndexed },
    });
  } catch {
    // Domain doesn't exist
    return null;
  }
}

/**
 * Backfill Domain table from existing completed scans.
 * This function:
 * 1. Finds all unique domains from completed scans
 * 2. Creates Domain records for any that don't exist
 * 3. Updates existing Domain records with correct latestScanId if needed
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Statistics about the backfill operation
 */
export async function backfillDomainsFromScans(
  prisma: PrismaClient,
  onProgress?: (stats: { processed: number; created: number; updated: number; errors: number }) => void
): Promise<{
  totalScans: number;
  uniqueDomains: number;
  created: number;
  updated: number;
  errors: number;
  skipped: number;
}> {
  const stats = {
    totalScans: 0,
    uniqueDomains: 0,
    created: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
  };

  // Get all completed scans grouped by normalizedInput (unique domains)
  // Use raw query for efficient aggregation
  const uniqueInputs = await prisma.scan.groupBy({
    by: ['normalizedInput'],
    where: {
      status: 'done',
      normalizedInput: { not: null },
    },
    _count: true,
  });

  stats.totalScans = await prisma.scan.count({ where: { status: 'done' } });
  stats.uniqueDomains = uniqueInputs.length;

  let processed = 0;

  for (const input of uniqueInputs) {
    if (!input.normalizedInput) {
      stats.skipped++;
      continue;
    }

    try {
      // Normalize to eTLD+1 domain
      const domain = normalizeDomain(input.normalizedInput);
      if (!domain || domain === 'invalid') {
        stats.skipped++;
        continue;
      }

      // Find the latest completed scan for this domain
      const latestScan = await prisma.scan.findFirst({
        where: {
          normalizedInput: input.normalizedInput,
          status: 'done',
        },
        orderBy: {
          finishedAt: 'desc',
        },
        select: {
          id: true,
          finishedAt: true,
          createdAt: true,
        },
      });

      if (!latestScan) {
        stats.skipped++;
        continue;
      }

      // Find the earliest scan for firstScanned date
      const firstScan = await prisma.scan.findFirst({
        where: {
          normalizedInput: input.normalizedInput,
          status: 'done',
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          createdAt: true,
        },
      });

      // Check if domain record exists
      const existingDomain = await prisma.domain.findUnique({
        where: { domain },
        select: { id: true, latestScanId: true },
      });

      if (existingDomain) {
        // Update if latestScanId is different or missing
        if (existingDomain.latestScanId !== latestScan.id) {
          await prisma.domain.update({
            where: { domain },
            data: {
              latestScanId: latestScan.id,
              lastScanned: latestScan.finishedAt ?? new Date(),
              scanCount: input._count,
            },
          });
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } else {
        // Create new domain record
        await prisma.domain.create({
          data: {
            domain,
            latestScanId: latestScan.id,
            firstScanned: firstScan?.createdAt ?? latestScan.createdAt,
            lastScanned: latestScan.finishedAt ?? new Date(),
            scanCount: input._count,
            isIndexed: true,
          },
        });
        stats.created++;
      }

      processed++;
      if (onProgress && processed % 100 === 0) {
        onProgress({
          processed,
          created: stats.created,
          updated: stats.updated,
          errors: stats.errors,
        });
      }
    } catch (error) {
      stats.errors++;
      // Log but continue processing
      console.error(`Error processing domain from ${input.normalizedInput}:`, error);
    }
  }

  return stats;
}
