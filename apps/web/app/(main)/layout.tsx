/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Header, Footer } from '@/components/layout';

/**
 * Main Layout - Used for interactive pages (Home, Scan)
 *
 * Includes full Header and Footer components.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
