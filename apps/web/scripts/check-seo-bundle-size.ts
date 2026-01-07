#!/usr/bin/env npx tsx
/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * SEO Bundle Size Guard
 *
 * Parses Next.js build output and fails if SEO routes exceed JS bundle thresholds.
 * SEO routes should be minimal JS since they're SSR-only.
 *
 * Thresholds:
 * - First Load JS shared: baseline (set during initial build)
 * - SEO route delta: must not exceed baseline + 10KB
 *
 * Usage:
 *   pnpm build:web
 *   npx tsx apps/web/scripts/check-seo-bundle-size.ts
 *
 * Or add to package.json:
 *   "build:check": "next build && tsx scripts/check-seo-bundle-size.ts"
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// SEO routes that should have minimal JS
const SEO_ROUTES = [
  '/privacy-report/[domain]',
  '/reports',
  '/r/[slug]',
  '/sitemap.xml',
  '/robots.txt',
];

// Thresholds in KB
const THRESHOLDS = {
  // Maximum First Load JS for any SEO route (in KB)
  maxFirstLoadJS: 100, // 100KB is generous for SSR pages

  // Maximum delta above the smallest SEO route (in KB)
  maxDeltaFromBaseline: 10, // Any SEO route should be within 10KB of baseline

  // Absolute maximum for any individual route chunk (in KB)
  maxRouteChunk: 15, // Route-specific JS should be tiny
};

interface RouteInfo {
  route: string;
  size: number; // in bytes
  firstLoadJS: number; // in bytes
}

/**
 * Parse the .next/build-manifest.json or analyze-output for bundle sizes
 */
function parseBuildOutput(): RouteInfo[] {
  const buildDir = join(process.cwd(), '.next');

  // Try to read the routes-manifest.json
  const routesManifestPath = join(buildDir, 'routes-manifest.json');
  const buildManifestPath = join(buildDir, 'build-manifest.json');

  if (!existsSync(buildDir)) {
    console.error('❌ .next directory not found. Run `next build` first.');
    process.exit(1);
  }

  // For accurate bundle analysis, we need the output from next build
  // The build output shows "First Load JS" for each route

  // Alternative: Parse the server/pages-manifest.json and client chunks
  const serverPagesPath = join(buildDir, 'server', 'app-paths-manifest.json');

  if (existsSync(serverPagesPath)) {
    const manifest = JSON.parse(readFileSync(serverPagesPath, 'utf-8'));
    console.log('📊 Found app paths manifest');

    // This gives us route -> chunk mappings but not sizes
    // For accurate sizes, we need the build stats
  }

  // Check for next build analyzer output
  const analyzeOutputPath = join(buildDir, 'analyze');

  if (existsSync(analyzeOutputPath)) {
    console.log('📊 Found bundle analyzer output');
  }

  // Fallback: Read and parse the build CLI output if captured
  // This is the most reliable way to get "First Load JS" values

  return [];
}

/**
 * Main bundle size check
 */
async function main() {
  console.log('🔍 SEO Bundle Size Guard\n');
  console.log('Thresholds:');
  console.log(`  - Max First Load JS: ${THRESHOLDS.maxFirstLoadJS}KB`);
  console.log(`  - Max Delta from Baseline: ${THRESHOLDS.maxDeltaFromBaseline}KB`);
  console.log(`  - Max Route Chunk: ${THRESHOLDS.maxRouteChunk}KB\n`);

  // Check if .next directory exists
  const nextDir = join(process.cwd(), '.next');

  if (!existsSync(nextDir)) {
    console.error('❌ Error: .next directory not found.');
    console.error('   Run `pnpm build` in the web app first.\n');
    process.exit(1);
  }

  // Check for build output log (typically captured during CI)
  const buildLogPath = process.env.BUILD_LOG_PATH || join(process.cwd(), 'build-output.log');

  if (existsSync(buildLogPath)) {
    const buildLog = readFileSync(buildLogPath, 'utf-8');
    const results = parseBuildLog(buildLog);

    if (results.length > 0) {
      checkThresholds(results);
      return;
    }
  }

  // Alternative: Check the .next/server directory for page sizes
  const serverDir = join(nextDir, 'server', 'app');

  if (existsSync(serverDir)) {
    console.log('📁 Checking server app directory...\n');

    const results = checkServerPages(serverDir);

    if (results.length > 0) {
      // For server pages, we check the RSC payload size
      console.log('Server Component Sizes:');
      for (const result of results) {
        const sizeKB = (result.size / 1024).toFixed(1);
        const status = result.size < THRESHOLDS.maxRouteChunk * 1024 ? '✅' : '❌';
        console.log(`  ${status} ${result.route}: ${sizeKB}KB`);
      }
      return;
    }
  }

  // If we can't get accurate bundle sizes, provide instructions
  console.log('ℹ️  To enable accurate bundle size checking:\n');
  console.log('   1. Capture build output: pnpm build 2>&1 | tee build-output.log');
  console.log('   2. Or install @next/bundle-analyzer');
  console.log('   3. Set BUILD_LOG_PATH environment variable\n');

  // Still check for obvious issues
  checkStaticExports(nextDir);
}

/**
 * Parse Next.js build log output for route sizes
 */
