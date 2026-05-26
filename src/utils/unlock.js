// Local persistence of the user's "I paid" state.
//
// One-time IAP for the Tajada export feature. After a successful
// purchase (or restore-from-Apple/Google), we write a single small
// file recording that this device is unlocked. Every PDF / CSV
// export checks this file before proceeding.
//
// What we DON'T do:
//   - Server-side receipt verification. Tajada has no backend by
//     design. For a $14.99 non-consumable to a niche audience the
//     piracy risk is low; for higher-stakes purchases this would
//     need a verification server.
//   - Encrypt this file. There's nothing sensitive in it — just a
//     timestamp + product ID + source. An attacker with file-system
//     access on a jailbroken phone could write a fake unlock, but
//     that same attacker could just patch the JS. The honest stance:
//     this is a courtesy gate, not DRM.
//
// What we DO:
//   - Persist the original purchase metadata (transactionId,
//     transactionDate, productId) so a future support request can
//     be cross-checked against the App Store / Play Console.
//   - Expose revoke() for development and for the user (in a future
//     "I sold this phone" flow, if we add one).

import * as FileSystem from 'expo-file-system/legacy';

var UNLOCK_FILE = FileSystem.documentDirectory + 'tajada_unlock.json';

// ─── Read current unlock state ────────────────────────────────────
export async function getUnlockState() {
  try {
    var info = await FileSystem.getInfoAsync(UNLOCK_FILE);
    if (!info.exists) return { unlocked: false };
    var raw = await FileSystem.readAsStringAsync(UNLOCK_FILE);
    var parsed = JSON.parse(raw);
    return {
      unlocked: !!parsed.unlocked,
      purchasedAt: parsed.purchasedAt || null,
      productId: parsed.productId || null,
      transactionId: parsed.transactionId || null,
      source: parsed.source || null, // 'purchase' | 'restore' | 'dev'
    };
  } catch (e) {
    return { unlocked: false };
  }
}

export async function isUnlocked() {
  var s = await getUnlockState();
  return s.unlocked;
}

// ─── Record a purchase / restore ──────────────────────────────────
//
// `purchase` is the object returned by the IAP provider. We pull out
// the fields we want to persist and ignore the rest (some providers
// include long base64 receipts we don't need).

export async function recordPurchase(purchase, source) {
  var state = {
    unlocked: true,
    purchasedAt: (purchase && purchase.transactionDate)
      ? new Date(purchase.transactionDate).toISOString()
      : new Date().toISOString(),
    productId: (purchase && purchase.productId) || null,
    transactionId: (purchase && purchase.transactionId) || null,
    source: source || 'purchase',
  };
  await FileSystem.writeAsStringAsync(UNLOCK_FILE, JSON.stringify(state));
  return state;
}

// ─── Revoke (dev / re-test only) ─────────────────────────────────
export async function revokeUnlock() {
  try {
    await FileSystem.deleteAsync(UNLOCK_FILE, { idempotent: true });
  } catch (e) { /* non-fatal */ }
}
