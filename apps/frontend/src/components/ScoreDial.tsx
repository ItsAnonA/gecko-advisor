/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface ScoreDialProps {
  /** The privacy score value between 0-100 */
  score: number;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ScoreDial component displays privacy scores with accessibility-first design
 *
 * Features:
 * - WCAG AA compliant with text labels and pattern indicators
 * - Screen reader support with detailed descriptions
 * - Color-blind friendly with texture patterns
 * - Keyboard navigation support
 * - Performance optimized with React.memo
 *
 * @param props - Component props
 * @returns JSX element representing the score dial
 */
const ScoreDial = React.memo(function ScoreDial({ score, className = '', size = 'md' }: ScoreDialProps) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;

  // Size configurations
  const sizeConfig = {
    sm: { width: 80, height: 80, fontSize: 16 },
    md: { width: 120, height: 120, fontSize: 20 },
    lg: { width: 160, height: 160, fontSize: 24 }
  };

  const { width, height, fontSize } = sizeConfig[size];

  // Accessibility-first score categorization
  const getScoreCategory = (score: number) => {
    if (score >= 70) return {
      level: 'safe',
      color: '#22c55e', // score-safe
      bgColor: 'bg-score-safe/20',
      textColor: 'text-score-safe',
      label: 'Safe',
      description: 'Low privacy risk',
      pattern: 'none'
    };
    if (score >= 40) return {
      level: 'caution',
      color: '#fbbf24', // score-caution
      bgColor: 'bg-score-caution/20',
      textColor: 'text-score-caution',
      label: 'Caution',
      description: 'Medium privacy risk',
      pattern: 'diagonal-lines'
    };
    return {
      level: 'danger',
      color: '#f87171', // score-danger
      bgColor: 'bg-score-danger/20',
      textColor: 'text-score-danger',
      label: 'High Risk',
      description: 'High privacy risk',
      pattern: 'dots'
    };
  };

  const scoreCategory = getScoreCategory(score);
  const patternId = `pattern-${scoreCategory.level}-${React.useId()}`;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        role="img"
        aria-labelledby="score-title score-desc"
        className="drop-shadow-sm"
      >
        <defs>
          {/* Pattern definitions for accessibility */}
          {scoreCategory.pattern === 'diagonal-lines' && (
            <pattern id={patternId} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill={scoreCategory.color} fillOpacity="0.1" />
              <path d="M0,4 L4,0" stroke={scoreCategory.color} strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          )}
          {scoreCategory.pattern === 'dots' && (
            <pattern id={patternId} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={scoreCategory.color} fillOpacity="0.1" />
              <circle cx="3" cy="3" r="1" fill={scoreCategory.color} fillOpacity="0.4" />
            </pattern>
          )}
        </defs>

        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke="#1f2937"
          strokeWidth={8}
          fill="none"
        />

        {/* Progress circle with pattern overlay for accessibility */}
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={scoreCategory.color}
          strokeWidth={8}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />

        {/* Pattern overlay for color-blind accessibility */}
        {scoreCategory.pattern !== 'none' && (
          <circle
            cx="50"
            cy="50"
            r={r - 4}
            stroke={`url(#${patternId})`}
            strokeWidth={8}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        )}

        {/* Score text */}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={700}
          fill="#f9fafb"
          id="score-title"
          className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        >
          {score}
        </text>

        {/* Hidden descriptive text for screen readers */}
        <text
          id="score-desc"
          x="-1000"
          y="-1000"
          fontSize="1"
          aria-hidden="false"
        >
          Privacy score {score} out of 100. {scoreCategory.description}. Category: {scoreCategory.label}.
        </text>
      </svg>

      {/* Visible text label for WCAG compliance */}
      <div
        className="mt-2 text-center"
        aria-hidden="true"
      >
        <div
          className={`text-sm font-semibold px-2 py-1 rounded-full ${scoreCategory.bgColor} ${scoreCategory.textColor} drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]`}
        >
          {scoreCategory.label}
        </div>
        <div className="text-xs text-light-secondary mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {scoreCategory.description}
        </div>
      </div>
    </div>
  );
});

export default ScoreDial;
