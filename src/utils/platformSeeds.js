// Starter merchant rules seeded by the "what do you create?" step in
// onboarding. Selecting a platform auto-creates rules for its common
// payout senders, fee lines, and related software so the user starts
// with meaningful pre-classification instead of a blank slate.
//
// Seed shape:
//   { key, isBusiness, category, source, match }
//
// Matching modes (see rules.js applyRules):
//   exact   — the rule fires only when merchantKey(description) === key
//   prefix  — the rule fires when the normalized description starts with
//             `key` followed by a word boundary. Use this for brand
//             names that show up on bank statements with trailing
//             entity suffixes ("DOORDASH, INC. SAN FRANCISCO" → normalizes
//             to "doordash inc san francisco" → matches prefix "doordash").
//
// Default match is 'exact'. Use 'prefix' for any brand that's likely
// to appear with extra words; keep 'exact' for short generic terms
// where prefix matching would cause false positives (e.g. "spotify"
// alone, where personal "spotify premium" is a separate exact seed).

import { merchantKey } from './rules';

// Shortcut to produce a seed entry for a given raw description.
function seed(description, isBusiness, category, opts) {
  opts = opts || {};
  return {
    key: merchantKey(description),
    isBusiness: isBusiness,
    category: category,
    source: 'platform-seed',
    match: opts.prefix ? 'prefix' : 'exact',
  };
}

// ─── PLATFORM-SPECIFIC SEEDS ────────────────────────────────────
//
// Keyed by the platform option the user selects during onboarding.
// Each bucket bundles related platforms (e.g. all adult-subscription
// platforms live under 'fanvue' if you self-identify as a Fanvue/
// Fansly/ManyVids creator). The map below is intentionally generous
// — over-seeding is fine because rules can always be overridden,
// but under-seeding means the user starts cold.

