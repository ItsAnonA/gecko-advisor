/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { describe, it, expect } from 'vitest';
import { normalizeDomain, isValidDomain, getRegistrableDomain } from './normalize.js';

describe('normalizeDomain', () => {
  // Basic normalization cases
  const basicCases = [
    { input: 'example.com', expected: 'example.com' },
    { input: 'Example.COM', expected: 'example.com' },
    { input: 'EXAMPLE.COM', expected: 'example.com' },
    { input: '  example.com  ', expected: 'example.com' },
  ];

  describe('basic normalization', () => {
    basicCases.forEach(({ input, expected }) => {
      it(`"${input}" → "${expected}"`, () => {
        expect(normalizeDomain(input)).toBe(expected);
      });
    });
  });

  // www stripping cases
  const wwwCases = [
    { input: 'www.example.com', expected: 'example.com' },
    { input: 'WWW.EXAMPLE.COM', expected: 'example.com' },
    { input: 'www.WWW.example.com', expected: 'www.example.com' },
  ];

  describe('www stripping', () => {
    wwwCases.forEach(({ input, expected }) => {
      it(`"${input}" → "${expected}"`, () => {
        expect(normalizeDomain(input)).toBe(expected);
      });
    });
  });

  // URL stripping cases
  const urlCases = [
    { input: 'https://example.com/path', expected: 'example.com' },
    { input: 'http://www.example.com:8080/', expected: 'example.com' },
    { input: 'https://example.com/path?query=1', expected: 'example.com' },
    { input: 'https://example.com#fragment', expected: 'example.com' },
    { input: 'https://example.com/path?query=1#fragment', expected: 'example.com' },
    { input: 'HTTP://EXAMPLE.COM', expected: 'example.com' },
  ];

  describe('URL stripping', () => {
    urlCases.forEach(({ input, expected }) => {
      it(`"${input}" → "${expected}"`, () => {
        expect(normalizeDomain(input)).toBe(expected);
      });
    });
  });

  // Trailing dots
  const trailingDotCases = [
    { input: 'example.com.', expected: 'example.com' },
    { input: 'example.com...', expected: 'example.com' },
    { input: 'example.com..', expected: 'example.com' },
  ];

  describe('trailing dot removal', () => {
    trailingDotCases.forEach(({ input, expected }) => {
      it(`"${input}" → "${expected}"`, () => {
        expect(normalizeDomain(input)).toBe(expected);
      });
    });
  });

  // Unicode → Punycode conversion
  const punycodeCases = [
    { input: 'münchen.de', expected: 'xn--mnchen-3ya.de' },
    { input: 'россия.рф', expected: 'xn--h1alffa9f.xn--p1ai' },
    { input: '日本.jp', expected: 'xn--wgv71a.jp' },
    { input: 'example.com', expected: 'example.com' }, // ASCII stays unchanged
    { input: 'münchen.example.com', expected: 'xn--mnchen-3ya.example.com' },
  ];

  describe('unicode → punycode conversion', () => {
    punycodeCases.forEach(({ input, expected }) => {
      it(`"${input}" → "${expected}"`, () => {
        expect(normalizeDomain(input)).toBe(expected);
      });
    });
  });

  // Invalid inputs → empty string
  const invalidCases = [
    { input: '', expected: '' },
    { input: '   ', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' },
    // Very long domains (>253 chars)
    { input: 'a'.repeat(250) + '.com', expected: '' },
  ];

  describe('invalid inputs → empty string', () => {
    invalidCases.forEach(({ input, expected }) => {
      it(`"${input}" → "${expected}"`, () => {
        expect(normalizeDomain(input as string | null | undefined)).toBe(expected);
      });
    });
  });

  // Port removal
  describe('port removal', () => {
    it('removes port 80', () => {
      expect(normalizeDomain('example.com:80')).toBe('example.com');
    });
    it('removes port 443', () => {
      expect(normalizeDomain('example.com:443')).toBe('example.com');
    });
    it('removes custom port', () => {
      expect(normalizeDomain('example.com:8080')).toBe('example.com');
    });
  });
});

describe('isValidDomain', () => {
  describe('rejects invalid domains', () => {
    it('rejects no TLD', () => {
      expect(isValidDomain('localhost')).toBe(false);
    });

    it('rejects >253 chars total', () => {
      expect(isValidDomain('a'.repeat(250) + '.com')).toBe(false);
    });

    it('rejects hyphen at start of label', () => {
      expect(isValidDomain('-invalid.com')).toBe(false);
    });

    it('rejects hyphen at end of label', () => {
      expect(isValidDomain('invalid-.com')).toBe(false);
    });

    it('rejects label >63 chars', () => {
      expect(isValidDomain('a'.repeat(64) + '.com')).toBe(false);
    });

    it('rejects consecutive dots (empty label)', () => {
      expect(isValidDomain('example..com')).toBe(false);
    });

    it('rejects TLD < 2 chars', () => {
      expect(isValidDomain('example.a')).toBe(false);
    });

    it('rejects special characters', () => {
      expect(isValidDomain('example<script>.com')).toBe(false);
      expect(isValidDomain('example@test.com')).toBe(false);
    });

    it('rejects localhost', () => {
      expect(isValidDomain('localhost')).toBe(false);
      expect(isValidDomain('localhost.localdomain')).toBe(false);
    });

    it('rejects reserved TLDs', () => {
      expect(isValidDomain('example.local')).toBe(false);
      expect(isValidDomain('example.test')).toBe(false);
      expect(isValidDomain('example.example')).toBe(false);
      expect(isValidDomain('example.invalid')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidDomain(null)).toBe(false);
      expect(isValidDomain(undefined)).toBe(false);
    });
  });

  describe('accepts valid domains', () => {
    it('accepts basic domain', () => {
      expect(isValidDomain('example.com')).toBe(true);
    });

    it('accepts domain with subdomain', () => {
      expect(isValidDomain('sub.example.com')).toBe(true);
    });

    it('accepts valid punycode domain', () => {
      expect(isValidDomain('xn--mnchen-3ya.de')).toBe(true);
    });

    it('accepts domain with hyphens in middle', () => {
      expect(isValidDomain('my-example.com')).toBe(true);
    });

    it('accepts domain with numbers', () => {
      expect(isValidDomain('123.example.com')).toBe(true);
      expect(isValidDomain('example123.com')).toBe(true);
    });

    it('accepts long TLDs', () => {
      expect(isValidDomain('example.museum')).toBe(true);
      expect(isValidDomain('example.technology')).toBe(true);
    });

    it('accepts compound TLDs', () => {
      expect(isValidDomain('example.co.uk')).toBe(true);
      expect(isValidDomain('example.com.au')).toBe(true);
    });
  });
});

describe('getRegistrableDomain', () => {
  it('handles simple domains', () => {
    expect(getRegistrableDomain('example.com')).toBe('example.com');
  });

  it('handles subdomains', () => {
    expect(getRegistrableDomain('sub.example.com')).toBe('example.com');
    expect(getRegistrableDomain('deep.sub.example.com')).toBe('example.com');
  });

  it('handles compound TLDs', () => {
    expect(getRegistrableDomain('example.co.uk')).toBe('example.co.uk');
    expect(getRegistrableDomain('sub.example.co.uk')).toBe('example.co.uk');
  });

  it('handles various compound TLDs', () => {
    expect(getRegistrableDomain('example.com.au')).toBe('example.com.au');
    expect(getRegistrableDomain('example.co.jp')).toBe('example.co.jp');
    expect(getRegistrableDomain('example.org.uk')).toBe('example.org.uk');
  });
});
