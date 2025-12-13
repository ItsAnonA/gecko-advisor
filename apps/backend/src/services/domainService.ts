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
