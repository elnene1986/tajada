// Deterministic Schedule C category suggester.
//
// Suggests a category for each business EXPENSE at import time, so the
// Review modal opens pre-set to something sensible instead of
// "Otros Gastos del Negocio". Two layers:
//
//   1. Brand lookup — case-insensitive substring match against curated
//      lists (software, hosting, ad platforms, processor fees…). Catches
//      the ~80% of merchants that dominate a creator's statement.
//   2. Contract-labor heuristic — a personal-name payee (Zelle/Venmo/
//      PayPal) paid 3+ times in the session is almost certainly a
//      freelancer/editor/VA → pro_services.
//
// Suggestions NEVER auto-classify. They only fill `suggestedCategory`
// on the transaction; the user still decides business vs personal, and
// a rule-applied category always wins over a suggestion.
//
// Category keys map to the app's existing vocabulary in
// src/utils/categories.js — NOT a new category set.
//
// All amounts are integer cents (see src/utils/money.js).

import { merchantKey } from './rules';

// $200 de-minimis threshold, in cents. Above this, purchases at gear
// retailers / Apple are likely depreciable equipment (Form 4562);
// below, they're consumables or subscriptions.
var EQUIPMENT_THRESHOLD_CENTS = 20000;

// ─── Brand lists (uppercase, substring match) ──────────────────────

var SOFTWARE_AND_SAAS = [
  'ADOBE', 'FIGMA', 'NOTION', 'CANVA', 'FRAME.IO', 'RIVERSIDE',
  'DESCRIPT', 'LOOM', 'SLACK', 'ZOOM', 'GOOGLE WORKSPACE',
  'GOOGLE *GSUITE', 'MICROSOFT 365', 'MICROSOFT*365', 'ASANA',
  'AIRTABLE', 'LINEAR', 'MIRO', 'CALENDLY', 'TYPEFORM',
  'MAILCHIMP', 'BEEHIIV', 'CONVERTKIT',
  'OPENAI', 'ANTHROPIC', 'CLAUDE', 'CHATGPT', 'MIDJOURNEY',
  'RUNWAY', 'ELEVENLABS', 'GITHUB', 'REPLIT',
  'DROPBOX', 'BACKBLAZE', '1PASSWORD',
  'VERCEL', 'NETLIFY', 'CLOUDFLARE',
  'DIGITALOCEAN', 'DIGITAL OCEAN', 'LINODE',
  'GODADDY', 'GO DADDY', 'NAMECHEAP', 'GOOGLE DOMAINS',
  'SQUARESPACE', 'WEBFLOW', 'WIX', 'WORDPRESS',
  'BLUEHOST', 'DREAMHOST',
];

var STOCK_MEDIA_AND_PRODUCTION = [
  'STORYBLOCKS', 'ENVATO', 'SHUTTERSTOCK', 'GETTY',
  'ADOBE STOCK', 'EPIDEMIC SOUND', 'ARTLIST',
  'MUSICBED', 'SOUNDSTRIPE',
];

var AD_PLATFORMS = [
  'META PLATFORMS', 'META ADS', 'FACEBOOK ADS',
  'GOOGLE ADS', 'GOOGLE *ADS', 'ADWORDS',
  'X CORP ADS', 'TWITTER ADS',
  'TIKTOK ADS', 'TIKTOK *ADS',
  'LINKEDIN ADS', 'LNKD ADS',
  'REDDIT ADS', 'PINTEREST ADS', 'SNAP ADS',
];

// Platform fees / processor cuts → Línea 10 (platform_fees), NOT 27a.
var PAYMENT_PROCESSOR_FEES = [
  'STRIPE FEES', 'STRIPE FEE', 'STRIPE BILLING',
  'PATREON FEES', 'PATREON FEE',
  'PAYPAL FEES', 'PAYPAL FEE',
  'SUBSTACK FEES', 'SUBSTACK FEE',
  'GUMROAD FEES', 'GUMROAD FEE',
  'LEMONSQUEEZY FEES', 'SQUARE FEES', 'SQ FEE',
];

var LEGAL_AND_PROFESSIONAL = [
  'LEGALZOOM', 'LEGAL ZOOM',
  'ROCKET LAWYER', 'CLERKY',
  'H&R BLOCK', 'HR BLOCK', 'TURBOTAX', 'TURBO TAX',
  'QUICKBOOKS', 'WAVE ACCOUNTING', 'FREE TAX USA',
];

var GEAR_RETAILERS = [
  'B&H PHOTO', 'B AND H PHOTO', 'BHPHOTOVIDEO', 'BH PHOTO',
  'ADORAMA',
  'SWEETWATER', "MUSICIAN'S FRIEND", 'MUSICIANS FRIEND',
  'GUITAR CENTER', 'REVERB',
];

var COWORKING = [
  'WEWORK', 'WE WORK', 'INDUSTRIOUS', 'REGUS', 'DESKPASS',
];

