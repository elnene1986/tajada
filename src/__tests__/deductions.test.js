// Brief 06 — deducciones potenciales counter.
import { deductionTotals, EFFECTIVE_RATE } from '../utils/deductions';

// Minimal transaction/session factories mirroring the real shape:
// { type: 'credit'|'debit', isBusiness: bool, amountCents: int }.
function tx(type, isBusiness, amountCents) {
  return { type: type, isBusiness: isBusiness, amountCents: amountCents };
}
function session(transactions) {
  return { id: 's', transactions: transactions };
}

describe('deductionTotals', () => {
  it('sums only business expenses (debit + isBusiness)', () => {
    const sessions = [session([
      tx('debit', true, 50000),   // business expense — counts
      tx('debit', true, 30000),   // business expense — counts
      tx('debit', false, 99999),  // personal expense — excluded
      tx('credit', true, 400000), // business INCOME — excluded (not a deduction)
      tx('credit', false, 12345), // personal income — excluded
    ])];
    const r = deductionTotals(sessions);
    expect(r.deductionsCents).toBe(80000);
  });

  it('derives estimated savings at EFFECTIVE_RATE, rounded to cents', () => {
    // 80000 × 0.25 = 20000 exactly.
    expect(deductionTotals([session([tx('debit', true, 80000)])]).estimatedSavingsCents).toBe(20000);
    // 33333 × 0.25 = 8333.25 → rounds to 8333.
    expect(deductionTotals([session([tx('debit', true, 33333)])]).estimatedSavingsCents).toBe(8333);
  });

  it('aggregates across multiple sessions', () => {
    const r = deductionTotals([
      session([tx('debit', true, 10000)]),
      session([tx('debit', true, 25000), tx('debit', false, 999)]),
    ]);
    expect(r.deductionsCents).toBe(35000);
    expect(r.estimatedSavingsCents).toBe(Math.round(35000 * EFFECTIVE_RATE));
  });

  it('returns zeros for empty / malformed input', () => {
    expect(deductionTotals([])).toEqual({ deductionsCents: 0, estimatedSavingsCents: 0 });
    expect(deductionTotals(null)).toEqual({ deductionsCents: 0, estimatedSavingsCents: 0 });
    expect(deductionTotals(undefined)).toEqual({ deductionsCents: 0, estimatedSavingsCents: 0 });
    expect(deductionTotals([{ id: 'x' }])).toEqual({ deductionsCents: 0, estimatedSavingsCents: 0 });
    expect(deductionTotals([session([tx('debit', true, NaN)])]).deductionsCents).toBe(0);
  });
});
