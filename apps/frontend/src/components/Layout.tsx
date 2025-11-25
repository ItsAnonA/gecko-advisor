/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout wrapper with "Gecko in the Light" theme
 * Warm, natural, professional light background that builds trust
 */
export function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Warm natural background - trustworthy and approachable */}
      <div
        className="fixed inset-0 -z-10 bg-light-bg"
        aria-hidden="true"
      />

      {/* Subtle sage accent overlay for natural gecko-inspired feel */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-b from-light-sage/30 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Main content */}
      <div className="relative z-0">
        {children}
      </div>
    </>
  );
}
