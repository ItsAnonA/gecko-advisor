/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * ConditionalContent - Wrapper for conditional SEO blocks
 *
 * Phase 2A: "Same template, different meaning"
 *
 * Renders conditional semantic blocks based on scan findings.
 * This creates unique, valuable content for each report page,
 * differentiating them from "template spam" in Google's eyes.
 */

import React from 'react';
import { FingerprintingExplainer } from './FingerprintingExplainer';
import { HighTrackerExplainer } from './HighTrackerExplainer';
import { CriticalPrivacyConcerns } from './CriticalPrivacyConcerns';
import { CookieBreakdownSummary } from './CookieBreakdownSummary';
import { BigTechTrackerContext } from './BigTechTrackerContext';

interface Issue {
  category: string;
  title: string;
  severity: string;
}

interface Evidence {
  kind: string;
  title: string;
  details?: unknown;
}

export interface ConditionalContentProps {
  domain: string;
  score: number | null;
  trackerCount?: number;
  cookieCount?: number;
  thirdPartyCount?: number;
  evidence?: Evidence[];
  issues?: Issue[];
  trackerNames?: string[];
}

/**
 * Determines which conditional blocks to show based on findings.
 * Returns null for "clean" sites (nothing special to highlight).
 */
export function ConditionalContent({
  domain,
  score,
  trackerCount = 0,
  cookieCount = 0,
  evidence = [],
  issues = [],
  trackerNames = [],
}: ConditionalContentProps) {
  // Extract fingerprinting types from evidence
  const fingerprintingEvidence = evidence.filter(
    (e) =>
      e.kind === 'fingerprinting' ||
      e.kind === 'canvas_fingerprinting' ||
      e.kind === 'webgl_fingerprinting' ||
      e.kind === 'audio_fingerprinting'
  );

  const hasFingerprinting = fingerprintingEvidence.length > 0;
  const fingerprintingTypes = fingerprintingEvidence.map((e) => {
    if (e.kind === 'canvas_fingerprinting') return 'canvas';
    if (e.kind === 'webgl_fingerprinting') return 'webgl';
    if (e.kind === 'audio_fingerprinting') return 'audio';
    return 'general';
  });

  // Determine which blocks to show
  const showCritical = score !== null && score < 40;
  const showFingerprinting = hasFingerprinting;
  const showHighTrackers = trackerCount > 10;
  const showCookieBreakdown = cookieCount > 15;
  const showBigTech =
    trackerNames.length > 0 &&
    trackerNames.some((t) =>
      /google|facebook|amazon|microsoft|tiktok|twitter|meta|doubleclick|youtube/i.test(t)
    );

  // If nothing notable, don't render anything
  if (
    !showCritical &&
    !showFingerprinting &&
    !showHighTrackers &&
    !showCookieBreakdown &&
    !showBigTech
  ) {
    return null;
  }

  return (
    <div className="conditional-seo-content space-y-4">
      {/* Critical concerns first (most important) */}
      {showCritical && score !== null && (
        <CriticalPrivacyConcerns domain={domain} score={score} issues={issues} />
      )}

      {/* Fingerprinting (unique, high-interest content) */}
      {showFingerprinting && (
        <FingerprintingExplainer domain={domain} fingerprintingTypes={fingerprintingTypes} />
      )}

      {/* Big tech trackers (contextual, educational) */}
      {showBigTech && <BigTechTrackerContext domain={domain} bigTechTrackers={trackerNames} />}

      {/* High tracker count (quantitative concern) */}
      {showHighTrackers && (
        <HighTrackerExplainer
          domain={domain}
          trackerCount={trackerCount}
          trackerNames={trackerNames}
        />
      )}

      {/* Cookie breakdown (detailed analysis) */}
      {showCookieBreakdown && <CookieBreakdownSummary domain={domain} cookieCount={cookieCount} />}
    </div>
  );
}
