// SPDX-License-Identifier: MIT
import { buildReportStorageKey, type ReportPayload } from '@gecko-advisor/shared';
import { config } from '../config.js';
import { objectStorage } from '../storage/objectStorage.js';
import { logger } from '../logger.js';

export function getReportStorageKey(scanId: string): string {
  return buildReportStorageKey(scanId, {
    prefix: config.objectStorage.reportPrefix ?? 'reports/',
  });
}

/**
 * Fetches a report directly from Object Storage.
 * Returns null if not found or Object Storage is disabled.
 * This is the recommended approach for serving reports (faster, reduces DB load).
 */
export async function getReportFromStorage(scanId: string): Promise<ReportPayload | null> {
  if (!objectStorage.isEnabled()) {
    return null;
  }

  const key = getReportStorageKey(scanId);
  const report = await objectStorage.getJson<ReportPayload>(key);

  if (report) {
    logger.debug({ scanId, key }, 'Report served from Object Storage');
  }

  return report;
}

/**
 * Fetches a report by slug from Object Storage.
 * First looks up the scanId from the report metadata, then fetches the full report.
 * Returns null if not found.
 */
export async function getReportFromStorageBySlug(slug: string, scanId: string): Promise<ReportPayload | null> {
  // We need the scanId to build the storage key, so this is called after DB lookup
  return getReportFromStorage(scanId);
}

export async function getReportDownloadUrl(scanId: string): Promise<{ url: string; expiresInSeconds: number } | null> {
  if (!objectStorage.isEnabled()) {
    return null;
  }

  const key = getReportStorageKey(scanId);
  const publicUrl = objectStorage.getPublicUrl(key);
  if (publicUrl) {
    return {
      url: publicUrl,
      expiresInSeconds: 0,
    };
  }

  const signedUrl = await objectStorage.generateSignedUrl(key, config.objectStorage.signedUrlExpirySeconds);
  if (!signedUrl) {
    return null;
  }

  return {
    url: signedUrl,
    expiresInSeconds: config.objectStorage.signedUrlExpirySeconds ?? 3600,
  };
}
