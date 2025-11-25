/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface EnhancedSeverityBadgeProps {
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
  /** Count of items */
  count: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EnhancedSeverityBadge - Premium severity indicator badge
 *
 * Premium Features:
 * - Larger size for better visibility (px-3 py-1.5 vs px-2 py-0.5)
 * - Border for better definition and depth
 * - Bolder emoji icons (text-base)
 * - Increased font weight for counts (font-bold)
 * - Better color contrast (WCAG AA compliant)
 * - Smooth hover states
 *
 * Design Rationale:
 * - Larger badges draw attention to critical issues
 * - Borders create visual separation from background
 * - Bold numbers make counts instantly scannable
 * - Emoji size matches text for visual balance
 * - Colors follow semantic severity system
 *
 * @param props - Component props
 * @returns JSX element representing enhanced severity badge
 */
const EnhancedSeverityBadge = React.memo(function EnhancedSeverityBadge({
  severity,
  count,
  className = ''
}: EnhancedSeverityBadgeProps) {
  const severityConfig = {
    high: {
      bg: 'bg-score-danger/20',
      border: 'border-score-danger/30',
      text: 'text-score-danger',
      emoji: '⚠️',
      label: 'high'
    },
    medium: {
      bg: 'bg-score-caution/20',
      border: 'border-score-caution/30',
      text: 'text-score-caution',
      emoji: '⚡',
      label: 'medium'
    },
    low: {
      bg: 'bg-white',
      border: 'border-gray-200',
      text: 'text-zinc-600',
      emoji: 'ℹ️',
      label: 'low'
    }
  };

  const config = severityConfig[severity];

  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-3 py-1.5
        rounded-lg
        border ${config.border}
        ${config.bg} ${config.text}
        text-sm font-medium
        transition-transform duration-150
        hover:scale-105
        drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]
        ${className}
      `}
      title={`${count} ${config.label} severity issue${count !== 1 ? 's' : ''}`}
      role="status"
      aria-label={`${count} ${config.label} severity issue${count !== 1 ? 's' : ''}`}
    >
      <span className="text-base leading-none" aria-hidden="true">
        {config.emoji}
      </span>
      <span className="font-bold tabular-nums">
        {count}
      </span>
    </span>
  );
});

export default EnhancedSeverityBadge;
