/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import ProgressDial from './ProgressDial';
import clsx from 'clsx';

export interface ScanProgressProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current scan status */
  status: 'pending' | 'processing' | 'done' | 'error';
  /** Current step being processed */
  currentStep?: string;
  /** Estimated time remaining */
  estimatedTimeRemaining?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SVG Icons for scan steps - professional, consistent style
 */
const StepIcons = {
  // Rotating arrows - initializing
  initial: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  ),
  // Download arrow - fetching
  fetch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  // Magnifying glass - analyzing
  analyze: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  // Crosshairs/target - trackers
  trackers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  // Shield - security
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  // Lock - privacy
  privacy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  // Checkmark circle - finalize
  finalize: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  // Checkmark - completed
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

/**
 * Trust indicator icons
 */
const TrustIcons = {
  secure: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  transparent: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  noData: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
};

/**
 * Detailed scan progress component with step-by-step visualization
 *
 * Features:
 * - Visual progress indication with animated steps
 * - Professional SVG icons (no emojis)
 * - Staggered entrance animations
 * - Smooth step transitions
 * - Elapsed time counter to reduce perceived wait time
 * - Accessibility compliant with ARIA live regions
 */
const ScanProgress = React.memo(function ScanProgress({
  progress,
  status,
  currentStep,
  estimatedTimeRemaining,
  className = ''
}: ScanProgressProps) {
  // Track elapsed time since component mount
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  // Track if component has mounted for entrance animations
  const [mounted, setMounted] = React.useState(false);

  // Trigger mount animation
  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Start elapsed time counter when scanning
  React.useEffect(() => {
    if (status !== 'processing' && status !== 'pending') {
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Define scan steps with their typical progress ranges
  const scanSteps = [
    { id: 'initial', label: 'Initializing scan', range: [0, 10], icon: StepIcons.initial },
    { id: 'fetch', label: 'Fetching website', range: [10, 25], icon: StepIcons.fetch },
    { id: 'analyze', label: 'Analyzing content', range: [25, 50], icon: StepIcons.analyze },
    { id: 'trackers', label: 'Checking trackers', range: [50, 70], icon: StepIcons.trackers },
    { id: 'security', label: 'Security analysis', range: [70, 85], icon: StepIcons.security },
    { id: 'privacy', label: 'Privacy assessment', range: [85, 95], icon: StepIcons.privacy },
    { id: 'finalize', label: 'Finalizing report', range: [95, 100], icon: StepIcons.finalize }
  ];

  // Determine current step based on progress
  const getCurrentStep = () => {
    for (const step of scanSteps) {
      const rangeStart = step.range?.[0] ?? 0;
      const rangeEnd = step.range?.[1] ?? 100;
      if (progress >= rangeStart && progress <= rangeEnd) {
        return step;
      }
    }
    return scanSteps[scanSteps.length - 1] ?? scanSteps[0];
  };

  const activeStep = getCurrentStep();

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${Math.round(remainingSeconds)}s`;
  };

  // Get status color and message
  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', message: 'Starting scan...' };
      case 'processing':
        return { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', message: 'Scanning in progress...' };
      case 'done':
        return { color: 'text-emerald-600', bgColor: 'bg-emerald-500/20', message: 'Scan completed!' };
      case 'error':
        return { color: 'text-red-600', bgColor: 'bg-red-500/10', message: 'Scan failed' };
      default:
        return { color: 'text-zinc-600', bgColor: 'bg-zinc-100', message: 'Unknown status' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`space-y-6 ${className}`} data-testid="scan-progress">
      {/* Main progress display */}
      <div
        className={clsx(
          'flex flex-col items-center text-center space-y-4 transition-all duration-500',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        <ProgressDial percent={progress} data-testid="progress-dial" />

        {/* Status badge with icon */}
        <div
          className={clsx(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
            statusInfo.bgColor,
            statusInfo.color
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="flex-shrink-0" aria-hidden="true">
            {activeStep?.icon}
          </span>
          <span>{currentStep || activeStep?.label}</span>
          {(status === 'processing' || status === 'pending') && elapsedSeconds > 0 && (
            <span className="text-xs opacity-75 font-mono">
              ({elapsedSeconds}s)
            </span>
          )}
        </div>

        {/* Time remaining or typical duration */}
        {status === 'processing' && (
          <div
            className={clsx(
              'text-sm text-zinc-500 transition-all duration-500 delay-100',
              mounted ? 'opacity-100' : 'opacity-0'
            )}
          >
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 ? (
              <>Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}</>
            ) : (
              <span className="text-xs">Usually takes 5-10 seconds</span>
            )}
          </div>
        )}

        {/* Reassurance message for long-running scans */}
        {status === 'processing' && elapsedSeconds > 20 && (
          <div className="text-xs text-zinc-400 text-center max-w-md px-4 animate-fade-in">
            This may take up to 30 seconds for complex sites. Your scan is progressing normally.
          </div>
        )}
      </div>

      {/* Step progress visualization */}
      <div className="space-y-3">
        <div
          className={clsx(
            'text-sm font-semibold text-zinc-700 text-center transition-all duration-300 delay-150',
            mounted ? 'opacity-100' : 'opacity-0'
          )}
        >
          Scan Progress
        </div>

        <div className="space-y-2">
          {scanSteps.map((step, index) => {
            const rangeStart = step.range?.[0] ?? 0;
            const rangeEnd = step.range?.[1] ?? 100;
            const isCompleted = progress > rangeEnd;
            const isActive = progress >= rangeStart && progress <= rangeEnd;
            const isPending = progress < rangeStart;

            // Calculate staggered animation delay
            const animationDelay = 200 + (index * 50);

            return (
              <div
                key={step.id}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl transition-all duration-500',
                  mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4',
                  {
                    'bg-emerald-50 border-2 border-emerald-200': isCompleted,
                    'bg-emerald-500/5 border-2 border-emerald-400 shadow-lg shadow-emerald-500/10': isActive,
                    'bg-zinc-50 border border-zinc-200': isPending
                  }
                )}
                style={{ transitionDelay: `${animationDelay}ms` }}
                data-testid={`scan-step-${step.id}`}
              >
                {/* Step icon circle */}
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0',
                    {
                      'bg-emerald-500 text-white shadow-md shadow-emerald-500/30': isCompleted,
                      'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse': isActive,
                      'bg-zinc-100 text-zinc-400': isPending
                    }
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <span className="scale-110">{StepIcons.check}</span>
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={clsx(
                      'text-sm font-medium transition-colors truncate',
                      {
                        'text-emerald-700': isCompleted,
                        'text-emerald-600': isActive,
                        'text-zinc-500': isPending
                      }
                    )}
                  >
                    {step.label}
                  </div>

                  {/* Progress bar for active step - increased height */}
                  {isActive && (
                    <div className="mt-2 w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        style={{
                          width: `${Math.min(100, ((progress - rangeStart) / (rangeEnd - rangeStart)) * 100)}%`
                        }}
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={rangeStart}
                        aria-valuemax={rangeEnd}
                        aria-label={`${step.label} progress`}
                      />
                    </div>
                  )}
                </div>

                {/* Step status badge */}
                <div
                  className={clsx(
                    'text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-300 whitespace-nowrap',
                    {
                      'bg-emerald-500 text-white': isCompleted,
                      'bg-emerald-500/20 text-emerald-700 animate-pulse': isActive,
                      'bg-zinc-100 text-zinc-400': isPending
                    }
                  )}
                >
                  {isCompleted ? 'Done' : isActive ? 'Processing' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust indicators with icons */}
      <div
        className={clsx(
          'flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-zinc-500 pt-2 transition-all duration-500',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
        style={{ transitionDelay: '600ms' }}
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-emerald-500">{TrustIcons.secure}</span>
          Secure connection
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-emerald-500">{TrustIcons.transparent}</span>
          Transparent scan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-amber-500">{TrustIcons.noData}</span>
          No data stored
        </span>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {status === 'processing' && `Scan progress: ${progress}% complete. Currently ${activeStep?.label}.`}
        {status === 'done' && 'Scan completed successfully.'}
        {status === 'error' && 'Scan encountered an error.'}
      </div>
    </div>
  );
});

export default ScanProgress;
