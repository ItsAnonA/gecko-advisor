/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import Link from 'next/link';
import { memo, useState, useEffect } from 'react';
import { getStats } from '@/lib/api';
import { footerColumns } from '@/lib/navigation';

/**
 * Footer Component - Multi-Column Navigation with Authority Stats
 *
 * Full-width footer with organized navigation columns and live stats.
 * Transparent background with backdrop blur.
 *
 * Features:
 * - Four-column navigation grid (Products, Solutions, Resources, Company)
 * - External links open in new tab
 * - Live domain count and scan count from API
 * - Fully responsive with grid layout
 */
const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();
  const [stats, setStats] = useState<{ totalScans: number; domainCount?: number } | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <footer className="backdrop-blur-md bg-white/80 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {footerColumns.map((column) => (
            <div key={column.label}>
              <h3 className="font-semibold text-gecko-900 mb-3 text-sm">{column.label}</h3>
              <ul className="space-y-2">
                {column.items.map((item) => (
                  <li key={item.href}>
                    {item.href.startsWith('http') ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gecko-600 hover:text-advisor-600 transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm text-gecko-600 hover:text-advisor-600 transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-6">
          <p className="text-center text-xs text-gecko-500">
            &copy; {currentYear} Gecko Advisor. Domain intelligence platform.
          </p>
          {stats && (
            <p className="text-center text-xs text-gecko-400 mt-2">
              {stats.domainCount ? `${formatNumber(stats.domainCount)} domains monitored \u00b7 ` : ''}
              {stats.totalScans > 0 ? `${formatNumber(stats.totalScans)} scans completed \u00b7 ` : ''}
              Daily scanning since 2025
            </p>
          )}
        </div>
      </div>
    </footer>
  );
});

export default Footer;
