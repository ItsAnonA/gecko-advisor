/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

/**
 * Homepage placeholder - redirects to main Vite SPA.
 * This Next.js app handles SEO-critical routes only.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-display font-bold text-gecko-800 mb-4">
          Gecko Advisor
        </h1>
        <p className="text-lg text-gecko-600 mb-8">
          Free website privacy scanner. Analyze any site for trackers, cookies, and security issues.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/reports"
            className="px-6 py-3 bg-advisor-600 text-white font-medium rounded-lg hover:bg-advisor-700 transition-colors"
          >
            Browse Reports
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-gecko-300 text-gecko-700 font-medium rounded-lg hover:bg-gecko-50 transition-colors"
          >
            Scan a Website
          </Link>
        </div>
      </div>
    </main>
  );
}
