/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { formatPercentile } from '../comparisons';

interface LowScoreSummaryProps {
  domain: string;
  trackerCount: number;
  thirdPartyCount: number;
  percentile?: number;
  totalDomains?: number;
  hasAdTrackers: boolean;
}

/**
 * LowScoreSummary - Template for scores 0-49
 *
 * Clearly presents concerns but includes stabilizer text
 * to normalize the finding and provide actionable context.
 *
 * CRITICAL: Must include stabilizer sentence - do not remove.
 */
export function LowScoreSummary({
  domain,
  trackerCount,
  thirdPartyCount,
  percentile,
  totalDomains,
  hasAdTrackers,
}: LowScoreSummaryProps) {
  const hasComparison = percentile !== undefined && totalDomains !== undefined && totalDomains >= 50;
  const percentileBelow = percentile !== undefined ? 100 - percentile : undefined;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 leading-relaxed">
        <span className="text-red-600 font-medium">High data exposure detected</span>
      </p>
      <p className="text-sm text-slate-700 leading-relaxed">
        {domain} connects to {thirdPartyCount} external service{thirdPartyCount !== 1 ? 's' : ''} and
        loads {trackerCount} tracking script{trackerCount !== 1 ? 's' : ''}
        {hasAdTrackers ? ', including advertising networks' : ''}.
      </p>
      {hasComparison && percentileBelow !== undefined && (
        <p className="text-sm text-slate-600 leading-relaxed">
          This is more than <strong className="text-slate-800">{formatPercentile(percentileBelow)}%</strong> of
          sites we&apos;ve analyzed.
        </p>
      )}
      {/*
        STABILIZER - CRITICAL: Do NOT remove this sentence.

        Purpose: Prevents panic exits from users with low scores by:
        1. Normalizing the finding ("common on fast-growing sites")
        2. Providing hope ("can usually be reduced")
        3. Reducing fear ("without affecting core functionality")

        Removing this would be a UX regression that increases bounce rate.
        If someone asks to shorten the summary, protect this text.
      */}
      <p className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
        This is common on fast-growing or marketing-heavy sites and can usually be reduced
        without affecting core functionality.
      </p>
    </div>
  );
}
