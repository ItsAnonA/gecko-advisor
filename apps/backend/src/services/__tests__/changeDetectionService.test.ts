import { describe, it, expect } from 'vitest';
import {
  classifyChange,
  calculateSignificance,
  extractScanData,
  buildChangeReasons,
} from '../changeDetectionService.js';

// ============================================================================
// Change Classification
// ============================================================================

describe('classifyChange', () => {
  // NONE: |scoreDelta| < 2 and no significant tracker changes
  it('returns NONE for zero delta and no changes', () => {
    expect(classifyChange(0, false, 0, 0)).toBe('NONE');
  });

  it('returns NONE for delta of 1 with no tracker changes', () => {
    expect(classifyChange(1, false, 0, 0)).toBe('NONE');
  });

  it('returns NONE for delta of -1 with no tracker changes', () => {
    expect(classifyChange(-1, false, 0, 0)).toBe('NONE');
  });

  // MINOR: 2-5 points
  it('returns MINOR for delta of 2', () => {
    expect(classifyChange(2, false, 0, 0)).toBe('MINOR');
  });

  it('returns MINOR for delta of 5', () => {
    expect(classifyChange(5, false, 0, 0)).toBe('MINOR');
  });

  it('returns MINOR for delta of -3', () => {
    expect(classifyChange(-3, false, 0, 0)).toBe('MINOR');
  });

  it('returns MINOR for significant tracker changes even with zero delta', () => {
    expect(classifyChange(0, false, 3, 0)).toBe('MINOR');
    expect(classifyChange(0, false, 0, 3)).toBe('MINOR');
  });

  // MODERATE: 6-15 points
  it('returns MODERATE for delta of 6', () => {
    expect(classifyChange(6, false, 0, 0)).toBe('MODERATE');
  });

  it('returns MODERATE for delta of 15', () => {
    expect(classifyChange(15, false, 0, 0)).toBe('MODERATE');
  });

  it('returns MODERATE for delta of -10', () => {
    expect(classifyChange(-10, false, 0, 0)).toBe('MODERATE');
  });

  // MAJOR: 16-25 points
  it('returns MAJOR for delta of 16', () => {
    expect(classifyChange(16, false, 0, 0)).toBe('MAJOR');
  });

  it('returns MAJOR for delta of 25', () => {
    expect(classifyChange(25, false, 0, 0)).toBe('MAJOR');
  });

  it('returns MAJOR for delta of -20', () => {
    expect(classifyChange(-20, false, 0, 0)).toBe('MAJOR');
  });

  // CRITICAL: >25 points OR fingerprinting changed
  it('returns CRITICAL for delta of 26', () => {
    expect(classifyChange(26, false, 0, 0)).toBe('CRITICAL');
  });

  it('returns CRITICAL for delta of -30', () => {
    expect(classifyChange(-30, false, 0, 0)).toBe('CRITICAL');
  });

  it('returns CRITICAL for delta of 50', () => {
    expect(classifyChange(50, false, 0, 0)).toBe('CRITICAL');
  });

  it('returns CRITICAL when fingerprinting changed regardless of delta', () => {
    expect(classifyChange(0, true, 0, 0)).toBe('CRITICAL');
    expect(classifyChange(1, true, 0, 0)).toBe('CRITICAL');
    expect(classifyChange(-1, true, 0, 0)).toBe('CRITICAL');
  });

  // Edge cases
  it('prioritizes CRITICAL (fingerprinting) over score-based classification', () => {
    // Even with MINOR-level delta, fingerprinting change = CRITICAL
    expect(classifyChange(3, true, 0, 0)).toBe('CRITICAL');
  });
});

// ============================================================================
// Significance Calculation
// ============================================================================

describe('calculateSignificance', () => {
  it('returns 0 for no changes', () => {
    expect(calculateSignificance(0, false, 0, 0)).toBe(0);
  });

  it('score delta contributes up to 0.5', () => {
    // 50 point delta = max 0.5
    expect(calculateSignificance(50, false, 0, 0)).toBe(0.5);
    // Beyond 50 still caps at 0.5
    expect(calculateSignificance(100, false, 0, 0)).toBe(0.5);
  });

  it('fingerprinting change adds 0.3', () => {
    const withoutFp = calculateSignificance(0, false, 0, 0);
    const withFp = calculateSignificance(0, true, 0, 0);
    expect(withFp - withoutFp).toBe(0.3);
  });

  it('tracker changes contribute up to 0.2', () => {
    // 10 tracker changes = 0.2
    expect(calculateSignificance(0, false, 5, 5)).toBe(0.2);
    // More than 10 still caps at 0.2
    expect(calculateSignificance(0, false, 10, 10)).toBe(0.2);
  });

  it('total caps at 1.0', () => {
    // All maximized: 0.5 + 0.3 + 0.2 = 1.0
    expect(calculateSignificance(100, true, 20, 20)).toBe(1.0);
  });

  it('calculates proportionally for moderate changes', () => {
    // 10 point delta = 10/50 = 0.2
    const result = calculateSignificance(10, false, 0, 0);
    expect(result).toBeCloseTo(0.2, 2);
  });

  it('combines all factors correctly', () => {
    // 20 delta (20/50 = 0.4) + fingerprinting (0.3) + 4 tracker changes (min(4/10, 0.2) = 0.2)
    const result = calculateSignificance(20, true, 2, 2);
    // 0.4 + 0.3 + 0.2 = 0.9 → min(0.9, 1.0) = 0.9
    expect(result).toBeCloseTo(0.9, 2);
  });
});

