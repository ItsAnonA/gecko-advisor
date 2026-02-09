import { describe, it, expect } from 'vitest';
import {
  extractTemplateData,
  parseDomainFromTitle,
  parseCategoryFromTitle,
} from '../insightNarrativeService.js';
import { generateNarrativeWithValidation } from '../narrativeService.js';

// ============================================================================
// parseDomainFromTitle
// ============================================================================

describe('parseDomainFromTitle', () => {
  it('parses domain from improvement title', () => {
    expect(parseDomainFromTitle('example.com improved privacy score by 15 points')).toBe(
      'example.com'
    );
  });

  it('parses domain from regression title', () => {
    expect(parseDomainFromTitle('facebook.com privacy score dropped by 10 points')).toBe(
      'facebook.com'
    );
  });

  it('parses subdomain from title', () => {
    expect(parseDomainFromTitle('mail.google.com improved privacy score by 5 points')).toBe(
      'mail.google.com'
    );
  });

  it('returns null for non-domain title', () => {
    expect(parseDomainFromTitle('Some random text without a domain')).toBeNull();
  });
});

// ============================================================================
// parseCategoryFromTitle
// ============================================================================

describe('parseCategoryFromTitle', () => {
  it('parses category from category trend title', () => {
    expect(parseCategoryFromTitle('Streaming privacy improved by 5.2%')).toBe('Streaming');
  });

  it('parses multi-word category', () => {
    expect(parseCategoryFromTitle('Social Media privacy declined by 3.1%')).toBe('Social Media');
  });

  it('returns null for non-category title', () => {
    expect(parseCategoryFromTitle('example.com improved score')).toBeNull();
  });
});

// ============================================================================
// extractTemplateData
// ============================================================================

