/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import Link from 'next/link';
import { memo, useState, useEffect } from 'react';
import { getStats } from '@/lib/api';

/**
 * Footer Component - Minimal Navigation
 *
 * Simplified footer with horizontal navbar layout.
 * Transparent background with subtle top border.
 *
 * Features:
 * - Horizontal navigation links
 * - Essential pages only (About, FAQ, Roadmap, Security, Legal, Twitter)
 * - Transparent with backdrop blur
 * - Total scans count display
 * - Fully responsive with flex-wrap
 */
const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();
  const [totalScans, setTotalScans] = useState<number | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    getStats()
      .then((stats) => setTotalScans(stats.totalScans))
      .catch(() => setTotalScans(null));
  }, []);

  // Format number with commas for readability
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <footer className="backdrop-blur-md bg-white/80 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex flex-wrap items-center justify-center gap-6 text-base text-gecko-600">
          <Link
            href="/about"
            className="font-semibold hover:text-advisor-600 transition-colors"
          >
            Why We Built This
          </Link>
          <Link
            href="/faq"
            className="font-semibold hover:text-advisor-600 transition-colors"
          >
            FAQ
          </Link>
          <Link
            href="/roadmap"
            className="font-semibold hover:text-advisor-600 transition-colors"
          >
            Roadmap
          </Link>
          <Link
            href="/security"
            className="font-semibold hover:text-advisor-600 transition-colors"
          >
            Security
          </Link>
          <Link
            href="/legal"
            className="font-semibold hover:text-advisor-600 transition-colors"
          >
            Legal
          </Link>
          <a
            href="https://twitter.com/PrivacyGecko"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-advisor-600 transition-colors"
          >
            Twitter
          </a>
        </nav>

        <p className="text-center text-xs text-gecko-500 mt-4">
          © {currentYear} Gecko Advisor. Open source privacy scanner.
          {totalScans !== null && totalScans > 0 && (
            <span className="ml-2 text-advisor-600 font-medium">
              • {formatNumber(totalScans)} websites scanned
            </span>
          )}
        </p>
      </div>
    </footer>
  );
});

export default Footer;
