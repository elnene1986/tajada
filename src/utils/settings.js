// App settings — the small persisted prefs the Settings screen owns.
//
// v1 holds exactly one thing: the effective tax rate used by the
// "deducciones potenciales" counter (brief 06 / decision B3). It exists
// as its own module — rather than a field bolted onto deductions.js —
// so deductions.js stays PURE and synchronous (it's heavily unit-tested
// and must not reach for storage). The counter's math takes the rate as
// an argument; this module is where the chosen rate is read/written.
//
// Same persistence shape as homeOffice.js / mileage.js: one small JSON
// file in documentDirectory, written atomically, tolerant of a missing
// or corrupt file (falls back to defaults).

import * as FileSystem from 'expo-file-system/legacy';
import { writeAtomic } from './fsAtomic';
import { EFFECTIVE_RATE } from './deductions';

var SETTINGS_FILE = FileSystem.documentDirectory + 'tajada_settings.json';

// Read persisted settings. Never throws; unknown/invalid values fall
// back to the module defaults so a bad file can't wedge the app.
export async function getSettings() {
  try {
    var info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!info.exists) return { effectiveRate: EFFECTIVE_RATE };
    var parsed = JSON.parse(await FileSystem.readAsStringAsync(SETTINGS_FILE));
    var r = Number(parsed && parsed.effectiveRate);
    return { effectiveRate: (isFinite(r) && r > 0 && r < 1) ? r : EFFECTIVE_RATE };
  } catch (e) {
    return { effectiveRate: EFFECTIVE_RATE };
  }
}

// Persist the effective rate. Invalid input falls back to the default so
// the stored value is always a sane multiplier. Returns the saved shape.
export async function setEffectiveRate(rate) {
  var n = Number(rate);
  var clean = (isFinite(n) && n > 0 && n < 1) ? n : EFFECTIVE_RATE;
  var current = await getSettings();
  var next = Object.assign({}, current, { effectiveRate: clean, updatedAt: new Date().toISOString() });
  try {
    await writeAtomic(SETTINGS_FILE, JSON.stringify(next));
  } catch (e) { /* non-fatal — in-memory value stands */ }
  return next;
}
