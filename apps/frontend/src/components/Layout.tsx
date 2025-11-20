/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { ReactNode } from 'react';
import { BackgroundVideo } from './BackgroundVideo';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout wrapper with background video
 * Provides consistent background across all pages
 */
export function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Background video - renders behind all content */}
      <BackgroundVideo
        src="/ga_bg_sm1.mp4"
        poster="/ga_bg_poster.jpg"
        opacity={0.35}
        enableOnMobile={true}
      />

      {/* Main content */}
      <div className="relative z-0">
        {children}
      </div>
    </>
  );
}
