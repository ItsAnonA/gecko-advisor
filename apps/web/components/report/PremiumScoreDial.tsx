/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';

export interface PremiumScoreDialProps {
  /** Privacy score value (0-100) */
  score: number;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom label override */
  label?: string;
  /** Disable animations */
  disableAnimation?: boolean;
  /** Show description text below */
  showDescription?: boolean;
}

/**
 * PremiumScoreDial - Distinctive privacy score visualization
 *
 * A bold, memorable score dial with:
 * - Animated gradient ring with glow effects
 * - Count-up score animation
 * - Semantic color coding (green/amber/red)
 * - Color-blind accessible patterns
 * - Distinctive typography
 * - Depth through shadows and layering
 */
const PremiumScoreDial = React.memo(function PremiumScoreDial({
  score,
  className = '',
  size = 'lg',
  label,
  disableAnimation = false,
  showDescription = true
}: PremiumScoreDialProps) {
  const [mounted, setMounted] = React.useState(false);
  const [displayScore, setDisplayScore] = React.useState(disableAnimation ? score : 0);
  const uniqueId = React.useId();

  // Trigger mount animation
  React.useEffect(() => {
    if (disableAnimation) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [disableAnimation]);

  // Animated score count-up
  React.useEffect(() => {
    if (!mounted || disableAnimation) {
      setDisplayScore(score);
      return;
    }

    const duration = 1200;
    const startTime = Date.now();
    const endValue = Math.max(0, Math.min(100, score));

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(endValue * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    // Delay start to sync with ring animation
    const delay = setTimeout(() => requestAnimationFrame(animate), 300);
    return () => clearTimeout(delay);
  }, [mounted, score, disableAnimation]);

  // Circle geometry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Size configurations - generous sizing for impact
  const sizeConfig = {
    sm: {
      width: 100,
      height: 100,
      strokeWidth: 6,
      fontSize: 'text-2xl',
      labelSize: 'text-xs',
      descSize: 'text-[10px]',
      glowBlur: 'blur-xl',
      ringOffset: 4
    },
    md: {
      width: 140,
      height: 140,
      strokeWidth: 8,
      fontSize: 'text-4xl',
      labelSize: 'text-sm',
      descSize: 'text-xs',
      glowBlur: 'blur-2xl',
      ringOffset: 5
    },
    lg: {
      width: 180,
      height: 180,
      strokeWidth: 10,
      fontSize: 'text-5xl',
      labelSize: 'text-base',
      descSize: 'text-sm',
      glowBlur: 'blur-2xl',
      ringOffset: 6
    },
    xl: {
      width: 220,
      height: 220,
      strokeWidth: 12,
      fontSize: 'text-6xl',
      labelSize: 'text-lg',
      descSize: 'text-base',
      glowBlur: 'blur-3xl',
      ringOffset: 7
    }
  };

  const config = sizeConfig[size];

  // Semantic score styling with gradients
  const getScoreStyle = (s: number) => {
    if (s >= 70) {
      return {
        level: 'safe',
        gradient: { start: '#10b981', mid: '#22c55e', end: '#4ade80' },
        glow: 'rgba(34, 197, 94, 0.5)',
        bgGlow: 'bg-emerald-400',
        labelBg: 'bg-emerald-500/20',
        labelBorder: 'border-emerald-500/40',
        labelText: 'text-emerald-600',
        label: label || 'Low Risk',
        description: 'Minimal tracking detected',
        patternType: 'none' as const
      };
    }
    if (s >= 40) {
      return {
        level: 'caution',
        gradient: { start: '#f59e0b', mid: '#fbbf24', end: '#fcd34d' },
        glow: 'rgba(251, 191, 36, 0.5)',
        bgGlow: 'bg-amber-400',
        labelBg: 'bg-amber-500/20',
        labelBorder: 'border-amber-500/40',
        labelText: 'text-amber-600',
        label: label || 'Moderate Risk',
        description: 'Some privacy concerns found',
        patternType: 'diagonal' as const
      };
    }
    return {
      level: 'danger',
      gradient: { start: '#dc2626', mid: '#ef4444', end: '#f87171' },
      glow: 'rgba(239, 68, 68, 0.5)',
      bgGlow: 'bg-red-400',
      labelBg: 'bg-red-500/20',
      labelBorder: 'border-red-500/40',
      labelText: 'text-red-600',
      label: label || 'High Risk',
      description: 'Significant privacy issues',
      patternType: 'dots' as const
    };
  };

  const style = getScoreStyle(normalizedScore);
  const gradientId = `grad-${uniqueId}`;
  const glowFilterId = `glow-${uniqueId}`;
  const patternId = `pattern-${uniqueId}`;
  const innerShadowId = `inner-shadow-${uniqueId}`;

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      data-testid="premium-score-dial"
    >
      {/* SVG Container with glow background */}
      <div className="relative">
        {/* Animated glow effect */}
        <div
          className={`absolute inset-0 ${style.bgGlow} ${config.glowBlur} rounded-full transition-opacity duration-1000 ${
            mounted ? 'opacity-30' : 'opacity-0'
          }`}
          style={{ transform: 'scale(0.8)' }}
          aria-hidden="true"
        />

        <svg
          width={config.width}
          height={config.height}
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Privacy score ${normalizedScore} out of 100. Risk level: ${style.label.toLowerCase()}.`}
          className="relative"
          style={{
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
          }}
        >
          <defs>
            {/* Main gradient - radial for depth */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={style.gradient.start} />
              <stop offset="50%" stopColor={style.gradient.mid} />
              <stop offset="100%" stopColor={style.gradient.end} />
            </linearGradient>

            {/* Glow filter for the progress ring */}
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feFlood floodColor={style.glow} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id={innerShadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset dx="0" dy="2" result="offset" />
              <feComposite in="SourceGraphic" in2="offset" operator="over" />
            </filter>

            {/* Accessibility patterns */}
            {style.patternType === 'diagonal' && (
              <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="none" />
                <path
                  d="M0,6 L6,0 M-1,1 L1,-1 M5,7 L7,5"
                  stroke={style.gradient.mid}
                  strokeWidth="0.8"
                  strokeOpacity="0.4"
                />
              </pattern>
            )}
            {style.patternType === 'dots' && (
              <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="none" />
                <circle cx="4" cy="4" r="1.5" fill={style.gradient.mid} fillOpacity="0.5" />
              </pattern>
            )}
          </defs>

          {/* Background track - dark with subtle gradient */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#18181b"
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* Secondary track for depth */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#27272a"
            strokeWidth={config.strokeWidth - 2}
            fill="none"
            strokeLinecap="round"
          />

          {/* Progress ring with gradient and glow */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? strokeDashoffset : circumference}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            filter={`url(#${glowFilterId})`}
            style={{
              transition: disableAnimation
                ? 'none'
                : 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            className="motion-reduce:transition-none"
          />

          {/* Pattern overlay for color-blind accessibility */}
          {style.patternType !== 'none' && (
            <circle
              cx="50"
              cy="50"
              r={radius - 2}
              stroke={`url(#${patternId})`}
              strokeWidth={config.strokeWidth - 3}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={mounted ? strokeDashoffset : circumference}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{
                transition: disableAnimation
                  ? 'none'
                  : 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s',
              }}
              className="motion-reduce:transition-none"
            />
          )}

          {/* Center fill with subtle gradient */}
          <circle
            cx="50"
            cy="50"
            r={radius - config.strokeWidth / 2 - 2}
            fill="url(#center-gradient)"
            opacity="0.1"
          />
          <defs>
            <radialGradient id="center-gradient">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
            </radialGradient>
          </defs>

          {/* Score number - bold, prominent */}
          <text
            x="50"
            y="56"
            textAnchor="middle"
            dominantBaseline="middle"
            className={`${config.fontSize} font-black tabular-nums`}
            fill="#fafafa"
            style={{
              fontFamily: '"DM Sans", "Space Grotesk", system-ui, sans-serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              letterSpacing: '-0.02em'
            }}
          >
            {displayScore}
          </text>
        </svg>
      </div>

      {/* Label badge - distinctive pill shape */}
      <div
        className={`
          mt-4 px-4 py-1.5 rounded-full
          ${style.labelBg} ${style.labelText}
          ${config.labelSize} font-bold tracking-wide
          border ${style.labelBorder}
          shadow-sm
          transition-all duration-500
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
        aria-hidden="true"
      >
        {style.label}
      </div>

      {/* Description text */}
      {showDescription && (
        <p
          className={`
            mt-2 ${config.descSize} text-zinc-500 text-center max-w-[200px]
            transition-all duration-700 delay-200
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}
          `}
          aria-hidden="true"
        >
          {style.description}
        </p>
      )}

      {/* Methodology qualifier - anchors score to observable behavior */}
      <p
        className={`
          mt-1 text-[10px] text-zinc-400 text-center tracking-wide uppercase
          transition-all duration-700 delay-300
          ${mounted ? 'opacity-100' : 'opacity-0'}
        `}
        aria-hidden="true"
      >
        Based on network behavior
      </p>
    </div>
  );
});

export default PremiumScoreDial;
