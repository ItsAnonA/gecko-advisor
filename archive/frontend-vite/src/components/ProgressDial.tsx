/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

interface ProgressDialProps {
  percent: number;
  'data-testid'?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the animated glow effect */
  showGlow?: boolean;
}

/**
 * Animated progress dial with brand colors and glow effect
 *
 * Features:
 * - Animated ring draw on mount
 * - Smooth transitions when progress updates
 * - Brand green color with configurable glow
 * - Pulse animation during active scanning
 */
export default function ProgressDial({
  percent,
  'data-testid': dataTestId,
  size = 'md',
  showGlow = true
}: ProgressDialProps) {
  const [mounted, setMounted] = React.useState(false);
  const [animatedPercent, setAnimatedPercent] = React.useState(0);

  // Trigger mount animation
  React.useEffect(() => {
    // Small delay to ensure CSS transition works
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Animate percent changes smoothly
  React.useEffect(() => {
    if (!mounted) return;

    const target = Math.max(0, Math.min(100, percent));
    const step = (target - animatedPercent) / 10;

    if (Math.abs(target - animatedPercent) < 1) {
      setAnimatedPercent(target);
      return;
    }

    const timer = setTimeout(() => {
      setAnimatedPercent(prev => prev + step);
    }, 30);

    return () => clearTimeout(timer);
  }, [percent, animatedPercent, mounted]);

  // Size configurations
  const sizes = {
    sm: { width: 80, fontSize: 14, strokeWidth: 6 },
    md: { width: 120, fontSize: 20, strokeWidth: 8 },
    lg: { width: 160, fontSize: 28, strokeWidth: 10 }
  };

  const { width, fontSize, strokeWidth } = sizes[size];
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.round(animatedPercent);
  const displayPct = Math.max(0, Math.min(100, percent));

  // Calculate offset - start from full (hidden) and animate to target
  const targetOffset = c - (animatedPercent / 100) * c;
  const currentOffset = mounted ? targetOffset : c; // Start hidden, animate to target

  // Brand colors
  const brandGreenGlow = 'rgba(16, 185, 129, 0.6)';
  const trackColor = '#1e293b'; // slate-800
  const textColor = '#1f2937'; // gray-800

  // Generate unique IDs for SVG elements
  const gradientId = React.useId();
  const glowId = React.useId();

  return (
    <div className="relative inline-block">
      {/* Glow backdrop */}
      {showGlow && mounted && animatedPercent > 0 && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${brandGreenGlow} 0%, transparent 70%)`,
            transform: 'scale(1.1)',
            opacity: 0.5,
          }}
        />
      )}

      <svg
        width={width}
        height={width}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Progress ${displayPct}%`}
        data-testid={dataTestId}
        className="relative z-10"
        style={{ filter: showGlow ? `drop-shadow(0 0 12px ${brandGreenGlow})` : undefined }}
      >
        <defs>
          {/* Gradient for progress ring */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" /> {/* emerald-400 */}
            <stop offset="50%" stopColor="#10b981" /> {/* emerald-500 */}
            <stop offset="100%" stopColor="#059669" /> {/* emerald-600 */}
          </linearGradient>

          {/* Glow filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />

        {/* Progress ring with animation */}
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={currentOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          filter={showGlow ? `url(#${glowId})` : undefined}
          style={{
            transition: mounted ? 'stroke-dashoffset 0.5s ease-out' : 'stroke-dashoffset 0.8s ease-out',
          }}
        />

        {/* Center text with count-up animation */}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={700}
          fill={textColor}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}
        >
          {pct}%
        </text>
      </svg>
    </div>
  );
}
