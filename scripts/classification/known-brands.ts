/**
 * Known Brand Classification (Confidence: 0.95)
 *
 * Deterministic classification based on curated brand lists.
 * NO AI/LLM - pure string matching for reproducibility.
 */

export const KNOWN_BRANDS: Record<string, string[]> = {
  streaming: [
    // Video streaming
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'hbomax.com',
    'max.com',
    'primevideo.com',
    'peacocktv.com',
    'paramountplus.com',
    'appletv.com',
    'youtube.com',
    'vimeo.com',
    'dailymotion.com',
    'twitch.tv',
    'kick.com',
    'crunchyroll.com',
    'funimation.com',
    'pluto.tv',
    'tubi.tv',
    'roku.com',
    'plex.tv',
    // Music streaming
    'spotify.com',
    'music.apple.com',
    'tidal.com',
    'deezer.com',
    'pandora.com',
    'soundcloud.com',
    'bandcamp.com',
    'audiomack.com',
    'last.fm',
    // Podcast platforms
    'podcasts.apple.com',
    'podcasters.spotify.com',
    'anchor.fm',
    'podbean.com',
    'buzzsprout.com',
  ],

  ecommerce: [
    // Major marketplaces
    'amazon.com',
    'ebay.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'etsy.com',
    'wayfair.com',
    'costco.com',
    'homedepot.com',
    'lowes.com',
    'aliexpress.com',
    'alibaba.com',
    'wish.com',
    'temu.com',
    'shein.com',
    // Fashion/Apparel
    'zappos.com',
    'nordstrom.com',
    'macys.com',
    'kohls.com',
    'gap.com',
    'hm.com',
    'zara.com',
    'asos.com',
    'nike.com',
    'adidas.com',
    'underarmour.com',
    'lululemon.com',
    // Electronics
    'newegg.com',
    'bhphotovideo.com',
    'adorama.com',
    'microcenter.com',
    // Platforms
    'shopify.com',
    'bigcommerce.com',
    'squarespace.com',
    'wix.com',
    'magento.com',
  ],

  saas: [
    // Productivity
    'slack.com',
    'notion.so',
    'figma.com',
    'canva.com',
    'miro.com',
    'asana.com',
    'monday.com',
    'trello.com',
    'clickup.com',
    'airtable.com',
    'coda.io',
    // Dev tools
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'vercel.com',
    'netlify.com',
    'heroku.com',
    'digitalocean.com',
    'linode.com',
    'vultr.com',
    'cloudflare.com',
    'fastly.com',
    // CRM/Sales
    'salesforce.com',
    'hubspot.com',
    'zendesk.com',
    'intercom.com',
    'freshdesk.com',
    'zoho.com',
    'pipedrive.com',
    // Communication
    'zoom.us',
    'webex.com',
    'gotomeeting.com',
    'discord.com',
    'loom.com',
    // Cloud storage
    'dropbox.com',
    'box.com',
    'onedrive.live.com',
    // Payments
    'stripe.com',
    'square.com',
    'paypal.com',
    'braintree.com',
    'adyen.com',
    // Email
    'mailchimp.com',
    'sendgrid.com',
    'constantcontact.com',
    'klaviyo.com',
    // Analytics
    'mixpanel.com',
    'amplitude.com',
    'segment.com',
    'hotjar.com',
    'fullstory.com',
    // Project management
    'jira.atlassian.com',
    'confluence.atlassian.com',
    'basecamp.com',
    'teamwork.com',
    'wrike.com',
  ],

  news: [
    // US news
    'nytimes.com',
    'washingtonpost.com',
    'wsj.com',
    'usatoday.com',
    'latimes.com',
    'chicagotribune.com',
    'nypost.com',
    'bostonglobe.com',
    // TV news
    'cnn.com',
    'foxnews.com',
    'msnbc.com',
    'nbcnews.com',
    'cbsnews.com',
    'abcnews.go.com',
    // International
    'bbc.com',
    'bbc.co.uk',
    'reuters.com',
    'apnews.com',
    'theguardian.com',
    'independent.co.uk',
    'telegraph.co.uk',
    'aljazeera.com',
    'dw.com',
    'france24.com',
    // Tech news
    'techcrunch.com',
    'theverge.com',
    'wired.com',
    'arstechnica.com',
    'engadget.com',
    'gizmodo.com',
    'mashable.com',
    'cnet.com',
    'zdnet.com',
    'venturebeat.com',
    '9to5mac.com',
    'macrumors.com',
    // Business news
    'forbes.com',
    'bloomberg.com',
    'businessinsider.com',
    'fortune.com',
    'cnbc.com',
    'marketwatch.com',
    'ft.com',
    'economist.com',
    // Digital media
    'huffpost.com',
    'buzzfeed.com',
    'vox.com',
    'vice.com',
    'slate.com',
    'salon.com',
    'thedailybeast.com',
    // Publishing platforms
    'medium.com',
    'substack.com',
  ],
};

export interface BrandMatchResult {
  category: string;
  confidence: number;
  method: 'exact' | 'subdomain' | 'base';
}

/**
 * Match domain against known brand lists
 * Returns category and confidence if matched, null otherwise
 */
export function matchKnownBrand(domain: string): BrandMatchResult | null {
  const normalized = domain.toLowerCase().replace(/^www\./, '');

  for (const [category, brands] of Object.entries(KNOWN_BRANDS)) {
    for (const brand of brands) {
      // Exact match (highest confidence)
      if (normalized === brand) {
        return { category, confidence: 0.95, method: 'exact' };
      }

      // Subdomain match (e.g., app.slack.com → slack.com)
      if (normalized.endsWith('.' + brand)) {
        return { category, confidence: 0.95, method: 'subdomain' };
      }

      // Country TLD match (e.g., amazon.co.uk → amazon)
      // Only for brands with 5+ chars to avoid false positives
      const brandBase = brand.split('.')[0];
      const domainBase = normalized.split('.')[0];
      if (brandBase === domainBase && brandBase.length >= 5) {
        return { category, confidence: 0.9, method: 'base' };
      }
    }
  }

  return null;
}

/**
 * Get total count of known brands
 */
export function getKnownBrandCount(): number {
  return Object.values(KNOWN_BRANDS).reduce((sum, brands) => sum + brands.length, 0);
}

/**
 * Get brand count per category
 */
export function getBrandCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [category, brands] of Object.entries(KNOWN_BRANDS)) {
    counts[category] = brands.length;
  }
  return counts;
}
