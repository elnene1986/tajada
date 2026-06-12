// Unified transaction schema:
// { id, date, description, amountCents, type: 'credit'|'debit', source, isBusiness: true }
//
// `amountCents` is ALWAYS an integer number of cents (e.g. $9.99 → 999,
// $1,234.56 → 123456). Never a float, never dollars. JavaScript only
// has IEEE-754 floats, so summing dollar values with `+=` across a
// year of transactions accumulates pennies of drift that show up when
// the user's contador reconciles totals against the bank statement.
// Parse strings to integer cents at ingest (via parseToCents from
// utils/money), aggregate cents with integer math, format at display.
//
// `source` and `format` are stored as stable English keys
// ('Bank', 'Credit Card', 'Venmo', 'PayPal', 'Other' for source;
// the format-detection strings like 'chase_cc' for format) so they
// can be used safely as dedup keys, grouping keys, and rule sources.
// Translation happens at display time via sourceLabel() / formatLabel().

import { v4Fallback } from '../utils/helpers';
import { parseToCents } from '../utils/money';
import { t } from '../i18n';

// ─── FORMAT DETECTION ───────────────────────────────────────────
export function detectFormat(content, filename = '') {
  const lower = filename.toLowerCase();
  const firstLines = content.split('\n').slice(0, 5).join('\n').toLowerCase();

  // OFX/QFX format
  if (content.includes('<OFX>') || content.includes('<ofx>') || lower.endsWith('.ofx') || lower.endsWith('.qfx')) {
    return 'ofx';
  }

  // Venmo
  if (firstLines.includes('account statement') && firstLines.includes('venmo')) {
    return 'venmo';
  }

  // PayPal
  if (firstLines.includes('paypal') || firstLines.includes('"date","time","timezone"')) {
    return 'paypal';
  }

  // Capital One / generic bank
  if (firstLines.includes('transaction description') && firstLines.includes('transaction amount')) {
    return 'capital_one';
  }

  // Chase credit card
  if (firstLines.includes('transaction date') && firstLines.includes('post date') && firstLines.includes('category')) {
    return 'chase_cc';
  }

  // Citi credit card
  if (firstLines.includes('status') && firstLines.includes('debit') && firstLines.includes('credit') && firstLines.includes('member name')) {
    return 'citi_cc';
  }

  // Amex
  if (firstLines.includes('date') && firstLines.includes('description') && firstLines.includes('amount') && (lower.includes('amex') || lower.includes('american express'))) {
    return 'amex_cc';
  }

  // Generic CSV fallback
  return 'generic';
}

// ─── CSV LINE PARSER ────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  // Strip a leading UTF-8 BOM. Excel (especially Spanish-locale
  // exports) writes one, and without this our first column header
  // silently fails to match its expected name (the first header
  // becomes "﻿Date" instead of "Date").
  return content
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(parseCSVLine);
}

// ─── CAPITAL ONE / GENERIC BANK ─────────────────────────────────
export function parseCapitalOne(content) {
  const rows = parseCSV(content);
  const headerIdx = rows.findIndex(r =>
    r.some(c => c.toLowerCase().includes('transaction description'))
  );
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(h => h.toLowerCase().trim());
  const descIdx = header.findIndex(h => h.includes('transaction description'));
  const dateIdx = header.findIndex(h => h.includes('transaction date'));
  const typeIdx = header.findIndex(h => h.includes('transaction type'));
  const amtIdx = header.findIndex(h => h.includes('transaction amount'));

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= amtIdx) continue;

    const rawCents = parseToCents(row[amtIdx]);
    if (!Number.isFinite(rawCents)) continue;

    const txnType = row[typeIdx]?.toLowerCase() || '';
    const isCredit = typeIdx !== -1 ? txnType.includes('credit') : rawCents > 0;

    transactions.push({
      id: v4Fallback(),
      date: row[dateIdx] || '',
      description: cleanDescription(row[descIdx] || ''),
      amountCents: Math.abs(rawCents),
      type: isCredit ? 'credit' : 'debit',
      source: 'Bank',
      isBusiness: true,
    });
  }
  return transactions;
}

