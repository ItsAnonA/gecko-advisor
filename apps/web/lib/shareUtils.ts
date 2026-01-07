/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Share Copy Utilities
 *
 * Generates pre-written share copy for privacy reports.
 *
 * RULES:
 * - Precision > praise
 * - Avoid absolutes like "respects your privacy" (legal risk)
 * - No editorializing on low scores
 * - Factual, verifiable claims only
 */

export interface ShareCopyParams {
  domain: string;
  score: number;
  trackerCount: number;
  tlsGrade?: string;
}

export interface ShareCopyResult {
  text: string;
  hashtags: string[];
}

/**
 * Generates pre-written share copy based on report data
 *
 * Copy varies based on score and tracker count:
 * - High score (≥80), no trackers: Strongest factual claim
 * - High score with trackers: Comparative claim
 * - Moderate score (60-79): Neutral framing
 * - Low score (<60): Factual only, no editorializing
 */
export function generateShareCopy({
  domain,
  score,
  trackerCount,
  tlsGrade,
}: ShareCopyParams): ShareCopyResult {
  // High score, no trackers - strongest claim (still precise)
  if (score >= 80 && trackerCount === 0) {
    return {
      text: `No trackers detected on ${domain}. Privacy score: ${score}/100.`,
      hashtags: ['privacy', 'security'],
    };
  }

  // High score with some trackers
  if (score >= 80) {
    return {
      text: `${domain} scores ${score}/100 on privacy — fewer trackers than most sites.`,
      hashtags: ['privacy', 'websecurity'],
    };
  }

  // Moderate score - neutral framing
  if (score >= 60) {
    return {
      text: `Privacy report for ${domain}: ${score}/100. See the full analysis.`,
      hashtags: ['privacy'],
    };
  }

  // Low score - factual, no editorializing
  return {
    text: `Privacy analysis of ${domain}: ${score}/100.`,
    hashtags: ['privacy'],
  };
}

/**
 * Returns the canonical share URL for a domain
 */
export function getShareUrl(domain: string): string {
  return `https://geckoadvisor.com/privacy-report/${encodeURIComponent(domain)}`;
}

/**
 * Generates a Twitter/X share URL with pre-written copy
 */
export function getTwitterShareUrl(params: ShareCopyParams): string {
  const { text, hashtags } = generateShareCopy(params);
  const url = getShareUrl(params.domain);

  const twitterUrl = new URL('https://twitter.com/intent/tweet');
  twitterUrl.searchParams.set('text', text);
  twitterUrl.searchParams.set('url', url);
  if (hashtags.length > 0) {
    twitterUrl.searchParams.set('hashtags', hashtags.join(','));
  }

  return twitterUrl.toString();
}

/**
 * Generates a LinkedIn share URL
 */
export function getLinkedInShareUrl(domain: string): string {
  const url = getShareUrl(domain);
  const linkedInUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  linkedInUrl.searchParams.set('url', url);
  return linkedInUrl.toString();
}

/**
 * Copies text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
