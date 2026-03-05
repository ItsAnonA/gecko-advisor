/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Answer Content Service (Phase C1)
 *
 * Generates factual, template-based text for answer pages.
 * Uses hedge language (no causal claims). Pure data narration.
 */

import { labelForScore } from '@gecko-advisor/shared';

export interface AnswerDataPoint {
  label: string;
  value: string;
}

export interface AnswerFaqItem {
  q: string;
  a: string;
}

export interface AnswerContent {
  headline: string;
  paragraphs: string[];
  dataPoints: AnswerDataPoint[];
  faqItems: AnswerFaqItem[];
}

interface DomainTrackingData {
  domain: string;
  score: number;
  trackerCount: number;
  cookieCount: number;
  hasFingerprinting: boolean;
  trackerNames: string[];
}

interface CategoryRankingDomain {
  domain: string;
  displayName: string;
  score: number;
  trackerCount: number;
  cookieCount: number;
}

interface TrackerUsageData {
  trackerName: string;
  domainCount: number;
  datasetPercentage: number;
  topDomains: Array<{ domain: string; displayName: string; score: number }>;
}

/**
 * Generate content for a domain-tracking answer.
 */
export function generateDomainTrackingContent(data: DomainTrackingData): AnswerContent {
  const grade = labelForScore(data.score);
  const trackerList = data.trackerNames.slice(0, 5).join(', ');
  const moreCount = Math.max(0, data.trackerNames.length - 5);

  const headline = `Based on our scan, ${data.domain} loads ${data.trackerCount} third-party tracker${data.trackerCount !== 1 ? 's' : ''}.`;

  const paragraphs = [
    `Our analysis of ${data.domain} detected ${data.trackerCount} third-party tracker${data.trackerCount !== 1 ? 's' : ''} and ${data.cookieCount} cookie${data.cookieCount !== 1 ? 's' : ''}. The domain received a privacy score of ${data.score}/100 (Grade ${grade}).`,
  ];

  if (data.trackerNames.length > 0) {
    const trackerText = moreCount > 0
      ? `Detected trackers include ${trackerList}, and ${moreCount} more.`
      : `Detected trackers include ${trackerList}.`;
    paragraphs.push(trackerText);
  }

  if (data.hasFingerprinting) {
    paragraphs.push(
      `Our scan also detected browser fingerprinting techniques, which may be used for persistent cross-site identification.`
    );
  }

  const dataPoints: AnswerDataPoint[] = [
    { label: 'Privacy Score', value: `${data.score}/100 (${grade})` },
    { label: 'Trackers Detected', value: String(data.trackerCount) },
    { label: 'Cookies', value: String(data.cookieCount) },
    { label: 'Fingerprinting', value: data.hasFingerprinting ? 'Detected' : 'Not Detected' },
  ];

  const faqItems: AnswerFaqItem[] = [
    {
      q: `Does ${data.domain} use tracking cookies?`,
      a: `Our scan detected ${data.cookieCount} cookie${data.cookieCount !== 1 ? 's' : ''} on ${data.domain}, including ${data.trackerCount} associated with third-party trackers.`,
    },
    {
      q: `What is ${data.domain}'s privacy score?`,
      a: `${data.domain} received a privacy score of ${data.score}/100 (Grade ${grade}) based on our automated analysis of trackers, cookies, fingerprinting, and security headers.`,
    },
  ];

  return { headline, paragraphs, dataPoints, faqItems };
}

/**
 * Generate content for a category-ranking answer.
 */
export function generateCategoryRankingContent(
  title: string,
  category: string,
  sortField: string,
  domains: CategoryRankingDomain[],
  avgScore: number
): AnswerContent {
  const isByScore = sortField === 'score';
  const topDomain = domains[0];

  const headline = isByScore
    ? `Among ${category} platforms we analyzed, ${topDomain?.displayName || 'the top domain'} appears to have the highest privacy score.`
    : `Among ${category} platforms we analyzed, ${topDomain?.displayName || 'the top domain'} appears to load the most trackers.`;

  const paragraphs = [
    `We analyzed ${domains.length} ${category} domains. The average privacy score in this category is ${avgScore.toFixed(1)}/100.`,
  ];

  if (domains.length >= 3) {
    const top3 = domains.slice(0, 3);
    const listText = top3
      .map((d) =>
        isByScore
          ? `${d.displayName} (score: ${d.score})`
          : `${d.displayName} (${d.trackerCount} trackers)`
      )
      .join(', ');
    paragraphs.push(`The top three are: ${listText}.`);
  }

  const dataPoints: AnswerDataPoint[] = [
    { label: 'Domains Analyzed', value: String(domains.length) },
    { label: 'Avg Score', value: avgScore.toFixed(1) },
  ];

  if (topDomain) {
    dataPoints.push(
      { label: isByScore ? 'Highest Score' : 'Most Trackers', value: topDomain.displayName },
    );
  }

  const faqItems: AnswerFaqItem[] = [
    {
      q: title,
      a: headline,
    },
  ];

  return { headline, paragraphs, dataPoints, faqItems };
}

/**
 * Generate content for a tracker-usage answer.
 */
export function generateTrackerUsageContent(data: TrackerUsageData): AnswerContent {
  const headline = `${data.domainCount.toLocaleString()} websites in our dataset use ${data.trackerName}, representing ${data.datasetPercentage}% of scanned domains.`;

  const paragraphs = [
    headline,
  ];

  if (data.topDomains.length >= 3) {
    const top3 = data.topDomains.slice(0, 3).map((d) => d.displayName).join(', ');
    paragraphs.push(`Notable domains using ${data.trackerName} include ${top3}.`);
  }

  const dataPoints: AnswerDataPoint[] = [
    { label: 'Domains Using', value: data.domainCount.toLocaleString() },
    { label: '% of Dataset', value: `${data.datasetPercentage}%` },
  ];

  const faqItems: AnswerFaqItem[] = [
    {
      q: `How many websites use ${data.trackerName}?`,
      a: headline,
    },
  ];

  return { headline, paragraphs, dataPoints, faqItems };
}
