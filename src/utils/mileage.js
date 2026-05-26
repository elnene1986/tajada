// Manual mileage tracker for Schedule C Line 9 (Car and truck).
//
// PROBLEM: creators drive to shoot locations, conferences, equipment
// pickups, post-office runs for merch, errands related to their
// business — all deductible at the IRS standard mileage rate. Without
// a tracker, that deduction is left on the table (or guessed at
// year-end in a way that won't survive an audit).
//
// APPROACH: simple log. Each entry is a single trip: date, miles,
// purpose, optional round-trip flag. The user adds them as they
// happen (or in batches). At tax time the screen sums miles × the
// current IRS standard mileage rate.
//
// WHY NOT GPS TRACKING: the cheap apps (Stride, MileIQ) track
// continuously via GPS. That requires background location permission,
// constant battery drain, and a privacy story (where did the user
// drive on Tuesday at 9pm?). Tajada's privacy posture is "we know
// nothing about you" — automatic tracking would break that. Manual
// entry is the right trade-off for an on-device, no-server app.
//
// IRS SUBSTANTIATION: a mileage log must include the date, miles,
// and business purpose for each trip (IRS Pub 463). This module
// requires all three.

import * as FileSystem from 'expo-file-system/legacy';

var MILEAGE_FILE = FileSystem.documentDirectory + 'tajada_mileage.json';

// IRS standard mileage rate for business use. The IRS publishes the
// next year's rate in late December. Update this constant annually,
// or expose a setter for Pablo to bump without a code change.
//   2024: $0.67 / mile
//   2025: $0.70 / mile
//   2026: TBD (defaulting to 2025 rate until IRS announces)
export var DEFAULT_RATE_PER_MILE = 0.70;

// ─── Read ─────────────────────────────────────────────────────────
async function readFile() {
  try {
    var info = await FileSystem.getInfoAsync(MILEAGE_FILE);
    if (!info.exists) return { entries: [], ratePerMile: DEFAULT_RATE_PER_MILE };
    var raw = await FileSystem.readAsStringAsync(MILEAGE_FILE);
    var parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      ratePerMile: typeof parsed.ratePerMile === 'number' ? parsed.ratePerMile : DEFAULT_RATE_PER_MILE,
    };
  } catch (e) {
    return { entries: [], ratePerMile: DEFAULT_RATE_PER_MILE };
  }
}

async function writeFile(state) {
  await FileSystem.writeAsStringAsync(MILEAGE_FILE, JSON.stringify(state));
}

export async function getMileageEntries() {
  var state = await readFile();
  return state.entries;
}

export async function getMileageState() {
  return await readFile();
}

export async function getRatePerMile() {
  var state = await readFile();
  return state.ratePerMile;
}

export async function setRatePerMile(rate) {
  var state = await readFile();
  state.ratePerMile = Number(rate) || DEFAULT_RATE_PER_MILE;
  await writeFile(state);
  return state.ratePerMile;
}

// ─── Add / update / delete ────────────────────────────────────────
//
// Entry shape:
//   { id, date (MM/DD/YYYY), miles (number), purpose (string),
//     roundTrip (bool), createdAt (ISO) }
//
// `miles` is stored as the user-entered one-way miles; round-trip
// doubling happens at totaling time so the user can flip the
// round-trip toggle after the fact without re-doing math.

function uid() {
  return 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000000).toString(16);
}

export async function saveMileageEntry(entry) {
  if (!entry || !entry.date || !entry.purpose) {
    throw new Error('mileage_entry_incomplete');
  }
  var miles = Number(entry.miles);
  if (!isFinite(miles) || miles <= 0) {
    throw new Error('mileage_entry_invalid_miles');
  }
  var state = await readFile();
  var record = {
    id: entry.id || uid(),
    date: String(entry.date),
    miles: miles,
    purpose: String(entry.purpose).slice(0, 120),
    roundTrip: !!entry.roundTrip,
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  var idx = state.entries.findIndex(function(e) { return e.id === record.id; });
  if (idx !== -1) state.entries[idx] = record;
  else state.entries.unshift(record);
  await writeFile(state);
  return record;
}

export async function deleteMileageEntry(id) {
  var state = await readFile();
  state.entries = state.entries.filter(function(e) { return e.id !== id; });
  await writeFile(state);
  return state.entries;
}

// ─── Totals ──────────────────────────────────────────────────────
//
// `effectiveMiles(entry)` = entry.miles × 2 if roundTrip else entry.miles.

export function effectiveMiles(entry) {
  if (!entry) return 0;
  var m = Number(entry.miles) || 0;
  return entry.roundTrip ? m * 2 : m;
}

export function totalMiles(entries) {
  if (!entries) return 0;
  return entries.reduce(function(sum, e) { return sum + effectiveMiles(e); }, 0);
}

export function totalDeduction(entries, ratePerMile) {
  var rate = typeof ratePerMile === 'number' ? ratePerMile : DEFAULT_RATE_PER_MILE;
  return totalMiles(entries) * rate;
}

// ─── Filter by year ──────────────────────────────────────────────
//
// The session/summary screen wants to surface "this tax year's"
// mileage deduction. Entries store the user-entered date in MM/DD/YYYY
// (or MM/DD/YY) — extract the year from the last slash-separated
// segment, normalizing 2-digit years to 20YY (the IRS doesn't expect
// us to handle 1999-era mileage).

export function entriesForYear(entries, year) {
  if (!entries || !year) return [];
  var y = String(year);
  return entries.filter(function(e) {
    var parts = String(e.date || '').split('/');
    if (parts.length < 3) return false;
    var entryYear = parts[2];
    if (entryYear.length === 2) entryYear = '20' + entryYear;
    return entryYear === y;
  });
}
