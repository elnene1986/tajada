// Duplicate-import guard.
//
// Detects when a file the user is importing overlaps transactions that
// already live in existing sessions — BEFORE a new session is created (or
// before rows are merged into the current one). Uses the same dedup key
// as the rest of the app: date | amountCents | description.toLowerCase().
//
// Pure functions (no storage, no UI) so the three outcomes are unit-
// testable: all-duplicate, partial, all-new.

// The canonical dedup key, matching ImportScreen / ReviewScreen /
// deductions. Tolerant of missing fields.
export function dedupKey(tx) {
  return (tx.date || '') + '|' + tx.amountCents + '|' + String(tx.description || '').toLowerCase();
}

// A Set of every transaction key across all existing sessions.
export function existingKeySet(sessions) {
  var set = new Set();
  if (!Array.isArray(sessions)) return set;
  sessions.forEach(function(s) {
    if (!s || !Array.isArray(s.transactions)) return;
    s.transactions.forEach(function(t) { set.add(dedupKey(t)); });
  });
  return set;
}

// Name of the existing session with the most rows in common with the
// parsed set — so the user is told WHICH import this duplicates.
// Returns null when there's no overlap.
function bestMatchSessionName(parsedKeys, sessions) {
  if (!Array.isArray(sessions)) return null;
  var best = null, bestCount = 0;
  sessions.forEach(function(s) {
    if (!s || !Array.isArray(s.transactions)) return;
    var keys = new Set(s.transactions.map(dedupKey));
    var overlap = 0;
    parsedKeys.forEach(function(k) { if (keys.has(k)) overlap++; });
    if (overlap > bestCount) { bestCount = overlap; best = s.name || null; }
  });
  return best;
}

// Deduped union of all transactions across a batch of files (or
// sessions) — first occurrence of each key wins, order preserved. Used by
// ImportScreen's totals card so in-batch overlap doesn't inflate FILAS
// PROCESADAS / INGRESOS / GASTOS. Accepts anything with a `transactions`
// array.
export function dedupedUnion(filesOrSessions) {
  var seen = new Set();
  var out = [];
  if (!Array.isArray(filesOrSessions)) return out;
  filesOrSessions.forEach(function(f) {
    if (!f || !Array.isArray(f.transactions)) return;
    f.transactions.forEach(function(t) {
      var k = dedupKey(t);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    });
  });
  return out;
}

// Classify a freshly-parsed transaction list against existing sessions.
//
// Returns:
//   status: 'all_duplicate' | 'partial' | 'new'
//   newTxns:  the rows to actually import — unique, and absent from every
//             existing session (also dedups repeats within the file)
//   newCount, duplicateCount
//   matchSessionName: name of the session this most overlaps, or null
export function classifyImport(parsedTxns, sessions) {
  var parsed = Array.isArray(parsedTxns) ? parsedTxns : [];
  var existing = existingKeySet(sessions);

  var seen = new Set(existing); // also collapses repeats within the file
  var newTxns = [];
  parsed.forEach(function(t) {
    var k = dedupKey(t);
    if (seen.has(k)) return; // already stored, or a repeat in this file
    seen.add(k);
    newTxns.push(t);
  });

  var duplicateCount = parsed.length - newTxns.length;
  var parsedKeys = parsed.map(dedupKey);

  var status;
  if (newTxns.length === 0) status = 'all_duplicate';
  else if (duplicateCount > 0) status = 'partial';
  else status = 'new';

  return {
    status: status,
    newTxns: newTxns,
    newCount: newTxns.length,
    duplicateCount: duplicateCount,
    matchSessionName: bestMatchSessionName(parsedKeys, sessions),
  };
}
