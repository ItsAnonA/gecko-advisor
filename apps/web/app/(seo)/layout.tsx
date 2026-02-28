/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';
import Image from 'next/image';
import { navGroups, ctaLink, footerColumns } from '@/lib/navigation';

/**
 * SEO Layout - Layout for SSR pages with consistent branding
 *
 * Matches the main app Header styling while remaining SSR-friendly.
 * Uses CSS :focus-within for dropdown navigation (no JS required).
 * Used for /privacy-report/*, /reports, /r/* routes.
 */
export default function SEOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-light-bg">
      {/* Header - Matches main app styling */}
      <header className="backdrop-blur-sm bg-white/90 sticky top-0 z-40 border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center group"
              aria-label="Gecko Advisor Home"
            >
              <div className="relative">
                <Image
                  src="/images/GeckoAdvisor_Logo.png"
                  alt="Gecko Advisor by PrivacyGecko"
                  width={180}
                  height={58}
                  className="h-10 sm:h-12 w-auto object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
                  priority
                  unoptimized
                />
              </div>
            </Link>

            {/* Navigation Links - SSR-friendly dropdowns via focus-within */}
            <div className="hidden md:flex items-center gap-4">
              {navGroups.map((group) => (
                <div key={group.label} className="relative group" tabIndex={0}>
                  <span className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gecko-600 hover:text-advisor-600 transition-colors cursor-pointer">
                    {group.label}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[220px]">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-4 py-2.5 text-sm text-gecko-700 hover:text-advisor-600 hover:bg-gray-50 transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <Link
                href={ctaLink.href}
                className="bg-advisor-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-advisor-600 transition-colors"
              >
                {ctaLink.label}
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerColumns.map((column) => (
              <div key={column.label}>
                <h3 className="font-semibold mb-4">{column.label}</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {column.items.map((item) => (
                    <li key={item.href}>
                      {item.href.startsWith('http') ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
                      ) : (
                        <Link href={item.href}>{item.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Gecko Advisor</p>
            <p className="mt-2 text-xs text-gray-400">142K+ domains monitored &middot; 7.4M+ findings analyzed &middot; Daily scanning since 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
