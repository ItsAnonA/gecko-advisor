/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, ProgressSkeleton } from '@/components/ui';
import { ScanProgress } from '@/components/scan';
import { getScanStatus, type ScanStatus, type HttpError } from '@/lib/api';

interface ScanProgressClientProps {
  scanId: string;
}

/**
 * Error display component
 */
function ErrorState({
  title,
  description,
  onRetry,
  onGoHome,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
      <p className="text-zinc-600 max-w-md mx-auto">{description}</p>
      <div className="flex justify-center gap-4 mt-6">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-advisor-500 text-white rounded-lg hover:bg-advisor-600 transition-colors"
          >
            Retry
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            Start New Scan
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ScanProgressClient - Client component for scan progress polling
 */
export default function ScanProgressClient({ scanId }: ScanProgressClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [scanStartTime] = useState(() => Date.now());
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check if rate limited
  const isRateLimited = useMemo(() => {
    const httpError = error as HttpError | null;
    return error && httpError?.status === 429;
  }, [error]);

  // Polling function
  const fetchStatus = useCallback(async () => {
    try {
      const data = await getScanStatus(scanId);
      setStatus(data);
      setError(null);
      setLoading(false);

      // Redirect to report when complete (use /r/slug which redirects to /privacy-policy/domain)
      if ((data.status === 'done' || data.status === 'error') && data.slug) {
        router.push(`/r/${data.slug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load scan status'));
      setLoading(false);
    }
  }, [scanId, router]);

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(() => {
      if (status?.status === 'done' || status?.status === 'error' || hasTimedOut) {
        return;
      }
      fetchStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchStatus, status?.status, hasTimedOut]);

  // Timeout detection (60 seconds)
  useEffect(() => {
    const checkTimeout = () => {
      const elapsedTime = Date.now() - scanStartTime;
      const TIMEOUT_MS = 60000;

      if (elapsedTime >= TIMEOUT_MS && status?.status !== 'done' && status?.status !== 'error' && !error) {
        setHasTimedOut(true);
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [scanStartTime, status?.status, error]);

  // Retry handler
  const handleRetry = useCallback(() => {
    if (retryCount >= 3) {
      router.push('/');
      return;
    }

    setRetryCount(prev => prev + 1);
    setHasTimedOut(false);
    setError(null);
    setLoading(true);
    fetchStatus();
  }, [retryCount, router, fetchStatus]);

  // Determine if we should show error state
  const shouldShowError = error || hasTimedOut;

  // Get page title based on status
  const pageTitle = shouldShowError
    ? hasTimedOut
      ? 'Scan Timed Out'
      : isRateLimited
      ? 'Scan Temporarily Slowed'
      : 'Scan Status Error'
    : status?.status === 'done'
    ? 'Scan Complete'
    : 'Privacy Scan In Progress';

  // Get status message
  const statusMessage = status?.status === 'done'
    ? 'Your privacy report is ready'
    : shouldShowError
    ? 'There was an issue with your scan'
    : 'Analyzing website privacy features...';

  return (
    <>
      <div className="flex items-center justify-end text-sm">
        <Link href="/docs" className="underline text-emerald-600 hover:text-emerald-700">Docs</Link>
      </div>
      <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{pageTitle}</h1>
      <div
        className="text-base text-zinc-600"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>
      <Card>
        {loading ? (
          <ProgressSkeleton />
        ) : shouldShowError ? (
          <ErrorState
            title={hasTimedOut ? 'Scan Timed Out' : isRateLimited ? 'Scan Temporarily Slowed' : 'Scan Status Error'}
            description={
              hasTimedOut
                ? 'The scan is taking longer than expected. This might be due to website complexity or temporary connectivity issues. You can retry the scan or start a new one.'
                : isRateLimited
                ? "We're checking your scan progress a bit slower to avoid overloading the server. Your scan is still running and will complete normally."
                : error?.message?.includes('Scan not found')
                ? 'The scan ID could not be found. It may have expired or been deleted. Please start a new scan.'
                : 'There was an error checking the scan progress. This might be due to a network issue or a temporary server problem.'
            }
            onRetry={handleRetry}
            onGoHome={() => router.push('/')}
          />
        ) : (
          <div className="py-4">
            <ScanProgress
              progress={status?.progress ?? (status?.status === 'done' ? 100 : 5)}
              status={status?.status === 'queued' ? 'pending' : status?.status === 'running' ? 'processing' : status?.status ?? 'processing'}
              currentStep={undefined}
              estimatedTimeRemaining={undefined}
            />

            {status?.status === 'done' && (
              <div className="text-center mt-6">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-sm"
                >
                  View Report
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Rate limit info banner */}
      {isRateLimited && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="text-emerald-600 flex-shrink-0 text-xl" aria-hidden="true">ℹ️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-zinc-900 mb-1">Automatic Rate Limit Protection</h3>
              <p className="text-zinc-600">
                We&apos;re automatically slowing down status checks to respect server limits.
                Your scan is still running normally. We&apos;ll automatically speed up again once the rate limit clears.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Retry count indicator */}
      {retryCount > 0 && !shouldShowError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-center">
          <span className="font-medium text-zinc-900">Retry attempt {retryCount} of 3</span>
        </div>
      )}
      <Link href="/" className="text-emerald-600 hover:text-emerald-700 underline">New scan</Link>
    </>
  );
}
