// Atomic file writes for on-device JSON storage.
//
// PROBLEM: A direct FileSystem.writeAsStringAsync() to the live file
// is NOT atomic. If the app is killed mid-write — iOS backgrounding,
// user force-quits, low-memory termination, storage exhaustion — the
// target file is left in a partial / corrupted state. The next read
// then either throws JSON.parse or, with our defensive try/catch
// patterns, silently returns [] / {} and the user loses all their data.
//
// SOLUTION: Write to a sibling .tmp file first, then ask the OS to
// rename it onto the target. The rename is a single atomic syscall
// when source and destination live on the same filesystem — which
// they always do here, because everything goes through
// FileSystem.documentDirectory. Either the rename happens fully and
// the new content is in place, or it doesn't and the original file
// is intact. The user can never end up with a half-written JSON blob.
//
// USAGE:
//   await writeAtomic(path, JSON.stringify(data));
//
// All on-device storage modules (storage, rules, unlock, mileage,
// backupMeta) go through this. Backup envelopes that get handed to
// expo-sharing go to the *cache* directory and are ephemeral — those
// don't need atomic writes because losing a cache file is harmless.

import * as FileSystem from 'expo-file-system/legacy';

export async function writeAtomic(path, content) {
  var tmp = path + '.tmp';

  // Clean up any stale .tmp left over from a previous failed write.
  // Idempotent — no-op if the file doesn't exist. We do this BEFORE
  // the new write so the moveAsync below doesn't fail with a "file
  // already exists" error on some platforms.
  try {
    await FileSystem.deleteAsync(tmp, { idempotent: true });
  } catch (e) { /* non-fatal — moveAsync would overwrite anyway */ }

  // Write the new content to the temp path. If THIS throws (out of
  // disk, permission denied, etc.) the original file at `path` is
  // still untouched, so the user's data is safe.
  await FileSystem.writeAsStringAsync(tmp, content);

  // Atomic OS-level rename. Either the new file replaces the old one
  // completely, or this throws and the original is intact.
  await FileSystem.moveAsync({ from: tmp, to: path });
}
