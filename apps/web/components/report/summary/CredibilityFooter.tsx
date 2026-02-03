/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

interface CredibilityFooterProps {
  totalDomains?: number;
}

/**
 * CredibilityFooter - Methodology transparency line
 *
 * Displays once per report page to establish credibility
 * and explain the analysis methodology.
 */
export function CredibilityFooter({ totalDomains }: CredibilityFooterProps) {
  const formattedTotal = totalDomains?.toLocaleString() ?? 'thousands of';

  return (
    <p className="text-xs text-slate-500 mt-4 leading-relaxed">
      Analysis performed using a real browser environment and compared against {formattedTotal} publicly accessible websites.
    </p>
  );
}

interface UltraLowDataGuardrailProps {
  trackerCount: number;
  thirdPartyCount: number;
}

/**
 * UltraLowDataGuardrail - Context for minimal sites
 *
 * Displayed when trackerCount=0 AND thirdPartyCount<=1
 * to provide context that minimal sites may appear cleaner
 * due to limited functionality.
 */
export function UltraLowDataGuardrail({ trackerCount, thirdPartyCount }: UltraLowDataGuardrailProps) {
  // Only show for ultra-minimal sites
  if (trackerCount > 0 || thirdPartyCount > 1) {
    return null;
  }

  return (
    <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-3 leading-relaxed">
      Minimal sites often appear cleaner due to limited functionality.
      As sites grow, periodic re-checks are recommended.
    </p>
  );
}
