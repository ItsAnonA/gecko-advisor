/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useState, useEffect, useId, memo } from 'react';

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
 */
const ProgressDial = memo(function ProgressDial({
  percent,
  'data-testid': dataTestId,
  size = 'md',
  showGlow = true,
}: ProgressDialProps) {
  const [mounted, setMounted] = useState(false);
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const target = Math.max(0, Math.min(100, percent));
    const step = (target - animatedPercent) / 10;

    if (Math.abs(target - animatedPercent) < 1) {
      setAnimatedPercent(target);
      return;
    }

    const timer = setTimeout(() => {
      setAnimatedPercent((prev) => prev + step);
    }, 30);

    return () => clearTimeout(timer);
  }, [percent, animatedPercent, mounted]);

  const sizes = {
    sm: { width: 80, fontSize: 14, strokeWidth: 6 },
    md: { width: 120, fontSize: 20, strokeWidth: 8 },
    lg: { width: 160, fontSize: 28, strokeWidth: 10 },
  };

  const { width, fontSize, strokeWidth } = sizes[size];
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.round(animatedPercent);
  const displayPct = Math.max(0, Math.min(100, percent));

  const targetOffset = c - (animatedPercent / 100) * c;
  const currentOffset = mounted ? targetOffset : c;

  const brandGreenGlow = 'rgba(16, 185, 129, 0.6)';
  const trackColor = '#1e293b';
  const textColor = '#1f2937';

  const gradientId = useId();
  const glowId = useId();

  return (
    <div className="relative inline-block">
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
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />

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
});

export default ProgressDial;
