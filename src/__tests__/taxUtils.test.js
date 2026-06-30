// Tax-math tests — the figures that drive the "what do I owe?" features.
// These caught real edge cases during the build (SS wage-base cap, the
// half-SE deduction, the year-boundary on quarterly dates) and lock them.

import { estimateTaxes, fractionToPct, DEFAULT_FED_RATE } from '../utils/taxEstimate';
import { deductionCents, MAX_DEDUCTION_CENTS } from '../utils/homeOffice';
import { total1099Cents, reconcile } from '../utils/reconcile1099';
import { upcomingDueDates, formatDueDate } from '../utils/quarterlyReminders';

describe('estimateTaxes', () => {
  test('hand-computed case: $24,000 net at 12% federal', () => {
    const e = estimateTaxes(2400000, 0.12);
    expect(e.seTaxCents).toBe(339110);
    expect(e.fedTaxCents).toBe(267653);
    expect(e.totalCents).toBe(606763);
    expect(fractionToPct(e.fraction)).toBe(25);
  });

  test('zero / negative net → all zeros', () => {
    expect(estimateTaxes(0, 0.12).totalCents).toBe(0);
    expect(estimateTaxes(-50000, 0.22).totalCents).toBe(0);
  });

  test('Social Security portion stops at the wage-base cap', () => {
    // $300k net: SS portion = 17,610,000 * 0.124; Medicare on full base.
    const e = estimateTaxes(30000000, 0.24);
    expect(e.seTaxCents).toBe(Math.round(17610000 * 0.124) + Math.round(Math.round(30000000 * 0.9235) * 0.029));
  });

  test('all outputs are integer cents', () => {
    const e = estimateTaxes(1234567, 0.22);
    ['seTaxCents', 'fedTaxCents', 'totalCents'].forEach(k => {
      expect(Number.isInteger(e[k])).toBe(true);
    });
  });

  test('defaults the federal rate when omitted', () => {
    expect(estimateTaxes(2400000).fedRate).toBe(DEFAULT_FED_RATE);
  });
});

describe('homeOffice.deductionCents', () => {
  test('simplified method = $5/sqft', () => {
    expect(deductionCents(100)).toBe(50000);
    expect(deductionCents(250)).toBe(125000);
  });
  test('caps at 300 sqft / $1,500', () => {
    expect(deductionCents(300)).toBe(MAX_DEDUCTION_CENTS);
    expect(deductionCents(400)).toBe(MAX_DEDUCTION_CENTS);
  });
  test('floors fractional sqft, guards junk', () => {
    expect(deductionCents(150.9)).toBe(75000);
    expect(deductionCents(0)).toBe(0);
    expect(deductionCents(-50)).toBe(0);
    expect(deductionCents('abc')).toBe(0);
  });
});

describe('1099-K reconcile', () => {
  const entries = [{ grossCents: 1000000 }, { grossCents: 550000 }];
  test('totals the gross', () => {
    expect(total1099Cents(entries)).toBe(1550000);
    expect(total1099Cents([])).toBe(0);
  });
  test('covered when recorded ≥ gross', () => {
    const r = reconcile(1576633, entries);
    expect(r.covered).toBe(true);
    expect(r.deltaCents).toBe(26633);
  });
  test('shortfall when recorded < gross', () => {
    const r = reconcile(1400000, entries);
    expect(r.covered).toBe(false);
    expect(r.deltaCents).toBe(-150000);
  });
});

describe('quarterly due dates', () => {
  test('mid-year surfaces the next four installments', () => {
    const u = upcomingDueDates(new Date(2026, 5, 29)); // Jun 29 2026
    expect(u).toHaveLength(4);
    expect(formatDueDate(u[0].date)).toBe('15 de septiembre de 2026');
    expect(formatDueDate(u[1].date)).toBe('15 de enero de 2027');
  });
  test('December correctly spans into next January (Q4)', () => {
    const u = upcomingDueDates(new Date(2026, 11, 20)); // Dec 20 2026
    expect(formatDueDate(u[0].date)).toBe('15 de enero de 2027');
    expect(formatDueDate(u[1].date)).toBe('15 de abril de 2027');
  });
});
