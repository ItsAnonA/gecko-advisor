/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * BackToHome Component
 *
 * A modern pill-shaped button for navigating back to the homepage.
 * Should be placed at the top of content pages.
 *
 * @example
 * <BackToHome />
 */
export default function BackToHome() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gecko-600 hover:text-advisor-600 bg-gray-50 hover:bg-advisor-50 border border-gray-200 hover:border-advisor-300 rounded-full transition-all duration-200 group mb-6"
      aria-label="Back to Home"
    >
      <svg
        className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>Home</span>
    </Link>
  );
}
