// SPDX-License-Identifier: MIT
import { defineConfig, devices } from '@playwright/test';

/**
 * Manual test configuration for running tests against existing services
 * No web server management - expects services already running
 */
export default defineConfig({
  testDir: './',

  /* Retry on failures */
  retries: 0,

  /* Single worker for manual testing */
  workers: 1,

  /* Global timeout for each test */
  timeout: 120_000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10_000,
  },

  /* Reporter to use */
  reporter: [['list'], ['html', { open: 'never' }]],

  /* Shared settings for all projects */
  use: {
    /* Base URL - frontend running on port 5173 */
    baseURL: 'http://localhost:5173',

    /* Collect trace on failure */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'on',

    /* Browser action defaults */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Output directories */
  outputDir: 'test-results/',
});