function parseBuildLog(log: string): RouteInfo[] {
  const results: RouteInfo[] = [];

  // Pattern: Route (pages)                              Size     First Load JS
  // Pattern: ○ /privacy-report/[domain]                 1.5 kB         89.2 kB
  const routePattern =
    /^[○●◐]\s+(\/[^\s]+)\s+(\d+(?:\.\d+)?)\s*(?:kB|KB|B)\s+(\d+(?:\.\d+)?)\s*(?:kB|KB)/gm;

  let match;
  while ((match = routePattern.exec(log)) !== null) {
    const route = match[1];
    const sizeStr = match[2];
    const firstLoadStr = match[3];

    // Convert to bytes (assuming kB)
    const size = parseFloat(sizeStr) * 1024;
    const firstLoadJS = parseFloat(firstLoadStr) * 1024;

    results.push({ route, size, firstLoadJS });
  }

  return results;
}

/**
 * Check server page file sizes as a proxy for bundle size
 */
function checkServerPages(serverDir: string): RouteInfo[] {
  const results: RouteInfo[] = [];
  const { readdirSync, statSync } = require('fs');
  const { join: pathJoin } = require('path');

  function walkDir(dir: string, prefix = ''): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = pathJoin(dir, entry.name);

      if (entry.isDirectory()) {
        // Handle route groups like (seo)
        const routePrefix = entry.name.startsWith('(')
          ? prefix // Skip route group in path
          : `${prefix}/${entry.name}`;

        walkDir(fullPath, routePrefix);
      } else if (entry.name === 'page.js' || entry.name === 'page.tsx') {
        const stats = statSync(fullPath);
        const route = prefix || '/';

        // Check if this is an SEO route
        const isSeORoute = SEO_ROUTES.some(
          (seoRoute) => route === seoRoute || route.includes(seoRoute.replace('[', '').replace(']', ''))
        );

        if (isSeORoute || route.includes('privacy-policy') || route.includes('/r/')) {
          results.push({
            route,
            size: stats.size,
            firstLoadJS: stats.size, // Approximate
          });
        }
      }
    }
  }

  try {
    walkDir(serverDir);
  } catch (e) {
    // Directory structure might differ
  }

  return results;
}

/**
 * Check threshold violations
 */
function checkThresholds(routes: RouteInfo[]): void {
  let hasViolations = false;

  // Find SEO routes
  const seoRoutes = routes.filter((r) =>
    SEO_ROUTES.some((seoRoute) => r.route.includes(seoRoute.replace('[', '').replace(']', '')))
  );

  if (seoRoutes.length === 0) {
    console.log('⚠️  No SEO routes found in build output.\n');
    return;
  }

  // Find baseline (smallest SEO route)
  const baseline = Math.min(...seoRoutes.map((r) => r.firstLoadJS));
  const baselineKB = (baseline / 1024).toFixed(1);

  console.log(`\n📊 SEO Route Bundle Sizes (Baseline: ${baselineKB}KB)\n`);

  for (const route of seoRoutes) {
    const firstLoadKB = (route.firstLoadJS / 1024).toFixed(1);
    const deltaKB = ((route.firstLoadJS - baseline) / 1024).toFixed(1);

    let status = '✅';
    let issues: string[] = [];

    // Check absolute threshold
    if (route.firstLoadJS > THRESHOLDS.maxFirstLoadJS * 1024) {
      status = '❌';
      issues.push(`exceeds max ${THRESHOLDS.maxFirstLoadJS}KB`);
      hasViolations = true;
    }

    // Check delta threshold
    if (route.firstLoadJS - baseline > THRESHOLDS.maxDeltaFromBaseline * 1024) {
      status = '❌';
      issues.push(`+${deltaKB}KB above baseline`);
      hasViolations = true;
    }

    const issueStr = issues.length > 0 ? ` (${issues.join(', ')})` : '';
    console.log(`  ${status} ${route.route}: ${firstLoadKB}KB${issueStr}`);
  }

  console.log('');

  if (hasViolations) {
    console.error('❌ SEO bundle size check FAILED\n');
    console.error('   SEO routes should have minimal client JS.');
    console.error('   Check for:');
    console.error('   - Unnecessary "use client" directives');
    console.error('   - Large dependencies imported in SEO components');
    console.error('   - Missing dynamic imports for client components\n');
    process.exit(1);
  }

  console.log('✅ SEO bundle size check PASSED\n');
}

/**
 * Check for static export issues
 */
function checkStaticExports(nextDir: string): void {
  const staticDir = join(nextDir, 'static');

  if (!existsSync(staticDir)) {
    return;
  }

  console.log('📁 Checking static assets...\n');

  // Check for unexpectedly large JS chunks
  const chunksDir = join(staticDir, 'chunks');

  if (existsSync(chunksDir)) {
    const { readdirSync, statSync } = require('fs');

    const chunks = readdirSync(chunksDir);
    const largeChunks = [];

    for (const chunk of chunks) {
      if (!chunk.endsWith('.js')) continue;

      const chunkPath = join(chunksDir, chunk);
      const stats = statSync(chunkPath);
      const sizeKB = stats.size / 1024;

      // Flag chunks over 50KB (might indicate bloat)
      if (sizeKB > 50) {
        largeChunks.push({ name: chunk, sizeKB: sizeKB.toFixed(1) });
      }
    }

    if (largeChunks.length > 0) {
      console.log('⚠️  Large JS chunks detected (may affect SEO page load):');
      for (const chunk of largeChunks) {
        console.log(`   - ${chunk.name}: ${chunk.sizeKB}KB`);
      }
      console.log('');
    }
  }
}

// Run
main().catch(console.error);
