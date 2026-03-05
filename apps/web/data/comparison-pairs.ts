/**
 * Curated comparison pairs for SEO-indexed comparison pages.
 * Only high-demand pairs that people actually search for.
 * Organized by category for discoverability.
 */

export interface ComparisonPair {
  domainA: string;
  domainB: string;
  category: string;
}

export const comparisonPairs: ComparisonPair[] = [
  // Social Media
  { domainA: 'facebook.com', domainB: 'reddit.com', category: 'social-media' },
  { domainA: 'facebook.com', domainB: 'twitter.com', category: 'social-media' },
  { domainA: 'twitter.com', domainB: 'threads.net', category: 'social-media' },
  { domainA: 'instagram.com', domainB: 'tiktok.com', category: 'social-media' },
  { domainA: 'reddit.com', domainB: 'twitter.com', category: 'social-media' },
  { domainA: 'snapchat.com', domainB: 'tiktok.com', category: 'social-media' },
  { domainA: 'pinterest.com', domainB: 'instagram.com', category: 'social-media' },
  { domainA: 'facebook.com', domainB: 'instagram.com', category: 'social-media' },
  { domainA: 'twitter.com', domainB: 'bluesky.social', category: 'social-media' },
  { domainA: 'twitter.com', domainB: 'mastodon.social', category: 'social-media' },
  { domainA: 'facebook.com', domainB: 'tiktok.com', category: 'social-media' },
  { domainA: 'reddit.com', domainB: 'instagram.com', category: 'social-media' },
  { domainA: 'linkedin.com', domainB: 'twitter.com', category: 'social-media' },
  { domainA: 'tiktok.com', domainB: 'youtube.com', category: 'social-media' },
  { domainA: 'discord.com', domainB: 'slack.com', category: 'social-media' },

  // Search
  { domainA: 'google.com', domainB: 'bing.com', category: 'search' },
  { domainA: 'google.com', domainB: 'duckduckgo.com', category: 'search' },
  { domainA: 'bing.com', domainB: 'duckduckgo.com', category: 'search' },
  { domainA: 'google.com', domainB: 'yahoo.com', category: 'search' },
  { domainA: 'brave.com', domainB: 'duckduckgo.com', category: 'search' },
  { domainA: 'google.com', domainB: 'brave.com', category: 'search' },
  { domainA: 'duckduckgo.com', domainB: 'yahoo.com', category: 'search' },
  { domainA: 'perplexity.ai', domainB: 'google.com', category: 'search' },

  // Streaming
  { domainA: 'netflix.com', domainB: 'disneyplus.com', category: 'streaming' },
  { domainA: 'youtube.com', domainB: 'netflix.com', category: 'streaming' },
  { domainA: 'spotify.com', domainB: 'apple.com', category: 'streaming' },
  { domainA: 'hulu.com', domainB: 'netflix.com', category: 'streaming' },
  { domainA: 'netflix.com', domainB: 'amazon.com', category: 'streaming' },
  { domainA: 'twitch.tv', domainB: 'youtube.com', category: 'streaming' },
  { domainA: 'spotify.com', domainB: 'youtube.com', category: 'streaming' },
  { domainA: 'hulu.com', domainB: 'disneyplus.com', category: 'streaming' },
  { domainA: 'netflix.com', domainB: 'hulu.com', category: 'streaming' },
  { domainA: 'spotify.com', domainB: 'tidal.com', category: 'streaming' },

  // Ecommerce
  { domainA: 'amazon.com', domainB: 'walmart.com', category: 'ecommerce' },
  { domainA: 'amazon.com', domainB: 'ebay.com', category: 'ecommerce' },
  { domainA: 'amazon.com', domainB: 'temu.com', category: 'ecommerce' },
  { domainA: 'shein.com', domainB: 'temu.com', category: 'ecommerce' },
  { domainA: 'etsy.com', domainB: 'amazon.com', category: 'ecommerce' },
  { domainA: 'target.com', domainB: 'walmart.com', category: 'ecommerce' },
  { domainA: 'bestbuy.com', domainB: 'amazon.com', category: 'ecommerce' },
  { domainA: 'alibaba.com', domainB: 'amazon.com', category: 'ecommerce' },
  { domainA: 'aliexpress.com', domainB: 'temu.com', category: 'ecommerce' },
  { domainA: 'shopify.com', domainB: 'amazon.com', category: 'ecommerce' },
  { domainA: 'walmart.com', domainB: 'ebay.com', category: 'ecommerce' },
  { domainA: 'wish.com', domainB: 'temu.com', category: 'ecommerce' },

  // AI Tools
  { domainA: 'openai.com', domainB: 'anthropic.com', category: 'ai-tools' },
  { domainA: 'chatgpt.com', domainB: 'claude.ai', category: 'ai-tools' },
  { domainA: 'openai.com', domainB: 'google.com', category: 'ai-tools' },
  { domainA: 'midjourney.com', domainB: 'openai.com', category: 'ai-tools' },
  { domainA: 'perplexity.ai', domainB: 'chatgpt.com', category: 'ai-tools' },
  { domainA: 'chatgpt.com', domainB: 'gemini.google.com', category: 'ai-tools' },
  { domainA: 'openai.com', domainB: 'mistral.ai', category: 'ai-tools' },
  { domainA: 'huggingface.co', domainB: 'openai.com', category: 'ai-tools' },
  { domainA: 'copilot.microsoft.com', domainB: 'chatgpt.com', category: 'ai-tools' },
  { domainA: 'stability.ai', domainB: 'midjourney.com', category: 'ai-tools' },

  // Messaging
  { domainA: 'whatsapp.com', domainB: 'telegram.org', category: 'messaging' },
  { domainA: 'signal.org', domainB: 'whatsapp.com', category: 'messaging' },
  { domainA: 'discord.com', domainB: 'telegram.org', category: 'messaging' },
  { domainA: 'signal.org', domainB: 'telegram.org', category: 'messaging' },
  { domainA: 'whatsapp.com', domainB: 'discord.com', category: 'messaging' },

  // News
  { domainA: 'cnn.com', domainB: 'foxnews.com', category: 'news' },
  { domainA: 'nytimes.com', domainB: 'washingtonpost.com', category: 'news' },
  { domainA: 'bbc.com', domainB: 'cnn.com', category: 'news' },
  { domainA: 'reuters.com', domainB: 'apnews.com', category: 'news' },
  { domainA: 'bbc.com', domainB: 'nytimes.com', category: 'news' },
  { domainA: 'theguardian.com', domainB: 'nytimes.com', category: 'news' },
  { domainA: 'cnn.com', domainB: 'nytimes.com', category: 'news' },
  { domainA: 'bbc.com', domainB: 'reuters.com', category: 'news' },

  // Banking
  { domainA: 'chase.com', domainB: 'bankofamerica.com', category: 'banking' },
  { domainA: 'wellsfargo.com', domainB: 'citibank.com', category: 'banking' },
  { domainA: 'chase.com', domainB: 'wellsfargo.com', category: 'banking' },
  { domainA: 'bankofamerica.com', domainB: 'wellsfargo.com', category: 'banking' },
  { domainA: 'paypal.com', domainB: 'stripe.com', category: 'banking' },

  // VPN
  { domainA: 'nordvpn.com', domainB: 'expressvpn.com', category: 'vpn' },
  { domainA: 'protonvpn.com', domainB: 'nordvpn.com', category: 'vpn' },
  { domainA: 'surfshark.com', domainB: 'nordvpn.com', category: 'vpn' },
  { domainA: 'mullvad.net', domainB: 'protonvpn.com', category: 'vpn' },
  { domainA: 'expressvpn.com', domainB: 'surfshark.com', category: 'vpn' },
  { domainA: 'nordvpn.com', domainB: 'mullvad.net', category: 'vpn' },

  // Gaming
  { domainA: 'steampowered.com', domainB: 'epicgames.com', category: 'gaming' },
  { domainA: 'roblox.com', domainB: 'minecraft.net', category: 'gaming' },
  { domainA: 'ea.com', domainB: 'ubisoft.com', category: 'gaming' },
  { domainA: 'twitch.tv', domainB: 'steampowered.com', category: 'gaming' },
  { domainA: 'epicgames.com', domainB: 'ea.com', category: 'gaming' },

  // Dating
  { domainA: 'tinder.com', domainB: 'bumble.com', category: 'dating' },
  { domainA: 'hinge.co', domainB: 'tinder.com', category: 'dating' },
  { domainA: 'match.com', domainB: 'okcupid.com', category: 'dating' },
  { domainA: 'bumble.com', domainB: 'hinge.co', category: 'dating' },

  // Crypto
  { domainA: 'coinbase.com', domainB: 'binance.com', category: 'crypto' },
  { domainA: 'kraken.com', domainB: 'coinbase.com', category: 'crypto' },
  { domainA: 'binance.com', domainB: 'kraken.com', category: 'crypto' },
  { domainA: 'coinbase.com', domainB: 'crypto.com', category: 'crypto' },

  // Email
  { domainA: 'gmail.com', domainB: 'outlook.com', category: 'email' },
  { domainA: 'proton.me', domainB: 'gmail.com', category: 'email' },
  { domainA: 'tutanota.com', domainB: 'proton.me', category: 'email' },

  // Cloud / Productivity
  { domainA: 'notion.so', domainB: 'coda.io', category: 'productivity' },
  { domainA: 'dropbox.com', domainB: 'google.com', category: 'productivity' },
  { domainA: 'github.com', domainB: 'gitlab.com', category: 'productivity' },
  { domainA: 'figma.com', domainB: 'canva.com', category: 'productivity' },
  { domainA: 'zoom.us', domainB: 'meet.google.com', category: 'productivity' },
];

/**
 * Find comparison pairs involving a specific domain.
 */
export function getComparisonPairsForDomain(domain: string): ComparisonPair[] {
  return comparisonPairs.filter(p => p.domainA === domain || p.domainB === domain);
}

/**
 * Get the "other" domain in a comparison pair.
 */
export function getOtherDomain(pair: ComparisonPair, domain: string): string {
  return pair.domainA === domain ? pair.domainB : pair.domainA;
}

/**
 * Get all unique domains referenced in comparison pairs.
 */
export function getAllComparisonDomains(): string[] {
  const domains = new Set<string>();
  for (const pair of comparisonPairs) {
    domains.add(pair.domainA);
    domains.add(pair.domainB);
  }
  return Array.from(domains).sort();
}