export var PLATFORM_SEEDS = {
  // ── OnlyFans + parent company + adult payment processors ──
  onlyfans: [
    seed('onlyfans',                 true,  'platform_payouts', { prefix: true }),
    seed('of payout',                true,  'platform_payouts'),
    seed('fenix intl',               true,  'platform_payouts', { prefix: true }),
    seed('fenix international',      true,  'platform_payouts', { prefix: true }),
    // Adult-payment processors. Most legit OnlyFans payouts arrive via
    // bank ACH labeled with one of these intermediaries.
    seed('segpay',                   true,  'platform_payouts', { prefix: true }),
    seed('ccbill',                   true,  'platform_payouts', { prefix: true }),
    seed('paxum',                    true,  'platform_payouts', { prefix: true }),
  ],

  // ── Fanvue / Fansly / ManyVids / JustForFans — adult subscription ──
  fanvue: [
    seed('fanvue',                   true,  'platform_payouts', { prefix: true }),
    seed('fansly',                   true,  'platform_payouts', { prefix: true }),
    seed('manyvids',                 true,  'platform_payouts', { prefix: true }),
    seed('justforfans',              true,  'platform_payouts', { prefix: true }),
    seed('jff',                      true,  'platform_payouts'),
  ],

  patreon: [
    seed('patreon',                  true,  'platform_payouts', { prefix: true }),
    seed('patreon inc',              true,  'platform_payouts', { prefix: true }),
  ],

  substack: [
    seed('substack',                 true,  'platform_payouts', { prefix: true }),
    seed('substack inc',             true,  'platform_payouts', { prefix: true }),
  ],

  // ── Twitch payouts (Amazon Pay routes) + Twitch-specific revenue ──
  twitch: [
    seed('twitch interactive',       true,  'platform_payouts', { prefix: true }),
    seed('twitch',                   true,  'platform_payouts', { prefix: true }),
    seed('amazon payments',          true,  'platform_payouts', { prefix: true }),
    seed('amzn payments',            true,  'platform_payouts', { prefix: true }),
  ],

  // ── YouTube (AdSense routes payouts; YouTube Shorts Fund too) ──
  youtube: [
    seed('google adsense',           true,  'platform_payouts', { prefix: true }),
    seed('adsense',                  true,  'platform_payouts', { prefix: true }),
    seed('youtube',                  true,  'platform_payouts', { prefix: true }),
    seed('google llc',               true,  'platform_payouts', { prefix: true }),
  ],

  // ── TikTok Creator Fund / Live gifts / TikTok Shop ──
  tiktok: [
    seed('tiktok',                   true,  'platform_payouts', { prefix: true }),
    seed('bytedance',                true,  'platform_payouts', { prefix: true }),
    seed('tiktok shop',              true,  'platform_payouts', { prefix: true }),
    seed('tiktok inc',               true,  'platform_payouts', { prefix: true }),
  ],

  // ── Podcast hosts + audio platforms ──
  podcast: [
    seed('spotify',                  true,  'platform_payouts', { prefix: true }),
    seed('anchor',                   true,  'platform_payouts', { prefix: true }),
    seed('anchor fm',                true,  'platform_payouts', { prefix: true }),
    seed('apple podcasts',           true,  'platform_payouts', { prefix: true }),
    seed('libsyn',                   true,  'software_subs',    { prefix: true }),
    seed('buzzsprout',               true,  'software_subs',    { prefix: true }),
    seed('simplecast',               true,  'software_subs',    { prefix: true }),
    seed('transistor fm',            true,  'software_subs',    { prefix: true }),
    seed('captivate fm',             true,  'software_subs',    { prefix: true }),
    seed('podbean',                  true,  'software_subs',    { prefix: true }),
    seed('riverside fm',             true,  'software_subs',    { prefix: true }),
    seed('descript',                 true,  'software_subs',    { prefix: true }),
  ],

  // ── Etsy + Depop (handmade / vintage marketplaces) ──
  etsy: [
    seed('etsy',                     true,  'platform_payouts', { prefix: true }),
    seed('etsy inc',                 true,  'platform_payouts', { prefix: true }),
    seed('etsy fees',                true,  'platform_fees'),
    seed('etsy seller fees',         true,  'platform_fees',    { prefix: true }),
    seed('depop',                    true,  'platform_payouts', { prefix: true }),
  ],

  kofi: [
    seed('ko fi',                    true,  'platform_payouts', { prefix: true }),
    seed('kofi',                     true,  'platform_payouts', { prefix: true }),
  ],

  // ── Gumroad + Stan + Beacons + Linktree (creator commerce links) ──
  gumroad: [
    seed('gumroad',                  true,  'platform_payouts', { prefix: true }),
    seed('gumroad inc',              true,  'platform_payouts', { prefix: true }),
    seed('stan store',               true,  'platform_payouts', { prefix: true }),
    seed('stanstore',                true,  'platform_payouts', { prefix: true }),
    seed('beacons',                  true,  'platform_payouts', { prefix: true }),
    seed('beacons ai',               true,  'platform_payouts', { prefix: true }),
    seed('linktree',                 true,  'platform_payouts', { prefix: true }),
  ],

  // ── Whop (paid Discord servers, communities, courses) ──
  whop: [
    seed('whop',                     true,  'platform_payouts', { prefix: true }),
    seed('whop inc',                 true,  'platform_payouts', { prefix: true }),
  ],

  // ── Cameo (paid personalized videos) ──
  cameo: [
    seed('cameo',                    true,  'platform_payouts', { prefix: true }),
    seed('cameo inc',                true,  'platform_payouts', { prefix: true }),
  ],

  // ── Course / coaching platforms ──
  courses: [
    seed('kajabi',                   true,  'platform_payouts', { prefix: true }),
    seed('teachable',                true,  'platform_payouts', { prefix: true }),
    seed('thinkific',                true,  'platform_payouts', { prefix: true }),
    seed('podia',                    true,  'platform_payouts', { prefix: true }),
    seed('hotmart',                  true,  'platform_payouts', { prefix: true }),
    seed('mighty networks',          true,  'platform_payouts', { prefix: true }),
    seed('skool',                    true,  'platform_payouts', { prefix: true }),
    seed('circle so',                true,  'platform_payouts', { prefix: true }),
  ],

  // ── Gig / delivery / rideshare ──
  // Users self-identify as drivers here, so we mark these as income.
  // Without this bucket selected, the UNIVERSAL_SEEDS leave these
  // unseeded so personal Uber rides stay unclassified.
  gigwork: [
    seed('doordash',                 true,  'platform_payouts', { prefix: true }),
    seed('doordash inc',             true,  'platform_payouts', { prefix: true }),
    seed('dd doordash',              true,  'platform_payouts', { prefix: true }),
    seed('uber',                     true,  'platform_payouts', { prefix: true }),
    seed('uber bv',                  true,  'platform_payouts', { prefix: true }),
    seed('uber partner',             true,  'platform_payouts', { prefix: true }),
    seed('uber eats',                true,  'platform_payouts', { prefix: true }),
    seed('lyft',                     true,  'platform_payouts', { prefix: true }),
    seed('lyft inc',                 true,  'platform_payouts', { prefix: true }),
    seed('instacart',                true,  'platform_payouts', { prefix: true }),
    seed('maplebear',                true,  'platform_payouts', { prefix: true }), // Instacart legal name
    seed('grubhub',                  true,  'platform_payouts', { prefix: true }),
    seed('postmates',                true,  'platform_payouts', { prefix: true }),
    seed('shipt',                    true,  'platform_payouts', { prefix: true }),
  ],
};