// ============================================================================
// Extract Scan Data
// ============================================================================

describe('extractScanData', () => {
  const baseScan = {
    id: 'scan-1',
    targetType: 'url' as const,
    input: 'https://example.com',
    normalizedInput: 'https://example.com',
    status: 'done' as const,
    score: 85,
    label: 'Good',
    progress: 100,
    summary: null,
    startedAt: new Date(),
    finishedAt: new Date(),
    slug: 'test-slug',
    source: 'manual' as const,
    dedupeOfId: null,
    shareMessage: null,
    meta: null,
    userId: null,
    isPublic: true,
    isProScan: false,
    scannerIp: null,
    domainId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('extracts basic scan data', () => {
    const scan = { ...baseScan, evidence: [] };
    const result = extractScanData(scan);
    expect(result.scanId).toBe('scan-1');
    expect(result.score).toBe(85);
    expect(result.trackers).toHaveLength(0);
    expect(result.hasFingerprinting).toBe(false);
  });

  it('extracts tracker domains from evidence', () => {
    const scan = {
      ...baseScan,
      evidence: [
        { kind: 'tracker', details: { domain: 'google-analytics.com' } },
        { kind: 'tracker', details: { domain: 'facebook.net' } },
      ],
    };
    const result = extractScanData(scan);
    expect(result.trackers).toContain('google-analytics.com');
    expect(result.trackers).toContain('facebook.net');
    expect(result.trackerCount).toBe(2);
  });

  it('extracts tracker domains using root field as fallback', () => {
    const scan = {
      ...baseScan,
      evidence: [{ kind: 'tracker', details: { root: 'tracker.example.com' } }],
    };
    const result = extractScanData(scan);
    expect(result.trackers).toContain('tracker.example.com');
  });

  it('deduplicates tracker domains', () => {
    const scan = {
      ...baseScan,
      evidence: [
        { kind: 'tracker', details: { domain: 'google-analytics.com' } },
        { kind: 'tracker', details: { domain: 'google-analytics.com' } },
      ],
    };
    const result = extractScanData(scan);
    expect(result.trackers).toHaveLength(1);
  });

  it('detects fingerprinting', () => {
    const scan = {
      ...baseScan,
      evidence: [{ kind: 'fingerprint', details: {} }],
    };
    const result = extractScanData(scan);
    expect(result.hasFingerprinting).toBe(true);
  });

  it('also extracts third_party_tracker kind', () => {
    const scan = {
      ...baseScan,
      evidence: [
        { kind: 'third_party_tracker', details: { domain: 'ads.example.com' } },
      ],
    };
    const result = extractScanData(scan);
    expect(result.trackers).toContain('ads.example.com');
  });

  it('uses score 0 when scan.score is null', () => {
    const scan = { ...baseScan, score: null, evidence: [] };
    const result = extractScanData(scan);
    expect(result.score).toBe(0);
  });
});

// ============================================================================
// Build Change Reasons
// ============================================================================

describe('buildChangeReasons', () => {
  it('reports score improvement', () => {
    const reasons = buildChangeReasons(10, false, false, [], []);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('improved');
    expect(reasons[0]).toContain('10');
  });

  it('reports score decrease', () => {
    const reasons = buildChangeReasons(-5, false, false, [], []);
    expect(reasons[0]).toContain('decreased');
    expect(reasons[0]).toContain('5');
  });

  it('reports fingerprinting detected', () => {
    const reasons = buildChangeReasons(0, true, true, [], []);
    expect(reasons).toContain('Fingerprinting techniques detected');
  });

  it('reports fingerprinting removed', () => {
    const reasons = buildChangeReasons(0, true, false, [], []);
    expect(reasons).toContain('Fingerprinting techniques removed');
  });

  it('lists added trackers (small count)', () => {
    const reasons = buildChangeReasons(0, false, false, ['a.com', 'b.com'], []);
    expect(reasons[0]).toContain('Added trackers: a.com, b.com');
  });

  it('summarizes added trackers (large count)', () => {
    const reasons = buildChangeReasons(
      0, false, false,
      ['a.com', 'b.com', 'c.com', 'd.com'], []
    );
    expect(reasons[0]).toContain('Added 4 trackers');
  });

  it('lists removed trackers', () => {
    const reasons = buildChangeReasons(0, false, false, [], ['old.com']);
    expect(reasons[0]).toContain('Removed trackers: old.com');
  });

  it('returns empty for no changes', () => {
    const reasons = buildChangeReasons(0, false, false, [], []);
    expect(reasons).toHaveLength(0);
  });

  it('combines multiple reasons', () => {
    const reasons = buildChangeReasons(-15, true, true, ['new.com'], ['old.com']);
    expect(reasons.length).toBe(4);
  });
});
