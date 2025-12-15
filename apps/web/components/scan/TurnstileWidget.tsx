/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useEffect, useState } from 'react';

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

/**
 * Cloudflare Turnstile bot protection widget
 *
 * This component renders an invisible CAPTCHA challenge
 * that automatically verifies users in the background.
 */
export default function TurnstileWidget({ onSuccess, onError, onExpire }: TurnstileWidgetProps) {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);

  // Get site key on client side only
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    setSiteKey(key || null);

    // If Turnstile is disabled (no site key), call onSuccess with empty token
    if (!key) {
      onSuccess('');
    }
  }, [onSuccess]);

  // If Turnstile is disabled (no site key), render nothing
  if (!siteKey) {
    return null;
  }

  return (
    <div className="turnstile-container">
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        options={{
          theme: 'dark',
          size: 'invisible',
          action: 'scan',
          appearance: 'interaction-only',
        }}
        onSuccess={onSuccess}
        onError={() => {
          console.warn('[Turnstile] Verification failed');
          onError?.();
        }}
        onExpire={() => {
          console.warn('[Turnstile] Token expired');
          onExpire?.();
        }}
      />
    </div>
  );
}

/**
 * Hook to check if Turnstile is enabled
 */
export function useTurnstileEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY));
  }, []);

  return enabled;
}
