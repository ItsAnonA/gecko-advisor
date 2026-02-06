import { describe, it, expect } from 'vitest';
import { INSIGHT_TIERS, type InsightTier } from '../insightGeneratorService.js';

// ============================================================================
// Insight Tier Threshold Constants
// ============================================================================

describe('INSIGHT_TIERS constants', () => {
  it('has three tiers: breaking, notable, emerging', () => {
    expect(INSIGHT_TIERS.breaking).toBeDefined();
    expect(INSIGHT_TIERS.notable).toBeDefined();
    expect(INSIGHT_TIERS.emerging).toBeDefined();
  });

  it('breaking requires magnitude >= 70 and confidence >= 0.9', () => {
    expect(INSIGHT_TIERS.breaking.minMagnitude).toBe(70);
    expect(INSIGHT_TIERS.breaking.minConfidence).toBe(0.9);
  });

  it('notable requires magnitude >= 40 and confidence >= 0.75', () => {
    expect(INSIGHT_TIERS.notable.minMagnitude).toBe(40);
    expect(INSIGHT_TIERS.notable.minConfidence).toBe(0.75);
  });

  it('emerging requires magnitude >= 25 and confidence >= 0.6', () => {
    expect(INSIGHT_TIERS.emerging.minMagnitude).toBe(25);
    expect(INSIGHT_TIERS.emerging.minConfidence).toBe(0.6);
  });

  it('tiers are strictly ordered: breaking > notable > emerging', () => {
    expect(INSIGHT_TIERS.breaking.minMagnitude).toBeGreaterThan(INSIGHT_TIERS.notable.minMagnitude);
    expect(INSIGHT_TIERS.notable.minMagnitude).toBeGreaterThan(INSIGHT_TIERS.emerging.minMagnitude);

    expect(INSIGHT_TIERS.breaking.minConfidence).toBeGreaterThan(INSIGHT_TIERS.notable.minConfidence);
    expect(INSIGHT_TIERS.notable.minConfidence).toBeGreaterThan(INSIGHT_TIERS.emerging.minConfidence);
  });

  it('has NO volume caps (quality-only thresholds)', () => {
    // Verify no maxPerWeek or similar caps exist
    const breakingKeys = Object.keys(INSIGHT_TIERS.breaking);
    const notableKeys = Object.keys(INSIGHT_TIERS.notable);
    const emergingKeys = Object.keys(INSIGHT_TIERS.emerging);

    for (const key of [...breakingKeys, ...notableKeys, ...emergingKeys]) {
      expect(key).not.toContain('max');
      expect(key).not.toContain('limit');
      expect(key).not.toContain('cap');
    }
  });
});

// ============================================================================
// Tier Classification Logic
// ============================================================================

/**
 * Replicates the inline filtering logic from generateTieredInsights (line 318-354)
 * to test tier classification without requiring a database.
 */
interface MockInsight {
  type: string;
  magnitude: number;
  confidence: number;
  domainId?: string;
  categoryId?: string;
  trackerDomain?: string;
}

function classifyInsight(insight: MockInsight): InsightTier | null {
  if (
    insight.magnitude >= INSIGHT_TIERS.breaking.minMagnitude &&
    insight.confidence >= INSIGHT_TIERS.breaking.minConfidence
  ) {
    return 'breaking';
  }

  if (
    insight.magnitude >= INSIGHT_TIERS.notable.minMagnitude &&
    insight.confidence >= INSIGHT_TIERS.notable.minConfidence
  ) {
    return 'notable';
  }

  if (
    insight.magnitude >= INSIGHT_TIERS.emerging.minMagnitude &&
    insight.confidence >= INSIGHT_TIERS.emerging.minConfidence
  ) {
    return 'emerging';
  }

  return null;
}

function classifyTiered(insights: MockInsight[]) {
  const getInsightId = (i: MockInsight) =>
    `${i.type}-${i.domainId ?? ''}-${i.categoryId ?? ''}-${i.trackerDomain ?? ''}`;

  const breaking = insights.filter(
    (i) =>
      i.magnitude >= INSIGHT_TIERS.breaking.minMagnitude &&
      i.confidence >= INSIGHT_TIERS.breaking.minConfidence
  );

  const breakingIds = new Set(breaking.map(getInsightId));

  const notable = insights.filter((i) => {
    const id = getInsightId(i);
    return (
      i.magnitude >= INSIGHT_TIERS.notable.minMagnitude &&
      i.confidence >= INSIGHT_TIERS.notable.minConfidence &&
      !breakingIds.has(id)
    );
  });

  const notableIds = new Set(notable.map(getInsightId));

  const emerging = insights.filter((i) => {
    const id = getInsightId(i);
    return (
      i.magnitude >= INSIGHT_TIERS.emerging.minMagnitude &&
      i.confidence >= INSIGHT_TIERS.emerging.minConfidence &&
      !breakingIds.has(id) &&
      !notableIds.has(id)
    );
  });

  return { breaking, notable, emerging };
}

