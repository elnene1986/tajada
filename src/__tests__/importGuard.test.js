// Duplicate-import guard (fix/duplicate-import-guard).
import { classifyImport, dedupKey, existingKeySet, dedupedUnion } from '../utils/importGuard';

function tx(date, desc, cents, type) {
  return { date: date, description: desc, amountCents: cents, type: type || 'debit' };
}
function session(name, transactions) {
  return { id: name, name: name, transactions: transactions };
}
// A "file" in the import batch has the same { transactions } shape.
function file(name, transactions) {
  return { id: name, name: name, transactions: transactions };
}

const A = tx('2026-01-05', 'ADOBE INC', 5299);
const B = tx('2026-01-12', 'B&H PHOTO', 120000);
const C = tx('2026-02-01', 'FIGMA', 1500);

describe('dedupKey / existingKeySet', () => {
  it('builds date|amountCents|lowercased-description', () => {
    expect(dedupKey(A)).toBe('2026-01-05|5299|adobe inc');
  });
  it('collects keys across all sessions', () => {
    const set = existingKeySet([session('s1', [A]), session('s2', [B])]);
    expect(set.has(dedupKey(A))).toBe(true);
    expect(set.has(dedupKey(B))).toBe(true);
    expect(set.size).toBe(2);
  });
  it('tolerates malformed input', () => {
    expect(existingKeySet(null).size).toBe(0);
    expect(existingKeySet([null, {}]).size).toBe(0);
  });
});

describe('classifyImport', () => {
  it('NEW: no overlap → import all, no match', () => {
    const r = classifyImport([A, B], [session('Old', [C])]);
    expect(r.status).toBe('new');
    expect(r.newCount).toBe(2);
    expect(r.duplicateCount).toBe(0);
    expect(r.newTxns).toEqual([A, B]);
    expect(r.matchSessionName).toBe(null);
  });

  it('ALL_DUPLICATE: every row already exists → nothing new, names the session', () => {
    const r = classifyImport([A, B], [session('Chase — enero.csv', [A, B, C])]);
    expect(r.status).toBe('all_duplicate');
    expect(r.newCount).toBe(0);
    expect(r.duplicateCount).toBe(2);
    expect(r.newTxns).toEqual([]);
    expect(r.matchSessionName).toBe('Chase — enero.csv');
  });

  it('PARTIAL: some rows exist → import only the new ones', () => {
    const r = classifyImport([A, B, C], [session('Old', [A])]);
    expect(r.status).toBe('partial');
    expect(r.newCount).toBe(2);
    expect(r.duplicateCount).toBe(1);
    expect(r.newTxns).toEqual([B, C]);
    expect(r.matchSessionName).toBe('Old');
  });

  it('collapses duplicates WITHIN the same file', () => {
    // Two identical rows, none previously stored → one imported, one omitted.
    const r = classifyImport([A, A], []);
    expect(r.status).toBe('partial');
    expect(r.newCount).toBe(1);
    expect(r.duplicateCount).toBe(1);
    expect(r.newTxns).toEqual([A]);
  });

  it('picks the session with the most overlap for the name', () => {
    const r = classifyImport([A, B], [
      session('Few', [A]),
      session('Many', [A, B]),
    ]);
    expect(r.status).toBe('all_duplicate');
    expect(r.matchSessionName).toBe('Many');
  });

  it('handles empty / no existing sessions', () => {
    const r = classifyImport([A], []);
    expect(r.status).toBe('new');
    expect(r.matchSessionName).toBe(null);
    const empty = classifyImport([], []);
    expect(empty.status).toBe('all_duplicate'); // nothing to import
    expect(empty.newCount).toBe(0);
  });
});

// In-batch guard (ImportScreen): adding a file to the batch is checked
// against files already listed — same classifyImport, treating files as
// the "existing" set. The totals card reads dedupedUnion.
describe('in-batch duplicate handling', () => {
  it('CASE 1 — a file identical to one already listed adds nothing new', () => {
    const listed = file('enero.csv', [A, B]);
    const readded = classifyImport([A, B], [listed]); // same file again
    expect(readded.newCount).toBe(0); // → ImportScreen rejects it
  });

  it('CASE 2 — partial in-batch overlap keeps the file but dedups totals', () => {
    // File 1 has A,B; File 2 has B,C (B overlaps). The file is kept
    // (newCount > 0), and the totals union is A,B,C — not A,B,B,C.
    const f1 = file('one.csv', [A, B]);
    const g = classifyImport([B, C], [f1]);
    expect(g.newCount).toBe(1); // only C is new → file is kept
    const union = dedupedUnion([f1, file('two.csv', [B, C])]);
    expect(union).toEqual([A, B, C]);
    expect(union.length).toBe(3); // not 4
  });

  it('dedupedUnion collapses a fully-duplicated file', () => {
    const same = [A, B];
    const union = dedupedUnion([file('x.csv', same), file('x-copy.csv', same)]);
    expect(union).toEqual([A, B]);
  });

  it('dedupedUnion income/expense totals are true after dedup', () => {
    const inc = tx('2026-03-01', 'PATREON', 90000, 'credit');
    const f = file('dup.csv', [inc, A]);
    const union = dedupedUnion([f, file('dup-copy.csv', [inc, A])]);
    const income = union.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amountCents, 0);
    const expenses = union.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amountCents, 0);
    expect(income).toBe(90000); // not 180000
    expect(expenses).toBe(5299); // not 10598
  });

  it('dedupedUnion tolerates malformed input', () => {
    expect(dedupedUnion(null)).toEqual([]);
    expect(dedupedUnion([null, {}])).toEqual([]);
  });
});
