#!/usr/bin/env tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Google Search Console Metrics Script
 *
 * Fetches SEO performance data from Google Search Console API.
 *
 * Prerequisites:
 * 1. Install googleapis: pnpm add googleapis
 * 2. Create a service account in Google Cloud Console
 * 3. Download service account JSON key
 * 4. Add service account email to GSC property (as Owner or Full User)
 * 5. Save key as: scripts/gsc-service-account.json (DO NOT commit!)
 *
 * Usage:
 *   pnpm gsc:metrics                 # Last 28 days overview
 *   pnpm gsc:metrics --days 7        # Last 7 days
 *   pnpm gsc:metrics --queries       # Top 100 queries
 *   pnpm gsc:metrics --pages         # Top 100 pages
 */

import { google } from 'googleapis';
import { join } from 'path';
import { existsSync } from 'fs';

const SITE_URL = 'https://geckoadvisor.com';
const SERVICE_ACCOUNT_KEY = join(process.cwd(), 'scripts', 'gsc-service-account.json');

interface GSCMetrics {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Initialize Google Search Console API client
 */
function initGSC() {
  if (!existsSync(SERVICE_ACCOUNT_KEY)) {
    console.error('❌ Service account key not found!');
    console.error(`Expected location: ${SERVICE_ACCOUNT_KEY}`);
    console.error('\nSetup instructions:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Create a service account with Search Console API access');
    console.error('3. Download JSON key and save as scripts/gsc-service-account.json');
    console.error('4. Add service account email to GSC property');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  return google.searchconsole({ version: 'v1', auth });
}

/**
 * Get daily metrics for date range
 */
async function getDailyMetrics(days = 28): Promise<GSCMetrics[]> {
  const searchconsole = initGSC();

  const endDate = new Date();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['date'],
      rowLimit: 1000,
    },
  });

  return (response.data.rows || []).map((row) => ({
    date: (row.keys?.[0] as string) || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

/**
 * Get top queries by impressions
 */
async function getTopQueries(limit = 100): Promise<GSCQuery[]> {
  const searchconsole = initGSC();

  const endDate = new Date();
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: limit,
    },
  });

  return (response.data.rows || []).map((row) => ({
    query: (row.keys?.[0] as string) || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

/**
 * Get top pages by impressions
 */
async function getTopPages(limit = 100): Promise<GSCPage[]> {
  const searchconsole = initGSC();

  const endDate = new Date();
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit: limit,
    },
  });

  return (response.data.rows || []).map((row) => ({
    page: (row.keys?.[0] as string) || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

/**
 * Calculate summary statistics from daily metrics
 */
function calculateSummary(metrics: GSCMetrics[]) {
  if (metrics.length === 0) {
    return {
      totalClicks: 0,
      totalImpressions: 0,
      avgCTR: 0,
      avgPosition: 0,
    };
  }

  const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
  const avgCTR = totalClicks / totalImpressions;
  const avgPosition = metrics.reduce((sum, m) => sum + m.position, 0) / metrics.length;

  return {
    totalClicks,
    totalImpressions,
    avgCTR,
    avgPosition,
  };
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const days = args.includes('--days')
    ? Number.parseInt(args[args.indexOf('--days') + 1] || '28', 10)
    : 28;
  const showQueries = args.includes('--queries');
  const showPages = args.includes('--pages');

  console.log('🔍 Fetching Google Search Console metrics...\n');

  try {
    // Fetch daily metrics
    const metrics = await getDailyMetrics(days);
    const summary = calculateSummary(metrics);

    console.log(`📊 Summary (Last ${days} days):`);
    console.log(`  Total Clicks:      ${summary.totalClicks.toLocaleString()}`);
    console.log(`  Total Impressions: ${summary.totalImpressions.toLocaleString()}`);
    console.log(`  Average CTR:       ${(summary.avgCTR * 100).toFixed(2)}%`);
    console.log(`  Average Position:  ${summary.avgPosition.toFixed(1)}`);
    console.log('');

    // Show top queries if requested
    if (showQueries) {
      console.log('🔎 Top Queries (Last 28 days):');
      const queries = await getTopQueries(20);
      console.table(
        queries.map((q, i) => ({
          '#': i + 1,
          Query: q.query.substring(0, 50),
          Impressions: q.impressions.toLocaleString(),
          Clicks: q.clicks,
          CTR: `${(q.ctr * 100).toFixed(1)}%`,
          Position: q.position.toFixed(1),
        }))
      );
      console.log('');
    }

    // Show top pages if requested
    if (showPages) {
      console.log('📄 Top Pages (Last 28 days):');
      const pages = await getTopPages(20);
      console.table(
        pages.map((p, i) => ({
          '#': i + 1,
          Page: p.page.replace(SITE_URL, '').substring(0, 60),
          Impressions: p.impressions.toLocaleString(),
          Clicks: p.clicks,
          CTR: `${(p.ctr * 100).toFixed(1)}%`,
          Position: p.position.toFixed(1),
        }))
      );
      console.log('');
    }

    console.log('✅ Metrics fetched successfully!');
  } catch (error) {
    console.error('❌ Error fetching GSC metrics:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for use in other scripts
export { getDailyMetrics, getTopQueries, getTopPages, calculateSummary };
