# Tajada — Handoff

**What this is.** Tajada is a React Native (Expo) on-device tax-sorting app for US-based Spanish-speaking creators. Forked from SplitLedger; single-brand Spanish-only project. Free to import / classify / review; paid one-time IAP ($14.99) to export PDF or CSV for a contador.

**Last session checkpoint:** 2026-05-26. All code work complete; ready for store submission paperwork.

## Live URLs

- **Repo:** https://github.com/elnene1986/tajada
- **Privacy policy:** https://elnene1986.github.io/tajada/privacy
- **Support page:** https://elnene1986.github.io/tajada/support

(GitHub Pages serves from `/docs` on `main`. Update those Markdown files and push — Pages republishes within ~60s.)

---

## TODO (what's left, in order)

### Phase 1 — Local smoke test (~30 min)

- [ ] `cd ~/Downloads/Tajada && npm install` (package.json version pins were corrected this session — should resolve cleanly now)
- [ ] `npx expo install expo-crypto` (lets Expo confirm the SDK 54 pin)
- [ ] `npx expo start`, scan QR with Expo Go, click through every screen
- [ ] In particular: try the encrypted-backup flow (create → share file → restore in same session by picking it back via DocumentPicker), the mileage tracker (add a trip, verify deduction), and the paywall (will show "MODO DESARROLLO" banner since real IAP needs an EAS dev client)

### Phase 2 — App Store Connect setup (~60 min)

- [ ] Sign in to App Store Connect (Apple Developer Program is already active per Pablo)
- [ ] My Apps → "+" → New App
  - Platform: iOS
  - Name: `Tajada`
  - Primary language: Spanish (Mexico)
  - Bundle ID: `com.tajada.app` (must be pre-registered in developer.apple.com → Identifiers)
  - SKU: `tajada-1`
- [ ] After app is created, copy the numeric Apple ID → paste into `eas.json` `submit.production.ios.ascAppId` (currently `REPLACE_WITH_TAJADA_ASC_APP_ID`)
- [ ] Copy your Apple Team ID (developer.apple.com → Membership, 10 chars) → paste into `eas.json` `submit.production.ios.appleTeamId` (currently `REPLACE_WITH_APPLE_TEAM_ID`)
- [ ] Create the IAP product
  - Monetization → In-App Purchases → "+" → Non-Consumable
  - Reference name: `Tajada Export Unlock`
  - **Product ID: `com.tajada.app.full_export`** (MUST match `PRODUCT_ID_FULL_EXPORT` in `src/utils/iap.js`)
  - Price tier: Tier 15 ($14.99 USD)
  - Localizations: Spanish (Mexico) + English (U.S.) — copy from `docs/app-store/app-store-listing.md`
- [ ] Paste listing content into App Store Connect → App Store tab → Spanish (Mexico) localization, then English (U.S.)
  - All copy is pre-drafted in `docs/app-store/app-store-listing.md` (char counts pre-verified)
  - Includes: name, subtitle, promotional text, description, keywords, App Review Notes
- [ ] Set Privacy Policy URL: `https://elnene1986.github.io/tajada/privacy`
- [ ] Set Support URL: `https://elnene1986.github.io/tajada/support`
- [ ] Set Marketing URL: `https://tajada.app` (or leave blank if not live)

### Phase 3 — Google Play Console setup (~60 min)

- [ ] Pay $25 one-time fee at play.google.com/console if not already
- [ ] Create app: Tajada, default language Spanish (Mexico), Free, no ads
- [ ] Create the IAP product
  - Monetize → Products → In-app products → Create
  - Product ID: `com.tajada.app.full_export` (same as iOS)
  - Price: $14.99 USD, Status: Active
- [ ] Setup → API access → create service account, download JSON, save as `./play-service-account.json` (already in `.gitignore`)
- [ ] Paste listing from `docs/app-store/play-store-listing.md` (Spanish primary, English secondary)
- [ ] Set Privacy Policy URL: `https://elnene1986.github.io/tajada/privacy`
- [ ] Set Support email: `hola@tajada.app`
- [ ] Complete Data Safety form (answers in `play-store-listing.md` — bottom line: collects nothing, shares nothing)
- [ ] Complete IARC content rating questionnaire (expected: Everyone)

### Phase 4 — Screenshots (~90 min — this is what most people underestimate)

- [ ] Take 6.7" iPhone screenshots (use iPhone 15 Pro Max simulator)
  - 10 screenshots, one per the list in `docs/app-store/screenshot-captions.md`
  - Spanish UI for the Spanish listing, English UI for the English listing — Apple rejects mismatches
  - Use realistic-looking demo data ("Patreon Inc · $940", not "Test 123")
