/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import {
  SEO_CONSTANTS,
  getPageHeading,
  getPageTitle,
  buildMetaDescription,
  buildCanonicalUrl,
  buildOpenGraphData,
  formatScanDate,
  getScanFreshnessText,
  type ScanDataForMetadata,
} from './metadata.js';

describe('SEO_CONSTANTS', () => {
  it('has correct site name', () => {
    expect(SEO_CONSTANTS.SITE_NAME).toBe('Gecko Advisor');
  });

  it('has correct base URL', () => {
    expect(SEO_CONSTANTS.BASE_URL).toBe('https://geckoadvisor.com');
  });

  it('has a default description', () => {
    expect(SEO_CONSTANTS.DEFAULT_DESCRIPTION).toBeTruthy();
    expect(SEO_CONSTANTS.DEFAULT_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});

describe('getPageHeading', () => {
  it('includes domain', () => {
    expect(getPageHeading('example.com', 75)).toContain('example.com');
  });

  it('includes score when provided', () => {
    expect(getPageHeading('example.com', 75)).toContain('75');
    expect(getPageHeading('example.com', 75)).toContain('100');
  });

  it('includes Privacy', () => {
    expect(getPageHeading('example.com', 75).toLowerCase()).toContain('privacy');
  });

  it('handles edge case score 0', () => {
    const heading = getPageHeading('example.com', 0);
    expect(heading).toContain('0/100');
  });

  it('handles edge case score 100', () => {
    const heading = getPageHeading('example.com', 100);
    expect(heading).toContain('100/100');
  });

  it('handles undefined score', () => {
    const heading = getPageHeading('example.com', undefined);
    expect(heading).toContain('example.com');
    expect(heading.toLowerCase()).toContain('privacy');
    expect(heading).not.toContain('/100');
  });

  it('handles null score', () => {
    const heading = getPageHeading('example.com', null);
    expect(heading).toContain('example.com');
    expect(heading).not.toContain('/100');
  });

  it('handles negative score (invalid)', () => {
    const heading = getPageHeading('example.com', -1);
    expect(heading).not.toContain('-1');
  });

  it('handles score > 100 (invalid)', () => {
    const heading = getPageHeading('example.com', 101);
    expect(heading).not.toContain('101');
  });
});

describe('getPageTitle', () => {
  it('contains domain', () => {
    expect(getPageTitle('example.com', 75)).toContain('example.com');
  });

  it('contains score when provided', () => {
    expect(getPageTitle('example.com', 75)).toContain('75');
  });

  it('contains Privacy', () => {
    expect(getPageTitle('example.com', 75).toLowerCase()).toContain('privacy');
  });

  it('handles no score', () => {
    const title = getPageTitle('example.com');
    expect(title).toContain('example.com');
    expect(title.toLowerCase()).toContain('privacy');
  });
});

describe('buildMetaDescription', () => {
  const fullData: ScanDataForMetadata = {
    status: 'done',
    score: 75,
    trackerCount: 5,
    thirdPartyCount: 10,
    tlsGrade: 'A',
    finishedAt: new Date().toISOString(),
  };

  it('description ≤ 155 characters', () => {
    const desc = buildMetaDescription(fullData, 'example.com');
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it('contains domain', () => {
    const desc = buildMetaDescription(fullData, 'example.com');
    expect(desc).toContain('example.com');
  });

  it('contains score when available', () => {
    const desc = buildMetaDescription(fullData, 'example.com');
    expect(desc).toContain('75');
  });

  it('handles null scanData', () => {
    const desc = buildMetaDescription(null, 'example.com');
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(desc).toContain('example.com');
  });

  it('handles missing score', () => {
    const { score: _score, ...dataWithoutScore } = fullData;
    const desc = buildMetaDescription(dataWithoutScore, 'example.com');
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(desc).toContain('example.com');
  });

  it('includes tracker count when available', () => {
    const desc = buildMetaDescription(fullData, 'example.com');
    expect(desc).toContain('5');
    expect(desc.toLowerCase()).toContain('tracker');
  });

  it('handles zero trackers', () => {
    const desc = buildMetaDescription({ ...fullData, trackerCount: 0 }, 'example.com');
    expect(desc.toLowerCase()).toContain('no tracker');
  });

  it('shows correct risk level for high score', () => {
    const desc = buildMetaDescription({ ...fullData, score: 85 }, 'example.com');
    expect(desc.toLowerCase()).toContain('low risk');
  });

  it('shows correct risk level for medium score', () => {
    const desc = buildMetaDescription({ ...fullData, score: 60 }, 'example.com');
    expect(desc.toLowerCase()).toContain('moderate risk');
  });

  it('shows correct risk level for low score', () => {
    const desc = buildMetaDescription({ ...fullData, score: 30 }, 'example.com');
    expect(desc.toLowerCase()).toContain('high risk');
  });
});

describe('buildCanonicalUrl', () => {
  it('returns correct format', () => {
    expect(buildCanonicalUrl('example.com')).toBe('https://geckoadvisor.com/privacy-policy/example.com');
  });

  it('uses custom base URL when provided', () => {
    expect(buildCanonicalUrl('example.com', 'https://custom.com')).toBe(
      'https://custom.com/privacy-policy/example.com'
    );
  });
});

describe('buildOpenGraphData', () => {
  const fullData: ScanDataForMetadata = {
    status: 'done',
    score: 75,
    trackerCount: 5,
    thirdPartyCount: 10,
    tlsGrade: 'A',
  };

  it('returns correct structure', () => {
    const og = buildOpenGraphData(fullData, 'example.com');
    expect(og).toHaveProperty('title');
    expect(og).toHaveProperty('description');
    expect(og).toHaveProperty('url');
    expect(og).toHaveProperty('siteName');
    expect(og).toHaveProperty('type');
  });

  it('title contains domain', () => {
    const og = buildOpenGraphData(fullData, 'example.com');
    expect(og.title).toContain('example.com');
  });

  it('title contains site name', () => {
    const og = buildOpenGraphData(fullData, 'example.com');
    expect(og.title).toContain('Gecko Advisor');
  });

  it('url is canonical URL', () => {
    const og = buildOpenGraphData(fullData, 'example.com');
    expect(og.url).toBe('https://geckoadvisor.com/privacy-policy/example.com');
  });

  it('type is article', () => {
    const og = buildOpenGraphData(fullData, 'example.com');
    expect(og.type).toBe('article');
  });
});

describe('formatScanDate', () => {
  it('formats valid Date object', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const formatted = formatScanDate(date);
    expect(formatted).toContain('2024');
    expect(formatted).toContain('January');
    expect(formatted).toContain('15');
  });

  it('formats valid date string', () => {
    const formatted = formatScanDate('2024-01-15T12:00:00Z');
    expect(formatted).toContain('2024');
    expect(formatted).toContain('January');
  });

  it('returns Unknown date for null', () => {
    expect(formatScanDate(null)).toBe('Unknown date');
  });

  it('returns Unknown date for undefined', () => {
    expect(formatScanDate(undefined)).toBe('Unknown date');
  });

  it('returns Unknown date for invalid date string', () => {
    expect(formatScanDate('invalid-date')).toBe('Unknown date');
  });
});

describe('getScanFreshnessText', () => {
  it('returns "Scanned today" for today', () => {
    const today = new Date();
    expect(getScanFreshnessText(today)).toBe('Scanned today');
  });

  it('returns "Scanned yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getScanFreshnessText(yesterday)).toBe('Scanned yesterday');
  });

  it('returns days ago for recent dates', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(getScanFreshnessText(threeDaysAgo)).toBe('Scanned 3 days ago');
  });

  it('returns weeks ago for older dates', () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    expect(getScanFreshnessText(twoWeeksAgo)).toBe('Scanned 2 weeks ago');
  });

  it('returns months ago for much older dates', () => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    expect(getScanFreshnessText(twoMonthsAgo)).toBe('Scanned 2 months ago');
  });

  it('handles null', () => {
    expect(getScanFreshnessText(null)).toBe('Scan date unknown');
  });

  it('handles invalid date', () => {
    expect(getScanFreshnessText('invalid')).toBe('Scan date unknown');
  });
});
