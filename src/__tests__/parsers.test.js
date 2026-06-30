// Parser tests — the safety net for bank/platform CSV format drift.
//
// Banks and platforms change their export columns without warning. When
// that happens the parser silently drops or misreads rows and the user
// sees fewer transactions (under-reported income or missed deductions)
// with NO error. These tests pin the current behavior so a regression
// shows up here instead of in someone's tax return.

import {
  detectFormat, parseCapitalOne, parseVenmo, parseFile,
} from '../parsers';

describe('detectFormat', () => {
  test('OFX by tag', () => {
    expect(detectFormat('<OFX><BANKMSGSRSV1>...')).toBe('ofx');
  });
  test('OFX by extension', () => {
    expect(detectFormat('garbage', 'export.qfx')).toBe('ofx');
  });
  test('Venmo statement', () => {
    expect(detectFormat('Account Statement\nVenmo,,,\n')).toBe('venmo');
  });
  test('PayPal', () => {
    expect(detectFormat('"Date","Time","TimeZone","Name"\npaypal')).toBe('paypal');
  });
  test('Capital One / generic bank', () => {
    expect(detectFormat('Transaction Date,Transaction Description,Transaction Amount')).toBe('capital_one');
  });
  test('Chase credit card', () => {
    expect(detectFormat('Transaction Date,Post Date,Description,Category,Type,Amount')).toBe('chase_cc');
  });
  test('unknown → generic', () => {
    expect(detectFormat('foo,bar,baz\n1,2,3')).toBe('generic');
  });
});

describe('parseCapitalOne', () => {
  const csv = [
    'Transaction Date,Posted Date,Card No.,Transaction Description,Transaction Type,Transaction Amount',
    '12/01/2025,12/02/2025,1234,STRIPE PAYOUT,Credit,940.00',
    '12/03/2025,12/04/2025,1234,ADOBE SUBSCRIPTION,Debit,-52.99',
  ].join('\n');

  test('parses credits and debits with integer cents', () => {
    const txns = parseCapitalOne(csv);
    expect(txns).toHaveLength(2);

    const credit = txns.find(t => t.type === 'credit');
    expect(credit.amountCents).toBe(94000);
    expect(Number.isInteger(credit.amountCents)).toBe(true);

    const debit = txns.find(t => t.type === 'debit');
    expect(debit.amountCents).toBe(5299); // abs value, sign in `type`
  });

  test('amounts are always positive integers (sign lives in type)', () => {
    parseCapitalOne(csv).forEach(t => {
      expect(t.amountCents).toBeGreaterThan(0);
      expect(Number.isInteger(t.amountCents)).toBe(true);
    });
  });

  test('strips a leading UTF-8 BOM on the header row', () => {
    const withBom = '﻿' + csv;
    expect(parseCapitalOne(withBom)).toHaveLength(2);
  });

  test('no matching header → empty array, not a throw', () => {
    expect(parseCapitalOne('foo,bar\n1,2')).toEqual([]);
  });
});

describe('parseVenmo', () => {
  const csv = [
    'Account Statement - (@creator)',
    ',ID,Datetime,Type,Status,Note,From,To,Amount (total)',
    ',3344,2025-06-01T10:00:00,Payment,Complete,thanks!,John Doe,Me,+ $50.00',
    ',3345,2025-06-02T10:00:00,Standard Transfer,Complete,,Me,Bank,- $100.00',
    ',3346,2025-06-03T10:00:00,Payment,Issued,pending,Jane,Me,+ $20.00',
  ].join('\n');

  test('keeps only completed payments, skips bank transfers and non-complete', () => {
    const txns = parseVenmo(csv);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('credit');
    expect(txns[0].amountCents).toBe(5000);
  });
});

describe('parseFile (dispatch)', () => {
  test('routes a Capital One CSV through the right parser', () => {
    const csv = [
      'Transaction Date,Posted Date,Card No.,Transaction Description,Transaction Type,Transaction Amount',
      '12/01/2025,12/02/2025,1234,STRIPE PAYOUT,Credit,940.00',
    ].join('\n');
    const result = parseFile(csv, 'capitalone.csv');
    expect(result.format).toBe('capital_one');
    expect(result.source).toBe('Bank');
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amountCents).toBe(94000);
  });
});
