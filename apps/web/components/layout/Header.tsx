/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { memo, useState, useCallback } from 'react';
import { navGroups, ctaLink } from '@/lib/navigation';

/**
 * Header Component - Responsive Navigation with Dropdown Menus
 *
 * Full-featured header with logo, grouped dropdown navigation, and mobile accordion.
 * Transparent background with subtle border.
 *
 * Features:
 * - Gecko Advisor logo (left)
 * - Desktop dropdown navigation groups (hover to open)
 * - Mobile accordion menu with expandable groups
 * - Active path highlighting
 * - CTA button for API Access
 */
const Header = memo(function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
    setOpenGroup(null);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setOpenGroup(null);
  }, []);

  return (
    <header className="backdrop-blur-sm bg-white/90 sticky top-0 z-40 border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Clean and professional */}
          <Link
            href="/"
            className="flex items-center group"
            aria-label="Gecko Advisor Home"
            onClick={closeMobileMenu}
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

          {/* Desktop Navigation - Dropdown Groups */}
          <div className="hidden md:flex items-center gap-1">
            {navGroups.map((group) => (
              <div key={group.label} className="relative group">
                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gecko-600 hover:text-advisor-600 transition-colors">
                  {group.label}
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[220px]">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2.5 text-sm transition-colors ${
                          pathname === item.href
                            ? 'text-advisor-600 bg-advisor-50'
                            : 'text-gecko-700 hover:text-advisor-600 hover:bg-gray-50'
                        }`}
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
              className="bg-advisor-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-advisor-600 transition-colors"
            >
              {ctaLink.label}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gecko-600 hover:text-advisor-600 hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu - Accordion Groups */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 py-4 space-y-1 animate-fade-in"
          >
            {navGroups.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                  className="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-gecko-700"
                >
                  {group.label}
                  <svg className={`w-4 h-4 transition-transform ${openGroup === group.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openGroup === group.label && (
                  <div className="pl-4 pb-2 space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className={`block px-4 py-2 text-sm rounded-lg ${
                          pathname === item.href
                            ? 'text-advisor-600 bg-advisor-50'
                            : 'text-gecko-600 hover:bg-gray-50'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href={ctaLink.href}
              onClick={closeMobileMenu}
              className="block mx-4 mt-2 px-4 py-3 text-center bg-advisor-500 text-white rounded-lg font-medium hover:bg-advisor-600 transition-colors"
            >
              {ctaLink.label}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
});

export default Header;

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