describe('extractTemplateData', () => {
  it('maps DOMAIN_IMPROVEMENT to most_improved template', () => {
    const result = extractTemplateData({
      insightType: 'DOMAIN_IMPROVEMENT',
      title: 'example.com improved privacy score by 20 points',
      details: {
        scoreBefore: 60,
        scoreAfter: 80,
        trackersRemoved: ['tracker1.com', 'tracker2.com'],
        fingerprintingStopped: true,
      },
      trackerDomain: null,
      confidence: 0.95,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('most_improved');
    expect(result!.data.domain).toBe('example.com');
    expect(result!.data.delta).toBe(20);
    expect(result!.data.trackersRemoved).toBe(2); // array.length
    expect(result!.data.fingerprintingStopped).toBe(true);
  });

  it('maps DOMAIN_REGRESSION to unexpected_regression template', () => {
    const result = extractTemplateData({
      insightType: 'DOMAIN_REGRESSION',
      title: 'facebook.com privacy score dropped by 15 points',
      details: {
        scoreBefore: 75,
        scoreAfter: 60,
        trackersAdded: ['ad1.com', 'ad2.com', 'ad3.com'],
        fingerprintingStarted: false,
      },
      trackerDomain: null,
      confidence: 0.95,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('unexpected_regression');
    expect(result!.data.domain).toBe('facebook.com');
    expect(result!.data.delta).toBe(15);
    expect(result!.data.trackersAdded).toBe(3);
  });

  it('maps CATEGORY_TREND to category_shift template', () => {
    const result = extractTemplateData({
      insightType: 'CATEGORY_TREND',
      title: 'Streaming privacy improved by 5.2%',
      details: {
        domainsImproving: 12,
        domainsDeclining: 3,
        avgScore: 72,
        scoreChange: 5.2,
      },
      trackerDomain: null,
      confidence: 0.85,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('category_shift');
    expect(result!.data.category).toBe('Streaming');
    expect(result!.data.domainsImproving).toBe(12);
    expect(result!.data.domainsDeclining).toBe(3);
  });

  it('maps TRACKER_SURGE to tracker_surge template', () => {
    const result = extractTemplateData({
      insightType: 'TRACKER_SURGE',
      title: 'tracker.example.com adoption increased by 15 sites',
      details: {
        netChange: 15,
        domainCount: 100,
        newAdoptions: 20,
        removals: 5,
      },
      trackerDomain: 'tracker.example.com',
      confidence: 0.9,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('tracker_surge');
    expect(result!.data.tracker).toBe('tracker.example.com');
    expect(result!.data.percent).toBe(15);
    expect(result!.data.count).toBe(15);
  });

  it('returns null for TRACKER_SURGE with zero domainCount (fail-closed)', () => {
    const result = extractTemplateData({
      insightType: 'TRACKER_SURGE',
      title: 'tracker.example.com adoption increased',
      details: { netChange: 5, domainCount: 0 },
      trackerDomain: 'tracker.example.com',
      confidence: 0.7,
    });

    expect(result).toBeNull();
  });

  it('maps TRACKER_DECLINE to tracker_decline template', () => {
    const result = extractTemplateData({
      insightType: 'TRACKER_DECLINE',
      title: 'old-tracker.com adoption decreased by 10 sites',
      details: { netChange: -10, domainCount: 50 },
      trackerDomain: 'old-tracker.com',
      confidence: 0.9,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('tracker_decline');
    expect(result!.data.tracker).toBe('old-tracker.com');
    expect(result!.data.count).toBe(10);
  });

  it('maps FINGERPRINTING_SHIFT to fingerprinting_trend template', () => {
    const result = extractTemplateData({
      insightType: 'FINGERPRINTING_SHIFT',
      title: '25 sites changed fingerprinting behavior',
      details: { started: 15, stopped: 10, totalChanges: 25, netChange: 5 },
      trackerDomain: null,
      confidence: 0.95,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('fingerprinting_trend');
    expect(result!.data.started).toBe(15);
    expect(result!.data.stopped).toBe(10);
  });

  it('maps ANOMALY to early_warning template', () => {
    const result = extractTemplateData({
      insightType: 'ANOMALY',
      title: 'Unusual pattern detected',
      details: { category: 'eCommerce', count: 5 },
      trackerDomain: null,
      confidence: 0.6,
    });

    expect(result).not.toBeNull();
    expect(result!.templateId).toBe('early_warning');
    expect(result!.data.category).toBe('eCommerce');
    // predictedChange will be undefined — natural failure mode
    expect(result!.data.predictedChange).toBeUndefined();
  });

  it('returns null for WEEKLY_SUMMARY (skipped)', () => {
    const result = extractTemplateData({
      insightType: 'WEEKLY_SUMMARY',
      title: 'Weekly Summary',
      details: {},
      trackerDomain: null,
      confidence: 0.8,
    });

    expect(result).toBeNull();
  });

  it('returns null for DOMAIN_IMPROVEMENT with missing scores (fail-closed)', () => {
    const result = extractTemplateData({
      insightType: 'DOMAIN_IMPROVEMENT',
      title: 'example.com improved privacy score by 10 points',
      details: {}, // Missing scoreBefore/scoreAfter
      trackerDomain: null,
      confidence: 0.8,
    });

    expect(result).toBeNull();
  });

  it('returns null for DOMAIN_IMPROVEMENT with unparseable title', () => {
    const result = extractTemplateData({
      insightType: 'DOMAIN_IMPROVEMENT',
      title: 'Some domain improved',
      details: { scoreBefore: 60, scoreAfter: 80 },
      trackerDomain: null,
      confidence: 0.8,
    });

    expect(result).toBeNull();
  });

  it('returns null for TRACKER_SURGE without trackerDomain', () => {
    const result = extractTemplateData({
      insightType: 'TRACKER_SURGE',
      title: 'Tracker surge',
      details: { netChange: 10, domainCount: 50 },
      trackerDomain: null,
      confidence: 0.9,
    });

    expect(result).toBeNull();
  });

  it('returns null for FINGERPRINTING_SHIFT with missing started/stopped', () => {
    const result = extractTemplateData({
      insightType: 'FINGERPRINTING_SHIFT',
      title: 'Fingerprinting changed',
      details: { totalChanges: 10 }, // Missing started/stopped
      trackerDomain: null,
      confidence: 0.8,
    });

    expect(result).toBeNull();
  });
});

// ============================================================================
// End-to-end: extractTemplateData → generateNarrativeWithValidation
// ============================================================================

describe('narrative generation integration', () => {
  it('approves valid DOMAIN_IMPROVEMENT narrative', () => {
    const mapping = extractTemplateData({
      insightType: 'DOMAIN_IMPROVEMENT',
      title: 'example.com improved privacy score by 20 points',
      details: {
        scoreBefore: 60,
        scoreAfter: 80,
        trackersRemoved: ['t1.com', 't2.com'],
        fingerprintingStopped: false,
      },
      trackerDomain: null,
      confidence: 0.95,
    });

    expect(mapping).not.toBeNull();
    const result = generateNarrativeWithValidation(mapping!.templateId, mapping!.data);
    expect(result.validated).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.narrative).toContain('example.com');
    expect(result.narrative).toContain('20');
  });

  it('approves valid TRACKER_DECLINE narrative', () => {
    const mapping = extractTemplateData({
      insightType: 'TRACKER_DECLINE',
      title: 'old-tracker.com adoption decreased by 25 sites',
      details: { netChange: -25, domainCount: 100 },
      trackerDomain: 'old-tracker.com',
      confidence: 0.9,
    });

    expect(mapping).not.toBeNull();
    const result = generateNarrativeWithValidation(mapping!.templateId, mapping!.data);
    expect(result.validated).toBe(true);
    expect(result.narrative).toContain('old-tracker.com');
  });

  it('approves valid FINGERPRINTING_SHIFT narrative', () => {
    const mapping = extractTemplateData({
      insightType: 'FINGERPRINTING_SHIFT',
      title: '30 sites changed fingerprinting behavior',
      details: { started: 20, stopped: 10, totalChanges: 30, netChange: 10 },
      trackerDomain: null,
      confidence: 0.95,
    });

    expect(mapping).not.toBeNull();
    const result = generateNarrativeWithValidation(mapping!.templateId, mapping!.data);
    expect(result.validated).toBe(true);
    expect(result.narrative).toContain('fingerprinting');
  });
});
