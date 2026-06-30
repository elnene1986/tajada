// Home-office deduction — IRS simplified method (Schedule C line 30).
//
// WHY THIS EXISTS:
// Almost every creator works from home — editing, filming, admin — yet
// most never claim the home-office deduction because the "regular
// method" (Form 8829: actual % of rent, utilities, insurance,
// depreciation) is intimidating. The IRS SIMPLIFIED method exists
// exactly for this: a flat $5 per square foot of the space used
// regularly and exclusively for business, capped at 300 sq ft → a
// maximum $1,500 deduction. One number in, real money off taxable
// income.
//
// SCOPE / CAVEATS (kept out of the math, surfaced in the UI copy):
//   • The space must be used REGULARLY and EXCLUSIVELY for business.
//   • The simplified deduction can't exceed the business's gross income
//     (it can't create or deepen a loss). We don't enforce that here —
//     it's an at-a-glance estimate, and the disclaimer says so.
//   • You pick simplified OR regular per year, not both. Tajada only
//     models the simplified method.
//
// MONEY CONTRACT: integer cents out (see src/utils/money.js). $5/sqft is
// exact dollars, so cents math stays clean: sqft × 500.

import * as FileSystem from 'expo-file-system/legacy';
import { writeAtomic } from './fsAtomic';

var HOME_OFFICE_FILE = FileSystem.documentDirectory + 'tajada_home_office.json';

// ─── 2025 simplified-method constants ─────────────────────────────
// The IRS has held the simplified rate at $5/sqft and the 300 sqft cap
// since 2013; if that ever changes, update here.
export var RATE_CENTS_PER_SQFT = 500; // $5.00
export var MAX_SQFT = 300;
export var MAX_DEDUCTION_CENTS = RATE_CENTS_PER_SQFT * MAX_SQFT; // $1,500.00

// Deduction in integer cents for a given square footage. Negative/NaN
// → 0; anything over the cap is clamped to 300 sqft ($1,500).
export function deductionCents(sqft) {
  var n = Number(sqft);
  if (!isFinite(n) || n <= 0) return 0;
  var clamped = Math.min(Math.floor(n), MAX_SQFT);
  return clamped * RATE_CENTS_PER_SQFT;
}

// ─── Persisted state ──────────────────────────────────────────────
// Single annual value (square footage). Stored globally like mileage,
// surfaced per-session in Summary.
export async function getHomeOffice() {
  try {
    var info = await FileSystem.getInfoAsync(HOME_OFFICE_FILE);
    if (!info.exists) return { sqft: 0 };
    var parsed = JSON.parse(await FileSystem.readAsStringAsync(HOME_OFFICE_FILE));
    var s = Number(parsed && parsed.sqft);
    return { sqft: isFinite(s) && s > 0 ? s : 0 };
  } catch (e) {
    return { sqft: 0 };
  }
}

export async function setHomeOfficeSqft(sqft) {
  var n = Number(sqft);
  var clean = isFinite(n) && n > 0 ? Math.min(Math.floor(n), MAX_SQFT) : 0;
  try {
    await writeAtomic(HOME_OFFICE_FILE, JSON.stringify({ sqft: clean, updatedAt: new Date().toISOString() }));
  } catch (e) { /* non-fatal — in-memory value stands */ }
  return { sqft: clean };
}