// ─── VENMO ──────────────────────────────────────────────────────
export function parseVenmo(content) {
  const rows = parseCSV(content);
  const headerIdx = rows.findIndex(r =>
    r.some(c => c.toLowerCase().includes('datetime'))
  );
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(h => h.toLowerCase().trim());
  const dtIdx = header.indexOf('datetime');
  const typeIdx = header.indexOf('type');
  const statusIdx = header.indexOf('status');
  const noteIdx = header.indexOf('note');
  const fromIdx = header.indexOf('from');
  const toIdx = header.indexOf('to');
  const amtIdx = header.findIndex(h => h.includes('amount (total)'));

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= amtIdx || !row[dtIdx]) continue;

    const status = row[statusIdx] || '';
    if (status.toLowerCase() !== 'complete') continue;

    const txnType = row[typeIdx] || '';
    // Skip bank transfers
    if (txnType === 'Standard Transfer' || txnType === 'Instant Transfer') continue;

    // Venmo's "amount (total)" column comes through as "+ $1.00",
    // "- $5.99", etc. parseToCents strips $/,/whitespace; the leading
    // sign is preserved so credit-vs-debit detection still works.
    const amtCents = parseToCents((row[amtIdx] || '').replace(/\+/g, ''));
    if (!Number.isFinite(amtCents)) continue;

    const isCredit = amtCents > 0;
    const from = row[fromIdx] || '';
    const to = row[toIdx] || '';
    const note = row[noteIdx] || '';

    let desc;
    if (isCredit) {
      desc = note
        ? t('parser.venmo.fromWithNote', { from: from, note: note })
        : t('parser.venmo.from', { from: from });
    } else if (txnType === 'Merchant Transaction') {
      desc = note
        ? t('parser.venmo.merchantWithNote', { note: note })
        : t('parser.venmo.merchantFallback');
    } else {
      desc = note
        ? t('parser.venmo.toWithNote', { to: to, note: note })
        : t('parser.venmo.to', { to: to });
    }

    const datePart = row[dtIdx].split('T')[0];
    const [y, m, d] = datePart.split('-');
    const dateStr = `${m}/${d}/${y.slice(2)}`;

    transactions.push({
      id: v4Fallback(),
      date: dateStr,
      description: desc.trim(),
      amountCents: Math.abs(amtCents),
      type: isCredit ? 'credit' : 'debit',
      source: 'Venmo',
      isBusiness: true,
    });
  }
  return transactions;
}

// ─── PAYPAL ─────────────────────────────────────────────────────
export function parsePayPal(content) {
  const rows = parseCSV(content);
  const headerIdx = rows.findIndex(r =>
    r.some(c => c.toLowerCase() === 'date') &&
    r.some(c => c.toLowerCase() === 'name' || c.toLowerCase() === 'description')
  );
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(h => h.toLowerCase().trim());
  const dateIdx = header.indexOf('date');
  const nameIdx = header.indexOf('name') !== -1 ? header.indexOf('name') : header.indexOf('description');
  const grossIdx = header.indexOf('gross');
  const typeIdx = header.indexOf('type');
  const statusIdx = header.indexOf('status');

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= grossIdx || !row[dateIdx]) continue;

    const status = (row[statusIdx] || '').toLowerCase();
    if (status && status !== 'completed') continue;

    const txnType = (row[typeIdx] || '').toLowerCase();
    if (txnType.includes('transfer') || txnType.includes('withdraw')) continue;

    // PayPal sometimes wraps the gross amount in extra quotes that
    // slip past the CSV parser when the cell content was double-quoted.
    // Strip them explicitly before parseToCents (which doesn't.)
    const amtCents = parseToCents((row[grossIdx] || '').replace(/"/g, ''));
    if (!Number.isFinite(amtCents)) continue;

    transactions.push({
      id: v4Fallback(),
      date: row[dateIdx],
      description: row[nameIdx] || t('parser.paypal.fallback'),
      amountCents: Math.abs(amtCents),
      type: amtCents >= 0 ? 'credit' : 'debit',
      source: 'PayPal',
      isBusiness: true,
    });
  }
  return transactions;
}

// ─── CHASE CREDIT CARD ──────────────────────────────────────────
export function parseChaseCreditCard(content) {
  const rows = parseCSV(content);
  const headerIdx = rows.findIndex(r =>
    r.some(c => c.toLowerCase().includes('transaction date')) &&
    r.some(c => c.toLowerCase().includes('post date'))
  );
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(h => h.toLowerCase().trim());
  const dateIdx = header.findIndex(h => h.includes('transaction date'));
  const descIdx = header.findIndex(h => h === 'description');
  const amtIdx = header.findIndex(h => h === 'amount');

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= amtIdx || !row[dateIdx]) continue;

    const rawCents = parseToCents(row[amtIdx]);
    if (!Number.isFinite(rawCents)) continue;

    // Chase: negative = purchase (expense), positive = credit/payment
    transactions.push({
      id: v4Fallback(),
      date: row[dateIdx],
      description: row[descIdx] || '',
      amountCents: Math.abs(rawCents),
      type: rawCents < 0 ? 'debit' : 'credit',
      source: 'Credit Card',
      isBusiness: true,
    });
  }
  return transactions;
}

