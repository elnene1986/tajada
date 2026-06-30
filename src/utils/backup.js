// Encrypted backup / restore for Tajada.
//
// PROBLEM: Tajada is on-device-only by design. That's great for privacy
// but cruel when a creator drops their phone in October and loses 9
// months of classifications. This module solves that without giving
// up the privacy story.
//
// APPROACH: Bundle all on-device state (sessions + rules + onboarding
// flag) into a single JSON snapshot, encrypt it with AES-256-GCM using
// a key derived from a user-controlled passphrase (PBKDF2-SHA256,
// 250k iterations), and produce a portable envelope file the user can
// store wherever they want: iCloud Drive, Google Drive, email it to
// themselves, AirDrop. We never see the passphrase or the data; if
// they forget the passphrase, the backup is unrecoverable. That's the
// trade-off — zero-knowledge is the point.
//
// THREAT MODEL:
//   ✓ Lost phone → restore on new phone from cloud copy of backup file
//   ✓ Backup file leaks → useless without passphrase
//   ✓ Attacker tampers with backup → GCM auth tag fails on decrypt
//   ✗ User picks weak passphrase → brute-forceable; we enforce a
//     minimum length but cannot guarantee strength
//   ✗ User forgets passphrase → unrecoverable by design
//
// FILE FORMAT (versioned envelope, JSON-shaped for portability):
//   {
//     format: 'tajada-backup',
//     schemaVersion: 2,
//     createdAt: ISO 8601,
//     kdf:     { algo: 'pbkdf2-sha256', iterations, salt: base64(16B) },
//     cipher:  { algo: 'aes-256-gcm',   nonce: base64(12B) },
//     payload: base64(ciphertext + GCM auth tag),
//   }
//
// The encrypted payload (decrypted `state`) is:
//   { sessions, rules, hint?, receipts? }
// where `receipts` (added in schemaVersion 2) is a { filename: base64 }
// map of the receipt image bytes referenced by transactions, so a
// restore on a new device can rebuild the images instead of leaving
// dangling file references. Backups without it (v1) restore fine — the
// receipts step is simply skipped.

import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as Crypto from 'expo-crypto';

export var BACKUP_FORMAT = 'tajada-backup';
export var SCHEMA_VERSION = 2;
var PBKDF2_ITERATIONS = 250000;
var SALT_BYTES = 16;
var NONCE_BYTES = 12;
export var MIN_PASSPHRASE_LENGTH = 12;

// ─── Encoding helpers ─────────────────────────────────────────────
// React Native 0.71+ ships btoa/atob globally; we still wrap them so
// failure surfaces a clear error rather than a ReferenceError.

function utf8Encode(s) { return new TextEncoder().encode(s); }
function utf8Decode(b) { return new TextDecoder().decode(b); }

