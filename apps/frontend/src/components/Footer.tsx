/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Footer Component - Minimal Navigation
 *
 * Simplified footer with horizontal navbar layout.
 * Transparent background with subtle top border.
 *
 * Features:
 * - Horizontal navigation links
 * - Essential pages only (About, Docs, FAQ, GitHub, Privacy, Terms)
 * - Transparent with backdrop blur
 * - Minimal copyright text
 * - Fully responsive with flex-wrap
 *
 * @example
 * <Footer />
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="backdrop-blur-md bg-white/80 border-t border-light-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex flex-wrap items-center justify-center gap-6 text-base text-gecko-600">
          <Link to="/about" className="font-semibold hover:text-advisor-600 transition-colors">
            Why We Built This
          </Link>
          <Link to="/faq" className="font-semibold hover:text-advisor-600 transition-colors">
            FAQ
          </Link>
          <Link to="/roadmap" className="font-semibold hover:text-advisor-600 transition-colors">
            Roadmap
          </Link>
          <Link to="/security" className="font-semibold hover:text-advisor-600 transition-colors">
            Security
          </Link>
          <Link to="/legal" className="font-semibold hover:text-advisor-600 transition-colors">
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
        </p>
      </div>
    </footer>
  );
}