// ─── GENERIC CREDIT CARD / BANK CSV ─────────────────────────────
//
// Handles three shapes of CSV:
//   1. Separate Debit/Credit columns (Citi style) OR Withdrawal/Deposit
//      columns (most US banks).
//   2. A single signed Amount column with a Type column (Deposit /
//      Withdrawal / Debit / Credit / Purchase / Fee / Refund).
//   3. A single signed Amount column with no type hint at all — in
//      that case we use the format hint to choose a sign convention:
//      credit-card formats treat positive as a charge (debit); bank
//      formats treat positive as a deposit (credit).
//
// The old implementation hard-coded `isDebit = rawAmt > 0`, which
// silently misclassified every deposit in a generic bank CSV as an
// expense. That bug is the reason this function now takes opts.isCC.
export function parseGenericCC(content, opts) {
  opts = opts || {};
  const isCC = !!opts.isCC;
  const sourceLabel = isCC ? 'Credit Card' : 'Bank';

  const rows = parseCSV(content);
  const headerIdx = rows.findIndex(r =>
    r.some(c => c.toLowerCase().includes('date')) &&
    r.some(c => {
      const h = c.toLowerCase();
      return h.includes('amount') || h === 'debit' || h === 'credit'
        || h.includes('withdraw') || h.includes('deposit');
    })
  );
  if (headerIdx === -1) return [];

  const header = rows[headerIdx].map(h => h.toLowerCase().trim());
  const dateIdx = header.findIndex(h => h.includes('date'));
  const descIdx = header.findIndex(h =>
    h.includes('description') || h.includes('merchant') || h.includes('name')
    || h.includes('memo') || h.includes('payee')
  );
  const amtIdx = header.findIndex(h => h.includes('amount'));
  // Recognise both "Debit/Credit" (CC) and "Withdrawal/Deposit" (bank)
  // pairs. Treat them identically — both are split-column shapes.
  const debitIdx = header.findIndex(h =>
    h === 'debit' || h === 'debits' || h === 'withdrawal' || h === 'withdrawals'
  );
  const creditIdx = header.findIndex(h =>
    h === 'credit' || h === 'credits' || h === 'deposit' || h === 'deposits'
  );
  const typeIdx = header.findIndex(h =>
    h === 'type' || h.includes('transaction type')
  );

  const transactions = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[dateIdx]) continue;

    let cents, isDebit;

    if (debitIdx !== -1 && creditIdx !== -1) {
      // Split-column shape: take whichever side has a value.
      const debitCents = parseToCents(row[debitIdx]);
      const creditCents = parseToCents(row[creditIdx]);
      const dCents = Number.isFinite(debitCents) ? debitCents : 0;
      const cCents = Number.isFinite(creditCents) ? creditCents : 0;
      if (dCents === 0 && cCents === 0) continue;
      cents = Math.abs(dCents || cCents);
      isDebit = dCents > 0;
    } else if (amtIdx !== -1) {
      const rawCents = parseToCents(row[amtIdx]);
      if (!Number.isFinite(rawCents)) continue;
      cents = Math.abs(rawCents);

      // Prefer an explicit transaction-type column when present.
      if (typeIdx !== -1) {
        const ttype = (row[typeIdx] || '').toLowerCase();
        if (ttype.includes('credit') || ttype.includes('deposit') || ttype.includes('refund')) {
          isDebit = false;
        } else if (ttype.includes('debit') || ttype.includes('withdraw')
            || ttype.includes('purchase') || ttype.includes('fee')) {
          isDebit = true;
        } else {
          // Type column wasn't decisive — fall back to sign + format.
          isDebit = isCC ? rawCents > 0 : rawCents < 0;
        }
      } else {
        // No type column. Use format hint:
        //   CC: positive = charge (debit), negative = payment/credit
        //   Bank: positive = deposit (credit), negative = withdrawal (debit)
        isDebit = isCC ? rawCents > 0 : rawCents < 0;
      }
    } else {
      continue;
    }

    transactions.push({
      id: v4Fallback(),
      date: row[dateIdx],
      description: descIdx !== -1 ? row[descIdx] || '' : '',
      amountCents: cents,
      type: isDebit ? 'debit' : 'credit',
      source: sourceLabel,
      isBusiness: true,
    });
  }
  return transactions;
}

