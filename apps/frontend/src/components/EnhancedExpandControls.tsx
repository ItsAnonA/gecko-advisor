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
        bg-stone-50 rounded-lg
        border border-gray-200
        ${className}
      `}
    >
      {/* Status indicator */}
      <div className="text-sm text-zinc-600">
        <span className="font-semibold text-zinc-900">
          {expandedCount}
        </span>
        {' of '}
        <span className="font-semibold text-zinc-900">
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
            text-emerald-600 hover:text-emerald-700
            bg-emerald-50 hover:bg-emerald-100
            border border-emerald-200 hover:border-emerald-300
            rounded-md
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-white
          "
          aria-label="Expand all evidence categories"
        >
          Expand all
        </button>

        {/* Divider - proper vertical line instead of "|" */}
        <div
          className="w-px h-5 bg-gray-200"
          aria-hidden="true"
        />

        <button
          onClick={onCollapseAll}
          className="
            px-3 py-1.5 min-h-[40px]
            text-sm font-medium
            text-zinc-600 hover:text-zinc-900
            bg-white hover:bg-gray-100
            border border-gray-200 hover:border-gray-300
            rounded-md
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-white
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
