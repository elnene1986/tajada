// "Deducciones potenciales" counter — brief 06.
//
// Turns categorization work the user already does into a running total
// of money the app found them. Two numbers:
//   deductionsCents       = sum of business EXPENSES (debit + isBusiness)
//   estimatedSavingsCents = deductionsCents × EFFECTIVE_RATE
//
// This is NOT the "set aside" estimate (see src/utils/taxEstimate.js),
// which answers "how much do I OWE?". This answers "how much did marking
// things negocio SAVE me?" — the shareable, emotional number that leads
// the Home screen.
//
// Compliance posture (brief 06): the counter never asserts deductibility.
// It sums what the USER marked negocio, the same way a spreadsheet totals
// a column. The UI copy is always "potenciales" and "(est.)", and the
// expanded view carries the "no es asesoría fiscal" handoff line.
//
// Pure derivation over existing session data. Integer cents throughout
// (see src/utils/money.js). No storage, no LLM, no native modules.

// Blended federal + SE-tax proxy for a solo creator. A $500 deduction is
// not $500 back — at ~25% effective it's ~$125. This is the DEFAULT rate;
// the Settings screen (brief B3) lets the user pick one of RATE_PRESETS
// and persists it via src/utils/settings.js. Callers load the persisted
// rate and pass it to deductionTotals(); with no argument this default
// stands (which is what the unit tests exercise). Do NOT grow real tax
// math here — that's taxEstimate.js / brief 07's territory.
export var EFFECTIVE_RATE = 0.25;

// The choices offered in Settings ("¿Tu tasa? La mayoría de creadores:
// 22–30%"). Kept here next to the default so the counter's math and the
// settings UI never drift apart.
export var RATE_PRESETS = [0.22, 0.25, 0.30];

// Dedup key mirrors ImportScreen / ReviewScreen exactly:
// date | amountCents | lowercased description. This is what those screens
// use to merge re-imports, so the counter's notion of "the same
// transaction" matches the app's everywhere else.
function dedupKey(tx) {
  return (tx.date || '') + '|' + tx.amountCents + '|' + String(tx.description || '').toLowerCase();
}

// Sum business expenses across all sessions and derive estimated savings.
// A "business expense" is a debit the user marked negocio — the exact
// predicate SummaryScreen uses (type === 'debit' && isBusiness).
//
// Deduplicated across sessions: importing the same CSV twice creates two
// sessions with identical rows, and the counter must not count each
// expense twice. The first occurrence of a (date, amount, description)
// key counts; later duplicates in any other session are skipped.
//
// `rate` is the effective-rate multiplier for the savings estimate; when
// omitted (or invalid) it falls back to EFFECTIVE_RATE, so existing
// callers and tests keep the 0.25 default. The Home screen loads the
// user's persisted choice (src/utils/settings.js) and passes it in.
//
// Returns integer cents; tolerant of malformed/empty input (returns zeros).
export function deductionTotals(sessions, rate) {
  var effRate = (typeof rate === 'number' && rate > 0 && rate < 1) ? rate : EFFECTIVE_RATE;
  var deductionsCents = 0;
  var seen = new Set();
  if (Array.isArray(sessions)) {
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (!s || !Array.isArray(s.transactions)) continue;
      for (var j = 0; j < s.transactions.length; j++) {
        var tx = s.transactions[j];
        if (tx && tx.type === 'debit' && tx.isBusiness &&
            Number.isFinite(tx.amountCents)) {
          var key = dedupKey(tx);
          if (seen.has(key)) continue;
          seen.add(key);
          deductionsCents += tx.amountCents;
        }
      }
    }
  }
  var estimatedSavingsCents = Math.round(deductionsCents * effRate);
  return {
    deductionsCents: deductionsCents,
    estimatedSavingsCents: estimatedSavingsCents,
  };
}

// Business-expense deductions grouped by Schedule C category, sorted
// high-to-low. Used by the share card's "top 3 categorías" (brief 06).
// Same predicate + cross-session dedup as deductionTotals, so the numbers
// agree. Rows with no category fall under 'uncategorized'. Returns an
// array of { category, deductionsCents }; `limit` caps the length
// (default 3). Tolerant of malformed/empty input (returns []).
export function topDeductionCategories(sessions, limit) {
  var byCat = {};
  var seen = new Set();
  if (Array.isArray(sessions)) {
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (!s || !Array.isArray(s.transactions)) continue;
      for (var j = 0; j < s.transactions.length; j++) {
        var tx = s.transactions[j];
        if (tx && tx.type === 'debit' && tx.isBusiness &&
            Number.isFinite(tx.amountCents)) {
          var key = dedupKey(tx);
          if (seen.has(key)) continue;
          seen.add(key);
          var cat = tx.category || 'uncategorized';
          byCat[cat] = (byCat[cat] || 0) + tx.amountCents;
        }
      }
    }
  }
  var arr = Object.keys(byCat).map(function(c) {
    return { category: c, deductionsCents: byCat[c] };
  });
  arr.sort(function(a, b) { return b.deductionsCents - a.deductionsCents; });
  var n = (typeof limit === 'number' && limit > 0) ? limit : 3;
  return arr.slice(0, n);
}