function matchesAny(haystack, needles) {
  for (var i = 0; i < needles.length; i++) {
    if (haystack.indexOf(needles[i]) !== -1) return true;
  }
  return false;
}

// ─── Personal-payee detection (raw descriptions) ───────────────────
//
// The contract-labor heuristic needs to know "is this an outgoing
// payment to a person?" Bank statements format these predictably:
// "Zelle to JOHN DOE", "Withdrawal from VENMO PAYMENT", "Withdrawal
// from PAYPAL to JANE…". Conservative on purpose — a false positive
// here suggests the wrong category for someone's taxes.
export function looksLikePersonalPayee(description) {
  if (!description) return false;
  var d = String(description).trim();
  if (/^Zelle to .+/i.test(d)) return true;
  if (/^Withdrawal from PAYPAL to .+/i.test(d)) return true;
  // "Zelle from" is incoming — not a payee. Venmo withdrawals don't
  // carry the recipient name, so we can't safely treat them as people.
  return false;
}

// ─── Single-transaction lookup ─────────────────────────────────────
//
// Returns { category, confidence, reason } or null. `amountCents` is
// an integer; `repeatCount` is how many same-merchant debits exist in
// the session (pass 1 if unknown).
export function suggestCategory(description, amountCents, repeatCount) {
  if (!description) return null;
  var key = String(description).toUpperCase();

  if (matchesAny(key, PAYMENT_PROCESSOR_FEES)) {
    return { category: 'platform_fees', confidence: 0.95, reason: 'Comisión de procesador de pagos' };
  }
  if (matchesAny(key, SOFTWARE_AND_SAAS)) {
    return { category: 'software_subs', confidence: 0.95, reason: 'Software de negocio conocido' };
  }
  if (matchesAny(key, STOCK_MEDIA_AND_PRODUCTION)) {
    return { category: 'content_prod', confidence: 0.93, reason: 'Stock media o sonido para producción' };
  }
  if (matchesAny(key, AD_PLATFORMS)) {
    return { category: 'promotion', confidence: 0.95, reason: 'Plataforma de anuncios pagados' };
  }
  if (matchesAny(key, LEGAL_AND_PROFESSIONAL)) {
    return { category: 'pro_services', confidence: 0.85, reason: 'Servicios legales o contables' };
  }
  if (matchesAny(key, COWORKING)) {
    return { category: 'other_expense', confidence: 0.8, reason: 'Espacio de trabajo rentado' };
  }

  // Apple: small recurring charges are iCloud / software subs; large
  // charges are likely hardware → equipment.
  if (key.indexOf('APPLE') !== -1) {
    if (amountCents >= EQUIPMENT_THRESHOLD_CENTS) {
      return { category: 'equipment', confidence: 0.78, reason: 'Compra grande de Apple — posible equipo' };
    }
    return { category: 'software_subs', confidence: 0.82, reason: 'Cargo recurrente de Apple' };
  }

  // Creator gear retailers: substantial purchases are depreciable
  // equipment; small ones are production consumables.
  if (matchesAny(key, GEAR_RETAILERS)) {
    if (amountCents >= EQUIPMENT_THRESHOLD_CENTS) {
      return { category: 'equipment', confidence: 0.85, reason: 'Compra en tienda de equipo — posible activo' };
    }
    return { category: 'content_prod', confidence: 0.78, reason: 'Consumibles de tienda de equipo' };
  }

  // Contract-labor heuristic: a person paid 3+ times this session.
  if ((repeatCount || 1) >= 3 && looksLikePersonalPayee(description)) {
    return { category: 'pro_services', confidence: 0.88, reason: 'Pagos recurrentes a una persona' };
  }

  return null;
}

// ─── Batch pass over imported transactions ─────────────────────────
//
// Call after applyRules(). Fills `suggestedCategory` (+ confidence +
// reason) on debit transactions that don't already carry a category
// from a rule. Returns { transactions, suggestedCount }.
export function suggestForTransactions(transactions) {
  // Repeat counts per merchant among debits — feeds the contract-labor
  // heuristic ("this person got paid 12 times").
  var repeats = {};
  transactions.forEach(function(t) {
    if (t.type !== 'debit') return;
    var k = merchantKey(t.description);
    if (!k) return;
    repeats[k] = (repeats[k] || 0) + 1;
  });

  var suggested = 0;
  var out = transactions.map(function(t) {
    if (t.type !== 'debit') return t;       // income: seeds/rules cover it
    if (t.category) return t;               // a rule already decided
    if (t.suggestedCategory) return t;      // already suggested (re-import)
    var k = merchantKey(t.description);
    var guess = suggestCategory(t.description, t.amountCents, repeats[k] || 1);
    if (!guess) return t;
    suggested++;
    return Object.assign({}, t, {
      suggestedCategory: guess.category,
      suggestedConfidence: guess.confidence,
      suggestedReason: guess.reason,
    });
  });
  return { transactions: out, suggestedCount: suggested };
}
