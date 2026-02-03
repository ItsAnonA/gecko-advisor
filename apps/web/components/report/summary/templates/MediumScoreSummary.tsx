/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { formatPercentile, getVendorTypes } from '../comparisons';

interface MediumScoreSummaryProps {
  domain: string;
  trackerCount: number;
  thirdPartyCount: number;
  percentile?: number;
  totalDomains?: number;
  category?: string;
  evidence: Array<{ kind: string; details: unknown }>;
}

/**
 * MediumScoreSummary - Template for scores 50-79
 *
 * Presents a balanced view, acknowledges data sharing,
 * and provides category context when available.
 */
export function MediumScoreSummary({
  domain,
  trackerCount,
  // thirdPartyCount is available for future use if needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  thirdPartyCount: _thirdPartyCount,
  percentile,
  totalDomains,
  category,
  evidence,
}: MediumScoreSummaryProps) {
  const hasComparison = percentile !== undefined && totalDomains !== undefined && totalDomains >= 50;
  const vendorTypes = getVendorTypes(evidence);
  const percentileBelow = percentile !== undefined ? 100 - percentile : undefined;
  const categoryText = category || 'your category';

  // Count unique vendor domains
  const uniqueVendors = new Set(
    evidence
      .filter(e => e.kind === 'tracker' || e.kind === 'thirdparty')
      .map(e => {
        const details = e.details as { domain?: string } | null;
        return details?.domain;
      })
      .filter(Boolean)
  ).size;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 leading-relaxed">
        <span className="text-amber-600 font-medium">
          {trackerCount} data collection script{trackerCount !== 1 ? 's' : ''} detected
        </span>
      </p>
      <p className="text-sm text-slate-700 leading-relaxed">
        {domain} shares visitor information with {uniqueVendors || trackerCount} third-party
        service{(uniqueVendors || trackerCount) !== 1 ? 's' : ''}, including {vendorTypes}.
      </p>
      {hasComparison && percentileBelow !== undefined && (
        <p className="text-sm text-slate-600 leading-relaxed">
          This is typical for {categoryText} sites, but <strong className="text-slate-800">{formatPercentile(percentileBelow)}%</strong> of
          websites we&apos;ve analyzed have fewer external data connections.
        </p>
      )}
    </div>
  );
}
