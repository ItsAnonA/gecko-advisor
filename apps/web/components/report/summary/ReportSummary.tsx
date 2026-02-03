/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { HighScoreSummary } from './templates/HighScoreSummary';
import { MediumScoreSummary } from './templates/MediumScoreSummary';
import { LowScoreSummary } from './templates/LowScoreSummary';
import { CredibilityFooter, UltraLowDataGuardrail } from './CredibilityFooter';
import { hasAdTrackers as checkHasAdTrackers } from './labels';

interface ReportSummaryProps {
  score: number;
  domain: string;
  trackerCount: number;
  thirdPartyCount: number;
  cookieCount: number;
  evidenceCount: number;
  percentile?: number;
  totalDomains?: number;
  averageScore?: number;
  category?: string;
  evidence: Array<{ kind: string; details: unknown }>;
}

/**
 * ReportSummary - Main orchestrator for score-based summary templates
 *
 * Selects the appropriate template based on score tier:
 * - High (80-100): HighScoreSummary
 * - Medium (50-79): MediumScoreSummary
 * - Low (0-49): LowScoreSummary
 *
 * All content is SSR-friendly and appears in initial HTML.
 */
export function ReportSummary({
  score,
  domain,
  trackerCount,
  thirdPartyCount,
  // Reserved for future use - cookie breakdown enhancements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cookieCount: _cookieCount,
  // Reserved for future use - evidence depth indicators
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  evidenceCount: _evidenceCount,
  percentile,
  totalDomains,
  // Reserved for future use - average comparison text
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  averageScore: _averageScore,
  category,
  evidence,
}: ReportSummaryProps) {
  const hasAds = checkHasAdTrackers(evidence);

  // Determine icon based on score tier
  const getScoreIcon = () => {
    if (score >= 80) {
      return (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (score >= 50) {
      return (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  // Render appropriate template based on score
  const renderTemplate = () => {
    if (score >= 80) {
      return (
        <HighScoreSummary
          domain={domain}
          trackerCount={trackerCount}
          thirdPartyCount={thirdPartyCount}
          percentile={percentile}
          totalDomains={totalDomains}
        />
      );
    }

    if (score >= 50) {
      return (
        <MediumScoreSummary
          domain={domain}
          trackerCount={trackerCount}
          thirdPartyCount={thirdPartyCount}
          percentile={percentile}
          totalDomains={totalDomains}
          category={category}
          evidence={evidence}
        />
      );
    }

    return (
      <LowScoreSummary
        domain={domain}
        trackerCount={trackerCount}
        thirdPartyCount={thirdPartyCount}
        percentile={percentile}
        totalDomains={totalDomains}
        hasAdTrackers={hasAds}
      />
    );
  };

  // CRITICAL: Score number must NOT appear above this summary section.
  // Interpretation comes first, numbers come after meaning. Always.
  // If someone reintroduces a numeric score above the summary — revert the PR.
  return (
    <>
      {/* REPORT_SUMMARY_START - SEO debugging marker */}
      <section className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-3">
          {/* Emojis/icons are intentional visual anchors. Do not remove or replace. */}
          {getScoreIcon()}
          Quick Summary
        </h2>

        {/* Score-specific template - contains SSR-visible interpretation text */}
        {renderTemplate()}

        {/* Ultra-low data guardrail for minimal sites */}
        <UltraLowDataGuardrail trackerCount={trackerCount} thirdPartyCount={thirdPartyCount} />

        {/* Credibility footer */}
        <CredibilityFooter totalDomains={totalDomains} />
      </section>
      {/* REPORT_SUMMARY_END */}
    </>
  );
}
