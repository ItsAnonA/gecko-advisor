/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Backend API URL for rewrites (local dev or Docker)
const API_URL = process.env.API_INTERNAL_URL || 'http://localhost:5001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',

  // Rewrite /api/* to backend (for local dev without nginx)
  async rewrites() {
    return [
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
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'https://geckoadvisor.com',
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable React strict mode
  reactStrictMode: true,
};

export default nextConfig;
