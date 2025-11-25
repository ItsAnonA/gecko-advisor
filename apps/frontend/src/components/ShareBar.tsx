/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useState } from 'react';
import clsx from 'clsx';

export interface ShareBarProps {
  url: string;
  message?: string;
}

export function ShareBar({ url, message }: ShareBarProps) {
  const [status, setStatus] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied to clipboard');
    } catch {
      setStatus('Copy failed. Please copy manually.');
    }
    timeoutClear();
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url, text: message, title: message });
        setStatus('Shared successfully');
        timeoutClear();
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }
    copy().catch(() => undefined);
  };

  const timeoutClear = () => {
    window.setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dark-border bg-dark-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-light-primary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Share this report</span>
        <span className="break-all text-xs text-light-secondary drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{url}</span>
        {status && <span className="mt-1 text-xs text-advisor-400">{status}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={clsx(
            'inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-dark-bg shadow-lg',
            'bg-advisor-500 hover:bg-advisor-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-dark-bg transition-colors duration-150',
          )}
          onClick={share}
        >
          Share
        </button>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-dark-border bg-dark-elevated hover:bg-dark-hover px-4 text-sm font-semibold text-light-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-advisor-500 focus-visible:ring-offset-dark-bg transition-colors duration-150 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          onClick={() => copy()}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
