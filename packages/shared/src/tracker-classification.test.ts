import { describe, it, expect } from 'vitest';
import {
  classifyTracker,
  analyzeTrackerPurposes,
  getTrackerName,
  getTrackerPurpose,
  dominantPurposeInterpretation,
  purposeLabel,
} from './tracker-classification.js';

describe('classifyTracker', () => {
  it('classifies known advertising trackers', () => {
    expect(classifyTracker('doubleclick.net').purpose).toBe('advertising');
    expect(classifyTracker('facebook.net').purpose).toBe('advertising');
    expect(classifyTracker('criteo.com').purpose).toBe('advertising');
    expect(classifyTracker('googlesyndication.com').purpose).toBe('advertising');
  });

  it('classifies known analytics trackers', () => {
    expect(classifyTracker('google-analytics.com').purpose).toBe('analytics');
    expect(classifyTracker('hotjar.com').purpose).toBe('analytics');
    expect(classifyTracker('mixpanel.com').purpose).toBe('analytics');
    expect(classifyTracker('clarity.ms').purpose).toBe('analytics');
  });

  it('classifies known social trackers', () => {
    expect(classifyTracker('facebook.com').purpose).toBe('social');
    expect(classifyTracker('twitter.com').purpose).toBe('social');
    expect(classifyTracker('tiktok.com').purpose).toBe('social');
    expect(classifyTracker('linkedin.com').purpose).toBe('social');
  });

  it('classifies known functional/CDN trackers', () => {
    expect(classifyTracker('googleapis.com').purpose).toBe('functional');
    expect(classifyTracker('cloudflare.com').purpose).toBe('functional');
    expect(classifyTracker('amazonaws.com').purpose).toBe('functional');
    expect(classifyTracker('jsdelivr.net').purpose).toBe('functional');
  });

  it('classifies fingerprinting trackers', () => {
    expect(classifyTracker('fingerprintjs.com').purpose).toBe('fingerprinting');
    expect(classifyTracker('fpjs.io').purpose).toBe('fingerprinting');
  });

  it('resolves subdomain aliases', () => {
    // connect.facebook.net should match facebook.net
    expect(classifyTracker('connect.facebook.net').purpose).toBe('advertising');
    expect(classifyTracker('connect.facebook.net').name).toBe('Meta Pixel');

    // platform.twitter.com should match its entry
    expect(classifyTracker('platform.twitter.com').purpose).toBe('social');
  });

  it('falls back to heuristic for ad-like domains', () => {
    const result = classifyTracker('ad.example.com');
    expect(result.purpose).toBe('advertising');
    expect(result.confidence).toBe('low');
  });

  it('falls back to heuristic for tracking-like domains', () => {
    const result = classifyTracker('pixel.someservice.io');
    expect(result.purpose).toBe('analytics');
    expect(result.confidence).toBe('low');
  });

  it('returns unknown for unrecognized domains', () => {
    const result = classifyTracker('completely-random-domain.xyz');
    expect(result.purpose).toBe('unknown');
    expect(result.confidence).toBe('low');
    expect(result.risk).toBe('medium');
  });

  it('provides display names for known trackers', () => {
    expect(getTrackerName('doubleclick.net')).toBe('DoubleClick (Google)');
    expect(getTrackerName('google-analytics.com')).toBe('Google Analytics');
    expect(getTrackerName('hotjar.com')).toBe('Hotjar');
  });

  it('returns domain as name for unknown trackers', () => {
    expect(getTrackerName('unknown-tracker.net')).toBe('unknown-tracker.net');
  });

  it('identifies secondary purposes for mixed-use trackers', () => {
    expect(classifyTracker('facebook.net').secondaryPurpose).toBe('analytics');
    expect(classifyTracker('googletagmanager.com').secondaryPurpose).toBe('advertising');
    expect(classifyTracker('quantserve.com').secondaryPurpose).toBe('advertising');
  });

  it('assigns correct confidence levels', () => {
    // Exact match → high
    expect(classifyTracker('doubleclick.net').confidence).toBe('high');
    // Mixed-use → medium
    expect(classifyTracker('googletagmanager.com').confidence).toBe('medium');
    // Unknown → low
    expect(classifyTracker('unknown.test').confidence).toBe('low');
  });
});

