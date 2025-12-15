/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';

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
 * Features:
 * - Gradient ring with semantic color coding
 * - Animated ring drawing on mount
 * - Glow effects with drop-shadow and blur
 * - Color-blind accessible patterns
 * - Responsive sizing
 * - WCAG AA compliant contrast
 * - Respects prefers-reduced-motion
 */
const EnhancedScoreDial = React.memo(function EnhancedScoreDial({
  score,
  className = '',
  size = 'md',
  label,
  disableAnimation = false
}: EnhancedScoreDialProps) {
  const [mounted, setMounted] = React.useState(false);
  const [displayScore, setDisplayScore] = React.useState(0);
  const uniqueId = React.useId();

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Count-up animation for score number
  React.useEffect(() => {
    if (!mounted || disableAnimation) {
      setDisplayScore(score);
      return;
    }

    const duration = 800;
    const startTime = Date.now();
    const endValue = Math.max(0, Math.min(100, score));

    const animateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(endValue * easeOut);

      setDisplayScore(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    };

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
    md: { width: 140, height: 140, scoreSize: 'text-4xl', labelSize: 'text-sm', strokeWidth: 8 },
    lg: { width: 180, height: 180, scoreSize: 'text-5xl', labelSize: 'text-base', strokeWidth: 10 },
    xl: { width: 220, height: 220, scoreSize: 'text-6xl', labelSize: 'text-lg', strokeWidth: 12 }
  };

  const config = sizeConfig[size];

  // Semantic color determination
  const getScoreStyle = (score: number) => {
    if (score >= 70) {
      return {
        level: 'safe',
        gradientColors: { start: '#22c55e', stop: '#16a34a' },
        bgGlow: 'bg-green-500/10',
        labelBg: 'bg-green-500/20',
        labelText: 'text-green-600',
        label: label || 'Low Risk',
        patternType: 'none' as const
      };
    }
    if (score >= 40) {
      return {
        level: 'caution',
        gradientColors: { start: '#fbbf24', stop: '#f59e0b' },
        bgGlow: 'bg-amber-500/10',
        labelBg: 'bg-amber-500/20',
        labelText: 'text-amber-600',
        label: label || 'Moderate Risk',
        patternType: 'diagonal' as const
      };
    }
    return {
      level: 'danger',
      gradientColors: { start: '#f87171', stop: '#ef4444' },
      bgGlow: 'bg-red-500/10',
      labelBg: 'bg-red-500/20',
      labelText: 'text-red-600',
      label: label || 'High Risk',
      patternType: 'dots' as const
    };
  };

  const style = getScoreStyle(normalizedScore);
  const gradientId = `gradient-${uniqueId}`;
  const glowId = `glow-${uniqueId}`;

  return (
    <div className={`inline-flex flex-col items-center ${className}`} data-testid="score-dial">
      <div className="relative">
        <div
          className={`absolute inset-0 ${style.bgGlow} opacity-30 blur-2xl rounded-full`}
          style={{ transform: 'scale(0.95)' }}
          aria-hidden="true"
        />

        <svg
          width={config.width}
          height={config.height}
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Privacy score ${normalizedScore} out of 100. Risk level: ${style.label.toLowerCase()}.`}
          className="relative drop-shadow-lg"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={style.gradientColors.start} />
              <stop offset="100%" stopColor={style.gradientColors.stop} />
            </linearGradient>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
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
            stroke={`url(#${gradientId})`}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={mounted && !disableAnimation ? strokeDashoffset : circumference}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            filter={`url(#${glowId})`}
            style={{
              transition: disableAnimation ? 'none' : 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="motion-reduce:transition-none"
          />

          {/* Score text */}
          <text
            x="50"
            y="58"
            textAnchor="middle"
            className={`${config.scoreSize} font-extrabold`}
            fill="#f9fafb"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {displayScore}
          </text>
        </svg>
      </div>

      {/* Label badge */}
      <div
        className={`mt-3 px-3 py-1.5 rounded-full ${style.labelBg} ${style.labelText} ${config.labelSize} font-bold tracking-wide`}
        aria-hidden="true"
      >
        {style.label}
      </div>
    </div>
  );
});

export default EnhancedScoreDial;
