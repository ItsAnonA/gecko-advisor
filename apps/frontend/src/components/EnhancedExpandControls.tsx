/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface EnhancedExpandControlsProps {
  /** Number of expanded categories */
  expandedCount: number;
  /** Total number of categories */
  totalCount: number;
  /** Callback when expand all is clicked */
  onExpandAll: () => void;
  /** Callback when collapse all is clicked */
  onCollapseAll: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EnhancedExpandControls - Premium expand/collapse control bar
 *
 * Premium Features:
 * - Larger text size (text-sm vs text-xs)
 * - Button backgrounds with hover states
 * - Proper vertical divider (not "|" character)
 * - Better visual hierarchy with color variation
 * - Border effects on hover
 * - Smooth transitions
 * - Improved accessibility
 *
 * Design Rationale:
 * - Larger buttons improve usability on mobile
 * - Background colors create clear button affordance
 * - Divider provides visual separation without clutter
 * - Color coding shows primary vs secondary actions
 * - Hover states provide interactive feedback
 *
 * @param props - Component props
 * @returns JSX element representing enhanced expand controls
 */
const EnhancedExpandControls = React.memo(function EnhancedExpandControls({
  expandedCount,
  totalCount,
  onExpandAll,
  onCollapseAll,
  className = ''
}: EnhancedExpandControlsProps) {
  return (
    <div
      className={`
        flex items-center justify-between
        py-3 px-4
        bg-dark-elevated rounded-lg
        border border-dark-border
        ${className}
      `}
    >
      {/* Status indicator */}
      <div className="text-sm text-light-secondary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        <span className="font-semibold text-light-primary">
          {expandedCount}
        </span>
        {' of '}
        <span className="font-semibold text-light-primary">
          {totalCount}
        </span>
        {' categories visible'}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExpandAll}
          className="
            px-3 py-1.5 min-h-[40px]
            text-sm font-medium
            text-advisor-400 hover:text-advisor-300
            bg-advisor-600/20 hover:bg-advisor-600/30
            border border-advisor-500/30 hover:border-advisor-500/50
            rounded-md
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:ring-offset-1 focus:ring-offset-dark-bg
            drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]
          "
          aria-label="Expand all evidence categories"
        >
          Expand all
        </button>

        {/* Divider - proper vertical line instead of "|" */}
        <div
          className="w-px h-5 bg-dark-border"
          aria-hidden="true"
        />

        <button
          onClick={onCollapseAll}
          className="
            px-3 py-1.5 min-h-[40px]
            text-sm font-medium
            text-light-primary hover:text-advisor-400
            bg-dark-surface hover:bg-dark-hover
            border border-dark-border hover:border-advisor-500/30
            rounded-md
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-advisor-500 focus:ring-offset-1 focus:ring-offset-dark-bg
            drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]
          "
          aria-label="Collapse all evidence categories"
        >
          Collapse all
        </button>
      </div>
    </div>
  );
});

export default EnhancedExpandControls;
