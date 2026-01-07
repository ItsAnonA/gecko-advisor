/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import { getIndexTier, isIndexable, getRobotsDirective, type ScanDataForGating } from './index-gating.js';

describe('getIndexTier', () => {
  // Full tier data (all fields present and valid)
  const fullData: ScanDataForGating = {
    status: 'done',
    score: 75,
    progress: 100,
    finishedAt: new Date().toISOString(),
    trackerCount: 5,
    thirdPartyCount: 10,
    cookieCount: 3,
    tlsGrade: 'A',
  };

  describe('full tier conditions', () => {
    it('returns full for complete data', () => {
      expect(getIndexTier(fullData)).toBe('full');
    });

    it('returns full for score 0 (valid, not missing)', () => {
      expect(getIndexTier({ ...fullData, score: 0 })).toBe('full');
    });

    it('returns full for score 100', () => {
      expect(getIndexTier({ ...fullData, score: 100 })).toBe('full');
    });

    // CRITICAL: zero metrics are VALID
    it('returns full for zero trackerCount (privacy-first site)', () => {
      expect(getIndexTier({ ...fullData, trackerCount: 0 })).toBe('full');
    });

    it('returns full for zero thirdPartyCount (static site)', () => {
      expect(getIndexTier({ ...fullData, thirdPartyCount: 0 })).toBe('full');
    });

    it('returns full for all zeros (valid, not thin)', () => {
      expect(
        getIndexTier({
          ...fullData,
          trackerCount: 0,
          thirdPartyCount: 0,
          cookieCount: 0,
        })
      ).toBe('full');
    });

    it('returns full with Date object for finishedAt', () => {
      expect(getIndexTier({ ...fullData, finishedAt: new Date() })).toBe('full');
    });
  });

  describe('limited tier conditions', () => {
    it('returns limited when missing trackerCount', () => {
      const { trackerCount: _trackerCount, ...limited } = fullData;
      expect(getIndexTier(limited)).toBe('limited');
    });

    it('returns limited when missing thirdPartyCount', () => {
      const { thirdPartyCount: _thirdPartyCount, ...limited } = fullData;
      expect(getIndexTier(limited)).toBe('limited');
    });

    it('returns limited when missing tlsGrade', () => {
      const { tlsGrade: _tlsGrade, ...limited } = fullData;
      expect(getIndexTier(limited)).toBe('limited');
    });

    it('returns limited when tlsGrade is empty string', () => {
      expect(getIndexTier({ ...fullData, tlsGrade: '' })).toBe('limited');
    });
  });

  describe('noindex tier conditions', () => {
    it('returns noindex for null', () => {
      expect(getIndexTier(null)).toBe('noindex');
    });

    it('returns noindex for undefined', () => {
      expect(getIndexTier(undefined)).toBe('noindex');
    });

    it('returns noindex for status !== done', () => {
      expect(getIndexTier({ ...fullData, status: 'pending' })).toBe('noindex');
      expect(getIndexTier({ ...fullData, status: 'running' })).toBe('noindex');
      expect(getIndexTier({ ...fullData, status: 'error' })).toBe('noindex');
      expect(getIndexTier({ ...fullData, status: 'failed' })).toBe('noindex');
      expect(getIndexTier({ ...fullData, status: '' })).toBe('noindex');
    });

    it('returns noindex for null score', () => {
      expect(getIndexTier({ ...fullData, score: null })).toBe('noindex');
    });

    it('returns noindex for undefined score', () => {
      expect(getIndexTier({ ...fullData, score: undefined })).toBe('noindex');
    });

    it('returns noindex for NaN score', () => {
      expect(getIndexTier({ ...fullData, score: NaN })).toBe('noindex');
    });

    it('returns noindex for negative score', () => {
      expect(getIndexTier({ ...fullData, score: -1 })).toBe('noindex');
      expect(getIndexTier({ ...fullData, score: -100 })).toBe('noindex');
    });

    it('returns noindex for score > 100', () => {
      expect(getIndexTier({ ...fullData, score: 101 })).toBe('noindex');
      expect(getIndexTier({ ...fullData, score: 1000 })).toBe('noindex');
    });

    it('returns noindex for invalid finishedAt date', () => {
      expect(getIndexTier({ ...fullData, finishedAt: 'invalid-date' })).toBe('noindex');
      expect(getIndexTier({ ...fullData, finishedAt: new Date('invalid') })).toBe('noindex');
    });

    it('returns limited (not noindex) when finishedAt is missing but other data incomplete', () => {
      // If finishedAt is missing but status is done and has score, we get limited tier
      // because it's missing analysis data (tlsGrade etc)
      const { finishedAt: _finishedAt, tlsGrade: _tlsGrade, ...data } = fullData;
      expect(getIndexTier(data)).toBe('limited');
    });
  });

  describe('edge cases', () => {
    it('handles NaN trackerCount', () => {
      expect(getIndexTier({ ...fullData, trackerCount: NaN })).toBe('limited');
    });

    it('handles NaN thirdPartyCount', () => {
      expect(getIndexTier({ ...fullData, thirdPartyCount: NaN })).toBe('limited');
    });

    it('handles empty object', () => {
      expect(getIndexTier({})).toBe('noindex');
    });

    it('handles object with only status', () => {
      expect(getIndexTier({ status: 'done' })).toBe('noindex');
    });
  });
});

describe('isIndexable', () => {
  it('returns true for full tier', () => {
    expect(
      isIndexable({
        status: 'done',
        score: 75,
        trackerCount: 5,
        thirdPartyCount: 10,
        tlsGrade: 'A',
      })
    ).toBe(true);
  });

  it('returns false for limited tier (thin content)', () => {
    // Limited tier has incomplete analysis data (~200 words) - should not be indexed
    expect(
      isIndexable({
        status: 'done',
        score: 75,
      })
    ).toBe(false);
  });

  it('returns false for noindex tier', () => {
    expect(isIndexable(null)).toBe(false);
    expect(isIndexable({ status: 'error' })).toBe(false);
    expect(isIndexable({ status: 'done', score: NaN })).toBe(false);
  });
});

describe('getRobotsDirective', () => {
  it('returns index: true for full tier', () => {
    expect(getRobotsDirective('full')).toEqual({ index: true, follow: true });
  });

  it('returns index: false for limited tier (thin content)', () => {
    // Limited tier has thin content - should not be indexed
    expect(getRobotsDirective('limited')).toEqual({ index: false, follow: true });
  });

  it('returns index: false for noindex tier', () => {
    expect(getRobotsDirective('noindex')).toEqual({ index: false, follow: true });
  });

  it('always returns follow: true', () => {
    expect(getRobotsDirective('full').follow).toBe(true);
    expect(getRobotsDirective('limited').follow).toBe(true);
    expect(getRobotsDirective('noindex').follow).toBe(true);
  });
});
