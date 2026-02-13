'use client';

/**
 * Error Boundary for /privacy-report/[domain]
 *
 * Catches unhandled errors during ISR/SSR and displays a user-friendly
 * fallback instead of returning a bare 500. This prevents 5xx errors
 * from reaching Google's crawl budget (GSC showed 180 5xx pages).
 */

import Link from 'next/link';

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">
        Report Temporarily Unavailable
      </h1>
      <p className="text-zinc-600 mb-8">
        We&apos;re having trouble loading this privacy report. This is usually
        temporary — please try again in a moment.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-advisor-600 text-white rounded-lg hover:bg-advisor-700 transition-colors font-medium"
        >
          Try Again
        </button>
        <Link
          href="/reports"
          className="px-6 py-2.5 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors font-medium"
        >
          Browse Reports
        </Link>
      </div>
      {error.digest && (
        <p className="mt-8 text-xs text-zinc-400">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