// ─── OFX / QFX PARSER ──────────────────────────────────────────
export function parseOFX(content) {
  const transactions = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];

    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\n]+)`, 'i'));
      return m ? m[1].trim() : '';
    };

    const trnType = getTag('TRNTYPE');
    const dateRaw = getTag('DTPOSTED');
    const amtCents = parseToCents(getTag('TRNAMT'));
    const name = getTag('NAME') || getTag('MEMO') || t('parser.ofx.fallback');

    if (!Number.isFinite(amtCents) || !dateRaw) continue;

    // Parse OFX date: 20250315120000 -> 03/15/25
    const y = dateRaw.slice(0, 4);
    const m = dateRaw.slice(4, 6);
    const d = dateRaw.slice(6, 8);
    const dateStr = `${m}/${d}/${y.slice(2)}`;

    transactions.push({
      id: v4Fallback(),
      date: dateStr,
      description: name,
      amountCents: Math.abs(amtCents),
      type: amtCents >= 0 ? 'credit' : 'debit',
      source: 'Bank',
      isBusiness: true,
    });
  }
  return transactions;
}

// ─── MASTER PARSER ──────────────────────────────────────────────
export function parseFile(content, filename = '') {
  const format = detectFormat(content, filename);

  switch (format) {
    case 'capital_one': return { format, source: 'Bank', transactions: parseCapitalOne(content) };
    case 'venmo': return { format, source: 'Venmo', transactions: parseVenmo(content) };
    case 'paypal': return { format, source: 'PayPal', transactions: parsePayPal(content) };
    case 'chase_cc': return { format, source: 'Credit Card', transactions: parseChaseCreditCard(content) };
    case 'citi_cc':
    case 'amex_cc': return { format, source: 'Credit Card', transactions: parseGenericCC(content, { isCC: true }) };
    // `generic` is the unknown-CSV fallback. Default to bank-convention
    // sign handling (positive = deposit) because most unrecognised files
    // are bank exports; CC issuers we know about are routed above.
    case 'generic': return { format, source: 'Bank', transactions: parseGenericCC(content, { isCC: false }) };
    case 'ofx': return { format, source: 'Bank', transactions: parseOFX(content) };
    default: return { format: 'unknown', source: 'Other', transactions: [] };
  }
}

// ─── HELPERS ────────────────────────────────────────────────────
//
// Description normalization. Bank statements include verbose,
// inconsistent strings for what are conceptually the same kind of
// transaction (Zelle inflow, Venmo cash-out, ATM withdrawal at
// Walgreens). We collapse the verbose forms into short Spanish
// phrases so the user sees clean, scannable descriptions in the
// Review screen — and so the merchantKey()-derived rules engine
// can produce stable keys for those normalized forms.
//
// We match on the English source-side patterns (which is what the
// bank actually writes) but emit Spanish strings on the right-hand
// side via t().
function cleanDescription(desc) {
  return desc
    .replace(/\s+/g, ' ')
    .replace(/Zelle money received from/i, t('parser.clean.zelleFrom'))
    .replace(/Zelle money sent to/i, t('parser.clean.zelleTo'))
    .replace(/Instant transfer received from VENMO - \w+/i, t('parser.clean.venmoTransferIn'))
    .replace(/Deposit from VENMO CASHOUT/i, t('parser.clean.venmoCashout'))
    .replace(/Withdrawal from PAYPAL to .+ INST XFER.*/i, t('parser.clean.paypalWithdrawal'))
    .replace(/Debit Card Purchase - /i, '')
    .replace(/ATM Withdrawal - WALGREENS # -X00 AX\d+ /i, t('parser.clean.atmWalgreens'))
    .trim();
}

// ─── DISPLAY HELPERS ────────────────────────────────────────────
//
// Translate a stored stable source key (e.g. 'Bank', 'Credit Card',
// 'Venmo') to a Spanish UI label. Unknown keys fall through to
// themselves so brand names like 'Stripe' still display sensibly.
export function sourceLabel(key) {
  switch (key) {
    case 'Bank': return t('source.bank');
    case 'Credit Card': return t('source.card');
    case 'Venmo': return t('source.venmo');
    case 'PayPal': return t('source.paypal');
    case 'Other': return t('source.other');
    default: return key || t('source.other');
  }
}

// Translate a format-detection key (e.g. 'chase_cc') to a Spanish UI
// label. Falls back to the key itself for unknown formats.
export function formatLabel(format) {
  const key = 'format.' + format;
  const translated = t(key);
  // `t()` returns the key when missing — treat that as no translation
  // and return the raw format so we never render "format.foo" in UI.
  return translated === key ? (format || t('format.unknown')) : translated;
}

