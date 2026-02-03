/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { formatPercentile } from '../comparisons';

interface HighScoreSummaryProps {
  domain: string;
  trackerCount: number;
  thirdPartyCount: number;
  percentile?: number;
  totalDomains?: number;
}

/**
 * HighScoreSummary - Template for scores 80-100
 *
 * Emphasizes positive findings, uses checkmark icon,
 * and highlights the site's strong privacy posture.
 */
export function HighScoreSummary({
  domain,
  trackerCount,
  thirdPartyCount,
  percentile,
  totalDomains,
}: HighScoreSummaryProps) {
  const hasComparison = percentile !== undefined && totalDomains !== undefined && totalDomains >= 50;
  const formattedTotal = totalDomains?.toLocaleString() ?? '0';

  // No trackers detected
  if (trackerCount === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-700 leading-relaxed">
          <span className="text-emerald-600 font-medium">No third-party tracking detected</span>
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          {domain} does not expose visitor data to advertising or analytics networks.
          When we loaded this site in a real browser environment, we found no scripts
          transmitting data to external tracking services.
        </p>
        {hasComparison && (
          <p className="text-sm text-slate-600 leading-relaxed">
            This puts you ahead of <strong className="text-slate-800">{formatPercentile(percentile)}%</strong> of
            the {formattedTotal} sites we&apos;ve analyzed.
          </p>
        )}
      </div>
    );
  }

  // Low tracker count but still high score
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 leading-relaxed">
        <span className="text-emerald-600 font-medium">Minimal data collection detected</span>
      </p>
      <p className="text-sm text-slate-700 leading-relaxed">
        {domain} connects to {thirdPartyCount} external service{thirdPartyCount !== 1 ? 's' : ''} and
        loads {trackerCount} tracking script{trackerCount !== 1 ? 's' : ''}.
        This is well below industry average.
      </p>
      {hasComparison && (
        <p className="text-sm text-slate-600 leading-relaxed">
          This places {domain} ahead of <strong className="text-slate-800">{formatPercentile(percentile)}%</strong> of
          the {formattedTotal} sites we&apos;ve analyzed.
        </p>
      )}
    </div>
  );
}
