/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';

export interface ComingSoonNoticeProps {
  /** Feature name being disabled */
  feature: string;
  /** Optional timeline (e.g., "Q1 2026") */
  timeline?: string;
  /** Callback when notice is dismissed */
  onDismiss?: () => void;
  /** Variant style - 'info' (blue) or 'warning' (amber) */
  variant?: 'info' | 'warning';
}

/**
 * ComingSoonNotice - Non-intrusive notification for disabled features
 *
 * Design principles:
 * - Trust Blue brand color for familiarity (info variant)
 * - Inline placement (no modal/toast blocking interaction)
 * - Dismissible for user control
 * - Clear, concise messaging
 * - WCAG AA compliant contrast ratios
 *
 * @example
 * ```tsx
 * <ComingSoonNotice
 *   feature="APP"
 *   timeline="Q1 2026"
 *   variant="info"
 *   onDismiss={() => setShowNotice(false)}
 * />
 * ```
 */
export default function ComingSoonNotice({
  feature,
  timeline,
  onDismiss,
  variant = 'info'
}: ComingSoonNoticeProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  // Variant-specific styling
  const variantStyles = {
    info: {
      container: 'bg-trust-600/20 border-trust-600/30',
      icon: 'text-trust-400',
      title: 'text-zinc-900 ',
      body: 'text-zinc-600 ',
      link: 'text-trust-300 hover:text-trust-200 focus:ring-trust-500',
      dismissBtn: 'text-trust-400 hover:text-trust-300 focus:ring-trust-500'
    },
    warning: {
      container: 'bg-score-caution/20 border-score-caution/30',
      icon: 'text-score-caution',
      title: 'text-zinc-900 ',
      body: 'text-zinc-600 ',
      link: 'text-score-caution hover:text-score-caution/80 focus:ring-score-caution',
      dismissBtn: 'text-score-caution hover:text-score-caution/80 focus:ring-score-caution'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`mt-3 p-4 rounded-lg border ${styles.container} animate-slide-up`}
      role="status"
      aria-live="polite"
      data-testid="coming-soon-notice"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-5 h-5 mt-0.5">
          <svg
            className={`w-5 h-5 ${styles.icon}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${styles.title}`}>
            {feature} scanning is coming soon
          </p>
          {timeline && (
            <p className={`mt-1 text-sm ${styles.body}`}>
              Expected availability: <span className="font-medium">{timeline}</span>
            </p>
          )}
          <p className={`mt-2 text-xs ${styles.body}`}>
            Currently, only URL scanning is available.
            <a
              href="/docs#roadmap"
              className={`ml-1 underline font-medium ${styles.link} focus:outline-none focus:ring-2 focus:ring-offset-1 rounded transition-colors duration-150`}
            >
              View roadmap
            </a>
          </p>
        </div>

        {/* Dismiss button - Touch-friendly 44x44px */}
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 w-10 h-10 min-w-[44px] min-h-[44px] inline-flex items-center justify-center ${styles.dismissBtn} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg rounded-full transition-colors duration-150`}
          aria-label={`Dismiss ${feature} coming soon notice`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
