import { describe, it, expect } from 'vitest';
import {
  parseEasyPrivacyLine,
  parseList,
  validateList,
  CANARIES,
  MIN_INGEST_DOMAIN_COUNT,
} from '../utils/easyPrivacyParser.js';

describe('parseEasyPrivacyLine', () => {
  describe('block rules (extracted)', () => {
    it('extracts eTLD+1 from a basic ||host^ rule', () => {
      expect(parseEasyPrivacyLine('||doubleclick.net^')).toBe('doubleclick.net');
    });

    it('strips subdomain to eTLD+1', () => {
      expect(parseEasyPrivacyLine('||stats.tracker.example.com^')).toBe('example.com');
    });

    it('handles path rules', () => {
      expect(parseEasyPrivacyLine('||tracker.example.com/pixel.gif')).toBe('example.com');
    });

    it('handles $domain= options', () => {
      expect(parseEasyPrivacyLine('||tracker.example.com^$domain=foo.com')).toBe('example.com');
    });

    it('handles $script,third-party options', () => {
      expect(parseEasyPrivacyLine('||metrics.example.com$script,third-party')).toBe('example.com');
    });

    it('handles ?query in URL', () => {
      expect(parseEasyPrivacyLine('||t.example.com?id=abc')).toBe('example.com');
    });

    it('handles co.uk public suffix correctly', () => {
      expect(parseEasyPrivacyLine('||tracking.example.co.uk^')).toBe('example.co.uk');
    });

    it('handles punycode IDN hosts', () => {
      // xn--bcher-kva.de == bücher.de (eTLD+1)
      expect(parseEasyPrivacyLine('||sub.xn--bcher-kva.de^')).toBe('xn--bcher-kva.de');
    });
  });

  describe('rejected (return null)', () => {
    it('rejects blank lines', () => {
      expect(parseEasyPrivacyLine('')).toBeNull();
      expect(parseEasyPrivacyLine('   ')).toBeNull();
    });

    it('rejects ! comments', () => {
      expect(parseEasyPrivacyLine('! Title: EasyPrivacy')).toBeNull();
      expect(parseEasyPrivacyLine('!')).toBeNull();
    });

    it('rejects [Adblock Plus] header', () => {
      expect(parseEasyPrivacyLine('[Adblock Plus 2.0]')).toBeNull();
    });

    it('rejects @@ exception/allowlist rules', () => {
      expect(parseEasyPrivacyLine('@@||example.com^')).toBeNull();
      expect(parseEasyPrivacyLine('@@||tracker.example.com^$domain=goodsite.com')).toBeNull();
    });

    it('rejects element-hiding ##', () => {
      expect(parseEasyPrivacyLine('example.com##.ad-banner')).toBeNull();
      expect(parseEasyPrivacyLine('##.ad-class')).toBeNull();
    });

    it('rejects element-hiding exceptions #@#', () => {
      expect(parseEasyPrivacyLine('example.com#@#.ad-banner')).toBeNull();
    });

    it('rejects scriptlet rules #?# and #$#', () => {
      expect(parseEasyPrivacyLine('example.com#?#.ad:has-text(/sponsor/)')).toBeNull();
      expect(parseEasyPrivacyLine('example.com#$#abort-on-property-read foo')).toBeNull();
    });

    it('rejects regex rules', () => {
      expect(parseEasyPrivacyLine('/banner\\d+\\.gif/')).toBeNull();
    });

    it('rejects URL-fragment rules without || prefix', () => {
      expect(parseEasyPrivacyLine('|http://example.com/banner')).toBeNull();
      expect(parseEasyPrivacyLine('/ads/track')).toBeNull();
    });

    it('rejects IP literal hosts', () => {
      // tldts.getDomain returns null for IP literals — no eTLD+1
      expect(parseEasyPrivacyLine('||1.2.3.4^')).toBeNull();
      expect(parseEasyPrivacyLine('||192.168.1.1/track')).toBeNull();
    });

    it('passes through unknown TLDs (tldts treats them as eTLD+1)', () => {
      // Documented behavior: tldts is permissive on unknown TLDs and returns
      // the 2-segment host unchanged. Harmless — garbage extracted domains
      // simply won't match real-evidence hostnames during classification.
      expect(parseEasyPrivacyLine('||tracker.invalidtld^')).toBe('tracker.invalidtld');
    });

    it('rejects wildcard hosts', () => {
      expect(parseEasyPrivacyLine('||*.example.com^')).toBeNull();
      expect(parseEasyPrivacyLine('||tracker.*.example.com^')).toBeNull();
    });

    it('rejects malformed lines', () => {
      expect(parseEasyPrivacyLine('||')).toBeNull();
      expect(parseEasyPrivacyLine('||^')).toBeNull();
      expect(parseEasyPrivacyLine('||..foo')).toBeNull();
      expect(parseEasyPrivacyLine('||.foo.com')).toBeNull();
      expect(parseEasyPrivacyLine('||no-tld')).toBeNull();
    });

  });
});

describe('parseList', () => {
  it('aggregates unique eTLD+1 domains and reports stats', () => {
    const text = [
      '[Adblock Plus 2.0]',
      '! Title: EasyPrivacy',
      '||doubleclick.net^',
      '||a.doubleclick.net^', // dedupes to same eTLD+1
      '||google-analytics.com^',
      '@@||allowed.com^',
      'example.com##.ad',
      '||facebook.net^$third-party',
      '',
    ].join('\n');

    const { domains, stats } = parseList(text);

    expect(domains.size).toBe(3);
    expect(domains.has('doubleclick.net')).toBe(true);
    expect(domains.has('google-analytics.com')).toBe(true);
    expect(domains.has('facebook.net')).toBe(true);

    expect(stats.totalLines).toBe(9);
    expect(stats.blockRules).toBe(4); // four lines start with ||
    expect(stats.parsed).toBe(4); // four extractions (one dupe, but parsed counts each)
  });

  it('handles empty input', () => {
    const { domains, stats } = parseList('');
    expect(domains.size).toBe(0);
    expect(stats.totalLines).toBe(1); // split('\n') always yields >=1
    expect(stats.blockRules).toBe(0);
    expect(stats.parsed).toBe(0);
  });
});

describe('validateList', () => {
  function makeListWithCanaries(extraCount: number): Set<string> {
    const s = new Set<string>(CANARIES);
    for (let i = 0; i < extraCount; i++) s.add(`tracker-${i}.example.com`);
    return s;
  }

  it('passes when count >= floor and all canaries present', () => {
    const result = validateList(makeListWithCanaries(MIN_INGEST_DOMAIN_COUNT));
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('fails when below the minimum floor', () => {
    const result = validateList(makeListWithCanaries(10));
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes('< floor'))).toBe(true);
  });

  it('fails when a canary is missing', () => {
    const s = makeListWithCanaries(MIN_INGEST_DOMAIN_COUNT);
    s.delete('google-analytics.com');
    const result = validateList(s);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes('google-analytics.com'))).toBe(true);
  });

  it('reports BOTH failures when count low AND canaries missing', () => {
    const result = validateList(new Set(['unrelated.com']));
    expect(result.ok).toBe(false);
    expect(result.reasons.length).toBe(2);
    expect(result.reasons[0]).toMatch(/floor/);
    expect(result.reasons[1]).toMatch(/canary/);
  });

  it('lists all missing canaries together', () => {
    const result = validateList(new Set(['noise.com']));
    const missingReason = result.reasons.find((r) => r.includes('canary'));
    expect(missingReason).toBeDefined();
    for (const c of CANARIES) {
      expect(missingReason!.includes(c)).toBe(true);
    }
  });
});
