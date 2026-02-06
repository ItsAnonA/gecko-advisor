import { describe, it, expect } from 'vitest';
import {
  calculateTrackingPenalty,
  calculateSecurityPenalty,
  calculateThirdPartyPenalty,
  calculateCookiePenalty,
  calculateCompliancePenalty,
  calculateBonuses,
  assessConfidence,
  deduplicateEvidence,
} from '../scoring.js';
import type { Evidence } from '@prisma/client';

// ============================================================================
// Test Helpers
// ============================================================================

let idCounter = 0;

function mockEvidence(
  kind: string,
  details: Record<string, unknown> = {}
): Evidence {
  idCounter++;
  return {
    id: `ev-${idCounter}`,
    scanId: 'scan-1',
    kind,
    severity: 0,
    title: `Test ${kind}`,
    details: details as object,
    createdAt: new Date(),
  };
}

function makeExplanations(): { evidenceId: string; points: number; reason: string }[] {
  return [];
}

// ============================================================================
// Tracking Penalty
// ============================================================================

describe('calculateTrackingPenalty', () => {
  it('returns 0 for no trackers and no fingerprinting', () => {
    const result = calculateTrackingPenalty([], 0, makeExplanations());
    expect(result).toBe(0);
  });

  it('penalizes 5 points per unique tracker domain', () => {
    const evidence = [
      mockEvidence('tracker', { domain: 'google-analytics.com' }),
      mockEvidence('tracker', { domain: 'facebook.net' }),
    ];
    const result = calculateTrackingPenalty(evidence, 0, makeExplanations());
    expect(result).toBe(10);
  });

  it('caps tracker base penalty at 40', () => {
    // 9 unique trackers × 5 = 45, capped at 40
    const evidence = Array.from({ length: 9 }, (_, i) =>
      mockEvidence('tracker', { domain: `tracker${i}.com` })
    );
    const result = calculateTrackingPenalty(evidence, 0, makeExplanations());
    expect(result).toBeLessThanOrEqual(50);
    // 9 × 5 = 45 → capped at 40 base + 0 fp = 40
    expect(result).toBe(40);
  });

  it('adds fingerprinting tracker penalty', () => {
    const evidence = [
      mockEvidence('tracker', { domain: 'fp.com', fingerprinting: true }),
    ];
    const result = calculateTrackingPenalty(evidence, 0, makeExplanations());
    // 1 tracker (5) + 1 fp tracker (5) = 10
    expect(result).toBe(10);
  });

  it('caps fingerprinting tracker addon at 15', () => {
    const evidence = Array.from({ length: 4 }, (_, i) =>
      mockEvidence('tracker', { domain: `fp${i}.com`, fingerprinting: true })
    );
    const result = calculateTrackingPenalty(evidence, 0, makeExplanations());
    // 4 trackers (20) + 4 fp trackers (20, capped at 15) = 35
    expect(result).toBe(35);
  });

  it('adds 5 points for 3+ fingerprint signals', () => {
    const result = calculateTrackingPenalty([], 3, makeExplanations());
    expect(result).toBe(5);
  });

  it('does not add fingerprint penalty for < 3 signals', () => {
    const result = calculateTrackingPenalty([], 2, makeExplanations());
    expect(result).toBe(0);
  });

  it('caps total tracking penalty at 50', () => {
    // Many trackers + fingerprinting
    const evidence = Array.from({ length: 15 }, (_, i) =>
      mockEvidence('tracker', { domain: `tracker${i}.com`, fingerprinting: true })
    );
    const result = calculateTrackingPenalty(evidence, 5, makeExplanations());
    expect(result).toBe(50);
  });

  it('deduplicates tracker domains', () => {
    const evidence = [
      mockEvidence('tracker', { domain: 'same.com' }),
      mockEvidence('tracker', { domain: 'same.com' }),
      mockEvidence('tracker', { domain: 'same.com' }),
    ];
    const result = calculateTrackingPenalty(evidence, 0, makeExplanations());
    // Only 1 unique domain → 5 points
    expect(result).toBe(5);
  });

  it('tracks explanations', () => {
    const explanations = makeExplanations();
    const evidence = [mockEvidence('tracker', { domain: 'test.com' })];
    calculateTrackingPenalty(evidence, 0, explanations);
    expect(explanations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Security Penalty
// ============================================================================

describe('calculateSecurityPenalty', () => {
  it('returns 0 for clean HTTPS site', () => {
    const result = calculateSecurityPenalty([], 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(0);
    expect(result.isHttpOnly).toBe(false);
  });

  it('penalizes HTTP-only sites with 20 points', () => {
    const result = calculateSecurityPenalty([], 'http://example.com', makeExplanations());
    expect(result.penalty).toBe(20);
    expect(result.isHttpOnly).toBe(true);
  });

  it('penalizes TLS grade C with 3 points', () => {
    const evidence = [mockEvidence('tls', { grade: 'C' })];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(3);
  });

  it('penalizes TLS grade D with 7 points', () => {
    const evidence = [mockEvidence('tls', { grade: 'D' })];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(7);
  });

  it('penalizes TLS grade F with 12 points', () => {
    const evidence = [mockEvidence('tls', { grade: 'F' })];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(12);
  });

  it('no TLS penalty for grade A or A+', () => {
    const evidenceA = [mockEvidence('tls', { grade: 'A' })];
    const resultA = calculateSecurityPenalty(evidenceA, 'https://example.com', makeExplanations());
    expect(resultA.penalty).toBe(0);

    const evidenceAPlus = [mockEvidence('tls', { grade: 'A+' })];
    const resultAPlus = calculateSecurityPenalty(evidenceAPlus, 'https://example.com', makeExplanations());
    expect(resultAPlus.penalty).toBe(0);
  });

  it('penalizes mixed content on HTTPS sites', () => {
    const evidence = [
      mockEvidence('insecure', { url: 'http://cdn.example.com/script.js', resourceType: 'resource' }),
    ];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(10);
  });

  it('caps mixed content penalty at 20', () => {
    const evidence = Array.from({ length: 5 }, (_, i) =>
      mockEvidence('insecure', { url: `http://cdn${i}.com/file.js`, resourceType: 'resource' })
    );
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    // 5 × 10 = 50, capped at 20
    expect(result.penalty).toBe(20);
  });

  it('skips mixed content check for HTTP-only sites', () => {
    const evidence = [
      mockEvidence('insecure', { url: 'http://cdn.example.com/script.js', resourceType: 'resource' }),
    ];
    const result = calculateSecurityPenalty(evidence, 'http://example.com', makeExplanations());
    // Should only have the 20-point HTTP penalty, not mixed content
    expect(result.penalty).toBe(20);
  });

  it('ignores insecure entries with resourceType "link"', () => {
    const evidence = [
      mockEvidence('insecure', { url: 'http://example.com/page', resourceType: 'link' }),
    ];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(0);
  });

  it('penalizes missing headers at 3 points each', () => {
    const evidence = [
      mockEvidence('header', { name: 'Content-Security-Policy' }),
      mockEvidence('header', { name: 'X-Content-Type-Options' }),
    ];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    expect(result.penalty).toBe(6);
  });

  it('caps header penalty at 12', () => {
    const evidence = Array.from({ length: 6 }, (_, i) =>
      mockEvidence('header', { name: `Header-${i}` })
    );
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    // 6 × 3 = 18, capped at 12
    expect(result.penalty).toBe(12);
  });

  it('caps total security penalty at 45', () => {
    const evidence = [
      mockEvidence('tls', { grade: 'F' }),
      ...Array.from({ length: 5 }, (_, i) =>
        mockEvidence('insecure', { url: `http://cdn${i}.com/file.js`, resourceType: 'resource' })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        mockEvidence('header', { name: `Header-${i}` })
      ),
    ];
    const result = calculateSecurityPenalty(evidence, 'https://example.com', makeExplanations());
    // 12 (TLS F) + 20 (mixed content cap) + 12 (headers cap) = 44, under cap of 45
    expect(result.penalty).toBeLessThanOrEqual(45);
  });
});

// ============================================================================
// Third-Party Penalty
// ============================================================================

describe('calculateThirdPartyPenalty', () => {
  it('returns 0 for no third-party domains', () => {
    const result = calculateThirdPartyPenalty([], 'example.com', makeExplanations());
    expect(result).toBe(0);
  });

  it('penalizes 2 points per unique third-party domain', () => {
    const evidence = [
      mockEvidence('thirdparty', { domain: 'cdn.other.com' }),
      mockEvidence('thirdparty', { domain: 'api.another.com' }),
    ];
    const result = calculateThirdPartyPenalty(evidence, 'example.com', makeExplanations());
    expect(result).toBe(4);
  });

  it('caps at 15 points', () => {
    const evidence = Array.from({ length: 10 }, (_, i) =>
      mockEvidence('thirdparty', { domain: `third${i}.com` })
    );
    const result = calculateThirdPartyPenalty(evidence, 'example.com', makeExplanations());
    // 10 × 2 = 20, capped at 15
    expect(result).toBe(15);
  });

  it('filters out first-party domains (same eTLD+1)', () => {
    const evidence = [
      mockEvidence('thirdparty', { domain: 'api.example.com' }),
      mockEvidence('thirdparty', { domain: 'cdn.example.com' }),
    ];
    const result = calculateThirdPartyPenalty(evidence, 'example.com', makeExplanations());
    expect(result).toBe(0);
  });
});

// ============================================================================
// Cookie Penalty
// ============================================================================

describe('calculateCookiePenalty', () => {
  it('returns 0 for no cookie issues', () => {
    const result = calculateCookiePenalty([], makeExplanations());
    expect(result).toBe(0);
  });

  it('penalizes 2 points per cookie issue', () => {
    const evidence = [
      mockEvidence('cookie', { name: 'session_id' }),
      mockEvidence('cookie', { name: 'prefs' }),
    ];
    const result = calculateCookiePenalty(evidence, makeExplanations());
    expect(result).toBe(4);
  });

  it('caps at 10 points', () => {
    const evidence = Array.from({ length: 8 }, (_, i) =>
      mockEvidence('cookie', { name: `cookie${i}` })
    );
    const result = calculateCookiePenalty(evidence, makeExplanations());
    // 8 × 2 = 16, capped at 10
    expect(result).toBe(10);
  });
});

// ============================================================================
// Compliance Penalty
// ============================================================================

describe('calculateCompliancePenalty', () => {
  it('returns 5 when no policy found', () => {
    const result = calculateCompliancePenalty([], makeExplanations());
    expect(result.penalty).toBe(5);
    expect(result.policyFound).toBe(false);
  });

  it('returns 0 when policy is present', () => {
    const evidence = [mockEvidence('policy', { url: '/privacy' })];
    const result = calculateCompliancePenalty(evidence, makeExplanations());
    expect(result.penalty).toBe(0);
    expect(result.policyFound).toBe(true);
  });
});

// ============================================================================
// Bonuses
// ============================================================================

describe('calculateBonuses', () => {
  it('returns 0 for HTTP-only sites', () => {
    const evidence = [mockEvidence('tls', { grade: 'A+' })];
    const result = calculateBonuses(evidence, true, makeExplanations());
    expect(result).toBe(0);
  });

  it('returns 3 for TLS grade A+', () => {
    const evidence = [mockEvidence('tls', { grade: 'A+' })];
    const result = calculateBonuses(evidence, false, makeExplanations());
    expect(result).toBe(3);
  });

  it('returns 2 for TLS grade A', () => {
    const evidence = [mockEvidence('tls', { grade: 'A' })];
    const result = calculateBonuses(evidence, false, makeExplanations());
    expect(result).toBe(2);
  });

  it('returns 0 for TLS grade B', () => {
    const evidence = [mockEvidence('tls', { grade: 'B' })];
    const result = calculateBonuses(evidence, false, makeExplanations());
    expect(result).toBe(0);
  });

  it('returns 0 for no TLS evidence', () => {
    const result = calculateBonuses([], false, makeExplanations());
    expect(result).toBe(0);
  });
});

// ============================================================================
// Scan Confidence Assessment
// ============================================================================

describe('assessConfidence', () => {
  it('returns high when no issues', () => {
    const result = assessConfidence({});
    expect(result.level).toBe('high');
    expect(result.reasons).toHaveLength(0);
  });

  it('flags limited page coverage', () => {
    const result = assessConfidence({ pagesScanned: 1 });
    expect(result.reasons).toContain('Limited page coverage');
  });

  it('flags TLS scan failure', () => {
    const result = assessConfidence({ tlsScanFailed: true });
    expect(result.reasons).toContain('TLS assessment incomplete');
  });

  it('flags multiple crawl failures', () => {
    const result = assessConfidence({ crawlErrors: 10 });
    expect(result.reasons).toContain('Multiple crawl failures');
  });

  it('flags unusually fast scan', () => {
    const result = assessConfidence({ duration: 2000 });
    expect(result.reasons).toContain('Scan completed unusually fast');
  });

  it('flags robots.txt blocking', () => {
    const result = assessConfidence({ blockedByRobots: true });
    expect(result.reasons).toContain('Robots.txt blocked some pages');
  });

  it('returns medium for 1-2 issues', () => {
    const result = assessConfidence({ pagesScanned: 1, tlsScanFailed: true });
    expect(result.level).toBe('medium');
  });

  it('returns low for 3+ issues', () => {
    const result = assessConfidence({
      pagesScanned: 1,
      tlsScanFailed: true,
      crawlErrors: 10,
    });
    expect(result.level).toBe('low');
  });
});

// ============================================================================
// Evidence Deduplication
// ============================================================================

describe('deduplicateEvidence', () => {
  it('removes duplicate tracker domains', () => {
    const evidence = [
      mockEvidence('tracker', { domain: 'same.com' }),
      mockEvidence('tracker', { domain: 'same.com' }),
    ];
    const result = deduplicateEvidence(evidence);
    expect(result).toHaveLength(1);
  });

  it('keeps different tracker domains', () => {
    const evidence = [
      mockEvidence('tracker', { domain: 'a.com' }),
      mockEvidence('tracker', { domain: 'b.com' }),
    ];
    const result = deduplicateEvidence(evidence);
    expect(result).toHaveLength(2);
  });

  it('deduplicates headers by name', () => {
    const evidence = [
      mockEvidence('header', { name: 'CSP' }),
      mockEvidence('header', { name: 'CSP' }),
    ];
    const result = deduplicateEvidence(evidence);
    expect(result).toHaveLength(1);
  });

  it('deduplicates thirdparty by domain', () => {
    const evidence = [
      mockEvidence('thirdparty', { domain: 'cdn.example.com' }),
      mockEvidence('thirdparty', { domain: 'cdn.example.com' }),
    ];
    const result = deduplicateEvidence(evidence);
    expect(result).toHaveLength(1);
  });

  it('treats fingerprint as a single entry', () => {
    const evidence = [
      mockEvidence('fingerprint', {}),
      mockEvidence('fingerprint', {}),
    ];
    const result = deduplicateEvidence(evidence);
    expect(result).toHaveLength(1);
  });

  it('preserves different kinds', () => {
    const evidence = [
      mockEvidence('tracker', { domain: 'tracker.com' }),
      mockEvidence('header', { name: 'CSP' }),
      mockEvidence('cookie', { name: 'session' }),
    ];
    const result = deduplicateEvidence(evidence);
    expect(result).toHaveLength(3);
  });
});
