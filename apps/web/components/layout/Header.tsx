/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { memo, useState, useCallback } from 'react';

/**
 * Header Component - Responsive Navigation
 *
 * Full-featured header with logo, navigation links, and mobile menu.
 * Transparent background with subtle border.
 *
 * Features:
 * - Gecko Advisor logo (left)
 * - Desktop navigation links
 * - Mobile hamburger menu
 * - Active path highlighting
 * - GitHub repository link
 */
const Header = memo(function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const navLinks = [
    { href: '/privacy-scanner', label: 'Scanner' },
    { href: '/reports', label: 'Reports' },
    { href: '/changes', label: 'Changes' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'About' },
  ];

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

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-advisor-600'
                    : 'text-gecko-600 hover:text-advisor-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/privacygecko/gecko-advisor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-zinc-700 hover:text-advisor-600 hover:border-advisor-400 hover:bg-gray-50 transition-all shadow-sm"
              aria-label="View on GitHub"
            >
              <GitHubIcon className="w-5 h-5" />
              <span className="font-medium">GitHub</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gecko-600 hover:text-advisor-600 hover:bg-gray-100 transition-colors"
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 py-4 space-y-2 animate-fade-in"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-advisor-50 text-advisor-600'
                    : 'text-gecko-600 hover:bg-gray-50 hover:text-advisor-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/privacygecko/gecko-advisor"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobileMenu}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-base font-medium text-gecko-600 hover:bg-gray-50 hover:text-advisor-600 transition-colors"
            >
              <GitHubIcon className="w-5 h-5" />
              <span>GitHub</span>
            </a>
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
