// Merchant memory / rules engine.
//
// A rule says: "whenever you see a transaction whose normalized
// description matches <merchantKey>, classify it as <isBusiness> and
// tag it with <category>". Rules persist across sessions so the user
// never has to re-classify the same merchant twice.
//
// Storage is a single JSON file in the app's document directory.
// This stays on-device — same privacy posture as sessions.

import * as FileSystem from 'expo-file-system/legacy';

// Tajada-branded rules path. Pre-rebrand installs wrote to the
// SplitLedger-era filename; migrateLegacyRules() below quietly moves
// the old file into the new path on first read, idempotent and
// best-effort so a failed migration never blocks the read path.
var RULES_FILE = FileSystem.documentDirectory + 'tajada_rules.json';
var LEGACY_RULES_FILE = FileSystem.documentDirectory + 'splitledger_rules.json';

async function migrateLegacyRules() {
  try {
    var newInfo = await FileSystem.getInfoAsync(RULES_FILE);
    if (newInfo.exists) return;
    var oldInfo = await FileSystem.getInfoAsync(LEGACY_RULES_FILE);
    if (!oldInfo.exists) return;
    await FileSystem.moveAsync({ from: LEGACY_RULES_FILE, to: RULES_FILE });
  } catch (e) { /* non-fatal */ }
}

// ─── Normalize a description into a stable merchant key ───────────
//
// We strip dates, amounts, reference numbers, trailing store codes —
// anything that varies month-to-month for the same merchant. The
// result becomes the key we match against on future imports.
export function merchantKey(description) {
  if (!description) return '';
  return String(description)
    .toLowerCase()
    .replace(/\d{1,2}\/\d{1,2}\/?\d{0,4}/g, '')      // inline dates 5/12/25
    .replace(/\$[\d,.]+/g, '')                        // inline amounts
    .replace(/#\w+/g, '')                             // reference #s
    .replace(/\bref[:\s#]*\w+/gi, '')                 // ref: xxx
    .replace(/\bconf[:\s#]*\w+/gi, '')                // conf: xxx
    .replace(/\btxn[:\s#]*\w+/gi, '')                 // txn id
    .replace(/mm[\w]+/gi, '')                         // Capital One mm tags
    .replace(/bpf_dss_\S+/gi, '')                     // Venmo bpf junk
    .replace(/\s{2,}/g, ' ')
    .replace(/[^\w\s&]/g, ' ')                        // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Persistence ──────────────────────────────────────────────────
export async function getRules() {
  try {
    await migrateLegacyRules();
    var info = await FileSystem.getInfoAsync(RULES_FILE);
    if (!info.exists) return {};
    var raw = await FileSystem.readAsStringAsync(RULES_FILE);
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

async function writeRules(rules) {
  await FileSystem.writeAsStringAsync(RULES_FILE, JSON.stringify(rules));
}

// ─── Bulk replace (used by the restore-from-backup flow) ──────────
//
// Overwrite the entire rules dictionary. Pass {} to wipe. The backup
// restore flow calls this with the decrypted rules from the user's
// backup file.
export async function setAllRules(rules) {
  var dict = (rules && typeof rules === 'object') ? rules : {};
  await writeRules(dict);
  return dict;
}

// Save (or overwrite) a rule for a given merchant key.
//
// `source` describes how the rule got created: 'manual' | 'onboarding' | 'platform-seed'.
// `match` controls how the rule fires against a normalized description:
//   'exact'  (default) — the rule fires only when merchantKey(description) === key
//   'prefix' — the rule fires when the normalized description starts with
//              key followed by a word boundary (a space, or end-of-string).
//              Used for brand seeds like 'doordash' that need to match
//              'doordash inc san francisco' on real bank statements.
//              Exact matches are always preferred over prefix matches, and
//              when multiple prefix rules could match, the longest wins.
export async function saveRule(key, isBusiness, category, source, match) {
  if (!key) return null;
  var rules = await getRules();
  var now = new Date().toISOString();
  rules[key] = {
    merchantKey: key,
    isBusiness: !!isBusiness,
    category: category || null,
    source: source || 'manual',
    match: match === 'prefix' ? 'prefix' : 'exact',
    createdAt: (rules[key] && rules[key].createdAt) || now,
    updatedAt: now,
  };
  await writeRules(rules);
  return rules[key];
}

export async function deleteRule(key) {
  var rules = await getRules();
  if (rules[key]) {
    delete rules[key];
    await writeRules(rules);
  }
  return rules;
}

// ─── Apply rules to a list of transactions ────────────────────────
// Returns { transactions, appliedCount } — the list with rule-matched
// transactions flagged + tagged, and a count for UI messaging.
//
// Matching strategy:
//   1. Exact match — rules[merchantKey(description)]
//   2. Prefix match — longest rule key whose `match === 'prefix'` and
//      whose key is a word-bounded prefix of the description's key
//
// Exact always wins so a user-set rule like "amazon" → personal can't
// be overridden by a "amazon" prefix-seed elsewhere; and the longest
// prefix wins so "uber eats" (if present) beats "uber".
export function applyRules(transactions, rules) {
  if (!rules || Object.keys(rules).length === 0) {
    return { transactions: transactions, appliedCount: 0 };
  }

  // Pre-compute the list of prefix rules, sorted by key length desc so
  // the first match in the loop is the longest one. This avoids
  // re-sorting on every transaction.
  var prefixRules = Object.keys(rules)
    .filter(function(k) { return rules[k] && rules[k].match === 'prefix'; })
    .sort(function(a, b) { return b.length - a.length; });

  function matchRule(descKey) {
    if (!descKey) return null;
    if (rules[descKey]) return rules[descKey];
    for (var i = 0; i < prefixRules.length; i++) {
      var pk = prefixRules[i];
      // Word-bounded prefix: descKey === pk OR descKey starts with pk + ' '
      if (descKey === pk) return rules[pk];
      if (descKey.length > pk.length
          && descKey.charAt(pk.length) === ' '
          && descKey.slice(0, pk.length) === pk) {
        return rules[pk];
      }
    }
    return null;
  }

  var applied = 0;
  var out = transactions.map(function(t) {
    var key = merchantKey(t.description);
    var r = matchRule(key);
    if (!r) return t;
    applied++;
    return Object.assign({}, t, {
      isBusiness: r.isBusiness,
      category: r.category || t.category || null,
      ruleApplied: true,
    });
  });
  return { transactions: out, appliedCount: applied };
}

// Seed a batch of rules (used by onboarding platform selection).
// Each entry: { key, isBusiness, category, source, match }.
// `match` defaults to 'exact'; pass 'prefix' to make the seed match
// any description whose normalized key starts with this key + space.
export async function seedRules(entries) {
  if (!entries || entries.length === 0) return;
  var rules = await getRules();
  var now = new Date().toISOString();
  entries.forEach(function(e) {
    if (!e.key) return;
    // Do not overwrite an existing manually-created rule.
    if (rules[e.key] && rules[e.key].source === 'manual') return;
    rules[e.key] = {
      merchantKey: e.key,
      isBusiness: !!e.isBusiness,
      category: e.category || null,
      source: e.source || 'platform-seed',
      match: e.match === 'prefix' ? 'prefix' : 'exact',
      createdAt: (rules[e.key] && rules[e.key].createdAt) || now,
      updatedAt: now,
    };
  });
  await writeRules(rules);
}
