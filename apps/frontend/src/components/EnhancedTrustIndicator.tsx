/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface EnhancedTrustIndicatorProps {
  /** Icon element (SVG) */
  icon: React.ReactNode;
  /** Heading text */
  title: string;
  /** Description text */
  description: string;
  /** Color variant */
  variant: 'gecko' | 'blue' | 'amber';
  /** Additional CSS classes */
  className?: string;
}

/**
 * EnhancedTrustIndicator - Premium trust indicator card
 *
 * Premium Features:
 * - Gradient backgrounds (subtle, brand-appropriate)
 * - Icon containers with gradient fills and shadows
 * - Smooth hover state transitions (shadow + border)
 * - Background decoration (blurred circle element)
 * - Improved typography hierarchy
 * - Responsive padding and spacing
 * - 3D depth with multiple shadow layers
 *
 * Design Rationale:
 * - Gradients create visual interest without overwhelming
 * - Icon containers draw attention to key trust signals
 * - Hover states provide interactive feedback
 * - Background decoration adds subtle premium polish
 * - Color-coded variants reinforce message semantics
 *
 * @param props - Component props
 * @returns JSX element representing enhanced trust indicator
 */
const EnhancedTrustIndicator = React.memo(function EnhancedTrustIndicator({
  icon,
  title,
  description,
  variant,
  className = ''
}: EnhancedTrustIndicatorProps) {
  const variantConfig = {
    gecko: {
      gradient: 'bg-gradient-to-br from-dark-elevated via-dark-surface to-dark-bg',
      border: 'border-advisor-500/30 hover:border-advisor-500/50',
      iconGradient: 'from-advisor-500 to-advisor-600',
      iconShadow: 'shadow-lg shadow-advisor-500/40',
      titleColor: 'text-zinc-900',
      descColor: 'text-zinc-600',
      decorationBg: 'bg-advisor-500/10'
    },
    blue: {
      gradient: 'bg-gradient-to-br from-dark-elevated via-dark-surface to-dark-bg',
      border: 'border-trust-600/30 hover:border-trust-600/50',
      iconGradient: 'from-trust-500 to-trust-600',
      iconShadow: 'shadow-lg shadow-trust-500/40',
      titleColor: 'text-zinc-900',
      descColor: 'text-zinc-600',
      decorationBg: 'bg-trust-500/10'
    },
    amber: {
      gradient: 'bg-gradient-to-br from-dark-elevated via-dark-surface to-dark-bg',
      border: 'border-score-caution/30 hover:border-score-caution/50',
      iconGradient: 'from-score-caution to-amber-600',
      iconShadow: 'shadow-lg shadow-score-caution/40',
      titleColor: 'text-zinc-900',
      descColor: 'text-zinc-600',
      decorationBg: 'bg-score-caution/10'
    }
  };

  const config = variantConfig[variant];

  return (
    <div
      className={`
        relative overflow-hidden group
        flex items-start gap-3
        p-5 md:p-6
        rounded-xl
        border-2 ${config.border}
        ${config.gradient}
        shadow-sm hover:shadow-xl
        hover:transform hover:-translate-y-1
        transition-all duration-300 ease-out
        before:absolute before:top-0 before:left-0 before:right-0 before:h-1
        before:bg-gradient-to-r before:from-advisor-600 before:to-green-400
        before:scale-x-0 hover:before:scale-x-100 before:transition-transform before:duration-300
        ${className}
      `}
    >
      {/* Background decoration - subtle blurred circle */}
      <div
        className={`absolute -right-8 -top-8 w-24 h-24 ${config.decorationBg} rounded-full blur-2xl`}
        aria-hidden="true"
      />

      {/* Icon container with gradient and shadow */}
      <div className="flex-shrink-0 relative z-10">
        <div
          className={`
            w-12 h-12
            rounded-xl
            bg-gradient-to-br ${config.iconGradient}
            ${config.iconShadow}
            flex items-center justify-center
            transition-transform duration-300 ease-out
            group-hover:scale-110 group-hover:rotate-6
          `}
        >
          <div className="text-white w-6 h-6">
            {icon}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10">
        <div className={`font-semibold text-base ${config.titleColor} leading-snug `}>
          {title}
        </div>
        <p className={`text-sm ${config.descColor} mt-1.5 leading-relaxed `}>
          {description}
        </p>
      </div>
    </div>
  );
});

export default EnhancedTrustIndicator;
