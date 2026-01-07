/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Report Generation Queue
 *
 * Handles background generation of SSR report HTML for cache warming.
 * Uses BullMQ for job processing with deduplication and retry logic.
 */

import { scanQueue, SCAN_PRIORITY } from '../queue.js';
import { logger } from '../logger.js';
import { generateSSRReportHTML } from '../services/ssrReportService.js';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache.js';

/**
 * Job data for report generation
 */
export interface ReportGenerationJobData {
  domain: string;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Add a report generation job to the queue with deduplication.
 *
 * @param data - Job data containing domain and priority
 * @returns Job ID or null if job already exists
 */
export async function queueReportGeneration(
  data: ReportGenerationJobData
): Promise<string | null> {
  const { domain, priority = 'normal' } = data;

  // Generate deterministic job ID for deduplication
  const jobId = `report-${domain}`;

  // Check if job already exists
  const existingJob = await scanQueue.getJob(jobId);
  if (existingJob) {
    logger.debug({ domain, jobId }, 'Report generation job already queued, skipping');
    return null;
  }

  // Map priority to BullMQ priority
  const priorityValue =
    priority === 'high'
      ? SCAN_PRIORITY.URGENT
      : priority === 'low'
        ? SCAN_PRIORITY.LOW
        : SCAN_PRIORITY.NORMAL;

  // Add job to queue
  const job = await scanQueue.add(
    'generate-report',
    { domain },
    {
      jobId,
      priority: priorityValue,
      attempts: 3, // Retry up to 3 times
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds, then exponential backoff
      },
      removeOnComplete: {
        count: 50, // Keep last 50 completed jobs
        age: 24 * 3600, // 24 hours
      },
      removeOnFail: {
        count: 100, // Keep last 100 failed jobs for debugging
        age: 48 * 3600, // 48 hours
      },
    }
  );

  logger.info(
    {
      domain,
      jobId,
      priority,
      priorityValue,
    },
    'Report generation job queued'
  );

  return job.id ?? null;
}

/**
 * Process a report generation job.
 *
 * This function is called by the worker to process queued report generation jobs.
 *
 * @param domain - Domain to generate report for
 * @returns Success status
 */
export async function processReportGenerationJob(domain: string): Promise<boolean> {
  try {
    logger.info({ domain }, 'Processing report generation job');

    // Generate report HTML
    const html = await generateSSRReportHTML(domain);

    if (!html) {
      logger.warn({ domain }, 'No scan found for domain - cannot generate report');
      return false;
    }

    // Cache the generated report
    const cacheKey = CACHE_KEYS.SSR_REPORT_HTML(domain);
    await CacheService.set(cacheKey, html, CACHE_TTL.SSR_REPORT_HTML);

    logger.info({ domain, cacheKey }, 'Report generated and cached successfully');

    return true;
  } catch (error) {
    logger.error(
      {
        error,
        domain,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      'Report generation job failed'
    );

    // Re-throw to trigger BullMQ retry logic
    throw error;
  }
}
