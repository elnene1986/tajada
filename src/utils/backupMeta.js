// Tiny cleartext metadata about the user's backup history.
//
// This file is INTENTIONALLY not encrypted — it stores no transaction
// data, only "when did you last back up?" so the Home screen can nudge
// the user when their backup is stale. Nothing here is sensitive.
//
// Lives separately from the encrypted backup envelope (which the user
// stores wherever they want via the share sheet); this is just local
// state for the UI.

import * as FileSystem from 'expo-file-system/legacy';
import { writeAtomic } from './fsAtomic';

var META_FILE = FileSystem.documentDirectory + 'tajada_backup_meta.json';

export async function readBackupMeta() {
  try {
    var info = await FileSystem.getInfoAsync(META_FILE);
    if (!info.exists) return { lastBackupAt: null };
    var raw = await FileSystem.readAsStringAsync(META_FILE);
    var parsed = JSON.parse(raw);
    return {
      lastBackupAt: parsed.lastBackupAt || null,
    };
  } catch (e) {
    return { lastBackupAt: null };
  }
}

export async function recordBackupSuccess() {
  var meta = { lastBackupAt: new Date().toISOString() };
  try {
    await writeAtomic(META_FILE, JSON.stringify(meta));
  } catch (e) { /* non-fatal; UI just won't get the freshness hint */ }
  return meta;
}

// Days since the given ISO timestamp, or null if absent. Floored —
// "0 days ago" means earlier today, "1 day" means yesterday.
export function daysSince(iso) {
  if (!iso) return null;
  var ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
