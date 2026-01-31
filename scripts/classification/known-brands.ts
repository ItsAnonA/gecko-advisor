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

  social: [
    // Major platforms
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'tiktok.com',
    'snapchat.com',
    'pinterest.com',
    'reddit.com',
    'tumblr.com',
    'threads.net',
    'mastodon.social',
    // Messaging
    'whatsapp.com',
    'telegram.org',
    'signal.org',
    'messenger.com',
    'wechat.com',
    'line.me',
    'viber.com',
    // Professional/Niche
    'quora.com',
    'meetup.com',
    'nextdoor.com',
    'clubhouse.com',
    'bereal.com',
    'lemon8.com',
  ],

  finance: [
    // Major banks
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citi.com',
    'capitalone.com',
    'usbank.com',
    'pnc.com',
    'tdbank.com',
    'ally.com',
    'discover.com',
    // International banks
    'hsbc.com',
    'barclays.com',
    'lloydsbank.com',
    'natwest.com',
    'santander.com',
    'deutschebank.com',
    'bnpparibas.com',
    // Fintech
    'robinhood.com',
    'coinbase.com',
    'venmo.com',
    'cashapp.com',
    'chime.com',
    'sofi.com',
    'wealthfront.com',
    'betterment.com',
    'acorns.com',
    'wise.com',
    'revolut.com',
    'kraken.com',
    'binance.com',
    // Investment
    'fidelity.com',
    'schwab.com',
    'vanguard.com',
    'etrade.com',
    'tdameritrade.com',
    'interactivebrokers.com',
    // Insurance
    'geico.com',
    'statefarm.com',
    'progressive.com',
    'allstate.com',
    'libertymutual.com',
    // Credit
    'experian.com',
    'equifax.com',
    'transunion.com',
    'creditkarma.com',
    'nerdwallet.com',
  ],

  healthcare: [
    // Hospital systems
    'mayoclinic.org',
    'clevelandclinic.org',
    'hopkinsmedicine.org',
    'massgeneral.org',
    'mountsinai.org',
    'stanfordhealthcare.org',
    'uchealth.org',
    'kaiserpermanente.org',
    // Telehealth
    'teladoc.com',
    'amwell.com',
    'mdlive.com',
    'doctorondemand.com',
    'hims.com',
    'hers.com',
    'cerebral.com',
    'talkspace.com',
    'betterhelp.com',
    'zocdoc.com',
    // Pharmacies
    'cvs.com',
    'walgreens.com',
    'riteaid.com',
    'goodrx.com',
    'capsule.com',
    'pillpack.com',
    // Health information
    'webmd.com',
    'healthline.com',
    'mayoclinic.org',
    'nih.gov',
    'cdc.gov',
    'medlineplus.gov',
    'drugs.com',
    'rxlist.com',
    // Fitness
    'myfitnesspal.com',
    'fitbit.com',
    'peloton.com',
    'strava.com',
    'noom.com',
  ],

  education: [
    // MOOCs
    'coursera.org',
    'udemy.com',
    'edx.org',
    'khanacademy.org',
    'skillshare.com',
    'masterclass.com',
    'linkedin.com/learning',
    'pluralsight.com',
    'udacity.com',
    'codecademy.com',
    'datacamp.com',
    'duolingo.com',
    'babbel.com',
    'rosettastone.com',
    // K-12
    'ixl.com',
    'brainly.com',
    'quizlet.com',
    'chegg.com',
    'kahoot.com',
    'classdojo.com',
    'clever.com',
    'schoology.com',
    'canvas.instructure.com',
    'blackboard.com',
    'moodle.org',
    // Universities (common platforms)
    'mit.edu',
    'stanford.edu',
    'harvard.edu',
    'berkeley.edu',
    'ox.ac.uk',
    'cam.ac.uk',
    // Academic resources
    'jstor.org',
    'pubmed.gov',
    'scholar.google.com',
    'researchgate.net',
    'academia.edu',
  ],

  travel: [
    // OTAs
    'booking.com',
    'expedia.com',
    'hotels.com',
    'priceline.com',
    'kayak.com',
    'tripadvisor.com',
    'trivago.com',
    'hotwire.com',
    'orbitz.com',
    'travelocity.com',
    'skyscanner.com',
    'momondo.com',
    // Airlines
    'delta.com',
    'united.com',
    'aa.com',
    'southwest.com',
    'jetblue.com',
    'alaskaair.com',
    'spirit.com',
    'frontier.com',
    'ryanair.com',
    'easyjet.com',
    'lufthansa.com',
    'emirates.com',
    'qantas.com',
    // Hotels
    'marriott.com',
    'hilton.com',
    'ihg.com',
    'hyatt.com',
    'wyndhamhotels.com',
    'choicehotels.com',
    'bestwestern.com',
    'accor.com',
    // Vacation rentals
    'airbnb.com',
    'vrbo.com',
    'vacasa.com',
    'homeaway.com',
    // Car rentals
    'enterprise.com',
    'hertz.com',
    'avis.com',
    'budget.com',
    'nationalcar.com',
    'turo.com',
    // Cruise
    'carnival.com',
    'royalcaribbean.com',
    'ncl.com',
    'princess.com',
  ],

  gaming: [
    // Platforms
    'steam.com',
    'steampowered.com',
    'epicgames.com',
    'gog.com',
    'origin.com',
    'ea.com',
    'ubisoft.com',
    'blizzard.com',
    'battlenet.com',
    'xbox.com',
    'playstation.com',
    'nintendo.com',
    // Storefronts
    'humblebundle.com',
    'greenmangaming.com',
    'fanatical.com',
    'cdkeys.com',
    'g2a.com',
    // Gaming communities
    'ign.com',
    'gamespot.com',
    'kotaku.com',
    'polygon.com',
    'pcgamer.com',
    'rockpapershotgun.com',
    'eurogamer.net',
    // Esports
    'twitch.tv',
    'liquipedia.net',
    'esportsearnings.com',
    // Game publishers
    'activision.com',
    'riotgames.com',
    'bethesda.net',
    'capcom.com',
    'bandainamcoent.com',
    'square-enix.com',
    'sega.com',
    'konami.com',
    // Mobile gaming
    'supercell.com',
    'king.com',
    'zynga.com',
    'mihoyo.com',
    'netmarble.com',
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
