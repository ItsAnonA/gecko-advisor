/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * R2 Batch Delete Script
 *
 * Deletes report JSON files from R2 storage for given scan IDs.
 * Reads scan IDs from stdin (one per line) and deletes in batches.
 *
 * Usage:
 *   cat scan_ids.txt | node r2-batch-delete.mjs
 *   # Or with direct input:
 *   echo "scanId1\nscanId2" | node r2-batch-delete.mjs
 *
 * Environment variables required:
 *   OBJECT_STORAGE_ENDPOINT
 *   OBJECT_STORAGE_BUCKET
 *   OBJECT_STORAGE_ACCESS_KEY
 *   OBJECT_STORAGE_SECRET_KEY
 *   OBJECT_STORAGE_REGION (default: auto)
 *   OBJECT_STORAGE_REPORT_PREFIX (default: reports/)
 */

import { S3Client, DeleteObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createInterface } from 'readline';

// Configuration from environment
const config = {
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
  bucket: process.env.OBJECT_STORAGE_BUCKET,
  accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY,
  secretKey: process.env.OBJECT_STORAGE_SECRET_KEY,
  region: process.env.OBJECT_STORAGE_REGION || 'auto',
  prefix: process.env.OBJECT_STORAGE_REPORT_PREFIX || 'reports/',
};

// Validate configuration
const missingVars = [];
if (!config.endpoint) missingVars.push('OBJECT_STORAGE_ENDPOINT');
if (!config.bucket) missingVars.push('OBJECT_STORAGE_BUCKET');
if (!config.accessKey) missingVars.push('OBJECT_STORAGE_ACCESS_KEY');
if (!config.secretKey) missingVars.push('OBJECT_STORAGE_SECRET_KEY');

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Initialize S3 client for R2
const s3Client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  credentials: {
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
  },
  forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true',
});

// Build object key from scan ID
function buildKey(scanId) {
  const prefix = config.prefix.replace(/\/?$/, '/');
  return `${prefix}${scanId}.json`;
}

// Delete a batch of objects (max 1000 per S3 API call)
async function deleteBatch(scanIds) {
  if (scanIds.length === 0) return { deleted: 0, errors: 0 };

  const objects = scanIds.map((id) => ({ Key: buildKey(id) }));

  try {
    const command = new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: { Objects: objects, Quiet: false },
    });

    const response = await s3Client.send(command);

    const deleted = response.Deleted?.length || 0;
    const errors = response.Errors?.length || 0;

    if (errors > 0) {
      console.error('Delete errors:', response.Errors);
    }

    return { deleted, errors };
  } catch (error) {
    console.error('Batch delete failed:', error.message);
    return { deleted: 0, errors: scanIds.length };
  }
}

// Check if an object exists (for verification)
async function objectExists(scanId) {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: buildKey(scanId),
      })
    );
    return true;
  } catch {
    return false;
  }
}

// Main function
async function main() {
  console.log('=== R2 Batch Delete Script ===');
  console.log(`Bucket: ${config.bucket}`);
  console.log(`Prefix: ${config.prefix}`);
  console.log('');

  // Read scan IDs from stdin
  const scanIds = [];
  const rl = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      scanIds.push(trimmed);
    }
  }

  console.log(`Total scan IDs to process: ${scanIds.length}`);

  if (scanIds.length === 0) {
    console.log('No scan IDs provided. Exiting.');
    return;
  }

  // Sample check: verify first object exists before bulk delete
  console.log(`Checking if first object exists: ${buildKey(scanIds[0])}`);
  const firstExists = await objectExists(scanIds[0]);
  console.log(`First object exists: ${firstExists}`);

  if (!firstExists) {
    console.log('Warning: First object does not exist. Objects may already be deleted or keys are wrong.');
    console.log('Proceeding anyway (S3 delete is idempotent)...');
  }

  // Process in batches of 1000 (S3 DeleteObjects limit)
  const BATCH_SIZE = 1000;
  let totalDeleted = 0;
  let totalErrors = 0;
  let batchNum = 0;

  for (let i = 0; i < scanIds.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = scanIds.slice(i, i + BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}: Deleting ${batch.length} objects... `);
    const { deleted, errors } = await deleteBatch(batch);
    console.log(`Done (deleted: ${deleted}, errors: ${errors})`);

    totalDeleted += deleted;
    totalErrors += errors;

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < scanIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total objects deleted: ${totalDeleted}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Success rate: ${((totalDeleted / scanIds.length) * 100).toFixed(2)}%`);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
