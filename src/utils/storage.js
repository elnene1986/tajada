import * as FileSystem from 'expo-file-system/legacy';
import { writeAtomic } from './fsAtomic';
import { dollarsToCents } from './money';

// Tajada-branded storage path. Pre-rebrand installs wrote to a file
// named after the original project (splitledger_sessions.json); the
// migration helper below quietly moves that data into the new path
// on first read so existing test installs aren't orphaned.
const STORAGE_FILE = FileSystem.documentDirectory + 'tajada_sessions.json';
const LEGACY_STORAGE_FILE = FileSystem.documentDirectory + 'splitledger_sessions.json';

// One-time rename. Returns nothing — designed to be best-effort and
// idempotent: if the new file already exists or the old one doesn't,
// it's a no-op. Failures are swallowed because losing the migration
// is recoverable (the old file stays in place), but throwing here
// would block the entire read path.
async function migrateLegacyStorage() {
  try {
    const newInfo = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (newInfo.exists) return;
    const oldInfo = await FileSystem.getInfoAsync(LEGACY_STORAGE_FILE);
    if (!oldInfo.exists) return;
    await FileSystem.moveAsync({ from: LEGACY_STORAGE_FILE, to: STORAGE_FILE });
  } catch (e) { /* non-fatal */ }
}

// One-time SHAPE migration: pre-cents installs stored transaction
// amounts as `amount` (float dollars). Current code uses `amountCents`
// (integer cents). On read, walk every transaction in every session;
// if any still has `amount` and no `amountCents`, convert and drop the
// old field. Returns true iff anything was changed so the caller can
// write the migrated data back to disk (atomically).
//
// Idempotent: sessions where everything already has amountCents
// short-circuit immediately. Safe to call on every read.
function migrateAmountsToCents(sessions) {
  if (!Array.isArray(sessions)) return { sessions: [], changed: false };
  var changed = false;
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (!s || !Array.isArray(s.transactions)) continue;
    for (var j = 0; j < s.transactions.length; j++) {
      var t = s.transactions[j];
      if (!t) continue;
      if (typeof t.amountCents === 'number') continue; // already migrated
      if (typeof t.amount === 'number') {
        t.amountCents = dollarsToCents(t.amount);
        delete t.amount;
        changed = true;
      }
    }
  }
  return { sessions: sessions, changed: changed };
}

export async function getSessions() {
  try {
    await migrateLegacyStorage();
    const info = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(STORAGE_FILE);
    const parsed = JSON.parse(raw);
    // Convert any pre-cents transactions before handing the array out.
    // If anything was actually converted, persist the new shape so the
    // migration runs at most once per session lifetime.
    const migrated = migrateAmountsToCents(parsed);
    if (migrated.changed) {
      try {
        await writeAtomic(STORAGE_FILE, JSON.stringify(migrated.sessions));
      } catch (e) {
        // Persisting the migration failed (rare — disk full?). Not
        // fatal: the in-memory copy is still cents, so this call
        // returns correct data, and the migration will simply re-run
        // on the next read.
      }
    }
    return migrated.sessions;
  } catch (e) {
    return [];
  }
}

export async function saveSession(session) {
  const sessions = await getSessions();
  const idx = sessions.findIndex(function(s) { return s.id === session.id; });
  if (idx !== -1) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  await writeAtomic(STORAGE_FILE, JSON.stringify(sessions));
  return sessions;
}

export async function deleteSession(sessionId) {
  const sessions = await getSessions();
  const filtered = sessions.filter(function(s) { return s.id !== sessionId; });
  await writeAtomic(STORAGE_FILE, JSON.stringify(filtered));
  return filtered;
}

// ─── Bulk replace (used by the restore-from-backup flow) ──────────
//
// Atomically replace the entire session list with the given array.
// Pass [] to wipe. The backup/restore flow calls this with the
// decrypted session list from the user's backup file.
//
// Old backups (created before the cents refactor) carry transactions
// shaped { amount: <float dollars> }; we migrate them to amountCents
// here so the restored data lands in the new shape without having to
// wait for the next getSessions() read.

export async function setAllSessions(sessions) {
  var arr = Array.isArray(sessions) ? sessions : [];
  var migrated = migrateAmountsToCents(arr);
  await writeAtomic(STORAGE_FILE, JSON.stringify(migrated.sessions));
  return migrated.sessions;
}
