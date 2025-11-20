/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useEffect, useRef, useState } from 'react';

interface BackgroundVideoProps {
  src: string;
  poster?: string;
  opacity?: number;
  className?: string;
  enableOnMobile?: boolean;
}

/**
 * BackgroundVideo component for full-page video backgrounds
 * Features:
 * - Respects prefers-reduced-motion
 * - Falls back to gradient on mobile if disabled
 * - Smooth fade-in when loaded
 * - Dark overlay gradient for readability
 *
 * @param src - Video source URL (MP4)
 * @param poster - Optional poster image for instant display
 * @param opacity - Video opacity (0-1), default 0.15
 * @param enableOnMobile - Show video on mobile, default true
 */
export function BackgroundVideo({
  src,
  poster,
  opacity = 0.15,
  className = '',
  enableOnMobile = true,
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);

  useEffect(() => {
    // Check if we should show video based on viewport and motion preferences
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shouldShow = (enableOnMobile || !isMobile) && !prefersReducedMotion;
    setShouldShowVideo(shouldShow);

    if (shouldShow && videoRef.current) {
      // Attempt to play video
      videoRef.current.play().catch((error) => {
        console.warn('Video autoplay failed:', error);
      });
    }
  }, [enableOnMobile]);

  const handleLoadedData = () => {
    setIsLoaded(true);
  };

  if (!shouldShowVideo) {
    // Fallback: Show static gradient background
    return (
      <div
        className={`fixed inset-0 -z-10 bg-gradient-to-br from-dark-bg via-dark-surface to-dark-elevated ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className}`} aria-hidden="true">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster={poster}
        onLoadedData={handleLoadedData}
        className={`w-full h-full object-cover transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ opacity: isLoaded ? opacity : 0 }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Dark overlay gradient for text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-dark-bg/20 via-dark-bg/40 to-dark-bg/70"
      />

      {/* Loading state: Show dark background while video loads */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-dark-bg" />
      )}
    </div>
  );
}
