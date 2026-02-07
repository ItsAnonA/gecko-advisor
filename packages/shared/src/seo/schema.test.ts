/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { describe, it, expect } from 'vitest';
import {
  FAQ_MAX_WORDS,
  enforceWordLimit,
  buildWebPageSchema,
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from './schema.js';
import type { ScanDataForMetadata } from './metadata.js';

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

describe('enforceWordLimit', () => {
  it('exports FAQ_MAX_WORDS constant as 55', () => {
    expect(FAQ_MAX_WORDS).toBe(55);
  });

  it('returns text unchanged if under limit', () => {
    const text = 'This is a short sentence.';
    expect(enforceWordLimit(text)).toBe(text);
  });

  it('truncates text over 55 words', () => {
    const longText = 'word '.repeat(60).trim();
    const result = enforceWordLimit(longText);
    expect(wordCount(result)).toBeLessThanOrEqual(55);
  });

  it('ends at sentence boundary when possible', () => {
    // Text with a sentence ending around word 40
    const text =
      'This is the first sentence with many words to fill up space. ' +
      'This is the second sentence. ' +
      'This is the third sentence that goes on and on and on and on and on and on and on and on and on.';
    const result = enforceWordLimit(text);
    // Should end at a period if within 60% threshold
    if (result.length < text.length) {
      expect(result.endsWith('.') || result.endsWith('...')).toBe(true);
    }
  });

  it('adds ellipsis when no good sentence boundary', () => {
    // No periods in text
    const text = 'word '.repeat(60).trim();
    const result = enforceWordLimit(text);
    expect(result).toContain('...');
  });

  it('respects custom maxWords parameter', () => {
    const text = 'word '.repeat(30).trim();
    const result = enforceWordLimit(text, 10);
    expect(wordCount(result)).toBeLessThanOrEqual(10);
  });
});

describe('buildFAQSchema', () => {
  const fullData: ScanDataForMetadata = {
    status: 'done',
    score: 75,
    trackerCount: 5,
    thirdPartyCount: 10,
    cookieCount: 3,
    tlsGrade: 'A',
    finishedAt: new Date().toISOString(),
  };

  describe('structure', () => {
    it('returns FAQPage schema', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      expect(faq).not.toBeNull();
      expect(faq?.['@context']).toBe('https://schema.org');
      expect(faq?.['@type']).toBe('FAQPage');
    });

    it('returns null for noindex tier', () => {
      expect(buildFAQSchema(fullData, 'example.com', 'noindex')).toBeNull();
    });

    it('returns null for null scanData', () => {
      expect(buildFAQSchema(null, 'example.com', 'full')).toBeNull();
    });

    it('returns null if fewer than 2 questions', () => {
      const minimalData = { status: 'done', score: 75 };
      // Only score question, no tracker/thirdParty/tls questions
      const faq = buildFAQSchema(minimalData, 'example.com', 'full');
      expect(faq).toBeNull();
    });

    it('has at least 2 questions for valid data', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      expect(faq?.mainEntity.length).toBeGreaterThanOrEqual(2);
    });

    it('has 4 questions for full data', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      expect(faq?.mainEntity.length).toBe(4);
    });
  });

  describe('word limits', () => {
    it('all answers ≤ 55 words', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      faq?.mainEntity.forEach((q) => {
        const words = wordCount(q.acceptedAnswer.text);
        expect(words).toBeLessThanOrEqual(55);
      });
    });

    it('tracker answer ≤ 55 words (zero trackers)', () => {
      const faq = buildFAQSchema({ ...fullData, trackerCount: 0 }, 'example.com', 'full');
      const trackerQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('track'));
      if (trackerQ) {
        expect(wordCount(trackerQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });

    it('tracker answer ≤ 55 words (many trackers)', () => {
      const faq = buildFAQSchema({ ...fullData, trackerCount: 50 }, 'example.com', 'full');
      const trackerQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('track'));
      if (trackerQ) {
        expect(wordCount(trackerQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });

    it('third-party answer ≤ 55 words (zero)', () => {
      const faq = buildFAQSchema({ ...fullData, thirdPartyCount: 0 }, 'example.com', 'full');
      const tpQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('third'));
      if (tpQ) {
        expect(wordCount(tpQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });

    it('third-party answer ≤ 55 words (many)', () => {
      const faq = buildFAQSchema({ ...fullData, thirdPartyCount: 100 }, 'example.com', 'full');
      const tpQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('third'));
      if (tpQ) {
        expect(wordCount(tpQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });

    it('security answer ≤ 55 words (grade A)', () => {
      const faq = buildFAQSchema({ ...fullData, tlsGrade: 'A' }, 'example.com', 'full');
      const secQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('secure'));
      if (secQ) {
        expect(wordCount(secQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });

    it('security answer ≤ 55 words (grade F)', () => {
      const faq = buildFAQSchema({ ...fullData, tlsGrade: 'F' }, 'example.com', 'full');
      const secQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('secure'));
      if (secQ) {
        expect(wordCount(secQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });

    it('score answer ≤ 55 words', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      const scoreQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('score'));
      if (scoreQ) {
        expect(wordCount(scoreQ.acceptedAnswer.text)).toBeLessThanOrEqual(55);
      }
    });
  });

  describe('question content', () => {
    it('questions contain domain', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      faq?.mainEntity.forEach((q) => {
        expect(q.name).toContain('example.com');
      });
    });

    it('tracker question uses hedging language', () => {
      const faq = buildFAQSchema(fullData, 'example.com', 'full');
      const trackerQ = faq?.mainEntity.find((q) => q.name.toLowerCase().includes('track'));
      const answer = trackerQ?.acceptedAnswer.text.toLowerCase() || '';
      // Should contain hedging like "detected", "scan", "may include"
      expect(
        answer.includes('detected') || answer.includes('scan') || answer.includes('may')
      ).toBe(true);
    });
  });
});

describe('buildWebPageSchema', () => {
  const fullData: ScanDataForMetadata = {
    status: 'done',
    score: 75,
    trackerCount: 5,
    thirdPartyCount: 10,
    tlsGrade: 'A',
    finishedAt: new Date().toISOString(),
  };

  it('returns WebPage schema', () => {
    const schema = buildWebPageSchema(fullData, 'example.com');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebPage');
  });

  it('contains correct URL', () => {
    const schema = buildWebPageSchema(fullData, 'example.com');
    expect(schema.url).toBe('https://geckoadvisor.com/privacy-report/example.com');
  });

  it('contains site name in isPartOf', () => {
    const schema = buildWebPageSchema(fullData, 'example.com');
    expect(schema.isPartOf.name).toBe('Gecko Advisor');
  });

  it('contains dateModified when finishedAt exists', () => {
    const schema = buildWebPageSchema(fullData, 'example.com');
    expect(schema.dateModified).toBeDefined();
  });

  it('mainEntity is a Report', () => {
    const schema = buildWebPageSchema(fullData, 'example.com');
    expect(schema.mainEntity?.['@type']).toBe('Report');
  });

  it('uses custom baseUrl when provided', () => {
    const schema = buildWebPageSchema(fullData, 'example.com', 'https://custom.com');
    expect(schema.url).toBe('https://custom.com/privacy-report/example.com');
    expect(schema.isPartOf.url).toBe('https://custom.com');
  });
});

describe('buildBreadcrumbSchema', () => {
  it('returns BreadcrumbList schema', () => {
    const schema = buildBreadcrumbSchema('example.com');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('BreadcrumbList');
  });

  it('has 3 items', () => {
    const schema = buildBreadcrumbSchema('example.com');
    expect(schema.itemListElement.length).toBe(3);
  });

  it('first item is Home', () => {
    const schema = buildBreadcrumbSchema('example.com');
    const firstItem = schema.itemListElement[0];
    expect(firstItem).toBeDefined();
    expect(firstItem?.name).toBe('Home');
    expect(firstItem?.position).toBe(1);
  });

  it('second item is Privacy Reports', () => {
    const schema = buildBreadcrumbSchema('example.com');
    const secondItem = schema.itemListElement[1];
    expect(secondItem).toBeDefined();
    expect(secondItem?.name).toBe('Privacy Reports');
    expect(secondItem?.position).toBe(2);
  });

  it('third item is domain (no item URL)', () => {
    const schema = buildBreadcrumbSchema('example.com');
    const thirdItem = schema.itemListElement[2];
    expect(thirdItem).toBeDefined();
    expect(thirdItem?.name).toBe('example.com');
    expect(thirdItem?.position).toBe(3);
    expect(thirdItem?.item).toBeUndefined();
  });
});

describe('buildOrganizationSchema', () => {
  it('returns Organization schema', () => {
    const schema = buildOrganizationSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Organization');
  });

  it('contains correct name', () => {
    const schema = buildOrganizationSchema();
    expect(schema.name).toBe('Gecko Advisor');
  });

  it('contains logo', () => {
    const schema = buildOrganizationSchema();
    expect(schema.logo).toContain('logo.png');
  });

  it('contains sameAs links', () => {
    const schema = buildOrganizationSchema();
    expect(schema.sameAs).toBeDefined();
    expect(schema.sameAs?.length).toBeGreaterThan(0);
  });
});

describe('buildWebSiteSchema', () => {
  it('returns WebSite schema', () => {
    const schema = buildWebSiteSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
  });

  it('contains correct name', () => {
    const schema = buildWebSiteSchema();
    expect(schema.name).toBe('Gecko Advisor');
  });

  it('contains potentialAction for search', () => {
    const schema = buildWebSiteSchema();
    expect(schema.potentialAction).toBeDefined();
    expect((schema.potentialAction as Record<string, unknown>)['@type']).toBe('SearchAction');
  });

  it('search action URL contains placeholder', () => {
    const schema = buildWebSiteSchema();
    const action = schema.potentialAction as Record<string, unknown>;
    const target = action.target as Record<string, unknown>;
    expect(target.urlTemplate).toContain('{search_term_string}');
  });
});

describe('FAQ banned phrases', () => {
  const fullData: ScanDataForMetadata = {
    status: 'done',
    score: 75,
    trackerCount: 5,
    thirdPartyCount: 10,
    tlsGrade: 'A',
    finishedAt: new Date().toISOString(),
  };

  const banned = [
    'strong commitment',
    'respects your privacy',
    'privacy-friendly',
    'trustworthy',
    'responsible',
    'reasonable',
    'rare',
    'uncommon',
    'best practices',
    'compliant',
    'gdpr',
    'ccpa',
  ];

  it('no banned phrases in any FAQ answer', () => {
    // Test various scan data configurations
    const configs = [
      fullData,
      { ...fullData, score: 95, trackerCount: 0, thirdPartyCount: 0 },
      { ...fullData, score: 25, trackerCount: 50, thirdPartyCount: 100 },
      { ...fullData, tlsGrade: 'F' },
    ];

    configs.forEach((config) => {
      const faq = buildFAQSchema(config, 'example.com', 'full');
      faq?.mainEntity.forEach((q) => {
        const answerLower = q.acceptedAnswer.text.toLowerCase();
        banned.forEach((phrase) => {
          expect(answerLower).not.toContain(phrase.toLowerCase());
        });
      });
    });
  });
});
