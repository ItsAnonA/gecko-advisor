/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout wrapper with professional gradient background
 * Provides consistent, clean background across all pages
 */
export function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Professional gradient background - clean and trustworthy */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-dark-bg via-dark-surface to-dark-elevated"
        aria-hidden="true"
      />

      {/* Main content */}
      <div className="relative z-0">
        {children}
      </div>
    </>
  );
}
