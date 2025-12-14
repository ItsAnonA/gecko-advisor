/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

/**
 * SEO Layout - Minimal layout for SSR pages
 *
 * This layout has NO Providers, NO client JS bloat.
 * Used for /privacy-policy/*, /reports, /r/* routes.
 */
export default function SEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-light-bg">
      {/* Minimal Header - No auth state, no client interactivity */}
      <header className="border-b border-light-border bg-white">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gecko-800 hover:text-advisor-600">
            <span className="text-xl font-display font-bold">Gecko Advisor</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/reports"
              className="text-gecko-600 hover:text-advisor-600 font-medium"
            >
              Reports
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-advisor-600 text-white rounded-lg font-medium hover:bg-advisor-700 transition-colors"
            >
              Scan Website
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Minimal Footer */}
      <footer className="border-t border-light-border bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gecko-500 text-sm">
              &copy; {new Date().getFullYear()} Gecko Advisor. Free and open-source.
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/reports" className="text-gecko-500 hover:text-advisor-600">
                Privacy Reports
              </Link>
              <Link href="/" className="text-gecko-500 hover:text-advisor-600">
                Scan a Website
              </Link>
              <a
                href="https://github.com/privacygecko/gecko-advisor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gecko-500 hover:text-advisor-600"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