describe('analyzeTrackerPurposes', () => {
  it('returns minimal profile for empty input', () => {
    const result = analyzeTrackerPurposes([]);
    expect(result.stackProfile).toBe('minimal');
    expect(result.dominantPurpose).toBeNull();
    expect(result.dominantPurposeShare).toBe(0);
    expect(result.classified).toHaveLength(0);
  });

  it('identifies advertising-heavy stack', () => {
    const result = analyzeTrackerPurposes([
      'doubleclick.net',
      'criteo.com',
      'googlesyndication.com',
      'google-analytics.com',
    ]);
    expect(result.stackProfile).toBe('advertising-heavy');
    expect(result.dominantPurpose).toBe('advertising');
    expect(result.dominantPurposeShare).toBe(0.75);
    expect(result.isSkewed).toBe(true);
    expect(result.breakdown.advertising).toBe(3);
    expect(result.breakdown.analytics).toBe(1);
  });

  it('identifies analytics-heavy stack', () => {
    const result = analyzeTrackerPurposes([
      'google-analytics.com',
      'hotjar.com',
      'mixpanel.com',
      'doubleclick.net',
    ]);
    expect(result.stackProfile).toBe('analytics-heavy');
    expect(result.dominantPurpose).toBe('analytics');
    expect(result.isSkewed).toBe(true);
  });

  it('identifies mixed stack', () => {
    const result = analyzeTrackerPurposes([
      'doubleclick.net',      // advertising
      'google-analytics.com', // analytics
      'facebook.com',         // social
      'hotjar.com',           // analytics
    ]);
    expect(result.stackProfile).toBe('mixed');
    expect(result.isSkewed).toBe(false);
  });

  it('identifies functional-only stack', () => {
    const result = analyzeTrackerPurposes([
      'cloudflare.com',
      'googleapis.com',
      'amazonaws.com',
    ]);
    expect(result.stackProfile).toBe('functional-only');
    expect(result.dominantPurpose).toBeNull();
  });

  it('excludes functional and unknown from dominant purpose calculation', () => {
    const result = analyzeTrackerPurposes([
      'doubleclick.net',        // advertising
      'cloudflare.com',         // functional
      'googleapis.com',         // functional
      'unknown-thing.io',       // unknown
    ]);
    expect(result.dominantPurpose).toBe('advertising');
    // Only 1 privacy-relevant tracker → share = 1.0
    expect(result.dominantPurposeShare).toBe(1);
    // But only 1 privacy-relevant → not skewed (need >=2)
    expect(result.isSkewed).toBe(false);
  });

  it('sorts classified trackers by risk (high first)', () => {
    const result = analyzeTrackerPurposes([
      'cloudflare.com',      // risk: none
      'google-analytics.com', // risk: medium
      'doubleclick.net',      // risk: high
    ]);
    expect(result.classified[0]!.classification.risk).toBe('high');
    expect(result.classified[1]!.classification.risk).toBe('medium');
    expect(result.classified[2]!.classification.risk).toBe('none');
  });

  it('counts unknown trackers', () => {
    const result = analyzeTrackerPurposes([
      'doubleclick.net',
      'some-random-thing.net',
      'another-mystery.co',
    ]);
    expect(result.unknownCount).toBe(2);
  });
});

describe('helper functions', () => {
  it('getTrackerPurpose returns purpose', () => {
    expect(getTrackerPurpose('doubleclick.net')).toBe('advertising');
    expect(getTrackerPurpose('googleapis.com')).toBe('functional');
  });

  it('purposeLabel returns human-readable labels', () => {
    expect(purposeLabel('advertising')).toBe('Advertising & Retargeting');
    expect(purposeLabel('analytics')).toBe('Analytics & Measurement');
    expect(purposeLabel('functional')).toBe('Functional / CDN');
  });

  it('dominantPurposeInterpretation includes percentage', () => {
    const text = dominantPurposeInterpretation('advertising', 0.75);
    expect(text).toContain('75%');
    expect(text).toContain('Advertising');
  });
});