- [ ] Overlay captions per `screenshot-captions.md` using your tool of choice (Figma, Sketch, Apple's own Screenshot Builder — anything)
- [ ] For Play Store: at least 2 phone screenshots; can reuse Apple ones at lower res
- [ ] Create the 1024×500 feature graphic for Play Store (Apple doesn't need this)

### Phase 5 — Domain + email (~15 min)

- [ ] Confirm `hola@tajada.app` MX records are live and the inbox is monitored — both stores require a working support email. If `tajada.app` isn't yet registered, register it and configure email forwarding (Cloudflare Email Routing is free and fast).

### Phase 6 — Build + submit (~30 min active, ~24-48h waiting on review)

- [ ] `eas build --profile development` — get a dev client that includes `react-native-iap` so you can test the real IAP flow before submitting
- [ ] Install the dev client on your physical device, test the paywall end-to-end with a sandbox StoreKit account
- [ ] `eas build --profile production --platform all`
- [ ] `eas submit --profile production --platform all`
- [ ] In App Store Connect: attach the new build to the listing version → Submit for Review
- [ ] In Play Console: Production → Create release → attach build → Roll out
- [ ] First Apple review: 24-48h. First Play review: 3-7 days.

### Phase 7 — Design polish (doesn't block launch, but worth doing soon after)

- [ ] **Onboarding illustrations** — the four `Graphic` components in `src/screens/OnboardingScreen.js` are still navy-on-white with English file names ("Patreon_Payouts.csv", "Net profit"). Needs a designer to rework in Tajada's saffron-on-paper palette. Most visible "Spanish app with English mocks" tell.
- [ ] **PDF body colors** — the exported PDF still uses literal income-green / expense-red. Re-theme to Tajada saffron/brick in `src/screens/SummaryScreen.js` (look for the literal `#059669` and `#DC2626` hex codes).
- [ ] **BrandLogo SVG** — `src/components/BrandLogo.js` is a `View`-based approximation. Convert to `react-native-svg` for crispness, especially in screenshots.
- [ ] **Color palette review** — the working-screen functional colors beyond the 3 brand tokens are best-effort warm-tone guesses. See the `DESIGN REVIEW NEEDED` block in `src/brand/tajada.js`.

---

## What this session built

All code work that's already on `main`:

- **Parser fixes:** corrected the sign-convention bug in `parseGenericCC` (was misclassifying bank-deposit positives as debits), added UTF-8 BOM strip for Spanish-locale Excel CSVs, added Withdrawal/Deposit split-column detection, transaction-type column recognition.
- **i18n pass:** routed every English literal in the user-visible parser paths through `t()` (Venmo descriptions, source labels, format labels, fallback descriptions, cleanDescription normalizers). 312 i18n keys total.
- **Platform catalog 4.7×:** `src/utils/platformSeeds.js` went from 40 → 188 seeds across 15 platform buckets. Added Fanvue/Fansly, TikTok, Whop, Cameo, Gumroad/Stan/Beacons, Kajabi/Teachable, gig delivery (DoorDash/Uber/Lyft/Instacart). Plus 96 universal software/streaming/AI/comms seeds.
- **Prefix-match rules engine:** `src/utils/rules.js` now supports `match: 'exact' | 'prefix'` so brand seeds like "doordash" fire on "DOORDASH, INC. SAN FRANCISCO" via word-bounded prefix matching. Exact wins over prefix, longest prefix wins among prefix matches.
- **Encrypted backup:** `src/utils/backup.js` + `src/screens/BackupScreen.js`. AES-256-GCM with PBKDF2-SHA256 (250k iter), zero-knowledge passphrase, share envelope via `expo-sharing` to anywhere (iCloud, Drive, email, AirDrop). Restore picks file via DocumentPicker, decrypts, atomic bulk-replace after explicit confirmation.
- **Last-backup tracker:** `src/utils/backupMeta.js` writes a cleartext timestamp; HomeScreen pill shows "Respaldo hace 5 días" / "Respaldo hoy" / stale-color at 14+ days.
- **Storage filename migration:** `splitledger_*.json` → `tajada_*.json` with idempotent best-effort rename on first read; no data loss for any existing test installs.
- **One-time IAP:** `src/utils/iap.js` provider abstraction with dynamic require + stub fallback. Expo Go shows "MODO DESARROLLO" banner with simulated purchases; EAS Build uses real StoreKit / Play Billing. `src/components/Paywall.js` modal with price + Comprar / Restaurar / Cancelar. Gates PDF + CSV export in SummaryScreen via `withUnlock(action)` wrapper.
- **Mileage tracker (Schedule C Line 9):** `src/utils/mileage.js` + `src/screens/MileageScreen.js`. Manual entry (date / miles / purpose / round-trip / IRS rate), year picker, per-trip + annual summary. Integrated into SummaryScreen + PDF — when there are trips in the current tax year, a "Schedule C Línea 9" callout appears in both.
- **Ship-blocker cleanup:** Renamed storage files (splitledger → tajada), wrote `docs/privacy.md` + `docs/support.md` in Spanish, drafted Apple + Play listings in `docs/app-store/` with character-count-verified copy, removed dead dual-brand conditionals, added `_TODO_*` keys next to `REPLACE_WITH_*` placeholders in `eas.json` so they're self-documenting.
- **`docs/app-store/` submission kit:** `app-store-listing.md`, `play-store-listing.md`, `screenshot-captions.md`, `submission-checklist.md`, `README.md` — Pablo pastes from these straight into the consoles.

---

## Stack

Expo SDK ~54, React Native 0.81, `@react-navigation/native-stack`. On-device storage. No backend. Encrypted backups are opt-in and user-controlled (zero-knowledge — the passphrase never leaves the device).

## Layout

- `src/screens/` — Home, Import, Review, Summary, Onboarding, SourcePicker, **Backup**, **Mileage**
- `src/brand/` — single Tajada brand object (paper / ink / saffron, 58 color tokens)
- `src/theme/` — exposes the brand's color tokens + type/spacing
- `src/i18n/` — `es.json` (Spanish strings, 312 keys) + a small `t()` helper
- `src/utils/` — parsers, merchant rules (with prefix-match), Schedule C categories, storage, **backup (AES-256-GCM)**, **backupMeta (last-backup tracker)**, **iap (IAP provider abstraction)**, **unlock (purchase persistence)**, **mileage (Schedule C Line 9 tracker)**
- `src/components/` — `BrandLogo` (the saffron wedge glyph), `ErrorBoundary`, **`Paywall`**
- `assets/` — Tajada app icons (icon, adaptive-icon, splash-icon, favicon)
- `docs/` — public privacy + support pages (Spanish) plus `docs/app-store/` with App Store / Play Store listing drafts and submission checklist
- `app.config.js` — static Expo config; `eas.json` — build/submit profiles

## Storage (files inside `FileSystem.documentDirectory`)

- `tajada_sessions.json` — session list (each session = a sorted-statement batch)
- `tajada_rules.json` — merchant memory (key → { isBusiness, category, match })
- `tajada_backup_meta.json` — cleartext "last backup at" timestamp
- `tajada_unlock.json` — IAP unlock state (timestamp + product ID + transaction ID; not encrypted, see header in `src/utils/unlock.js` for the threat model)
- `tajada_mileage.json` — mileage log entries + current per-mile rate
- `onboarding_done.flag` — onboarding completion marker

`storage.js` and `rules.js` auto-migrate from the SplitLedger-era filenames (`splitledger_*.json`) on first read.

## Monetization

One-time non-consumable IAP, product ID `com.tajada.app.full_export`, $14.99 USD. Gates PDF + CSV export. `src/utils/iap.js` abstracts `react-native-iap` (v12.16.x — pre-Nitro API) with a dynamic require + stub fallback so Expo Go keeps working in dev.

## Backup model

Opt-in encrypted backup. User picks a passphrase (≥12 chars), Tajada bundles sessions + rules into a JSON snapshot, encrypts it with **AES-256-GCM** using a key derived via **PBKDF2-SHA256 (250k iterations)** from the passphrase + a random per-backup salt. The envelope is handed to `expo-sharing` so the user stores it wherever (iCloud Drive, Google Drive, email, AirDrop). Restore prompts for the passphrase, decrypts, then atomically replaces local state after explicit confirmation. If the user forgets the passphrase, the backup is unrecoverable by design.

Crypto deps: `@noble/ciphers@^2.2.0`, `@noble/hashes@^2.2.0`, `expo-crypto@~15.0.9`. All pure JS or stable Expo modules — no native module setup beyond `npm install`.

## Run it

```
npm install
npx expo install expo-crypto
npx expo start
```

In Expo Go you get the full app except real IAP (the stub provider kicks in with a dev banner).

## Build it

```
eas build --profile development           # dev client w/ react-native-iap (needed once)
eas build --profile production --platform all
eas submit --profile production --platform all
```

Bundle ID: `com.tajada.app`. Before submitting, fill the two `REPLACE_WITH_*` placeholders in `eas.json` (the inline `_TODO_*` keys tell you where to find each value).

## Future features (not in code yet, flagged in audit)

- **Receipt photos** — let creators attach a JPG to each transaction for IRS substantiation. `expo-image-picker` would handle it.
- **1099-K reconciliation** — Stripe/PayPal/Venmo issue 1099-K with gross totals that include platform fees; Tajada doesn't yet surface the delta between what the 1099-K reports and what the bank statements show.
- **Analytics** — no telemetry in code (consistent with the on-device privacy posture). If install-funnel visibility is wanted, PostHog with event-names-only (no transaction data) is the lowest-PII option.
- **Quarterly estimated-tax reminders** — push notifications at 4/15, 6/15, 9/15, 1/15 with safe-harbor estimate (last year × 110% / 4). All on-device.
