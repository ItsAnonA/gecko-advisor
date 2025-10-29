/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { BRAND } from '../config/branding';

/**
 * Header Component - PrivacyGecko Branding
 * Top navigation bar with PrivacyGecko branding and navigation
 *
 * Features:
 * - PrivacyGecko logo and Gecko Advisor branding
 * - Navigation links (desktop and mobile)
 * - Mobile hamburger menu with slide-out drawer
 * - Fully responsive with mobile drawer navigation
 * - Accessibility compliant (focus trap, ARIA labels, keyboard navigation)
 * - 100% free - no authentication required
 *
 * @example
 * <Header />
 */
export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle mobile menu: Escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent body scroll

      // Focus trap: focus first focusable element in drawer
      if (mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll(
          'button, a, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleMobileNavClick = () => {
    setMobileMenuOpen(false);
  };

  /**
   * Handle "New Scan" button click
   * - If on home page, scroll to scan input
   * - If on different page, navigate to home first, then scroll
   */
  const handleNewScan = () => {
    setMobileMenuOpen(false);

    if (location.pathname === '/') {
      // Already on home page, just scroll to input
      const scanInput = document.getElementById('scan-input');
      if (scanInput) {
        scanInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus the input for immediate user interaction
        setTimeout(() => scanInput.focus(), 300);
      }
    } else {
      // Navigate to home page first, then scroll
      navigate('/');
      // Wait for navigation to complete, then scroll
      setTimeout(() => {
        const scanInput = document.getElementById('scan-input');
        if (scanInput) {
          scanInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => scanInput.focus(), 300);
        }
      }, 100);
    }
  };

  /**
   * Check if a route is active
   */
  const isActiveRoute = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT SECTION: Logo Only */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center group hover:opacity-80 transition-opacity"
              aria-label="Gecko Advisor Home"
            >
              {/* Gecko Logo */}
              <img
                src={BRAND.logo.src}
                alt={BRAND.logo.alt}
                className="h-16 w-auto object-contain"
              />
            </Link>
          </div>

          {/* CENTER SECTION: Main Navigation */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-6 text-sm">
              <Link
                to="/"
                className={clsx(
                  'relative py-2 font-medium transition-colors',
                  isActiveRoute('/')
                    ? 'text-advisor-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-advisor-600'
                    : 'text-gray-600 hover:text-advisor-600'
                )}
              >
                Home
              </Link>
              <Link
                to="/reports"
                className={clsx(
                  'relative py-2 font-medium transition-colors',
                  isActiveRoute('/reports')
                    ? 'text-advisor-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-advisor-600'
                    : 'text-gray-600 hover:text-advisor-600'
                )}
              >
                Recent Scans
              </Link>
              <Link
                to="/docs"
                className={clsx(
                  'relative py-2 font-medium transition-colors',
                  isActiveRoute('/docs')
                    ? 'text-advisor-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-advisor-600'
                    : 'text-gray-600 hover:text-advisor-600'
                )}
              >
                Docs
              </Link>
              <Link
                to="/about"
                className={clsx(
                  'relative py-2 font-medium transition-colors',
                  isActiveRoute('/about')
                    ? 'text-advisor-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-advisor-600'
                    : 'text-gray-600 hover:text-advisor-600'
                )}
              >
                About
              </Link>
            </div>
          </div>

          {/* RIGHT SECTION: GitHub, New Scan, Wallet, Auth */}
          <div className="flex-shrink-0 flex items-center gap-3">
            {/* GitHub Link - Desktop only */}
            <a
              href="https://github.com/privacygecko/gecko-advisor"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              aria-label="View on GitHub"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span className="hidden lg:inline">GitHub</span>
            </a>

            {/* New Scan Button - Desktop only */}
            <button
              onClick={handleNewScan}
              className="hidden md:flex px-4 py-2 bg-advisor-600 hover:bg-advisor-700 active:bg-advisor-800 text-white rounded-lg font-medium items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Start a new privacy scan"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              New Scan
            </button>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gecko-50 transition-colors"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden',
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <div
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={clsx(
          'fixed top-0 right-0 h-full w-4/5 max-w-[320px] bg-white z-50 shadow-2xl transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {/* Gecko Logo */}
          <img
            src={BRAND.logo.src}
            alt={BRAND.logo.alt}
            className="h-10 w-auto object-contain"
          />

          {/* Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex flex-col h-full overflow-y-auto pb-20">
          {/* New Scan Button - Mobile (Prominent) */}
          <div className="p-4">
            <button
              onClick={handleNewScan}
              className="w-full px-4 py-3 bg-advisor-600 hover:bg-advisor-700 active:bg-advisor-800 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm"
              aria-label="Start a new privacy scan"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              New Scan
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col py-2">
            <Link
              to="/"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              Home
            </Link>
            <Link
              to="/reports"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/reports')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              Recent Scans
            </Link>
            <Link
              to="/docs"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/docs')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              Docs
            </Link>
            <Link
              to="/about"
              onClick={handleMobileNavClick}
              className={clsx(
                'py-3 px-4 text-base font-medium transition-colors',
                isActiveRoute('/about')
                  ? 'text-gecko-600 bg-gecko-50 border-l-4 border-gecko-600'
                  : 'text-gray-700 hover:bg-gecko-50 hover:text-gecko-600'
              )}
            >
              About
            </Link>
            <a
              href="https://github.com/privacygecko/gecko-advisor"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 text-base font-medium text-gray-700 hover:bg-gecko-50 hover:text-gecko-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>GitHub</span>
              <svg className="w-3 h-3 ml-auto opacity-50" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10.5 1.5h-9v9h4.5v1.5h-6V0h12v6h-1.5z" />
                <path d="M7.5 0v1.5h2.293L4.5 6.793l1.061 1.061 5.293-5.293V5.25H12V0z" />
              </svg>
            </a>
          </nav>

        </div>
      </div>
    </header>
  );
}
