import { describe, it, expect } from 'vitest';
import {
  validateHedgeLanguage,
  validateRetractionTone,
  enforceHedgeLanguage,
  addHedgePrefix,
  analyzeTopicDistribution,
  enforceTopicDiversity,
  FORBIDDEN_CAUSAL_LANGUAGE,
  HEDGE_WORDS,
  TOPIC_GUIDANCE,
  assessInsightValidity,
  getConfidenceDisplay,
  formatConfidence,
} from '../credibilityService.js';

// ============================================================================
// Hedge Language Validation
// ============================================================================

describe('validateHedgeLanguage', () => {
  it('accepts clean narrative without forbidden language', () => {
    const result = validateHedgeLanguage(
      'Our analysis suggests that privacy practices may have shifted in this category.'
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('rejects "caused by"', () => {
    const result = validateHedgeLanguage('The score drop was caused by new trackers.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('caused by');
  });

  it('rejects "result of"', () => {
    const result = validateHedgeLanguage('This is a result of poor security practices.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('result of');
  });

  it('rejects "due to"', () => {
    const result = validateHedgeLanguage('The improvement is due to removing trackers.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('due to');
  });

  it('rejects "because of"', () => {
    const result = validateHedgeLanguage('Score changed because of new cookies.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('because of');
  });

  it('rejects "directly led to"', () => {
    const result = validateHedgeLanguage('This directly led to a privacy regression.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('directly led to');
  });

  it('rejects "proves that"', () => {
    const result = validateHedgeLanguage('This proves that the domain is malicious.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('proves that');
  });

  it('rejects "confirms that"', () => {
    const result = validateHedgeLanguage('This confirms that tracking increased.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('confirms that');
  });

  it('rejects "definitely"', () => {
    const result = validateHedgeLanguage('The site definitely tracks users.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('definitely');
  });

  it('rejects "certainly"', () => {
    const result = validateHedgeLanguage('This is certainly a privacy concern.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('certainly');
  });

  it('rejects "without doubt"', () => {
    const result = validateHedgeLanguage('Without doubt, this is a regression.');
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase() === 'without doubt')).toBe(true);
  });

  it('rejects "undeniably"', () => {
    const result = validateHedgeLanguage('The tracker count is undeniably high.');
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('undeniably');
  });

  it('detects multiple violations in one narrative', () => {
    const result = validateHedgeLanguage(
      'This was definitely caused by new trackers, which proves that the site is malicious.'
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  it('is case-insensitive', () => {
    const result = validateHedgeLanguage('This was CAUSED BY new trackers.');
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('provides suggestions for causal language', () => {
    const result = validateHedgeLanguage('The drop was caused by tracker additions.');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toContain('Replace');
  });

  it('provides suggestions for certainty language', () => {
    const result = validateHedgeLanguage('This proves that the site is unsafe.');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('handles empty string', () => {
    const result = validateHedgeLanguage('');
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ============================================================================
// Enforce Hedge Language (throws)
// ============================================================================

describe('enforceHedgeLanguage', () => {
  it('returns narrative when clean', () => {
    const narrative = 'Our analysis suggests improvement.';
    expect(enforceHedgeLanguage(narrative)).toBe(narrative);
  });

  it('throws on forbidden language', () => {
    expect(() =>
      enforceHedgeLanguage('The change was caused by new trackers.')
    ).toThrow('Forbidden causal language detected');
  });

  it('includes violation details in error message', () => {
    expect(() =>
      enforceHedgeLanguage('This definitely proves that something happened.')
    ).toThrow(/definitely/);
  });
});

// ============================================================================
// Add Hedge Prefix
// ============================================================================

describe('addHedgePrefix', () => {
  it('adds high-confidence hedge for confidence >= 0.8', () => {
    const result = addHedgePrefix('The score improved significantly.', 0.9);
    expect(result).toMatch(/^Our analysis (indicates|suggests strongly|appears to show) that/);
  });

  it('adds medium-confidence hedge for 0.6-0.8', () => {
    const result = addHedgePrefix('The tracker count increased.', 0.7);
    expect(result).toMatch(/^Our analysis (may indicate|possibly suggests|could be related to) that/);
  });

  it('adds low-confidence hedge for < 0.6', () => {
    const result = addHedgePrefix('A new pattern is emerging.', 0.4);
    expect(result).toMatch(/^Our analysis (might suggest|early signals indicate|preliminary data shows) that/);
  });

  it('lowercases the first character of the statement', () => {
    const result = addHedgePrefix('The privacy score dropped.', 0.9);
    expect(result).toContain('the privacy score dropped.');
  });

  it('does not double-hedge if already hedged', () => {
    const statement = 'Our analysis indicates that the score improved.';
    const result = addHedgePrefix(statement, 0.9);
    expect(result).toBe(statement);
  });

  it('does not double-hedge with medium hedge words', () => {
    const statement = 'Data may indicate a shift in practices.';
    const result = addHedgePrefix(statement, 0.7);
    expect(result).toBe(statement);
  });
});

// ============================================================================
// Retraction Tone Validation
// ============================================================================

describe('validateRetractionTone', () => {
  it('accepts a proper retraction', () => {
    const retraction =
      'Our analysis predicted that the domain would improve. We predicted a score increase. This proved incorrect.';
    const result = validateRetractionTone(retraction);
    expect(result.valid).toBe(true);
    expect(result.forbiddenViolations).toHaveLength(0);
    expect(result.missingRequired).toHaveLength(0);
  });

  it('rejects "we weren\'t wrong"', () => {
    const result = validateRetractionTone(
      "We weren't wrong, the situation just changed. Our analysis predicted a decline. We predicted incorrectly. This proved false."
    );
    expect(result.valid).toBe(false);
    expect(result.forbiddenViolations).toContain("we weren't wrong");
  });

  it('rejects "reality changed"', () => {
    const result = validateRetractionTone(
      'Reality changed after our prediction. Our analysis predicted an increase. We predicted a rise. This proved incorrect.'
    );
    expect(result.valid).toBe(false);
    expect(result.forbiddenViolations).toContain('reality changed');
  });

  it('rejects "circumstances evolved"', () => {
    const result = validateRetractionTone(
      'Circumstances evolved since our prediction. Our analysis suggested a shift. We predicted a trend. This proved wrong.'
    );
    expect(result.valid).toBe(false);
    expect(result.forbiddenViolations).toContain('circumstances evolved');
  });

  it('requires "Our analysis"', () => {
    const result = validateRetractionTone(
      'We predicted a decline. This proved incorrect.'
    );
    expect(result.missingRequired).toContain('Our analysis');
  });

  it('requires "We predicted" (or equivalent)', () => {
    const result = validateRetractionTone(
      'Our analysis showed a decline. This proved incorrect.'
    );
    expect(result.missingRequired).toContain('We predicted');
  });

  it('requires "This proved"', () => {
    const result = validateRetractionTone(
      'Our analysis predicted a decline. We predicted a drop.'
    );
    expect(result.missingRequired).toContain('This proved');
  });

  it('provides helpful suggestions for missing required phrases', () => {
    const result = validateRetractionTone('The prediction was wrong.');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Topic Distribution Analysis
// ============================================================================

describe('analyzeTopicDistribution', () => {
  it('returns empty array for no insights', () => {
    const result = analyzeTopicDistribution([]);
    expect(result).toHaveLength(0);
  });

  it('correctly calculates percentages', () => {
    const insights = [
      { insightType: 'TRACKER_SURGE' as const },
      { insightType: 'TRACKER_SURGE' as const },
      { insightType: 'DOMAIN_IMPROVEMENT' as const },
      { insightType: 'DOMAIN_IMPROVEMENT' as const },
    ];
    const result = analyzeTopicDistribution(insights);
    expect(result).toHaveLength(2);
    expect(result[0]!.percentage).toBe(50);
    expect(result[1]!.percentage).toBe(50);
  });

  it('marks topics over hard limit', () => {
    // TRACKER_SURGE hard limit is 45%
    const insights = Array(10).fill({ insightType: 'TRACKER_SURGE' as const })
      .concat(Array(5).fill({ insightType: 'DOMAIN_IMPROVEMENT' as const }));

    const result = analyzeTopicDistribution(insights);
    const surge = result.find((d) => d.type === 'TRACKER_SURGE');

    // 10/15 = 66.7% > 45% hard limit
    expect(surge?.status).toBe('over_hard_limit');
    expect(surge?.guidance).toBeDefined();
  });

  it('marks topics over soft limit but under hard limit', () => {
    // TRACKER_SURGE soft limit is 30%, hard limit is 45%
    const insights = Array(4).fill({ insightType: 'TRACKER_SURGE' as const })
      .concat(Array(6).fill({ insightType: 'DOMAIN_IMPROVEMENT' as const }));

    const result = analyzeTopicDistribution(insights);
    const surge = result.find((d) => d.type === 'TRACKER_SURGE');

    // 4/10 = 40% > 30% soft limit, < 45% hard limit
    expect(surge?.status).toBe('at_soft_limit');
  });

  it('sorts by percentage descending', () => {
    const insights = [
      { insightType: 'TRACKER_SURGE' as const },
      { insightType: 'TRACKER_SURGE' as const },
      { insightType: 'TRACKER_SURGE' as const },
      { insightType: 'DOMAIN_IMPROVEMENT' as const },
    ];
    const result = analyzeTopicDistribution(insights);
    expect(result[0]!.type).toBe('TRACKER_SURGE');
  });
});

// ============================================================================
// Topic Diversity Enforcement
// ============================================================================

describe('enforceTopicDiversity', () => {
  it('returns all insights with no warnings for healthy distribution', () => {
    // Use many insights across types so each percentage stays below soft limits
    const insights = [
      ...Array(3).fill({ insightType: 'TRACKER_SURGE' as const }),
      ...Array(3).fill({ insightType: 'TRACKER_DECLINE' as const }),
      ...Array(3).fill({ insightType: 'DOMAIN_IMPROVEMENT' as const }),
      ...Array(3).fill({ insightType: 'DOMAIN_REGRESSION' as const }),
      ...Array(2).fill({ insightType: 'CATEGORY_TREND' as const }),
      ...Array(1).fill({ insightType: 'FINGERPRINTING_SHIFT' as const }),
    ];
    // Each type is well under its soft limit: TRACKER_SURGE 3/15 = 20% < 30% soft
    const result = enforceTopicDiversity(insights);
    expect(result.insights).toHaveLength(15);
    expect(result.warnings).toHaveLength(0);
    expect(result.dropped).toBe(0);
  });

  it('warns but keeps all in non-strict mode when over soft limit', () => {
    const insights = Array(4).fill({ insightType: 'TRACKER_SURGE' as const })
      .concat(Array(6).fill({ insightType: 'DOMAIN_IMPROVEMENT' as const }));

    const result = enforceTopicDiversity(insights, false);
    // 4/10 = 40% > 30% soft limit for TRACKER_SURGE
    expect(result.insights).toHaveLength(10);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.dropped).toBe(0);
  });

  it('caps in strict mode when over hard limit', () => {
    // Create distribution where TRACKER_SURGE exceeds hard limit (45%)
    const insights = Array(10).fill({ insightType: 'TRACKER_SURGE' as const })
      .concat(Array(5).fill({ insightType: 'DOMAIN_IMPROVEMENT' as const }));

    const result = enforceTopicDiversity(insights, true);
    // 10/15 = 66.7% > 45% hard limit
    expect(result.dropped).toBeGreaterThan(0);
    expect(result.insights.length).toBeLessThan(15);
  });

  it('returns empty arrays for empty input', () => {
    const result = enforceTopicDiversity([]);
    expect(result.insights).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.dropped).toBe(0);
  });
});

// ============================================================================
// Insight Validity Assessment
// ============================================================================

describe('assessInsightValidity', () => {
  it('returns current/untested for new insight', () => {
    const result = assessInsightValidity(new Date(), null, null, null);
    expect(result.relevance).toBe('current');
    expect(result.predictiveValidity).toBe('untested');
    expect(result.correctness).toBe('unknown');
    expect(result.shouldRetract).toBe(false);
  });

  it('marks as confirmed when outcome true and accurate', () => {
    const result = assessInsightValidity(new Date(), true, true, null);
    expect(result.predictiveValidity).toBe('confirmed');
    expect(result.correctness).toBe('accurate');
    expect(result.shouldRetract).toBe(false);
  });

  it('marks as reversed when outcome true but inaccurate', () => {
    const result = assessInsightValidity(new Date(), true, false, null);
    expect(result.predictiveValidity).toBe('reversed');
    expect(result.correctness).toBe('inaccurate');
    expect(result.shouldRetract).toBe(true);
  });

  it('marks as superseded when supersededBy is set', () => {
    const result = assessInsightValidity(new Date(), null, null, 'new-insight-id');
    expect(result.relevance).toBe('superseded');
  });

  it('marks as historical for old insights (>90 days)', () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const result = assessInsightValidity(oldDate, null, null, null);
    expect(result.relevance).toBe('historical');
    expect(result.age).toBeGreaterThanOrEqual(100);
  });

  it('calculates age in days', () => {
    const daysAgo = 15;
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const result = assessInsightValidity(date, null, null, null);
    expect(result.age).toBe(daysAgo);
  });
});

// ============================================================================
// Confidence Display
// ============================================================================

describe('getConfidenceDisplay', () => {
  it('returns high for >= 0.8', () => {
    const result = getConfidenceDisplay(0.9);
    expect(result.level).toBe('high');
    expect(result.label).toBe('High Confidence');
    expect(result.color).toBe('green');
    expect(result.caveat).toBeNull();
  });

  it('returns medium for 0.6-0.8', () => {
    const result = getConfidenceDisplay(0.7);
    expect(result.level).toBe('medium');
    expect(result.label).toBe('Medium Confidence');
    expect(result.color).toBe('yellow');
    expect(result.caveat).toBeDefined();
  });

  it('returns low for < 0.6', () => {
    const result = getConfidenceDisplay(0.3);
    expect(result.level).toBe('low');
    expect(result.label).toBe('Low Confidence');
    expect(result.color).toBe('red');
    expect(result.caveat).toBeDefined();
  });

  it('returns high at exact boundary 0.8', () => {
    const result = getConfidenceDisplay(0.8);
    expect(result.level).toBe('high');
  });

  it('returns medium at exact boundary 0.6', () => {
    const result = getConfidenceDisplay(0.6);
    expect(result.level).toBe('medium');
  });
});

describe('formatConfidence', () => {
  it('formats to percentage', () => {
    expect(formatConfidence(0.95)).toBe('95%');
    expect(formatConfidence(0.5)).toBe('50%');
    expect(formatConfidence(1.0)).toBe('100%');
  });
});

// ============================================================================
// Constants Validation
// ============================================================================

describe('FORBIDDEN_CAUSAL_LANGUAGE patterns', () => {
  it('has 11 patterns', () => {
    expect(FORBIDDEN_CAUSAL_LANGUAGE).toHaveLength(11);
  });

  it('all patterns are regex', () => {
    for (const pattern of FORBIDDEN_CAUSAL_LANGUAGE) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });

  it('patterns use word boundaries for precision', () => {
    // "due to" should not match "residue tokens"
    const dueToPattern = FORBIDDEN_CAUSAL_LANGUAGE.find(
      (p) => p.source.includes('due to')
    );
    expect(dueToPattern).toBeDefined();
    expect(dueToPattern!.test('residue tokens')).toBe(false);
    expect(dueToPattern!.test('this is due to trackers')).toBe(true);
  });
});

describe('HEDGE_WORDS', () => {
  it('has high, medium, low levels', () => {
    expect(HEDGE_WORDS.high).toBeDefined();
    expect(HEDGE_WORDS.medium).toBeDefined();
    expect(HEDGE_WORDS.low).toBeDefined();
  });

  it('each level has at least 3 options', () => {
    expect(HEDGE_WORDS.high.length).toBeGreaterThanOrEqual(3);
    expect(HEDGE_WORDS.medium.length).toBeGreaterThanOrEqual(3);
    expect(HEDGE_WORDS.low.length).toBeGreaterThanOrEqual(3);
  });
});

describe('TOPIC_GUIDANCE', () => {
  it('has guidance for all insight types', () => {
    const expectedTypes = [
      'TRACKER_SURGE',
      'TRACKER_DECLINE',
      'DOMAIN_IMPROVEMENT',
      'DOMAIN_REGRESSION',
      'CATEGORY_TREND',
      'FINGERPRINTING_SHIFT',
      'ANOMALY',
      'WEEKLY_SUMMARY',
    ];

    for (const type of expectedTypes) {
      const guidance = TOPIC_GUIDANCE[type as keyof typeof TOPIC_GUIDANCE];
      expect(guidance).toBeDefined();
      expect(guidance.softLimit).toBeLessThan(guidance.hardLimit);
    }
  });
});
