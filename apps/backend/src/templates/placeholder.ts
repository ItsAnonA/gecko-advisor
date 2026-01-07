/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Placeholder Page Generator
 *
 * Generates HTML for domains without cached reports.
 *
 * CRITICAL SEO REQUIREMENTS:
 * - MUST include <meta name="robots" content="noindex, follow">
 * - MUST NOT include <link rel="canonical">
 * - MUST use JS-based refresh (NOT <meta http-equiv="refresh">)
 * - MUST have meaningful content (not thin/empty page)
 *
 * Why these requirements:
 * 1. noindex prevents thin content from polluting search results
 * 2. No canonical prevents Google from choosing wrong canonical
 * 3. JS refresh ignored by bots, works for humans
 * 4. Meaningful content prevents Soft 404 classification
 */

import { escapeHtml } from '../utils/escape.js';

export function generatePlaceholderHTML(domain: string): string {
  const escapedDomain = escapeHtml(domain);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Report for ${escapedDomain} - Generating | Gecko Advisor</title>

  <!-- CRITICAL: noindex prevents indexing of placeholder page -->
  <meta name="robots" content="noindex, follow">

  <meta name="description" content="Privacy analysis for ${escapedDomain} is being generated. Check back shortly for the complete privacy report with score, tracker analysis, and security assessment.">

  <!-- NO CANONICAL TAG - only add when real content exists -->

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f8fafc;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .domain {
      color: #0284c7;
      word-break: break-all;
    }
    .status {
      background: #f0f9ff;
      border-left: 4px solid #0284c7;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #0284c7;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status h2 {
      font-size: 16px;
      font-weight: 600;
      color: #0c4a6e;
      margin: 0;
    }
    .status p {
      color: #475569;
      margin: 0;
    }
    .info-box {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .info-box h3 {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .info-box ul {
      list-style: none;
      padding: 0;
    }
    .info-box li {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-box li:last-child {
      border-bottom: none;
    }
    .info-box a {
      color: #0284c7;
      text-decoration: none;
      font-weight: 500;
    }
    .info-box a:hover {
      text-decoration: underline;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Report: <span class="domain">${escapedDomain}</span></h1>

    <div class="status">
      <div class="status-header">
        <span class="spinner" aria-hidden="true"></span>
        <h2>Report Generation in Progress</h2>
      </div>
      <p>We're analyzing the privacy practices, tracking technologies, and security headers for this domain. This typically takes 30-60 seconds.</p>
    </div>

    <div class="info-box">
      <h3>What We're Analyzing:</h3>
      <ul>
        <li>📊 Privacy score calculation (0-100)</li>
        <li>🔍 Third-party tracker detection</li>
        <li>🍪 Cookie analysis and classification</li>
        <li>🔒 Security header validation</li>
        <li>🌐 External connection mapping</li>
      </ul>
    </div>

    <p>This page will automatically refresh when the report is ready.</p>

    <div class="info-box">
      <h3>While You Wait:</h3>
      <ul>
        <li><a href="/">Browse recent privacy reports</a></li>
        <li><a href="/about">Learn how we calculate privacy scores</a></li>
        <li><a href="/methodology">Understanding our methodology</a></li>
      </ul>
    </div>

    <div class="footer">
      <p><strong>Gecko Advisor</strong> - Free, open-source privacy scanner</p>
      <p>No tracking, no signup required</p>
    </div>
  </div>

  <script>
    // JS-based auto-refresh - bots ignore this, humans get progressive updates
    (function() {
      var refreshCount = 0;
      var maxRefreshes = 12; // 12 refreshes * 5 seconds = 60 seconds max wait
      var refreshInterval = 5000; // 5 seconds

      function scheduleRefresh() {
        if (refreshCount < maxRefreshes) {
          setTimeout(function() {
            refreshCount++;
            console.log('Checking for updated report... (attempt ' + refreshCount + '/' + maxRefreshes + ')');
            location.reload();
          }, refreshInterval);
        } else {
          console.log('Max refresh attempts reached. Report may still be processing.');
        }
      }

      // Start refresh cycle
      scheduleRefresh();
    })();
  </script>
</body>
</html>`;
}
