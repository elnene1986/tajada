import * as FileSystem from 'expo-file-system/legacy';

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

export async function getSessions() {
  try {
    await migrateLegacyStorage();
    const info = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(STORAGE_FILE);
    return JSON.parse(raw);
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
  await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(sessions));
  return sessions;
}

export async function deleteSession(sessionId) {
  const sessions = await getSessions();
  const filtered = sessions.filter(function(s) { return s.id !== sessionId; });
  await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(filtered));
  return filtered;
}

// ─── Bulk replace (used by the restore-from-backup flow) ──────────
//
// Atomically replace the entire session list with the given array.
// Pass [] to wipe. The backup/restore flow calls this with the
// decrypted session list from the user's backup file.

export async function setAllSessions(sessions) {
  var arr = Array.isArray(sessions) ? sessions : [];
  await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(arr));
  return arr;
}
