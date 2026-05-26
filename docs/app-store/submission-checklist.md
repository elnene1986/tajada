# Submission Checklist — Tajada

Print this and tick as you go. Items marked **(blocker)** must be done before the store will accept the build for review.

## Before the first build

- [ ] **`npm install`** — pulls `react-native-iap` and `@noble/*` (added in recent changes).
- [ ] **`npx expo install expo-crypto`** — pin to the Expo SDK 54 compatible version.
- [ ] Run `npx expo start` once to confirm the app boots in Expo Go. (IAP will be stubbed; that's expected.)
- [ ] Build a dev client: `eas build --profile development` — needed because `react-native-iap` is native and won't load in Expo Go.

## Apple — App Store Connect

### Account and team
- [ ] **(blocker)** Apple Developer Program membership active ($99/yr).
- [ ] Team ID copied (10 chars, e.g. `ABC123XYZ4`) → paste into `eas.json` `appleTeamId`.

### App record
- [ ] **(blocker)** Create the app in App Store Connect → My Apps → "+" → New App.
  - Platform: iOS
  - Name: `Tajada` (display name; the full marketing name from the listing draft goes in the localization)
  - Primary language: Spanish (Mexico)
  - Bundle ID: `com.tajada.app` (must already be registered in developer.apple.com → Identifiers)
  - SKU: `tajada-1` (arbitrary, your record-keeping)
- [ ] Copy the numeric Apple ID (it'll be in App Information after creation) → paste into `eas.json` `ascAppId`.

### In-app purchase
- [ ] **(blocker for monetization)** Monetization → In-App Purchases → "+" → Non-Consumable
  - Reference name: `Tajada Export Unlock`
  - Product ID: `com.tajada.app.full_export` ← MUST match `src/utils/iap.js` `PRODUCT_ID_FULL_EXPORT`
  - Price: Tier 15 ($14.99 USD)
  - Localizations: Spanish (Mexico) + English (U.S.)
  - Submit for review with the first app submission

### Listing content (use `app-store-listing.md`)
- [ ] App name, subtitle, description, keywords, promotional text — all per the draft
- [ ] Categories: Finance (primary), Business (secondary)
- [ ] Age rating: 4+
- [ ] **(blocker)** Privacy Policy URL — host `docs/privacy.md` first
- [ ] **(blocker)** Support URL — host `docs/support.md` first
- [ ] App Review Notes (per the draft — tells reviewers how to test the IAP flow)

### Assets
- [ ] **(blocker)** App icon — `assets/icon.png` (1024×1024, no transparency, no rounded corners)
- [ ] **(blocker)** At least one screenshot per required device size:
  - 6.7" iPhone (iPhone 15 Pro Max) — REQUIRED
  - 6.5" iPhone (iPhone 11 Pro Max) — OPTIONAL but recommended
  - iPad Pro 12.9" — only if you support iPad (currently Tajada is iPhone-only via `app.config.js`)
- [ ] Captions per `screenshot-captions.md`

### Build
- [ ] **(blocker)** `eas build --profile production` succeeds
- [ ] `eas submit --profile production` uploads the build
- [ ] Build appears in TestFlight within ~30 min — smoke test on a real device
- [ ] In ASC, attach build to the listing version → Submit for Review

### Review
- Apple's review SLA is 24-48h; can be longer first time.
- Common rejection reasons to watch for: missing privacy URL (handled), implied tax filing (handled by description disclaimer), IAP not configured matching the JS code (configure first), missing "Restore purchases" (Paywall has it).

---

## Google — Play Console

### Account
- [ ] **(blocker)** Google Play Console developer account active ($25 one-time).

### App record
- [ ] **(blocker)** Create app → Tajada
  - Default language: Spanish (Mexico)
  - App or game: App
  - Free or paid: Free (IAP handles monetization)
  - Declaration: app does NOT contain ads

### In-app product
- [ ] **(blocker for monetization)** Monetize → Products → In-app products → Create product
  - Product ID: `com.tajada.app.full_export` (same as iOS)
  - Name: `Tajada Export Unlock`
  - Description: "Desbloquea exportación PDF y CSV. Pago único."
  - Price: $14.99 USD (Play auto-converts for other markets)
  - Status: Active

### Listing content (use `play-store-listing.md`)
- [ ] App title, short description, full description — per the draft
- [ ] Category: Finance
- [ ] Tags: as listed in the doc
- [ ] **(blocker)** Privacy Policy URL — host first
- [ ] **(blocker)** Support email: `hola@tajada.app`

### Data safety form
- [ ] Walk through the form using the answers in `play-store-listing.md` Data Safety section
  - Bottom line: declare no data collected, no data shared

### Content rating
- [ ] Complete IARC questionnaire (~5 min, answers per `play-store-listing.md`)
- [ ] Expected rating: Everyone

### Target audience
- [ ] Target audience: Adults (18+) — since Tajada serves working creators
- [ ] Declare app is NOT directed to children

### Assets
- [ ] **(blocker)** Adaptive icon — `assets/adaptive-icon.png`
- [ ] **(blocker)** Feature graphic — 1024×500 PNG (you'll need to create this; the App Store doesn't require an equivalent)
- [ ] **(blocker)** At least 2 phone screenshots (16:9 or 9:16, min 320px short edge)
- [ ] Optional: 7" tablet and 10" tablet screenshots if supporting tablets

### Build
- [ ] **(blocker)** Service account JSON downloaded to `./play-service-account.json` (already in `.gitignore`)
- [ ] **(blocker)** `eas build --profile production` succeeds
- [ ] `eas submit --profile production` uploads the AAB
- [ ] In Play Console → Production → Create release → attach build → Roll out

### Review
- Google's review is typically faster than Apple (often hours), but the first submission can take 3-7 days for staff manual review.

---

## After both stores are live

- [ ] Update `tajada.app` website with App Store + Play Store badges
- [ ] Set up basic Sentry or no-PII analytics if you want install funnels (audit-flagged; not in code yet — would require adding a network dep)
- [ ] Plan the launch comms: TikTok in Spanish, creator partnerships, Latino tax-prep publications
