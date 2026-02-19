import { describe, it, expect } from 'vitest';
import {
  calculateStdDev,
  calculateTrend,
  computeStabilityFromData,
  computeProvisionalFromData,
  computeScanConfidence,
  computePercentiles,
  STABILITY_REQUIREMENTS,
} from '../stabilityService.js';

// ============================================================================
// Helper: create scan rows with finishedAt dates relative to "now"
// ============================================================================

function makeScan(score: number, daysAgo: number): { score: number | null; finishedAt: Date | null } {
  const now = new Date();
  return {
    score,
    finishedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

function makeChange(
  changeType: 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL',
  daysAgo: number
): { detectedAt: Date; changeType: typeof changeType } {
  const now = new Date();
  return {
    changeType,
    detectedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

// ============================================================================
// calculateStdDev
// ============================================================================

describe('calculateStdDev', () => {
  it('returns 0 for empty array', () => {
    expect(calculateStdDev([])).toBe(0);
  });

  it('returns 0 for single value', () => {
    expect(calculateStdDev([50])).toBe(0);
  });

  it('returns 0 for identical values', () => {
    expect(calculateStdDev([80, 80, 80])).toBe(0);
  });

  it('calculates correct standard deviation', () => {
    // [60, 80] -> mean=70, diffs=[-10,10], squaredDiffs=[100,100], variance=100, stddev=10
    expect(calculateStdDev([60, 80])).toBe(10);
  });

  it('handles larger arrays', () => {
    const values = [10, 20, 30, 40, 50];
    // mean=30, diffs=[-20,-10,0,10,20], squared=[400,100,0,100,400], var=200, std=~14.14
    const result = calculateStdDev(values);
    expect(result).toBeCloseTo(14.142, 2);
  });
});

// ============================================================================
// calculateTrend
// ============================================================================

describe('calculateTrend', () => {
  it('returns STABLE with trendStrength 0 for fewer than 3 scans', () => {
    const result = calculateTrend([makeScan(80, 1), makeScan(75, 10)]);
    expect(result.trend).toBe('STABLE');
    expect(result.trendStrength).toBe(0);
  });

  it('returns STABLE for consistent scores', () => {
    const scans = [makeScan(80, 1), makeScan(80, 10), makeScan(80, 20), makeScan(80, 30)];
    const result = calculateTrend(scans);
    expect(result.trend).toBe('STABLE');
  });

  it('detects IMPROVING trend when recent scores are higher', () => {
    // Recent half (first 2): 82, 80 -> avg 81
    // Older half (last 2): 74, 72 -> avg 73
    // percentChange = (81 - 73) / 73 * 100 = ~10.96%
    // CV = ~0.054 (low variance, clear directional improvement)
    const scans = [makeScan(82, 1), makeScan(80, 5), makeScan(74, 20), makeScan(72, 30)];
    const result = calculateTrend(scans);
    expect(result.trend).toBe('IMPROVING');
    expect(result.trendStrength).toBeGreaterThan(0);
  });

  it('detects VOLATILE over IMPROVING when variance is high', () => {
    // Same improving direction but with extreme swings
    // Recent half: 90, 88 -> avg 89; Older half: 60, 55 -> avg 57.5
    // CV = ~0.22 > 0.15 → VOLATILE takes precedence
    const scans = [makeScan(90, 1), makeScan(88, 5), makeScan(60, 20), makeScan(55, 30)];
    const result = calculateTrend(scans);
    expect(result.trend).toBe('VOLATILE');
  });

  it('detects DECLINING trend when recent scores are lower', () => {
    // Recent half (first 2): 72, 74 -> avg 73
    // Older half (last 2): 82, 84 -> avg 83
    // percentChange = (73 - 83) / 83 * 100 = -12.05%
    // CoV is low because scores are clustered, so VOLATILE won't trigger first
    const scans = [makeScan(72, 1), makeScan(74, 5), makeScan(82, 20), makeScan(84, 30)];
    const result = calculateTrend(scans);
    expect(result.trend).toBe('DECLINING');
    expect(result.trendStrength).toBeGreaterThan(0);
  });

  it('detects VOLATILE trend for high variance', () => {
    // Scores: [90, 10, 90, 10] -> mean=50, stddev very high
    // coefficientOfVariation > 0.15
    const scans = [makeScan(90, 1), makeScan(10, 10), makeScan(90, 20), makeScan(10, 30)];
    const result = calculateTrend(scans);
    expect(result.trend).toBe('VOLATILE');
  });

  it('detects VOLATILE for moderate variance (CV > 0.15)', () => {
    // Scores: [85, 55, 80, 50] -> mean=67.5, stddev=~16.0
    // CV = 16.0 / 67.5 = ~0.237 > 0.15 threshold
    const scans = [makeScan(85, 1), makeScan(55, 10), makeScan(80, 20), makeScan(50, 30)];
    const result = calculateTrend(scans);
    expect(result.trend).toBe('VOLATILE');
  });
});

// ============================================================================
// computeStabilityFromData
// ============================================================================

describe('computeStabilityFromData', () => {
  it('calculates correct metrics for stable domain', () => {
    const scans = [makeScan(80, 1), makeScan(80, 10), makeScan(80, 20), makeScan(80, 60)];
    const changes: { detectedAt: Date; changeType: 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL' }[] = [];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

    expect(result.volatilityIndex).toBe(0); // no variance, no changes
    expect(result.stabilityScore).toBe(100);
    expect(result.trend).toBe('STABLE');
    expect(result.confidenceLevel).toBe('high');
    expect(result.confidenceScore).toBe(1.0);
    expect(result.scanCount).toBe(4);
    expect(result.avgScoreLast90d).toBe(80);
    expect(result.changesLast90d).toBe(0);
  });

  it('increases volatility for major changes', () => {
    const scans = [makeScan(80, 1), makeScan(80, 10), makeScan(80, 20)];
    const changes = [makeChange('MAJOR', 5), makeChange('CRITICAL', 15)];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

    // volatility = stddev*5 + changes*2 + majorChanges*10
    // stddev=0, changes=2, major=2 -> 0 + 4 + 20 = 24
    expect(result.volatilityIndex).toBe(24);
    expect(result.stabilityScore).toBe(76);
    expect(result.majorChangesLast90d).toBe(2);
    expect(result.changesLast90d).toBe(2);
  });

  it('correctly partitions changes into 30d and 90d', () => {
    const scans = [makeScan(80, 1), makeScan(75, 15), makeScan(70, 60)];
    const changes = [
      makeChange('MINOR', 5),   // within 30d
      makeChange('MINOR', 25),  // within 30d
      makeChange('MINOR', 45),  // only in 90d
      makeChange('MINOR', 80),  // only in 90d
    ];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'medium', 0.7);

    expect(result.changesLast30d).toBe(2);
    expect(result.changesLast90d).toBe(4);
    expect(result.confidenceLevel).toBe('medium');
    expect(result.confidenceScore).toBe(0.7);
  });

  it('reconciles trend to VOLATILE when volatilityIndex >= 40 but trend would be STABLE', () => {
    // 3 identical scores (STABLE by CV), but many major changes push volatilityIndex >= 40
    const scans = [makeScan(75, 1), makeScan(75, 10), makeScan(75, 20)];
    const changes = [
      makeChange('MAJOR', 5),
      makeChange('MAJOR', 10),
      makeChange('MAJOR', 15),
      makeChange('MAJOR', 20),
    ];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

    // volatility = stddev*5 + changes*2 + majorChanges*10
    // stddev=0, changes=4, major=4 -> 0 + 8 + 40 = 48
    expect(result.volatilityIndex).toBe(48);
    // With volatilityIndex >= 40 and raw trend STABLE, reconciliation overrides to VOLATILE
    expect(result.trend).toBe('VOLATILE');
    expect(result.trendStrength).toBeCloseTo(0.48, 2);
  });

  it('does NOT reconcile when volatilityIndex < 40', () => {
    const scans = [makeScan(75, 1), makeScan(75, 10), makeScan(75, 20)];
    const changes = [makeChange('MINOR', 5), makeChange('MINOR', 10)];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

    // volatility = 0 + 4 + 0 = 4 (well below 40)
    expect(result.volatilityIndex).toBe(4);
    expect(result.trend).toBe('STABLE');
  });

  it('caps volatility at 100', () => {
    const scans = [makeScan(10, 1), makeScan(90, 10), makeScan(10, 20)];
    const changes = [
      makeChange('CRITICAL', 5),
      makeChange('CRITICAL', 10),
      makeChange('CRITICAL', 15),
      makeChange('CRITICAL', 20),
      makeChange('CRITICAL', 25),
    ];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

    expect(result.volatilityIndex).toBeLessThanOrEqual(100);
    expect(result.stabilityScore).toBeGreaterThanOrEqual(0);
  });

  it('calculates standard deviations for 30d and 90d windows', () => {
    // 3 scans in last 30d, 1 scan in 60-90d range
    const scans = [makeScan(80, 1), makeScan(60, 10), makeScan(70, 20), makeScan(50, 60)];

    const result = computeStabilityFromData(scans, [], thirtyDaysAgo, 'high', 1.0);

    // 30d scores: [80, 60, 70], mean=70, stddev = sqrt((100+100+0)/3) = ~8.165
    expect(result.scoreStdDev30d).toBeCloseTo(8.165, 2);
    // 90d scores: [80, 60, 70, 50], mean=65
    expect(result.scoreStdDev90d).toBeGreaterThan(0);
    expect(result.avgScoreLast30d).toBeCloseTo(70, 0);
    expect(result.avgScoreLast90d).toBeCloseTo(65, 0);
  });
});

// ============================================================================
// computeProvisionalFromData
// ============================================================================

describe('computeProvisionalFromData', () => {
  it('returns base stability for null domain proxy', () => {
    const result = computeProvisionalFromData(null, 75);

    expect(result.stabilityScore).toBe(50);
    expect(result.volatilityIndex).toBe(50);
    expect(result.trend).toBe('STABLE');
    expect(result.trendStrength).toBe(0.3);
    expect(result.confidenceLevel).toBe('provisional');
    expect(result.confidenceScore).toBe(STABILITY_REQUIREMENTS.provisional.confidenceMultiplier);
    expect(result.scanCount).toBe(1);
    expect(result.avgScoreLast30d).toBe(75);
    expect(result.avgScoreLast90d).toBe(75);
  });

  it('boosts stability for Tier A domain with high Tranco rank', () => {
    const result = computeProvisionalFromData({ trancoRank: 5000, indexTier: 'A' }, 80);

    // base 50 + trancoRank<=10000 (+20) + tierA (+15) = 85
    expect(result.stabilityScore).toBe(85);
    expect(result.volatilityIndex).toBe(15);
  });

  it('partially boosts stability for Tier B domain with moderate Tranco rank', () => {
    const result = computeProvisionalFromData({ trancoRank: 50000, indexTier: 'B' }, 60);

    // base 50 + trancoRank<=100000 (+10) + tierB (+5) = 65
    expect(result.stabilityScore).toBe(65);
    expect(result.volatilityIndex).toBe(35);
  });

  it('uses only Tranco boost for Tier C domain', () => {
    const result = computeProvisionalFromData({ trancoRank: 5000, indexTier: 'C' }, 70);

    // base 50 + trancoRank<=10000 (+20) + tierC (+0) = 70
    expect(result.stabilityScore).toBe(70);
    expect(result.volatilityIndex).toBe(30);
  });

  it('uses base stability for domain with no Tranco rank', () => {
    const result = computeProvisionalFromData({ trancoRank: null, indexTier: 'A' }, 80);

    // base 50 + trancoRank null (+0) + tierA (+15) = 65
    expect(result.stabilityScore).toBe(65);
    expect(result.volatilityIndex).toBe(35);
  });

  it('defaults score to 50 when null', () => {
    const result = computeProvisionalFromData(null, null);

    expect(result.avgScoreLast30d).toBe(50);
    expect(result.avgScoreLast90d).toBe(50);
  });

  it('returns zero std deviations and zero changes', () => {
    const result = computeProvisionalFromData(null, 80);

    expect(result.scoreStdDev30d).toBe(0);
    expect(result.scoreStdDev90d).toBe(0);
    expect(result.changesLast30d).toBe(0);
    expect(result.changesLast90d).toBe(0);
    expect(result.majorChangesLast90d).toBe(0);
  });
});

// ============================================================================
// Consistency: computeStabilityFromData matches inline calculation logic
// ============================================================================

describe('computeStabilityFromData consistency', () => {
  it('produces identical results to inline calculation for same input', () => {
    // Simulate the same input that calculateDomainStability would produce
    const scans = [
      makeScan(85, 2),
      makeScan(78, 12),
      makeScan(82, 25),
      makeScan(70, 45),
      makeScan(75, 65),
    ];
    const changes = [
      makeChange('MINOR', 10),
      makeChange('MODERATE', 40),
      makeChange('MAJOR', 60),
    ];

    const result = computeStabilityFromData(scans, changes, thirtyDaysAgo, 'high', 1.0);

    // Manually compute expected values
    const scans30d = scans.filter((s) => s.finishedAt! >= thirtyDaysAgo);
    const scores30d = scans30d.map((s) => s.score!);
    const scores90d = scans.map((s) => s.score!);

    const expectedAvg30d = scores30d.reduce((a, b) => a + b, 0) / scores30d.length;
    const expectedAvg90d = scores90d.reduce((a, b) => a + b, 0) / scores90d.length;

    expect(result.avgScoreLast30d).toBeCloseTo(expectedAvg30d, 5);
    expect(result.avgScoreLast90d).toBeCloseTo(expectedAvg90d, 5);

    // Verify volatility formula: stddev90d*5 + changes90d*2 + majorChanges90d*10
    const expectedStdDev90d = calculateStdDev(scores90d);
    const changesLast30d = changes.filter((c) => c.detectedAt >= thirtyDaysAgo).length;
    const changesLast90d = changes.length;
    const majorChanges = changes.filter(
      (c) => c.changeType === 'MAJOR' || c.changeType === 'CRITICAL'
    ).length;

    const expectedVolatility = Math.min(100, expectedStdDev90d * 5 + changesLast90d * 2 + majorChanges * 10);

    expect(result.volatilityIndex).toBeCloseTo(expectedVolatility, 5);
    expect(result.stabilityScore).toBeCloseTo(Math.max(0, 100 - expectedVolatility), 5);
    expect(result.changesLast30d).toBe(changesLast30d);
    expect(result.changesLast90d).toBe(changesLast90d);
    expect(result.majorChangesLast90d).toBe(majorChanges);
  });
});

// ============================================================================
// computeScanConfidence — Laplace-smoothed beta mean
// ============================================================================

describe('computeScanConfidence', () => {
  it('returns 0.5 for zero scans (neutral prior)', () => {
    expect(computeScanConfidence(0, 0)).toBeCloseTo(0.5, 5);
  });

  it('returns ~0.667 for 1 success, 0 failures', () => {
    // (1+1)/(1+0+2) = 2/3
    expect(computeScanConfidence(1, 0)).toBeCloseTo(2 / 3, 5);
  });

  it('returns ~0.167 for 0 successes, 5 failures', () => {
    // (0+1)/(0+5+2) = 1/7
    expect(computeScanConfidence(0, 5)).toBeCloseTo(1 / 7, 5);
  });

  it('returns ~0.857 for 5 successes, 0 failures', () => {
    // (5+1)/(5+0+2) = 6/7
    expect(computeScanConfidence(5, 0)).toBeCloseTo(6 / 7, 5);
  });

  it('returns ~0.5 for equal successes and failures', () => {
    // (5+1)/(5+5+2) = 6/12 = 0.5
    expect(computeScanConfidence(5, 5)).toBeCloseTo(0.5, 5);
  });

  it('returns < 0.4 for 1 success / 4 failures (acceptance criterion)', () => {
    // (1+1)/(1+4+2) = 2/7 ≈ 0.286
    const confidence = computeScanConfidence(1, 4);
    expect(confidence).toBeLessThan(0.4);
    expect(confidence).toBeCloseTo(2 / 7, 5);
  });

  it('returns ≥ 0.85 for 5+ successes / 0 failures (acceptance criterion)', () => {
    expect(computeScanConfidence(5, 0)).toBeGreaterThanOrEqual(0.85);
    expect(computeScanConfidence(10, 0)).toBeGreaterThanOrEqual(0.85);
    expect(computeScanConfidence(20, 0)).toBeGreaterThanOrEqual(0.85);
  });

  it('returns ~0.5 for 50% failure rate (acceptance criterion)', () => {
    expect(computeScanConfidence(10, 10)).toBeCloseTo(0.5, 1);
    expect(computeScanConfidence(50, 50)).toBeCloseTo(0.5, 1);
  });

  it('is monotonically increasing with more successes', () => {
    const c1 = computeScanConfidence(1, 2);
    const c2 = computeScanConfidence(2, 2);
    const c3 = computeScanConfidence(5, 2);
    expect(c2).toBeGreaterThan(c1);
    expect(c3).toBeGreaterThan(c2);
  });

  it('is monotonically decreasing with more failures', () => {
    const c1 = computeScanConfidence(5, 0);
    const c2 = computeScanConfidence(5, 2);
    const c3 = computeScanConfidence(5, 5);
    expect(c2).toBeLessThan(c1);
    expect(c3).toBeLessThan(c2);
  });
});

// ============================================================================
// computePercentiles — nearest-rank percentile computation
// ============================================================================

describe('computePercentiles', () => {
  it('returns empty object for empty input', () => {
    expect(computePercentiles([])).toEqual({});
  });

  it('returns the single value for all percentiles with 1 element', () => {
    expect(computePercentiles([42])).toEqual({ 50: 42, 90: 42, 95: 42 });
  });

  it('computes correct percentiles for small sorted dataset', () => {
    // 10 values: 1,2,3,4,5,6,7,8,9,10
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = computePercentiles(values);
    expect(result[50]).toBe(5);   // ceil(0.5*10)-1 = 4 → values[4] = 5
    expect(result[90]).toBe(9);   // ceil(0.9*10)-1 = 8 → values[8] = 9
    expect(result[95]).toBe(10);  // ceil(0.95*10)-1 = 9 → values[9] = 10
  });

  it('handles unsorted input', () => {
    const values = [10, 3, 7, 1, 5, 9, 2, 8, 4, 6];
    const result = computePercentiles(values);
    expect(result[50]).toBe(5);
    expect(result[90]).toBe(9);
  });

  it('supports custom percentiles', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    const result = computePercentiles(values, [25, 50, 75, 99]);
    expect(result[25]).toBe(25);
    expect(result[50]).toBe(50);
    expect(result[75]).toBe(75);
    expect(result[99]).toBe(99);
  });

  it('handles duplicate values', () => {
    const values = [5, 5, 5, 5, 5, 100];
    const result = computePercentiles(values);
    expect(result[50]).toBe(5);
    expect(result[95]).toBe(100);
  });
});