describe('tier classification logic', () => {
  it('classifies high-magnitude high-confidence as breaking', () => {
    expect(classifyInsight({ type: 'DOMAIN_REGRESSION', magnitude: 80, confidence: 0.95 })).toBe('breaking');
  });

  it('classifies medium-magnitude medium-confidence as notable', () => {
    expect(classifyInsight({ type: 'CATEGORY_TREND', magnitude: 50, confidence: 0.8 })).toBe('notable');
  });

  it('classifies low-magnitude moderate-confidence as emerging', () => {
    expect(classifyInsight({ type: 'TRACKER_SURGE', magnitude: 30, confidence: 0.65 })).toBe('emerging');
  });

  it('returns null below all thresholds', () => {
    expect(classifyInsight({ type: 'ANOMALY', magnitude: 10, confidence: 0.3 })).toBeNull();
  });

  it('requires BOTH magnitude and confidence for breaking', () => {
    // High magnitude but low confidence
    expect(classifyInsight({ type: 'TEST', magnitude: 90, confidence: 0.5 })).not.toBe('breaking');
    // High confidence but low magnitude
    expect(classifyInsight({ type: 'TEST', magnitude: 30, confidence: 0.95 })).not.toBe('breaking');
  });

  it('at exact breaking threshold values', () => {
    expect(classifyInsight({ type: 'TEST', magnitude: 70, confidence: 0.9 })).toBe('breaking');
  });

  it('at exact notable threshold values', () => {
    expect(classifyInsight({ type: 'TEST', magnitude: 40, confidence: 0.75 })).toBe('notable');
  });

  it('at exact emerging threshold values', () => {
    expect(classifyInsight({ type: 'TEST', magnitude: 25, confidence: 0.6 })).toBe('emerging');
  });

  it('just below breaking falls to notable', () => {
    // magnitude 69 (below 70) but confidence 0.9 → notable (meets 40/0.75)
    expect(classifyInsight({ type: 'TEST', magnitude: 69, confidence: 0.9 })).toBe('notable');
  });

  it('just below notable falls to emerging', () => {
    // magnitude 39 (below 40) but confidence 0.75 → emerging (meets 25/0.6)
    expect(classifyInsight({ type: 'TEST', magnitude: 39, confidence: 0.75 })).toBe('emerging');
  });

  it('just below emerging returns null', () => {
    expect(classifyInsight({ type: 'TEST', magnitude: 24, confidence: 0.6 })).toBeNull();
    expect(classifyInsight({ type: 'TEST', magnitude: 25, confidence: 0.59 })).toBeNull();
  });
});

// ============================================================================
// Mutual Exclusivity
// ============================================================================

describe('tier mutual exclusivity', () => {
  it('breaking insights are excluded from notable', () => {
    const insights: MockInsight[] = [
      { type: 'DOMAIN_REGRESSION', magnitude: 80, confidence: 0.95, domainId: 'd1' },
    ];

    const result = classifyTiered(insights);
    expect(result.breaking).toHaveLength(1);
    expect(result.notable).toHaveLength(0);
    expect(result.emerging).toHaveLength(0);
  });

  it('notable insights are excluded from emerging', () => {
    const insights: MockInsight[] = [
      { type: 'CATEGORY_TREND', magnitude: 50, confidence: 0.8, categoryId: 'c1' },
    ];

    const result = classifyTiered(insights);
    expect(result.breaking).toHaveLength(0);
    expect(result.notable).toHaveLength(1);
    expect(result.emerging).toHaveLength(0);
  });

  it('different insights go to different tiers correctly', () => {
    const insights: MockInsight[] = [
      { type: 'DOMAIN_REGRESSION', magnitude: 80, confidence: 0.95, domainId: 'd1' },
      { type: 'CATEGORY_TREND', magnitude: 50, confidence: 0.8, categoryId: 'c1' },
      { type: 'TRACKER_SURGE', magnitude: 30, confidence: 0.65, trackerDomain: 't1' },
      { type: 'ANOMALY', magnitude: 10, confidence: 0.3 }, // Below all thresholds
    ];

    const result = classifyTiered(insights);
    expect(result.breaking).toHaveLength(1);
    expect(result.notable).toHaveLength(1);
    expect(result.emerging).toHaveLength(1);
  });

  it('does not double-count same insight across tiers', () => {
    // An insight that meets breaking threshold should NOT appear in notable/emerging
    const insights: MockInsight[] = [
      { type: 'DOMAIN_REGRESSION', magnitude: 90, confidence: 0.95, domainId: 'd1' },
    ];

    const result = classifyTiered(insights);
    const total = result.breaking.length + result.notable.length + result.emerging.length;
    expect(total).toBe(1);
  });

  it('dedup is based on type+domain+category+tracker composite key', () => {
    // Same type but different domains → different insights
    const insights: MockInsight[] = [
      { type: 'DOMAIN_REGRESSION', magnitude: 80, confidence: 0.95, domainId: 'd1' },
      { type: 'DOMAIN_REGRESSION', magnitude: 80, confidence: 0.95, domainId: 'd2' },
    ];

    const result = classifyTiered(insights);
    expect(result.breaking).toHaveLength(2);
  });
});

// ============================================================================
// No Volume Caps
// ============================================================================

describe('no volume caps enforcement', () => {
  it('all qualifying insights are included (no .slice())', () => {
    // Create 20 breaking-level insights
    const insights: MockInsight[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'DOMAIN_REGRESSION',
      magnitude: 80 + (i % 20),
      confidence: 0.95,
      domainId: `domain-${i}`,
    }));

    const result = classifyTiered(insights);
    expect(result.breaking).toHaveLength(20);
  });

  it('total equals sum of all tiers', () => {
    const insights: MockInsight[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'DOMAIN_REGRESSION' as const,
        magnitude: 80,
        confidence: 0.95,
        domainId: `breaking-${i}`,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        type: 'CATEGORY_TREND' as const,
        magnitude: 50,
        confidence: 0.8,
        categoryId: `notable-${i}`,
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        type: 'TRACKER_SURGE' as const,
        magnitude: 30,
        confidence: 0.65,
        trackerDomain: `emerging-${i}`,
      })),
    ];

    const result = classifyTiered(insights);
    const total = result.breaking.length + result.notable.length + result.emerging.length;
    expect(total).toBe(10);
    expect(result.breaking).toHaveLength(5);
    expect(result.notable).toHaveLength(3);
    expect(result.emerging).toHaveLength(2);
  });
});
