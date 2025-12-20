/**
 * Adult Content Blocklist Module
 *
 * Blocks domains that contain adult content using:
 * 1. TLD blocking (.xxx, .porn, .sex, .adult)
 * 2. Keyword pattern matching in hostname
 * 3. Curated domain list (UT1-based subset)
 *
 * Used by:
 * - Backend: Block scan requests (403 Forbidden)
 * - Frontend: NoIndex existing scan reports
 */

// Blocked TLDs (adult-specific top-level domains)
const BLOCKED_TLDS = new Set([
  '.xxx',
  '.porn',
  '.sex',
  '.adult',
  '.sexy',
]);

// Keyword patterns to block (case-insensitive matching)
// These patterns match common adult site naming conventions
const BLOCKED_PATTERNS: RegExp[] = [
  // Explicit terms
  /\bporn/i,
  /\bxxx\b/i,
  /\bsex(?!pert|ton|y\b)/i, // sex but not expert, sexton, sexy (brand names)
  /\badult(?!swim)/i, // adult but not adultswim
  /\bhentai/i,
  /\berotic/i,
  /\bnude/i,
  /\bnaked/i,

  // Common adult site brands/patterns
  /xhamster/i,
  /xvideos/i,
  /xnxx/i,
  /pornhub/i,
  /redtube/i,
  /youporn/i,
  /brazzers/i,
  /chaturbate/i,
  /onlyfans/i,
  /fansly/i,

  // Regional/language specific
  /\bbokep/i, // Indonesian
  /\bdesi.*hub/i, // South Asian
  /\bjav\b/i, // Japanese AV

  // Piracy sites often paired with adult content
  /\b(fap|wank|jerk)/i,

  // NOTE: Removed suffix patterns (tube$, hub$, cams?$, live$) as they cause
  // false positives with legitimate sites like blog.youtube, arca.live, etc.
  // Rely on explicit brand patterns and curated domain list instead.
];

// Curated blocklist of specific domains (from UT1 + GSC abuse data)
// These are domains that don't match patterns but should be blocked
const BLOCKED_DOMAINS = new Set([
  // From GSC abuse data (include variants without TLD for partial matching)
  'bokepindoh.monster',
  'porntv69.com',
  'porntv69',
  'xhamsterflirt.com',
  'xhamsterflirt',
  'faphouse4k.com',
  'faphouse4k',
  '4khdhub.com',
  '4khdhub',
  'desihub.org',
  'xmishti.com',
  'xmishti',
  '9xflix.nexus',
  '3lawey.com',
  '3lawey',
  'uzpana.ru',
  'dqza.app',
  'bboy1.com',
  'effectivegatecpm.com',

  // Common adult domains that might bypass patterns
  'cam4.com',
  'livejasmin.com',
  'stripchat.com',
  'bongacams.com',
  'myfreecams.com',
  'camsoda.com',
  'imlive.com',
  'flirt4free.com',

  // Adult content aggregators
  'erome.com',
  'thisvid.com',
  'spankbang.com',
  'tnaflix.com',
  'porntrex.com',
  'hqporner.com',
  'beeg.com',
  'txxx.com',
  'sunporno.com',
  'pornone.com',

  // Leak/piracy sites often with adult content
  'thothub.is',
  'fapello.com',
  'celebjihad.com',
]);

/**
 * Extract the base domain from a hostname
 * e.g., "www.example.com" -> "example.com"
 *       "sub.domain.example.co.uk" -> "example.co.uk"
 */
function getBaseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) {
    return hostname.toLowerCase();
  }

  // Handle common multi-part TLDs
  const multiPartTLDs = ['co.uk', 'com.br', 'co.jp', 'com.au', 'co.nz'];
  const lastTwo = parts.slice(-2).join('.');

  if (multiPartTLDs.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Check if a domain is blocked due to adult content
 *
 * @param hostname - The hostname to check (e.g., "example.com" or "www.example.com")
 * @returns true if the domain should be blocked
 */
export function isBlockedDomain(hostname: string): boolean {
  if (!hostname) return false;

  const normalizedHost = hostname.toLowerCase().trim();
  const baseDomain = getBaseDomain(normalizedHost);

  // Check 1: Blocked TLDs
  for (const tld of BLOCKED_TLDS) {
    if (normalizedHost.endsWith(tld)) {
      return true;
    }
  }

  // Check 2: Pattern matching on hostname
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedHost)) {
      return true;
    }
  }

  // Check 3: Exact domain match
  if (BLOCKED_DOMAINS.has(normalizedHost) || BLOCKED_DOMAINS.has(baseDomain)) {
    return true;
  }

  return false;
}

/**
 * Get the reason a domain was blocked (for logging/debugging)
 */
export function getBlockReason(hostname: string): string | null {
  if (!hostname) return null;

  const normalizedHost = hostname.toLowerCase().trim();
  const baseDomain = getBaseDomain(normalizedHost);

  // Check TLDs
  for (const tld of BLOCKED_TLDS) {
    if (normalizedHost.endsWith(tld)) {
      return `blocked_tld:${tld}`;
    }
  }

  // Check patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalizedHost)) {
      return `blocked_pattern:${pattern.source}`;
    }
  }

  // Check domains
  if (BLOCKED_DOMAINS.has(normalizedHost) || BLOCKED_DOMAINS.has(baseDomain)) {
    return `blocked_domain:${baseDomain}`;
  }

  return null;
}

// Export for testing
export { BLOCKED_TLDS, BLOCKED_PATTERNS, BLOCKED_DOMAINS, getBaseDomain };
