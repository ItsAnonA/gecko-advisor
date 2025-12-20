/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Rate limit error response from the API
 */
export interface RateLimitError {
  type: 'rate_limit_exceeded';
  title: string;
  status: 429;
  detail: string;
  retryAfterSeconds?: number;
  scansUsed?: number;
  scansRemaining?: number;
  resetAt?: string;
}

interface RateLimitIndicatorProps {
  rateLimitError: RateLimitError | null;
  onCountdownComplete?: () => void;
}

/**
 * Simple, friendly rate limit indicator
 */
export function RateLimitIndicator({
  rateLimitError,
  onCountdownComplete,
}: RateLimitIndicatorProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown when we get a burst limit error
  useEffect(() => {
    if (rateLimitError?.retryAfterSeconds) {
      setSecondsRemaining(rateLimitError.retryAfterSeconds);
    }
  }, [rateLimitError]);

  // Countdown timer
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (secondsRemaining === 0) {
        setSecondsRemaining(null);
        onCountdownComplete?.();
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [secondsRemaining, onCountdownComplete]);

  if (!rateLimitError) return null;

  const isDailyLimit = rateLimitError.scansRemaining === 0 && !rateLimitError.retryAfterSeconds;

  // Burst limit - simple countdown
  if (secondsRemaining && secondsRemaining > 0) {
    return (
      <p className="text-sm text-gecko-600 text-center mb-3" role="status">
        ⏳ Please wait <span className="font-semibold tabular-nums">{secondsRemaining}s</span> before next scan
      </p>
    );
  }

  // Daily limit exhausted
  if (isDailyLimit) {
    return (
      <p className="text-sm text-gecko-600 text-center mb-3" role="status">
        You&apos;ve used all 10 free scans today. Come back tomorrow! 🌅
      </p>
    );
  }

  return null;
}

export default RateLimitIndicator;
