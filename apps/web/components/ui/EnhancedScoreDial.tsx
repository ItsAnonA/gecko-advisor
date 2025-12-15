/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React, { useId, memo, useState, useEffect } from 'react';

export interface EnhancedScoreDialProps {
  /** The privacy score value between 0-100 */
  score: number;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'md' | 'lg' | 'xl';
  /** Optional label to display below score */
  label?: string;
  /** Disable animation (for testing or accessibility) */
  disableAnimation?: boolean;
}

/**
 * EnhancedScoreDial - Premium score visualization component
 *
 * Premium Features:
 * - Gradient ring with semantic color coding
 * - Animated ring drawing on mount (1.5s ease-out)
 * - Glow effects with drop-shadow and blur
 * - Color-blind accessible patterns
 * - Responsive sizing (md: 140px, lg: 180px, xl: 220px)
 * - Tabular numbers for score display
 * - WCAG AA compliant contrast
 * - Respects prefers-reduced-motion
 */
const EnhancedScoreDial = memo(function EnhancedScoreDial({
  score,
  className = '',
  size = 'md',
  label,
  disableAnimation = false
}: EnhancedScoreDialProps) {
  const id = useId();
  const [mounted, setMounted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Count-up animation for score number
  useEffect(() => {
    if (!mounted || disableAnimation) {
      setDisplayScore(score);
      return;
    }

    // Animate from 0 to final score
    const duration = 800; // ms
    const startTime = Date.now();
    const startValue = 0;
    const endValue = Math.max(0, Math.min(100, score));

    const animateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);

      setDisplayScore(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    };

    // Start count-up after ring animation begins (500ms delay)
    const delayTimer = setTimeout(() => {
      requestAnimationFrame(animateScore);
    }, 500);

    return () => clearTimeout(delayTimer);
  }, [mounted, score, disableAnimation]);

  // Circle math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Size configurations
  const sizeConfig = {
    md: {
      width: 140,
      height: 140,
      scoreSize: 'text-4xl', // 36px
      labelSize: 'text-sm',
      strokeWidth: 8,
      glowSize: 'blur-2xl'
    },
    lg: {
      width: 180,
      height: 180,
      scoreSize: 'text-5xl', // 48px
      labelSize: 'text-base',
      strokeWidth: 10,
      glowSize: 'blur-3xl'
    },
    xl: {
      width: 220,
      height: 220,
      scoreSize: 'text-6xl', // 60px
      labelSize: 'text-lg',
      strokeWidth: 12,
      glowSize: 'blur-3xl'
    }
  };

  const config = sizeConfig[size];

  // Semantic color and gradient determination
  const getScoreStyle = (score: number) => {
    if (score >= 70) {
      return {
        level: 'safe',
        gradientId: 'gradient-safe',
        gradientColors: { start: '#22c55e', stop: '#16a34a' }, // score-safe to green-600
        glowColor: 'rgba(34, 197, 94, 0.4)', // score-safe with opacity
        bgGlow: 'bg-score-safe/10',
        labelBg: 'bg-score-safe/20',
        labelText: 'text-score-safe',
        label: label || 'SAFE',
        patternId: 'pattern-safe',
        patternType: 'none'
      };
    }
    if (score >= 40) {
      return {
        level: 'caution',
        gradientId: 'gradient-caution',
        gradientColors: { start: '#fbbf24', stop: '#f59e0b' }, // score-caution to amber-500
        glowColor: 'rgba(251, 191, 36, 0.4)', // score-caution with opacity
        bgGlow: 'bg-score-caution/10',
        labelBg: 'bg-score-caution/20',
        labelText: 'text-score-caution',
        label: label || 'CAUTION',
        patternId: 'pattern-caution',
        patternType: 'diagonal'
      };
    }
    return {
      level: 'danger',
      gradientId: 'gradient-danger',
      gradientColors: { start: '#f87171', stop: '#ef4444' }, // score-danger to red-500
      glowColor: 'rgba(248, 113, 113, 0.4)', // score-danger with opacity
      bgGlow: 'bg-score-danger/10',
      labelBg: 'bg-score-danger/20',
      labelText: 'text-score-danger',
      label: label || 'HIGH RISK',
      patternId: 'pattern-danger',
      patternType: 'dots'
    };
  };

  const style = getScoreStyle(normalizedScore);
  const uniqueGradientId = `${style.gradientId}-${id}`;
  const uniquePatternId = `${style.patternId}-${id}`;

  return (
    <div className={`inline-flex flex-col items-center ${className}`} data-testid="score-dial">
      {/* Outer glow container */}
      <div className="relative">
        {/* Background glow effect */}
        <div
          className={`absolute inset-0 ${style.bgGlow} opacity-30 ${config.glowSize} rounded-full`}
          style={{ transform: 'scale(0.95)' }}
          aria-hidden="true"
        />

        <svg
          width={config.width}
          height={config.height}
          viewBox="0 0 100 100"
          role="img"
          aria-labelledby={`score-title-${id} score-desc-${id}`}
          className="relative drop-shadow-lg"
        >
          <defs>
            {/* Gradient definitions */}
            <linearGradient id={uniqueGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={style.gradientColors.start} />
              <stop offset="100%" stopColor={style.gradientColors.stop} />
            </linearGradient>

            {/* Glow filter */}
            <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Accessibility patterns */}
            {style.patternType === 'diagonal' && (
              <pattern id={uniquePatternId} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="none" />
                <path
                  d="M0,6 L6,0 M-1,1 L1,-1 M5,7 L7,5"
                  stroke={style.gradientColors.stop}
                  strokeWidth="1"
                  strokeOpacity="0.3"
                />
              </pattern>
            )}
            {style.patternType === 'dots' && (
              <pattern id={uniquePatternId} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="none" />
                <circle cx="4" cy="4" r="1.5" fill={style.gradientColors.stop} fillOpacity="0.4" />
              </pattern>
            )}
          </defs>

          {/* Background track circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#1f2937"
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
          />

          {/* Progress circle with gradient */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={`url(#${uniqueGradientId})`}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={mounted && !disableAnimation ? strokeDashoffset : circumference}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            filter={`url(#glow-${id})`}
            style={{
              transition: disableAnimation ? 'none' : 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="motion-reduce:transition-none"
          />

          {/* Pattern overlay for color-blind accessibility */}
          {style.patternType !== 'none' && (
            <circle
              cx="50"
              cy="50"
              r={radius - 2}
              stroke={`url(#${uniquePatternId})`}
              strokeWidth={config.strokeWidth - 2}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={mounted && !disableAnimation ? strokeDashoffset : circumference}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{
                transition: disableAnimation ? 'none' : 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
              }}
              className="motion-reduce:transition-none"
            />
          )}

          {/* Score text with tabular numbers and count-up animation */}
          <text
            x="50"
            y="58"
            textAnchor="middle"
            className={`${config.scoreSize} font-extrabold tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
              mounted && !disableAnimation ? 'animate-score-number' : ''
            }`}
            fill="#f9fafb"
            id={`score-title-${id}`}
            style={{
              fontFamily: '"Space Grotesk", "DM Sans", system-ui, sans-serif',
              opacity: disableAnimation ? 1 : undefined,
            }}
          >
            {displayScore}
          </text>

          {/* Hidden description for screen readers */}
          <text
            id={`score-desc-${id}`}
            x="-1000"
            y="-1000"
            fontSize="1"
          >
            Privacy score {normalizedScore} out of 100. Risk level: {style.label.toLowerCase()}.
          </text>
        </svg>
      </div>

      {/* Label badge */}
      <div
        className={`mt-3 px-3 py-1.5 rounded-full ${style.labelBg} ${style.labelText} ${config.labelSize} font-bold tracking-wide border border-${style.level === 'safe' ? 'score-safe' : style.level === 'caution' ? 'score-caution' : 'score-danger'}/30`}
        aria-hidden="true"
      >
        {style.label}
      </div>
    </div>
  );
});

export default EnhancedScoreDial;
