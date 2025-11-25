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
 * Detailed scan progress component with step-by-step visualization
 *
 * Features:
 * - Visual progress indication with steps
 * - Estimated time remaining
 * - Elapsed time counter to reduce perceived wait time
 * - Reassurance messages for long-running scans
 * - Accessibility compliant with ARIA live regions
 * - Responsive design for mobile and desktop
 * - Real-time progress updates
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
    { id: 'initial', label: 'Initializing scan', range: [0, 10], icon: '🔄' },
    { id: 'fetch', label: 'Fetching website', range: [10, 25], icon: '📥' },
    { id: 'analyze', label: 'Analyzing content', range: [25, 50], icon: '🔍' },
    { id: 'trackers', label: 'Checking trackers', range: [50, 70], icon: '🎯' },
    { id: 'security', label: 'Security analysis', range: [70, 85], icon: '🔒' },
    { id: 'privacy', label: 'Privacy assessment', range: [85, 95], icon: '🛡️' },
    { id: 'finalize', label: 'Finalizing report', range: [95, 100], icon: '✅' }
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
    // Fallback to last step if progress is beyond expected range
    return scanSteps[scanSteps.length - 1] ?? scanSteps[0] ?? {
      id: 'default',
      label: 'Processing',
      range: [0, 100] as [number, number],
      icon: '🔄'
    };
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
        return { color: 'text-advisor-400', bgColor: 'bg-advisor-600/20', message: 'Starting scan...' };
      case 'processing':
        return { color: 'text-advisor-400', bgColor: 'bg-advisor-600/20', message: 'Scanning in progress...' };
      case 'done':
        return { color: 'text-score-safe', bgColor: 'bg-score-safe/20', message: 'Scan completed!' };
      case 'error':
        return { color: 'text-score-danger', bgColor: 'bg-score-danger/20', message: 'Scan failed' };
      default:
        return { color: 'text-zinc-600', bgColor: 'bg-white', message: 'Unknown status' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`space-y-6 ${className}`} data-testid="scan-progress">
      {/* Main progress display */}
      <div className="flex flex-col items-center text-center space-y-4">
        <ProgressDial percent={progress} data-testid="progress-dial" />

        {/* Status and current step with elapsed time */}
        <div
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            statusInfo.bgColor,
            statusInfo.color
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="mr-2" aria-hidden="true">{activeStep.icon}</span>
          {currentStep || activeStep.label}
          {(status === 'processing' || status === 'pending') && elapsedSeconds > 0 && (
            <span className="ml-1 text-xs opacity-75">
              ({elapsedSeconds}s)
            </span>
          )}
        </div>

        {/* Time remaining or typical duration */}
        {status === 'processing' && (
          <div className="text-sm text-zinc-600 text-center ">
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 ? (
              <>Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}</>
            ) : (
              <span className="text-xs">Usually takes 5-10 seconds</span>
            )}
          </div>
        )}

        {/* Reassurance message for long-running scans */}
        {status === 'processing' && elapsedSeconds > 20 && (
          <div className="text-xs text-zinc-500 text-center max-w-md px-4 ">
            This may take up to 30 seconds for complex sites. Your scan is progressing normally.
          </div>
        )}
      </div>

      {/* Step progress visualization */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-zinc-900 text-center ">
          Scan Progress
        </div>

        <div className="space-y-2">
          {scanSteps.map((step, index) => {
            const rangeStart = step.range?.[0] ?? 0;
            const rangeEnd = step.range?.[1] ?? 100;
            const isCompleted = progress > rangeEnd;
            const isActive = progress >= rangeStart && progress <= rangeEnd;
            const isPending = progress < rangeStart;

            return (
              <div
                key={step.id}
                className={clsx(
                  'flex items-center gap-2 sm:gap-3 p-2 rounded-lg transition-all duration-300',
                  {
                    'bg-score-safe/20 border border-score-safe/30': isCompleted,
                    'bg-advisor-600/20 border border-advisor-500/30 shadow-sm': isActive,
                    'bg-white border border-gray-200': isPending
                  }
                )}
                data-testid={`scan-step-${step.id}`}
              >
                {/* Step icon */}
                <div
                  className={clsx(
                    'w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm transition-colors flex-shrink-0',
                    {
                      'bg-score-safe text-dark-bg': isCompleted,
                      'bg-advisor-500 text-dark-bg animate-pulse': isActive,
                      'bg-stone-50 text-zinc-500': isPending
                    }
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? '✓' : isActive ? step.icon : index + 1}
                </div>

                {/* Step label */}
                <div className="flex-1 min-w-0">
                  <div
                    className={clsx(
                      'text-xs sm:text-sm font-medium transition-colors truncate ',
                      {
                        'text-score-safe': isCompleted,
                        'text-advisor-400': isActive,
                        'text-zinc-500': isPending
                      }
                    )}
                  >
                    {step.label}
                  </div>

                  {/* Progress bar for active step */}
                  {isActive && (
                    <div className="mt-1 w-full bg-stone-50 rounded-full h-1 sm:h-1.5">
                      <div
                        className="bg-advisor-500 h-1 sm:h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(10,174,84,0.5)]"
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

                {/* Step status indicator */}
                <div
                  className={clsx(
                    'text-2xs sm:text-xs px-1 sm:px-2 py-1 rounded transition-colors whitespace-nowrap',
                    {
                      'bg-score-safe/20 text-score-safe': isCompleted,
                      'bg-advisor-600/20 text-advisor-400': isActive,
                      'bg-stone-50 text-zinc-500': isPending
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

      {/* Trust indicators */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-zinc-600 ">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-score-safe inline-block" aria-hidden="true"/>
          Secure connection
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-advisor-500 inline-block" aria-hidden="true"/>
          Transparent scan
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-score-caution inline-block" aria-hidden="true"/>
          No data stored
        </span>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {status === 'processing' && `Scan progress: ${progress}% complete. Currently ${activeStep.label}.`}
        {status === 'done' && 'Scan completed successfully.'}
        {status === 'error' && 'Scan encountered an error.'}
      </div>
    </div>
  );
});

export default ScanProgress;