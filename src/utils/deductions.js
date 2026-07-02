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
// not $500 back — at ~25% effective it's ~$125. A future settings row
// ("¿Tu tasa? La mayoría de creadores: 22–30%") can make this adjustable;
// for now it's one constant so the counter can ship. Do NOT grow real tax
// math here — that's taxEstimate.js / brief 07's territory.
export var EFFECTIVE_RATE = 0.25;

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
// Returns integer cents; tolerant of malformed/empty input (returns zeros).
export function deductionTotals(sessions) {
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
  var estimatedSavingsCents = Math.round(deductionsCents * EFFECTIVE_RATE);
  return {
    deductionsCents: deductionsCents,
    estimatedSavingsCents: estimatedSavingsCents,
  };
}