function bytesToBase64(bytes) {
  if (typeof btoa !== 'function') throw new Error('btoa_unavailable');
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(s) {
  if (typeof atob !== 'function') throw new Error('atob_unavailable');
  var bin = atob(s);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── Passphrase validation ────────────────────────────────────────
//
// Length is the cheapest, most effective hurdle for the kind of
// passphrase an end user will pick. We rate-limit via PBKDF2 cost
// (250k iterations ≈ 200ms per attempt on a phone) so even short
// passphrases aren't trivially brute-forceable.

export function validatePassphrase(passphrase) {
  if (!passphrase) return { ok: false, reason: 'empty' };
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return { ok: false, reason: 'too_short', minLength: MIN_PASSPHRASE_LENGTH };
  }
  return { ok: true };
}

// Rough strength estimate for UI feedback. Not used for enforcement
// (length alone is the gate); just helps the user pick something
// better than "password123".
export function passphraseStrength(passphrase) {
  if (!passphrase) return 0;
  var score = 0;
  if (passphrase.length >= 12) score += 1;
  if (passphrase.length >= 16) score += 1;
  if (passphrase.length >= 24) score += 1;
  if (/[a-z]/.test(passphrase)) score += 1;
  if (/[A-Z]/.test(passphrase)) score += 1;
  if (/[0-9]/.test(passphrase)) score += 1;
  if (/[^\w\s]/.test(passphrase)) score += 1;
  if (/\s/.test(passphrase)) score += 1; // passphrases > passwords
  return Math.min(4, Math.floor(score / 2));
}

// ─── Encrypt ──────────────────────────────────────────────────────

export async function createBackup(state, passphrase) {
  var check = validatePassphrase(passphrase);
  if (!check.ok) throw new Error('passphrase_' + check.reason);

  // expo-crypto.getRandomBytesAsync returns Uint8Array — exactly what
  // @noble/ciphers wants. We never pull from Math.random.
  var salt = await Crypto.getRandomBytesAsync(SALT_BYTES);
  var nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);

  // Derive 256-bit AES key from the passphrase + per-backup salt.
  var key = pbkdf2(sha256, utf8Encode(passphrase), salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });

  // AES-GCM encrypts AND authenticates; the tag is appended to the
  // ciphertext by @noble/ciphers and verified on decrypt. A wrong
  // passphrase derives a wrong key → tag verification throws.
  var plaintext = utf8Encode(JSON.stringify(state));
  var ciphertext = gcm(key, nonce).encrypt(plaintext);

  return JSON.stringify({
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    hint: state.hint || undefined,
    kdf: {
      algo: 'pbkdf2-sha256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      algo: 'aes-256-gcm',
      nonce: bytesToBase64(nonce),
    },
    payload: bytesToBase64(ciphertext),
  }, null, 2);
}

// ─── Inspect (without decrypting) ─────────────────────────────────
//
// Pre-flight a backup file: confirm it's a Tajada backup, check the
// schema version, surface the hint and timestamp so the user can
// recognize the file before being asked for the passphrase.

export function inspectBackup(envelopeJson) {
  var env;
  try { env = JSON.parse(envelopeJson); }
  catch (e) { throw new Error('invalid_backup_file'); }
  if (!env || typeof env !== 'object') throw new Error('invalid_backup_file');
  if (env.format !== BACKUP_FORMAT) throw new Error('not_a_tajada_backup');
  // Accept any schema we know how to read (1..SCHEMA_VERSION). Older
  // backups restore fine — newer fields (e.g. receipts in v2) are simply
  // absent. Only a version NEWER than this build is unsupported.
  if (typeof env.schemaVersion !== 'number' || env.schemaVersion < 1 || env.schemaVersion > SCHEMA_VERSION) {
    var e = new Error('unsupported_schema_version');
    e.found = env.schemaVersion;
    e.expected = SCHEMA_VERSION;
    throw e;
  }
  if (!env.kdf || !env.cipher || !env.payload) {
    throw new Error('invalid_backup_file');
  }
  return {
    format: env.format,
    schemaVersion: env.schemaVersion,
    createdAt: env.createdAt || null,
    hint: env.hint || null,
  };
}

// ─── Decrypt ──────────────────────────────────────────────────────

export async function restoreBackup(envelopeJson, passphrase) {
  inspectBackup(envelopeJson); // throws on bad format/version
  if (!passphrase) throw new Error('passphrase_required');

  var env = JSON.parse(envelopeJson);
  var salt = base64ToBytes(env.kdf.salt);
  var nonce = base64ToBytes(env.cipher.nonce);
  var ciphertext = base64ToBytes(env.payload);

  var key = pbkdf2(sha256, utf8Encode(passphrase), salt, {
    c: env.kdf.iterations,
    dkLen: 32,
  });

  // Wrong passphrase → wrong key → GCM tag verification fails →
  // throws "invalid ghash tag" or similar. We catch and surface a
  // single error so the UI doesn't leak which mode failed.
  var plain;
  try {
    plain = gcm(key, nonce).decrypt(ciphertext);
  } catch (e) {
    throw new Error('wrong_passphrase_or_corrupted');
  }

  var state;
  try {
    state = JSON.parse(utf8Decode(plain));
  } catch (e) {
    throw new Error('invalid_backup_contents');
  }
  return state;
}
