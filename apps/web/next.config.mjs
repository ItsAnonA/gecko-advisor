/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend API URL for rewrites (local dev only)
// In production, nginx handles /api/* routing - no rewrites needed
const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';
const isProduction = process.env.NODE_ENV === 'production';

// Umami Analytics - proxied through our domain to bypass ad blockers
const UMAMI_URL = 'https://cloud.umami.is';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',

  // Rewrite /api/* to backend (LOCAL DEV ONLY - nginx handles this in production)
  // Umami analytics proxy works in both dev and production
  async rewrites() {
    // Umami proxy rewrites - always enabled to bypass ad blockers
    const umamiRewrites = [
      {
        source: '/stats/script.js',
        destination: `${UMAMI_URL}/script.js`,
      },
      {
        source: '/stats/api/send',
        destination: `${UMAMI_URL}/api/send`,
      },
    ];

    // Skip API rewrites in production - nginx proxies /api/* to backend
    if (isProduction) {
      return umamiRewrites;
    }

    // Local dev: proxy /api/* to backend directly + Umami
    return [
      ...umamiRewrites,
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },

  // Transpile workspace packages
  transpilePackages: ['@gecko-advisor/shared'],

  // Webpack config to handle ESM imports with .js extensions
  webpack: (config) => {
    // Add alias for @gecko-advisor/shared to resolve to source files
    config.resolve.alias['@gecko-advisor/shared'] = path.resolve(
      __dirname,
      '../../packages/shared/src'
    );

    // Handle .js extensions resolving to .ts files in the shared package
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };

    return config;
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'geckoadvisor.com',
      },
      {
        protocol: 'https',
        hostname: '*.geckoadvisor.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://geckoadvisor.com',
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
