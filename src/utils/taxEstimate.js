// Tax "set aside" estimator — Schedule C self-employment math.
//
// WHAT THIS ANSWERS:
// A creator's #1 question isn't "what are my totals?" — Tajada already
// shows those. It's "how much of this do I actually owe, so I don't get
// surprised in April?" This module turns net business profit into a
// recommended amount to set aside, using the HYBRID approach:
//
//   1. Self-employment (SE) tax — computed precisely. It's a flat
//      15.3% (12.4% Social Security + 2.9% Medicare) applied to 92.35%
//      of net profit. The SS portion stops at the annual wage base; the
//      Medicare portion has no cap. This is reliable for creators, so we
//      compute it exactly rather than guessing.
//   2. Federal income tax — approximated. We can't know the user's
//      filing status or other household income without asking (and the
//      privacy ethos says don't), so we apply a single user-adjustable
//      marginal rate to the income that's actually taxable after the
//      "deduction for one-half of SE tax." The default is the 12%
//      bracket, the most common for creators at this income level.
//
// The output is explicitly an ESTIMATE, not tax advice. The UI labels it
// as such and lets the user move the federal rate.
//
// MONEY CONTRACT:
// Inputs and outputs are integer cents (see src/utils/money.js). All
// intermediate multiplications round back to integer cents immediately
// so nothing leaks float drift into a displayed dollar figure.

import * as FileSystem from 'expo-file-system/legacy';
import { writeAtomic } from './fsAtomic';

// ─── 2025 tax-year constants ──────────────────────────────────────
//
// ⚠️ ANNUAL ROLLOVER CHECKLIST (do this each year when the IRS/SSA
// publish the new figures, usually late December):
//   1. This file: bump TAX_YEAR, SS_WAGE_BASE_CENTS, and review
//      FED_RATE_PRESETS against the new brackets.
//   2. src/utils/mileage.js: bump DEFAULT_RATE_PER_MILE to the new IRS
//      standard mileage rate.
//   3. Nothing else hard-codes the year — SummaryScreen imports
//      TAX_YEAR from here (single source of truth). Don't reintroduce a
//      literal '2025' anywhere.
//
// TAX_YEAR is the single source of truth for the displayed/exported tax
// year across the app. Keeping the figures named + dated makes the
// annual bump a short, checklist-driven change rather than a hunt.
export const TAX_YEAR = 2025;
var SE_TAXABLE_FRACTION = 0.9235; // net earnings from self-employment
var SS_RATE = 0.124;              // Social Security portion of SE tax
var MEDICARE_RATE = 0.029;        // Medicare portion (no wage cap)
var SS_WAGE_BASE_CENTS = 17610000; // $176,100 (2025) — SS portion cap

// Federal marginal-rate presets offered in the UI. These mirror the
// 2025 single-filer ordinary brackets a creator is most likely to land
// in; the user picks the one closest to their situation.
export const FED_RATE_PRESETS = [0.10, 0.12, 0.22, 0.24];
export const DEFAULT_FED_RATE = 0.12;

// ─── Core estimate ────────────────────────────────────────────────
//
// netProfitCents — business income minus business expenses minus any
//   above-the-line Schedule C deductions already taken (mileage, home
//   office). Should be the final Schedule C net profit, in cents.
// fedRate — user's chosen federal marginal rate (e.g. 0.12).
//
// Returns an all-integer-cents breakdown plus the effective set-aside
// fraction of net profit (0..1) for display as a percentage.
export function estimateTaxes(netProfitCents, fedRate) {
  var rate = Number.isFinite(fedRate) ? fedRate : DEFAULT_FED_RATE;
  var net = Number.isFinite(netProfitCents) ? Math.round(netProfitCents) : 0;

  // No positive profit → nothing to set aside. (A net loss carries its
  // own tax treatment that's well beyond an at-a-glance estimate.)
  if (net <= 0) {
    return {
      netProfitCents: net,
      seTaxCents: 0,
      fedTaxCents: 0,
      totalCents: 0,
      fraction: 0,
      fedRate: rate,
    };
  }

  // SE tax — on 92.35% of net profit, SS portion capped at the wage base.
  var seBaseCents = Math.round(net * SE_TAXABLE_FRACTION);
  var ssBaseCents = Math.min(seBaseCents, SS_WAGE_BASE_CENTS);
  var ssCents = Math.round(ssBaseCents * SS_RATE);
  var medicareCents = Math.round(seBaseCents * MEDICARE_RATE);
  var seTaxCents = ssCents + medicareCents;

  // Federal income tax — applied to net profit reduced by the
  // deduction for one-half of SE tax (an above-the-line adjustment).
  var halfSeCents = Math.round(seTaxCents / 2);
  var fedBaseCents = Math.max(0, net - halfSeCents);
  var fedTaxCents = Math.round(fedBaseCents * rate);

  var totalCents = seTaxCents + fedTaxCents;

  return {
    netProfitCents: net,
    seTaxCents: seTaxCents,
    fedTaxCents: fedTaxCents,
    totalCents: totalCents,
    fraction: totalCents / net, // 0..1, for "≈24% of net profit"
    fedRate: rate,
  };
}

// Whole-number percent for display: 0.2381 → 24.
export function fractionToPct(fraction) {
  if (!Number.isFinite(fraction) || fraction <= 0) return 0;
  return Math.round(fraction * 100);
}

// ─── Persisted preference: the user's chosen federal rate ─────────
// Tiny cleartext file — no transaction data, just the slider position
// so the estimate reads the same every time the user opens Summary.
var PREFS_FILE = FileSystem.documentDirectory + 'tajada_tax_prefs.json';

export async function getTaxPrefs() {
  try {
    var info = await FileSystem.getInfoAsync(PREFS_FILE);
    if (!info.exists) return { fedRate: DEFAULT_FED_RATE };
    var parsed = JSON.parse(await FileSystem.readAsStringAsync(PREFS_FILE));
    var r = parsed && parsed.fedRate;
    return { fedRate: Number.isFinite(r) ? r : DEFAULT_FED_RATE };
  } catch (e) {
    return { fedRate: DEFAULT_FED_RATE };
  }
}

export async function setFedRate(fedRate) {
  var rate = Number.isFinite(fedRate) ? fedRate : DEFAULT_FED_RATE;
  try {
    await writeAtomic(PREFS_FILE, JSON.stringify({ fedRate: rate }));
  } catch (e) { /* non-fatal — UI keeps the in-memory value */ }
  return { fedRate: rate };
}
