// Receipt photos — audit substantiation for deductions.
//
// WHY THIS EXISTS:
// The IRS can ask a creator to PROVE a deduction. A line in a bank
// statement ("AMAZON $240") isn't proof of a business purchase; the
// receipt is. Attaching a photo of the receipt to the transaction means
// that when a deduction is questioned (years later), the evidence is
// right there instead of lost in a shoebox.
//
// PRIVACY / STORAGE:
// Consistent with the rest of Tajada — nothing leaves the device. The
// picked image is COPIED into the app's private document directory
// (FileSystem.documentDirectory + 'receipts/'), so it survives even if
// the OS clears the picker's cache. We store only the local file URI on
// the transaction (`receiptUri`); no upload, no cloud, no telemetry.

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

var RECEIPT_DIR = FileSystem.documentDirectory + 'receipts/';

async function ensureDir() {
  try {
    var info = await FileSystem.getInfoAsync(RECEIPT_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(RECEIPT_DIR, { intermediates: true });
    }
  } catch (e) { /* makeDirectory throws if it already exists on some OS versions */ }
}

// Copy a picked asset into the app's private receipts dir, keyed by the
// transaction id. Returns the permanent local URI.
async function persistAsset(txnId, srcUri) {
  await ensureDir();
  var ext = '.jpg';
  var m = /\.(jpg|jpeg|png|heic|webp)$/i.exec(srcUri || '');
  if (m) ext = '.' + m[1].toLowerCase();
  var dest = RECEIPT_DIR + 'r_' + txnId + '_' + Date.now() + ext;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest;
}

// ─── Permission helpers ───────────────────────────────────────────
async function ensureCameraPermission() {
  try {
    var cur = await ImagePicker.getCameraPermissionsAsync();
    if (cur.granted) return true;
    var asked = await ImagePicker.requestCameraPermissionsAsync();
    return !!asked.granted;
  } catch (e) { return false; }
}

async function ensureLibraryPermission() {
  try {
    var cur = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (cur.granted) return true;
    var asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return !!asked.granted;
  } catch (e) { return false; }
}

// ─── Public API ───────────────────────────────────────────────────
//
// Each returns { ok, uri?, reason? }. `reason: 'denied'` lets the caller
// show a "turn on permission in Settings" message; `reason: 'canceled'`
// is a normal user cancel (no error UI needed).
export async function captureReceipt(txnId) {
  var granted = await ensureCameraPermission();
  if (!granted) return { ok: false, reason: 'denied' };
  try {
    var res = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: false });
    if (res.canceled || !res.assets || !res.assets[0]) return { ok: false, reason: 'canceled' };
    var uri = await persistAsset(txnId, res.assets[0].uri);
    return { ok: true, uri: uri };
  } catch (e) {
    return { ok: false, reason: 'error', message: e.message };
  }
}

export async function pickReceipt(txnId) {
  var granted = await ensureLibraryPermission();
  if (!granted) return { ok: false, reason: 'denied' };
  try {
    var res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, allowsEditing: false });
    if (res.canceled || !res.assets || !res.assets[0]) return { ok: false, reason: 'canceled' };
    var uri = await persistAsset(txnId, res.assets[0].uri);
    return { ok: true, uri: uri };
  } catch (e) {
    return { ok: false, reason: 'error', message: e.message };
  }
}

// Best-effort delete of a stored receipt file. Never throws — losing a
// reference is worse than leaving an orphan file behind.
export async function deleteReceiptFile(uri) {
  if (!uri || uri.indexOf(RECEIPT_DIR) !== 0) return;
  try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch (e) {}
}

// ─── Encrypted-backup integration ─────────────────────────────────
//
// PROBLEM: a backup stores the transaction's `receiptUri` (a device-
// local path) but NOT the image bytes. Restore on a new device leaves a
// dangling path — the receipt is gone exactly when an audit needs it.
// FIX: bundle the bytes (base64, keyed by filename) into the encrypted
// backup payload; on restore, write them into the new device's receipts
// dir and re-point each transaction at the local copy.

export var RECEIPTS_DIR = RECEIPT_DIR; // exposed for tests / callers

export function receiptBasename(uri) {
  return String(uri || '').split('/').pop();
}

// Read every receipt referenced by the sessions into a { name: base64 }
// map. Missing/unreadable files are skipped (so the backup never carries
// a broken reference). Keyed by basename, which embeds the txn id + a
// timestamp, so collisions across transactions don't happen in practice.
export async function gatherReceiptsForBackup(sessions) {
  var out = {};
  if (!Array.isArray(sessions)) return out;
  for (var i = 0; i < sessions.length; i++) {
    var txns = sessions[i] && sessions[i].transactions;
    if (!Array.isArray(txns)) continue;
    for (var j = 0; j < txns.length; j++) {
      var uri = txns[j] && txns[j].receiptUri;
      if (!uri) continue;
      var name = receiptBasename(uri);
      if (out[name]) continue;
      try {
        out[name] = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      } catch (e) { /* unreadable → omit; restore just won't have it */ }
    }
  }
  return out;
}

// Pure: re-point each transaction's receiptUri onto `dir` when its
// basename is in `names`. Returns NEW session/transaction objects (no
// mutation of the input). Extracted so it can be unit-tested without
// touching the filesystem.
export function rebaseReceiptUris(sessions, names, dir) {
  var have = Array.isArray(names) ? new Set(names) : new Set(Object.keys(names || {}));
  if (!Array.isArray(sessions)) return sessions;
  return sessions.map(function(sess) {
    if (!sess || !Array.isArray(sess.transactions)) return sess;
    return Object.assign({}, sess, {
      transactions: sess.transactions.map(function(t) {
        if (!t || !t.receiptUri) return t;
        var name = receiptBasename(t.receiptUri);
        if (have.has(name)) return Object.assign({}, t, { receiptUri: dir + name });
        return t;
      }),
    });
  });
}

// Write the bundled receipt bytes onto this device, then rebase the
// sessions' receiptUris onto the local receipts dir. Returns the updated
// sessions (caller persists them). Tolerant of an absent/empty map (old
// backups predate this feature) — returns sessions unchanged.
export async function restoreReceiptsFromBackup(sessions, receipts) {
  if (!receipts || typeof receipts !== 'object' || !Object.keys(receipts).length) {
    return sessions;
  }
  await ensureDir();
  var names = Object.keys(receipts);
  for (var i = 0; i < names.length; i++) {
    try {
      await FileSystem.writeAsStringAsync(RECEIPT_DIR + names[i], receipts[names[i]], { encoding: 'base64' });
    } catch (e) { /* skip this one; its txn will keep a dangling ref */ }
  }
  return rebaseReceiptUris(sessions, names, RECEIPT_DIR);
}
