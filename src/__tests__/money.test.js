// Money handling — the single chokepoint between string CSV data and
// the integer-cents world. If parseToCents drifts, every downstream
// total is wrong, so these lock the contract.

import {
  parseToCents, dollarsToCents, centsToDollars,
  fmtCents, fmtCentsK, centsToFixedString, formatAmountInput,
} from '../utils/money';

describe('parseToCents', () => {
  test('plain decimals', () => {
    expect(parseToCents('9.99')).toBe(999);
    expect(parseToCents('0.01')).toBe(1);
    expect(parseToCents('100')).toBe(10000);
  });

  test('strips $ and thousands separators', () => {
    expect(parseToCents('$1,234.56')).toBe(123456);
    expect(parseToCents('  $ 1,000.00 ')).toBe(100000);
  });

  test('parenthesized values are negative (accounting CSVs)', () => {
    expect(parseToCents('(9.99)')).toBe(-999);
  });

  test('negative sign preserved', () => {
    expect(parseToCents('-5.99')).toBe(-599);
    expect(parseToCents('+1.00')).toBe(100);
  });

  test('float-multiplication drift is rounded away', () => {
    // parseFloat("9.99")*100 === 998.9999999999999 in JS; must be 999.
    expect(parseToCents('9.99')).toBe(999);
    expect(parseToCents('19.99')).toBe(1999);
    expect(parseToCents('0.29')).toBe(29);
  });

  test('non-numeric → NaN', () => {
    expect(Number.isNaN(parseToCents('abc'))).toBe(true);
    expect(Number.isNaN(parseToCents(''))).toBe(true);
    expect(Number.isNaN(parseToCents(null))).toBe(true);
  });
});

describe('dollarsToCents / centsToDollars', () => {
  test('round trip', () => {
    expect(dollarsToCents(12.34)).toBe(1234);
    expect(centsToDollars(1234)).toBeCloseTo(12.34, 5);
  });
  test('non-finite guarded', () => {
    expect(dollarsToCents(NaN)).toBe(0);
    expect(centsToDollars(undefined)).toBe(0);
  });
});

describe('fmtCents', () => {
  test('formats with thousands separators', () => {
    expect(fmtCents(999)).toBe('$9.99');
    expect(fmtCents(123456)).toBe('$1,234.56');
    expect(fmtCents(0)).toBe('$0.00');
    expect(fmtCents(5)).toBe('$0.05');
  });
  test('absolute value (sign handled by caller)', () => {
    expect(fmtCents(-50)).toBe('$0.50');
  });
});

describe('fmtCentsK', () => {
  test('compact above $1k', () => {
    expect(fmtCentsK(1234567)).toBe('$12.3k');
  });
  test('full below $1k', () => {
    expect(fmtCentsK(99900)).toBe('$999.00');
  });
});

describe('centsToFixedString', () => {
  test('unsigned numeric for CSV', () => {
    expect(centsToFixedString(999)).toBe('9.99');
    expect(centsToFixedString(100000)).toBe('1000.00');
  });
});

describe('formatAmountInput (live text input)', () => {
  test('adds commas, caps decimals, trims leading zeros', () => {
    expect(formatAmountInput('10000')).toBe('10,000');
    expect(formatAmountInput('1234567.89')).toBe('1,234,567.89');
    expect(formatAmountInput('99.999')).toBe('99.99');
    expect(formatAmountInput('007')).toBe('7');
    expect(formatAmountInput('$12,000')).toBe('12,000');
    expect(formatAmountInput('1.2.3')).toBe('1.23');
    expect(formatAmountInput('')).toBe('');
  });
});
