# Tajada — Handoff

**What this is.** Tajada, a React Native (Expo) on-device tax-sorting app for US-based Spanish-speaking creators. Forked from SplitLedger; now its own clean, Spanish-only project.

**Project status.** Single-brand Spanish codebase. The dual-brand conditionals from the fork period have been removed. Static-verified after the most recent pass: all files parse, all i18n keys (247) resolve, all 15 onboarding platform chips align with their seed buckets.

## Stack

Expo SDK ~54, React Native 0.81, `@react-navigation/native-stack`. On-device storage. No backend. Encrypted backups are opt-in and user-controlled (zero-knowledge — the passphrase never leaves the device).

## Layout

- `src/screens/` — Home, Import, Review, Summary, Onboarding, SourcePicker, **Backup**
- `src/brand/` — single Tajada brand object (paper / ink / saffron, 58 color tokens)
- `src/theme/` — exposes the brand's color tokens + type/spacing
- `src/i18n/` — `es.json` (Spanish strings, 247 keys) + a small `t()` helper
- `src/utils/` — parsers, merchant rules (with prefix-match), Schedule C categories, storage, **backup (AES-256-GCM)**, **backupMeta (last-backup tracker)**
- `src/components/` — `BrandLogo` (the saffron wedge glyph), `ErrorBoundary`
- `assets/` — Tajada app icons (icon, adaptive-icon, splash-icon, favicon)
- `docs/` — public privacy + support pages (Spanish) — host these before submitting to the stores
- `app.config.js` — static Expo config; `eas.json` — build/submit profiles

## Storage

- `tajada_sessions.json` — session list (each session = a sorted-statement batch)
- `tajada_rules.json` — merchant memory (key → { isBusiness, category, match })
- `tajada_backup_meta.json` — cleartext "last backup at" timestamp (no transaction data)
- `onboarding_done.flag` — onboarding completion marker

`storage.js` and `rules.js` auto-migrate from the SplitLedger-era filenames (`splitledger_*.json`) on first read so existing test installs aren't orphaned.

## Backup model

Opt-in encrypted backup. User picks a passphrase (≥12 chars), Tajada bundles sessions + rules into a JSON snapshot, encrypts it with **AES-256-GCM** using a key derived via **PBKDF2-SHA256 (250k iterations)** from the passphrase + a random per-backup salt. The envelope is handed to `expo-sharing` so the user stores it wherever (iCloud Drive, Google Drive, email, AirDrop). Restore prompts for the passphrase, decrypts, then atomically replaces local state after explicit confirmation. If the user forgets the passphrase, the backup is unrecoverable by design.

Crypto deps: `@noble/ciphers`, `@noble/hashes`, `expo-crypto`. All three are pure-JS or stable Expo modules — no native module setup needed.

## Run it

```
npm install
npx expo start
```

## Build it

```
eas build --profile production
```

Before submitting:

1. Fill the `REPLACE_WITH_...` placeholders in `eas.json` (look for the `_TODO_*` keys inline — they tell you exactly where to find each value).
2. For Android: download the Play service account JSON to `./play-service-account.json` (already in `.gitignore`).
3. Host `docs/privacy.md` and `docs/support.md` at stable HTTPS URLs (GitHub Pages is the easy path — see `docs/README.md`). Both stores require these URLs.

Bundle ID is `com.tajada.app`.

## Outstanding follow-ups

Design / content items that don't block a build, but should land before public release:

- **Placeholder color palette** — the working-screen functional colors (income / expense / excluded / badges) beyond the 3 brand colors are best-effort warm-tone guesses. See the `DESIGN REVIEW NEEDED` block in `src/brand/tajada.js`.
- **Wedge glyph** — `BrandLogo.js` renders a View-based approximation of the v.02 glyph. A pixel-exact in-app mark needs `react-native-svg` or a PNG. (The app *icon* itself is final.)
- **Onboarding illustrations** — the marketing graphics in `OnboardingScreen.js` are still navy/English; they need a Tajada redesign rather than a recolor. (The `g` StyleSheet there is the dead-code marker — those inline hex colors are decorative placeholders, not chrome.)
- **PDF body colors** — the exported PDF still uses literal income-green / expense-red in its tables; re-theme after the palette review.
- **`cleanDescription` English helpers** — `src/parsers/index.js:457` still produces strings like `'PayPal withdrawal'` and `'Zelle from'` during description normalization. Low-priority because the rest of the user-facing parser output now flows through `t()`.
- **`supportEmail`** — `src/brand/tajada.js` has `hola@tajada.app`; confirm the domain MX records are live.
- **App Store metadata in Spanish** — name, subtitle (≤30 chars), keywords, description, screenshots with Spanish UI. Not started.
- **Monetization** — no IAP wired in. Recommended: one-time $14.99 unlock at first PDF export.

Then: build verification on a device, App Store + Play Store listings (Spanish metadata), and the privacy/support URLs live.
