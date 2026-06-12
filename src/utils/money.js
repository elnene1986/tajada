// Money handling — integer cents internally, formatted strings at the
// display boundary. Every transaction.amountCents in the system is an
// integer (no decimals, no floating-point), so aggregation across
// thousands of rows is bit-exact.
//
// WHY THIS EXISTS:
// JavaScript only has IEEE-754 floats. That means 0.1 + 0.2 ===
// 0.30000000000000004, and a year of Stripe payouts summed with `+=`
// can drift by pennies. When the user's contador reconciles Tajada's
// year-end Schedule C totals against the bank statement, off-by-cents
// errors look like Tajada is broken. The fix is to never carry money
// as a float — parse strings to integer cents at ingest, sum cents,
// format cents at the very last step.
//
// FIELD NAMING:
// Internal storage uses `amountCents` (integer). Anything older with
// `amount` (float dollars) is migrated automatically in storage.js
// on the next read.

// ─── Parsing CSV strings ──────────────────────────────────────────
//
// Bank/platform CSVs deliver strings like "1,234.56", "$1,234.56",
// "-9.99", or "(9.99)" (parens = negative on some bank exports).
// Strip the noise, parseFloat once, then multiply×100 + Math.round —
// Math.round catches the float drift introduced by the multiplication
// (e.g., parseFloat("9.99") * 100 === 998.9999999999999 in JS;
// Math.round pulls it back to 999).
//
// Returns NaN if the input doesn't look like a number — callers should
// check Number.isFinite(result) before using it.
export function parseToCents(input) {
  if (input == null) return NaN;
  var s = String(input).trim();
  if (!s) return NaN;
  // Strip currency markers, thousands separators, whitespace.
  s = s.replace(/[\s$,]/g, '');
  // Parenthesized number = negative (common in accounting CSVs).
  if (/^\(.+\)$/.test(s)) s = '-' + s.slice(1, -1);
  var n = parseFloat(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

// ─── Direct conversion (when you have a float dollar value) ──────
//
// Used by the storage migration that turns legacy float-dollar
// amounts into integer cents on first read.
export function dollarsToCents(d) {
  if (!Number.isFinite(d)) return 0;
  return Math.round(d * 100);
}

// Cents → dollars (float). ONLY for display. Don't aggregate the
// result — that re-introduces the bug we're trying to avoid.
export function centsToDollars(c) {
  if (!Number.isFinite(c)) return 0;
  return c / 100;
}

// ─── Formatting ───────────────────────────────────────────────────
//
// All formatters take integer cents and produce a display string.
// Sign is dropped (use the transaction's `type` field for +/− logic).
//
// Output examples:
//   fmtCents(999)    → "$9.99"
//   fmtCents(123456) → "$1,234.56"
//   fmtCents(-50)    → "$0.50"    (absolute value — caller adds sign)
//   fmtCents(0)      → "$0.00"
export function fmtCents(cents) {
  var c = Number.isFinite(cents) ? Math.abs(Math.round(cents)) : 0;
  var dollars = Math.floor(c / 100);
  var pennies = c % 100;
  // Thousands separators on the dollar portion — locale-independent
  // implementation because RN's Intl support is patchy on Android.
  var dollarStr = String(dollars).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  var pennyStr = pennies < 10 ? '0' + pennies : '' + pennies;
  return '$' + dollarStr + '.' + pennyStr;
}

// Compact format for tight UI (chips, badges). $1,234 → "$1.2k".
// Below $1k uses full cents; above $1k rounds to one decimal in
// thousands. Used by ReviewScreen badges where space is tight.
export function fmtCentsK(cents) {
  var c = Number.isFinite(cents) ? Math.abs(Math.round(cents)) : 0;
  if (c >= 100000) {
    // $1,000.00+ → "$1.2k"
    var k = c / 100000; // cents → thousands of dollars
    return '$' + k.toFixed(1) + 'k';
  }
  return fmtCents(c);
}

// Pure-numeric two-decimal output used inside the CSV export, where
// we want "9.99" without the dollar sign so the column stays numeric
// when opened in Excel / Google Sheets.
export function centsToFixedString(cents) {
  var c = Number.isFinite(cents) ? Math.abs(Math.round(cents)) : 0;
  var dollars = Math.floor(c / 100);
  var pennies = c % 100;
  return dollars + '.' + (pennies < 10 ? '0' + pennies : '' + pennies);
}