// ─── UNIVERSAL SEEDS ────────────────────────────────────────────
//
// Always seeded regardless of selected platforms — generic creator
// infrastructure that almost everyone uses. Brand-name seeds use
// prefix matching to catch the verbose bank-statement variants
// (e.g. "ADOBE *CREATIVE CLOUD"). Short ambiguous terms stay exact.

export var UNIVERSAL_SEEDS = [
  // ── Payment processors (fees side) ──
  seed('stripe',                     true,  'platform_fees',    { prefix: true }),
  seed('stripe payments',            true,  'platform_fees',    { prefix: true }),
  seed('paypal fee',                 true,  'platform_fees'),
  seed('paypal fees',                true,  'platform_fees'),
  seed('square inc',                 true,  'platform_fees',    { prefix: true }),
  seed('squareup',                   true,  'platform_fees',    { prefix: true }),

  // ── Design / video / creative software ──
  seed('adobe',                      true,  'software_subs',    { prefix: true }),
  seed('adobe creative cloud',       true,  'software_subs',    { prefix: true }),
  seed('canva',                      true,  'software_subs',    { prefix: true }),
  seed('figma',                      true,  'software_subs',    { prefix: true }),
  seed('procreate',                  true,  'software_subs',    { prefix: true }),
  seed('capcut',                     true,  'software_subs',    { prefix: true }),
  seed('davinci resolve',            true,  'software_subs',    { prefix: true }),
  seed('blackmagic',                 true,  'software_subs',    { prefix: true }),
  seed('frame io',                   true,  'software_subs',    { prefix: true }),
  seed('framer',                     true,  'software_subs',    { prefix: true }),
  seed('webflow',                    true,  'software_subs',    { prefix: true }),

  // ── Video calls / recording / streaming ──
  seed('zoom us',                    true,  'software_subs',    { prefix: true }),
  seed('zoom video',                 true,  'software_subs',    { prefix: true }),
  seed('loom',                       true,  'software_subs',    { prefix: true }),
  seed('streamyard',                 true,  'software_subs',    { prefix: true }),
  seed('restream',                   true,  'software_subs',    { prefix: true }),
  seed('obs project',                true,  'software_subs',    { prefix: true }),

  // ── Productivity / project / docs ──
  seed('notion',                     true,  'software_subs',    { prefix: true }),
  seed('notion labs',                true,  'software_subs',    { prefix: true }),
  seed('airtable',                   true,  'software_subs',    { prefix: true }),
  seed('slack',                      true,  'software_subs',    { prefix: true }),
  seed('dropbox',                    true,  'software_subs',    { prefix: true }),
  seed('google workspace',           true,  'software_subs',    { prefix: true }),
  seed('google one',                 true,  'software_subs',    { prefix: true }),
  seed('google storage',             true,  'software_subs',    { prefix: true }),
  seed('icloud',                     true,  'software_subs',    { prefix: true }),
  seed('apple storage',              true,  'software_subs',    { prefix: true }),
  seed('grammarly',                  true,  'software_subs',    { prefix: true }),
  seed('calendly',                   true,  'software_subs',    { prefix: true }),
  seed('cal com',                    true,  'software_subs',    { prefix: true }),

  // ── AI tools ──
  seed('openai',                     true,  'software_subs',    { prefix: true }),
  seed('chatgpt',                    true,  'software_subs',    { prefix: true }),
  seed('anthropic',                  true,  'software_subs',    { prefix: true }),
  seed('claude ai',                  true,  'software_subs',    { prefix: true }),
  seed('midjourney',                 true,  'software_subs',    { prefix: true }),
  seed('runway',                     true,  'software_subs',    { prefix: true }),
  seed('elevenlabs',                 true,  'software_subs',    { prefix: true }),
  seed('eleven labs',                true,  'software_subs',    { prefix: true }),
  seed('perplexity',                 true,  'software_subs',    { prefix: true }),
  seed('github copilot',             true,  'software_subs',    { prefix: true }),

  // ── Email / newsletter / marketing ──
  seed('mailchimp',                  true,  'software_subs',    { prefix: true }),
  seed('convertkit',                 true,  'software_subs',    { prefix: true }),
  seed('kit com',                    true,  'software_subs',    { prefix: true }),
  seed('beehiiv',                    true,  'software_subs',    { prefix: true }),
  seed('ghost foundation',           true,  'software_subs',    { prefix: true }),
  seed('flodesk',                    true,  'software_subs',    { prefix: true }),
  seed('klaviyo',                    true,  'software_subs',    { prefix: true }),

  // ── Social / scheduling / analytics ──
  seed('buffer',                     true,  'software_subs',    { prefix: true }),
  seed('hootsuite',                  true,  'software_subs',    { prefix: true }),
  seed('later com',                  true,  'software_subs',    { prefix: true }),
  seed('planoly',                    true,  'software_subs',    { prefix: true }),
  seed('tubebuddy',                  true,  'software_subs',    { prefix: true }),
  seed('vidiq',                      true,  'software_subs',    { prefix: true }),

  // ── Domains / hosting / dev infra ──
  seed('squarespace',                true,  'software_subs',    { prefix: true }),
  seed('shopify',                    true,  'software_subs',    { prefix: true }),
  seed('namecheap',                  true,  'software_subs',    { prefix: true }),
  seed('godaddy',                    true,  'software_subs',    { prefix: true }),
  seed('cloudflare',                 true,  'software_subs',    { prefix: true }),
  seed('vercel',                     true,  'software_subs',    { prefix: true }),
  seed('netlify',                    true,  'software_subs',    { prefix: true }),
  seed('wordpress',                  true,  'software_subs',    { prefix: true }),
  seed('wp engine',                  true,  'software_subs',    { prefix: true }),

  // ── Shipping (for merch sellers) ──
  seed('ups',                        true,  'content_prod',     { prefix: true }),
  seed('usps',                       true,  'content_prod',     { prefix: true }),
  seed('fedex',                      true,  'content_prod',     { prefix: true }),
  seed('shipstation',                true,  'software_subs',    { prefix: true }),
  seed('pirate ship',                true,  'content_prod',     { prefix: true }),

  // ── Office supplies / equipment vendors ──
  seed('b h photo',                  true,  'equipment',        { prefix: true }),
  seed('bhphotovideo',               true,  'equipment',        { prefix: true }),
  seed('best buy',                   true,  'equipment',        { prefix: true }),
  seed('apple com bill',             true,  'software_subs',    { prefix: true }),
  seed('apple store',                true,  'equipment',        { prefix: true }),

  // ── Common non-business (so we don't over-flag personal spending) ──
  // These stay EXACT so they don't accidentally catch business uses
  // (e.g. an exact "amazon" rule would clash with "amazon payments" —
  // which is Twitch's payout rail). Each service gets both its bare
  // name and the ".com" billing form, since most card statements
  // include the URL (NETFLIX.COM → "netflix com" after normalization).
  seed('netflix',                    false, null),
  seed('netflix com',                false, null),
  seed('hulu',                       false, null),
  seed('hulu com',                   false, null),
  seed('disney plus',                false, null),
  seed('disneyplus com',             false, null),
  seed('max',                        false, null),
  seed('hbo max',                    false, null),
  seed('peacock',                    false, null),
  seed('peacocktv com',              false, null),
  seed('paramount plus',             false, null),
  seed('paramount com',              false, null),
  seed('apple tv',                   false, null),
  seed('apple music',                false, null),
  seed('youtube premium',            false, null),
  seed('spotify premium',            false, null),
  seed('spotify usa',                false, null),
  seed('audible',                    false, null),
  seed('audible com',                false, null),
  seed('kindle unlimited',           false, null),
  seed('xbox',                       false, null),
  seed('xbox live',                  false, null),
  seed('xbox live gold',             false, null),
  seed('microsoft xbox',             false, null),
  seed('playstation',                false, null),
  seed('playstation network',        false, null),
  seed('sony playstation',           false, null),

  // ── Common bank-statement noise (personal by default) ──
  seed('atm withdrawal',             false, null),
  seed('zelle',                      false, null),
  seed('venmo cashout',              false, null),
];

export function seedsForSelections(selections) {
  var out = UNIVERSAL_SEEDS.slice();
  (selections || []).forEach(function(key) {
    var s = PLATFORM_SEEDS[key];
    if (s) { out = out.concat(s); }
  });
  return out;
}
