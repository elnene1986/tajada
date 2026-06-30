// 1099-K reconciliation — catch the gross-vs-net trap.
//
// THE PROBLEM:
// Payment platforms (Stripe, PayPal, Venmo, OnlyFans's processor, etc.)
// file Form 1099-K with the IRS reporting GROSS payment volume — the
// total before their fees were taken out, and including amounts that
// were later refunded. The creator only ever SEES the net that landed
// in their bank. Two ways this bites:
//   1. The creator reports the net they received → it's LESS than the
//      1099-K gross the IRS already has on file → automated mismatch
//      notice (CP2000).
//   2. The creator reports the gross to be safe → but forgets to deduct
//      the platform fees separately → overpays tax on money they never
//      kept.
// The right move is: report at least the 1099-K gross as income, and
// deduct the fees as a business expense. This module surfaces the gap so
// the creator (and their contador) can see it and handle it on purpose.
//
// MONEY CONTRACT: integer cents (see src/utils/money.js). The user types
// the gross from each 1099-K they received; parseToCents converts at the
// input boundary.

import * as FileSystem from 'expo-file-system/legacy';
import { writeAtomic } from './fsAtomic';

var FILE = FileSystem.documentDirectory + 'tajada_1099k.json';

function uid() {
  return 'k-' + Date.now() + '-' + Math.floor(Math.random() * 1000000).toString(16);
}

async function readFile() {
  try {
    var info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return { entries: [] };
    var parsed = JSON.parse(await FileSystem.readAsStringAsync(FILE));
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch (e) {
    return { entries: [] };
  }
}

async function writeFile(state) {
  await writeAtomic(FILE, JSON.stringify(state));
}

export async function get1099Entries() {
  return (await readFile()).entries;
}

// Entry shape: { id, issuer (string), grossCents (integer), createdAt }
export async function save1099Entry(entry) {
  if (!entry || !entry.issuer || !String(entry.issuer).trim()) {
    throw new Error('1099_issuer_required');
  }
  if (!Number.isFinite(entry.grossCents) || entry.grossCents <= 0) {
    throw new Error('1099_invalid_amount');
  }
  var state = await readFile();
  var record = {
    id: entry.id || uid(),
    issuer: String(entry.issuer).trim().slice(0, 60),
    grossCents: Math.round(entry.grossCents),
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  var idx = state.entries.findIndex(function(e) { return e.id === record.id; });
  if (idx !== -1) state.entries[idx] = record;
  else state.entries.unshift(record);
  await writeFile(state);
  return record;
}

export async function delete1099Entry(id) {
  var state = await readFile();
  state.entries = state.entries.filter(function(e) { return e.id !== id; });
  await writeFile(state);
  return state.entries;
}

// ─── Reconciliation math ──────────────────────────────────────────
export function total1099Cents(entries) {
  if (!entries) return 0;
  return entries.reduce(function(sum, e) {
    return sum + (Number.isFinite(e.grossCents) ? e.grossCents : 0);
  }, 0);
}

// Compare the recorded business income against the sum of the 1099-K
// gross amounts. `deltaCents` = recorded − gross:
//   • delta ≥ 0 → recorded income already covers what the platforms
//     reported (good — no mismatch risk).
//   • delta < 0 → the platforms reported MORE than was recorded; the
//     shortfall is usually fees withheld before deposit (deduct them)
//     or missing/unimported deposits (import them). Either way the
//     creator should report at least the gross.
export function reconcile(recordedIncomeCents, entries) {
  var gross = total1099Cents(entries);
  var recorded = Number.isFinite(recordedIncomeCents) ? recordedIncomeCents : 0;
  var delta = recorded - gross;
  return {
    grossCents: gross,
    recordedCents: recorded,
    deltaCents: delta,
    covered: delta >= 0,
  };
}
