# Tajada — Handoff

**What this is.** Tajada is a React Native (Expo) on-device tax-sorting app for US-based Spanish-speaking creators. Forked from SplitLedger; single-brand Spanish-only project. Free to import / classify / review; paid one-time IAP ($14.99) to export PDF or CSV for a contador.

**Last session checkpoint:** 2026-06-21 (marketing strategy + Phase 2 quick wins). This session: picked support email (`tajada.soporte@gmail.com`, replaced across all files), pushed landing page live at `https://elnene1986.github.io/tajada/`, implemented first-launch tax disclaimer modal (`src/components/DisclaimerModal.js`), and added paywall sample export preview (`docs/sample-export.html` + "Ver ejemplo" link in `Paywall.js`). Phase 2 remaining blockers: ToS and OnlyFans repositioning decision.

## Live URLs

- **Repo:** https://github.com/elnene1986/tajada
- **Privacy policy:** https://elnene1986.github.io/tajada/privacy
- **Support page:** https://elnene1986.github.io/tajada/support
- **Landing page:** https://elnene1986.github.io/tajada/ (live — `docs/index.html` on `main`)
- **Sample export preview:** https://elnene1986.github.io/tajada/sample-export.html (linked from paywall)

(GitHub Pages serves from `/docs` on `main`. Update those Markdown / HTML files and push — Pages republishes within ~60s.)

---

## TODO (what's left, in order)

### Phase 1 — Local smoke test (~30 min)

- [ ] `cd ~/Downloads/Tajada && npm install`
- [ ] `npx expo install expo-crypto` (lets Expo confirm the SDK 54 pin)
- [ ] `npx expo start`, scan QR with Expo Go, click through every screen
- [ ] In particular: try the encrypted-backup flow (create → share file → restore in same session by picking it back via DocumentPicker), the mileage tracker (add a trip, verify deduction), the **new welcome slide** that's now slide 1 of the onboarding (4 → 5 slides total), and the paywall (will show "MODO DESARROLLO" banner since real IAP needs an EAS dev client)
- [ ] **Smoke-test the cents migration:** any existing test install on your device or Expo Go sandbox has sessions in the old float-dollar shape. On first launch after this session's update, `getSessions()` will silently rewrite the file with integer `amountCents`. Verify the displayed totals look identical (they should — the math at display time produces the same string). If anything looks off, look in `src/utils/storage.js` `migrateAmountsToCents`.

### Phase 2 — Pre-submission decisions Pablo needs to make (~20 min of thinking, then mostly mechanical)

These came out of the audit. Code work is blocked on each until Pablo decides.

- [x] **Support email** — DONE 2026-06-21: `tajada.soporte@gmail.com` created and replaced across all files (`src/brand/tajada.js`, `docs/landing.html`, `docs/privacy.md`, `docs/support.md`, `docs/app-store/app-store-listing.md`, `docs/app-store/play-store-listing.md`, `docs/app-store/submission-checklist.md`).
- [ ] **Decide on Terms of Service.** Audit found ZERO ToS exists. For a paid app handling tax-relevant data, this is real liability. Three paths: Termly self-serve ($10–15/mo, generates tax-app-tailored ToS), a one-shot indie template from a lawyer ($300–800), or roll your own. Recommended: Termly. Once you have the text, mirror to `docs/terms.md` so GH Pages serves it alongside privacy/support. Then add a ToS URL to the App Store listing and a footer link on the landing page.
- [x] **First-launch tax-advice disclaimer modal** — DONE 2026-06-21: `src/components/DisclaimerModal.js` + wired into `App.js`. Shows once after onboarding (or on first launch for existing users). Writes `disclaimer_seen.flag`. 5 new i18n keys (`disclaimer.*`). See "What the 2026-06-21 session built" below.
- [x] **Paywall PDF preview** — DONE 2026-06-21: `docs/sample-export.html` live at `https://elnene1986.github.io/tajada/sample-export.html`. "Ver ejemplo de reporte →" link added to `Paywall.js` above the price block.
- [ ] **OnlyFans repositioning in App Store listing.** Audit found OnlyFans is named in 14 places across listings, screenshots, landing, and privacy. Not an auto-reject but raises Apple review temperature. Recommended adjustment: reorder `PLATFORM_OPTIONS` in `src/screens/OnboardingScreen.js` so the screenshot of the picker doesn't put OnlyFans top-left; rewrite the opening paragraph of `docs/app-store/app-store-listing.md` (line 51) to lead with neutral platforms (Patreon, Stripe, Substack, Twitch, Etsy); pre-empt in App Review Notes ("Tajada is a tax-categorization tool that supports many creator platforms, including some that host adult content. Tajada itself contains no adult material."). Editorial — needs Pablo's call on aggressiveness.

### Phase 3 — App Store Connect setup (~60 min)

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
  - **Re-check the opening paragraph after the OnlyFans repositioning decision (Phase 2)**
- [ ] Set Privacy Policy URL: `https://elnene1986.github.io/tajada/privacy`
- [ ] Set Support URL: `https://elnene1986.github.io/tajada/support`
- [ ] Set Marketing URL: `https://elnene1986.github.io/tajada/` (landing page is live) or `https://tajada.app` if domain is registered

### Phase 4 — Google Play Console setup (~60 min)

- [ ] Pay $25 one-time fee at play.google.com/console if not already
- [ ] Create app: Tajada, default language Spanish (Mexico), Free, no ads
- [ ] Create the IAP product
  - Monetize → Products → In-app products → Create
  - Product ID: `com.tajada.app.full_export` (same as iOS)
  - Price: $14.99 USD, Status: Active
- [ ] Setup → API access → create service account, download JSON, save as `./play-service-account.json` (already in `.gitignore`)
- [ ] Paste listing from `docs/app-store/play-store-listing.md` (Spanish primary, English secondary)
- [ ] Set Privacy Policy URL: `https://elnene1986.github.io/tajada/privacy`
- [ ] Set Support email: `tajada.soporte@gmail.com`
- [ ] Complete Data Safety form (answers in `play-store-listing.md` — bottom line: collects nothing, shares nothing)
- [ ] Complete IARC content rating questionnaire (expected: Everyone)

### Phase 5 — Screenshots (~90 min — what most people underestimate)

- [ ] Take 6.7" iPhone screenshots (use iPhone 15 Pro Max simulator)
  - 10 screenshots, one per the list in `docs/app-store/screenshot-captions.md`
  - Spanish UI for the Spanish listing, English UI for the English listing — Apple rejects mismatches
  - Use realistic-looking demo data ("Patreon Inc · $940", not "Test 123")
- [ ] Overlay captions per `screenshot-captions.md` using your tool of choice (Figma, Sketch, Apple's own Screenshot Builder — anything)
- [ ] For Play Store: at least 2 phone screenshots; can reuse Apple ones at lower res
- [ ] Create the 1024×500 feature graphic for Play Store (Apple doesn't need this)

### Phase 6 — Build + submit (~30 min active, ~24-48h waiting on review)

- [ ] `eas build --profile development` — get a dev client that includes `react-native-iap` so you can test the real IAP flow before submitting
- [ ] Install the dev client on your physical device, test the paywall end-to-end with a sandbox StoreKit account. **Verify the new "Tienda no disponible" → "Reintentar" flow** by signing out of your sandbox Apple ID before opening the paywall — it should refuse to render the purchase button instead of silently granting a free unlock (this was the production-stub bug fixed this session).
- [ ] `eas build --profile production --platform all`
- [ ] `eas submit --profile production --platform all`
- [ ] In App Store Connect: attach the new build to the listing version → Submit for Review
- [ ] In Play Console: Production → Create release → attach build → Roll out
- [ ] First Apple review: 24-48h. First Play review: 3-7 days.

### Phase 7 — Post-launch polish (doesn't block launch)

- [x] **Onboarding illustrations** — DONE 2026-06-12: slides 2–4 recolored to brand tokens, illustration text translated to Spanish, welcome slide now uses the rebuilt BrandLogo. Optional: a designer pass for bespoke artwork, but no longer off-brand.
- [ ] **PDF body colors** — exported PDF still uses literal income-green / expense-red. Re-theme to Tajada saffron/brick in `src/screens/SummaryScreen.js` (look for `#059669` and `#DC2626`).
- [ ] **BrandLogo SVG** — `src/components/BrandLogo.js` was rebuilt 2026-06-12 as a proper folded-corner mark (View-based, `size`/`bg` props). Still View triangles, not SVG; convert to `react-native-svg` only if screenshots show aliasing.
- [ ] **Color palette review** — see `DESIGN REVIEW NEEDED` block in `src/brand/tajada.js`.
- [ ] **Mileage cents refactor (low priority).** The transaction subsystem now uses integer cents end-to-end; mileage is still in float dollars. Drift risk is negligible at realistic creator scale (a creator entering 500 trips would see drift well below the cent), but it's belt-and-suspenders work if you want full consistency. Scope: `src/utils/mileage.js`, `src/screens/MileageScreen.js`, `src/screens/HomeScreen.js` mileage display.
- [ ] **Add a "Send debug log" affordance** for production issue-debugging without compromising the no-telemetry promise. Pattern: long-press the version number in a future settings screen, bundle recent errors locally, hand to `expo-sharing` if the user opts in. Today, when a user's CSV format breaks the parser, you'll never know — they'll see fewer transactions and might or might not email support.
- [ ] **Annual mileage rate update.** `DEFAULT_RATE_PER_MILE` in `src/utils/mileage.js` is hardcoded to $0.70 (2025). The 2026 rate will be different (IRS publishes in late December). The app lets users edit it manually, but the default will be wrong for fresh installs in 2026. Set a calendar reminder.
- [ ] **Trademark check on "Tajada."** 10 minutes at `tmsearch.uspto.gov` — search class 9 (downloadable software) and class 36 (financial services). "Tajada" is a generic Spanish word so conflict is unlikely, but worth verifying.
- [ ] **Mirror privacy + support pages off GitHub Pages.** Once `tajada.app` is registered (if ever), serve `tajada.app/privacy` and `tajada.app/support` from your own domain. The current `elnene1986.github.io/...` URLs are fragile — if that username ever changes, those links break and Apple uses them as the privacy policy of record.
- [ ] **Cross-platform IAP recovery note in support.md.** A user who pays on iPhone can't restore the purchase on Android (Apple/Google don't share transaction state). Industry-standard limitation but worth documenting in `docs/support.md` so support emails don't surprise you.
- [ ] **Delete `onboarding-preview.html`** in the repo root once you no longer need the static preview of the welcome slide.
- [ ] **Receipt photos** — future feature. `expo-image-picker`. When you wire it up, **add `NSPhotoLibraryUsageDescription` back to `app.config.js`** — it was removed this session because the audit caught it declared without being used (App Store guideline 5.1.1 rejection trigger).

---

## What the 2026-06-21 session built (marketing strategy + Phase 2 quick wins)

### Marketing strategy decisions (no code — context for future sessions)
- Identified $14.99 one-time as underpriced vs. market ($24.99 one-time or $9.99/yr recommended pre-launch).
- OnlyFans/adult creator community identified as highest-leverage organic channel — Spanish-speaking, underserved, vocal. Softening the positioning is the wrong move; marketing directly to that community while keeping App Store copy neutral is the right balance.
- Distribution gaps: no email list, no social presence, no accountant (contador) partner channel. Quickest wins: email waitlist on landing page + one Spanish-language post in a creator Facebook group or Reddit.
- Suggested future monetization tier: free export limit or annual subscription for recurring revenue + natural annual renewal (IRS rate changes each December).

### Code shipped

- **Support email replaced** — `tajada.soporte@gmail.com` across 7 files. `docs/app-store/submission-checklist.md` marked ✓.
- **Landing page live** — `docs/landing.html` copied to `docs/index.html` and pushed. Now live at `https://elnene1986.github.io/tajada/`.
- **First-launch disclaimer modal** (`src/components/DisclaimerModal.js`) — one-time acceptance modal. Shows after onboarding for new users; shows on first launch for existing users who already completed onboarding. Writes `disclaimer_seen.flag` (same pattern as `onboarding_done.flag`). No tap-outside dismiss — acceptance required. 5 new i18n keys: `disclaimer.title`, `disclaimer.bodyPre`, `disclaimer.bodyBold`, `disclaimer.bodyPost`, `disclaimer.cta`. `App.js` updated: imports `DisclaimerModal`, adds `hasSeenDisclaimer` / `markDisclaimerSeen` helpers using FileSystem, loads both flags in parallel at startup, renders `<DisclaimerModal visible={!showOnboarding && showDisclaimer} onAccept={handleDisclaimerAccept} />` inside `<ErrorBoundary>`.
- **Paywall sample export preview** (`docs/sample-export.html`) — full realistic mock export (Patreon, Stripe, OnlyFans, Venmo fake data; ~$18k income / ~$3.2k expenses) styled identically to the real generated PDF. Saffron "Este es un reporte de ejemplo" banner at top. Live at `https://elnene1986.github.io/tajada/sample-export.html`. `Paywall.js` updated: imports `Linking`, adds `SAMPLE_EXPORT_URL` constant, renders a "Ver ejemplo de reporte →" saffron underlined link between the feature list and price block. 1 new i18n key: `paywall.seeExample`. Total i18n keys: **321**.

---

## What the 2026-06-12 session built (UI polish + categorizer)

- **BrandLogo rebuilt** (`src/components/BrandLogo.js`) — proper folded-corner mark (corner cut + saffron flap), `size`/`bg` props. Used at 56px on Home, 92px on the onboarding welcome slide.
- **Home screen filled out** — bigger header, "Cómo funciona" 3-step empty state (new `home.step*` i18n keys).
- **Nav header themed** (`App.js` `screenOptions`) — paper background, no shadow, on every screen. Also a `FORCE_ONBOARDING` dev flag in App.js to replay the onboarding without clearing data.
- **Import screen premium pass** — elevated-card dropzone (dashed border gone), "Fuentes compatibles" chips + privacy note in the empty state.
- **Onboarding rebranded** — slides 2–4 recolored from SplitLedger-era greens/blues to brand tokens, illustration strings translated ("Ganancia neta", "Listo para el Anexo C"). Zero literal hex left in OnboardingScreen.
- **Deterministic Schedule C categorizer integrated** — new `src/utils/categorizer.js`: brand lists mapped to the EXISTING category keys in `categories.js`, Apple/gear-retailer $200 amount-splits (integer cents), Zelle/PayPal contract-labor heuristic at 3+ repeat payments. Runs at import (ImportScreen + ReviewScreen addAnotherFile) after `applyRules`; fills `suggestedCategory`/`suggestedConfidence`/`suggestedReason` on debits no rule covered. Review modal pre-selects the suggestion (priority: rule category > suggestion > type default) and shows a "✨ Sugerencia automática — {reason}" provenance chip (`review.suggestedHint` key). Suggestions never auto-classify; confirming one in the modal persists it as a manual rule via the existing saveRule path. LLM fallback for the long tail is NOT wired — the seam design lives in ~/Documents/Claude/Projects/tajada/ts/.

## What this session built (2026-05-26 part 2 — audit + fixes)

Heavy code-review pass. Everything below is on disk:

### Marketing + onboarding

- **Spanish marketing landing page** — `docs/landing.html`. Empathy-driven copy ("Sé lo estresante que es la temporada de impuestos"), 3-step "Cómo funciona", "time is money" dark-block quote, trust signals, honest pricing strip (free to use, $14.99 only when ready to export). Saffron-on-paper palette, Fraunces + Inter typography, mobile-responsive, single-file. Slot into GH Pages or move to `tajada.app` if/when that domain is live.
- **In-app onboarding intro slide (slide 1 of 5)** — `src/screens/OnboardingScreen.js`. New emotional hook before the four functional walkthrough slides. Calm saffron-wedge graphic with a thin rule + "PARA CREADORES" badge. Copy: "Sé lo estresante que es la temporada de impuestos. Por eso hice Tajada. En unos cuantos toques le entregas a tu contador un documento limpio y detallado — sin hojas de Excel a medianoche, sin recibos perdidos. Tu tiempo es tu recurso más valioso. Vamos a cuidarlo." Three new i18n keys: `onboarding.introTitle`, `onboarding.introSub`, `onboarding.introBadge` (es.json now at 315 keys).
- **`onboarding-preview.html`** in the repo root — static HTML mock of the welcome slide for quick visual review without running Expo. One-off; delete when you don't need it (already in Phase 7 cleanup).

### Tier-1 fixes (would have caused App Store rejections or shipped bugs)

- **`app.config.js` Info.plist clean-up.** Removed `NSPhotoLibraryUsageDescription` (declared but no code uses `ImagePicker` — guideline 5.1.1 rejection waiting to happen). Added `ITSAppUsesNonExemptEncryption: false` (qualifies for the BIS 740.17(b) exemption since AES is used only to encrypt the user's backup at rest with standard algorithms, not transmitted over the network from the app). Effect: every TestFlight + App Store submission now auto-passes the encryption compliance check instead of forcing manual answering of the questionnaire.
- **IAP production stub bug** — fixed in `src/components/Paywall.js`, `src/utils/iap.js`, `src/i18n/es.json`. Pre-fix: if `RNIap.initConnection()` threw in production (network glitch, signed-out Apple ID, StoreKit outage), the code silently substituted the dev stub and `purchase()` returned a fake success — granting the user a free unlock with `source: 'dev'` written to `tajada_unlock.json`. Post-fix: Paywall now checks `provider.isStub && !__DEV__`, and if true sets a `storeUnavailable` state that hides the purchase + restore buttons and replaces them with "Tienda no disponible" + a "Reintentar" button. The retry calls `resetProvider()` (renamed from `resetProviderForTesting` for clarity, with a back-compat alias) which clears the cached provider so the next `getProvider()` re-tries the real one. `doPurchase` also has a defense-in-depth check that refuses to record a stub purchase even if the UI gate were bypassed. New i18n keys: `paywall.storeUnavailableTitle`, `paywall.storeUnavailableBody`, `paywall.retry`. Dev banner ("MODO DESARROLLO") still shows correctly in `__DEV__` Expo Go.
- **Atomic file writes** — new `src/utils/fsAtomic.js` (`writeAtomic(path, content)`: writes to `path.tmp`, then `FileSystem.moveAsync` renames it onto the target — atomic OS-level rename when source/dest live on the same filesystem, which they always do inside `documentDirectory`). Pre-fix: every `writeAsStringAsync` to a live storage file was non-atomic; an iOS background-kill mid-write would leave a corrupt JSON file and the user would silently lose all their sessions on next read. Wired through all five persistent storage modules: `storage.js` (three call sites — saveSession, deleteSession, setAllSessions; the bulk-replace was the most dangerous since it's exactly what runs during restore-from-backup), `rules.js`, `mileage.js`, `unlock.js`, `backupMeta.js`. Three remaining direct `writeAsStringAsync` calls (`onboarding_done.flag`, backup envelope to cache, CSV export to cache) are intentionally non-atomic — they write to transient/cache files where corruption is recoverable by retrying the user action.

### Tier-3 fix — float-money refactor

End-to-end migration from float-dollars to integer-cents for all transaction amounts. JavaScript's IEEE-754 floats accumulate drift when summed across many rows (a year of Stripe payouts could drift by pennies); integer addition is bit-exact regardless of count.

- **New `src/utils/money.js`** — single source of truth for money handling.
  - `parseToCents(input)` — strips `$`, `,`, whitespace, parens-as-negative; returns NaN if not numeric. The chokepoint where strings cross into the cents world.
  - `dollarsToCents(d)` — `Math.round(d * 100)`; used by the migration only.
  - `centsToDollars(c)` — for the few places that *display-only* need a dollar value (don't aggregate the result).
  - `fmtCents(cents)` — `123456` → `"$1,234.56"`. Locale-independent (RN's Intl support is patchy on Android).
  - `fmtCentsK(cents)` — compact form for tight UI: `1234567` → `"$12.3k"`, smaller values → `fmtCents`.
  - `centsToFixedString(cents)` — unsigned `"9.99"` for CSV export columns that need to be numeric in Excel/Sheets.
- **All five parsers rewritten** — `src/parsers/index.js`. Capital One, Venmo, PayPal, Chase, generic CC/Bank (with split-column + single-column logic), OFX. Every `parseFloat(...)` + `Math.abs(rawAmt)` replaced with `parseToCents(...)`. Field renamed `amount` → `amountCents` on the transaction schema. Sign-vs-credit logic preserved exactly. Schema comment at top of file documents the cents contract.
- **Session migration on read** — `src/utils/storage.js`. New `migrateAmountsToCents(sessions)` walks every transaction in every session; if a transaction still has `.amount` (float) and no `.amountCents`, converts via `dollarsToCents`, deletes the old field. Idempotent — already-migrated transactions short-circuit. `getSessions()` runs the migration after `JSON.parse`; if anything changed, atomic-writes the new shape back so the migration runs at most once per install lifetime. `setAllSessions()` (the restore-from-backup path) also runs the migration, so old encrypted backups normalize to cents on restore without waiting for the next read.
- **All four screens updated** — `SummaryScreen.js` (8 `.reduce` aggregations + bucket accumulator + PDF rows + CSV export), `ReviewScreen.js` (2 dedup keys + 2 reduce aggregations + transaction row display, local `fmt`/`fmtK` swapped to `fmtCents`/`fmtCentsK`), `ImportScreen.js` (totals accumulator + dedup key + local `fmt`), `HomeScreen.js` (no transaction `.amount` reads — only formats mileage deduction which is its own value chain). All `fmt` call sites kept their names; only the field changes (`.amount` → `.amountCents`).
- **`helpers.js` cleanup** — removed dead `formatMoney` / `formatCompact` exports (nothing imported them) and left a comment explaining why: no float-dollar formatter should exist alongside the cents-based ones, to prevent future regressions.
- **Verification.** `\.amount\b` in `src/` has only three matches left: a comment in ReviewScreen documenting the rename, and the two lines in `migrateAmountsToCents` that intentionally read legacy `.amount`. `parseFloat` in `src/` has three matches: all inside `parseToCents`. `toFixed(2)` in `src/` has two matches: both in mileage formatters, which is the deliberate scope boundary (see Phase 7 — mileage cents refactor is post-launch optional polish).

### Audit findings that need Pablo's input (not blocked on code work)

Documented in Phase 2 above. To recap the severity hierarchy from the audit:

- **Tier 1 (blocking submission, all FIXED this session):** photo permission, encryption declaration, IAP stub fallback, atomic writes.
- **Tier 2 (real legal exposure, NEEDS DECISIONS):** no Terms of Service, tax-advice disclaimer too quiet, OnlyFans positioning in App Store listing, support email isn't live.
- **Tier 3 (will hurt after launch, all FIXED this session):** float-money refactor.
- **Tier 4 (worth knowing, NOT URGENT):** trademark check, GitHub Pages URL fragility, no automated tests, no telemetry, mileage rate annual update, cross-platform purchase recovery doc.

---

## What previous session built

For context — already on `main` before this session started:

- **Parser fixes:** corrected the sign-convention bug in `parseGenericCC` (was misclassifying bank-deposit positives as debits), added UTF-8 BOM strip for Spanish-locale Excel CSVs, added Withdrawal/Deposit split-column detection, transaction-type column recognition.
- **i18n pass:** routed every English literal in the user-visible parser paths through `t()` (Venmo descriptions, source labels, format labels, fallback descriptions, cleanDescription normalizers). Now at 315 keys after this session's additions.
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

- `src/screens/` — Home, Import, Review, Summary, Onboarding (5 slides now), SourcePicker, Backup, Mileage
- `src/brand/` — single Tajada brand object (paper / ink / saffron, 58 color tokens)
- `src/theme/` — exposes the brand's color tokens + type/spacing
- `src/i18n/` — `es.json` (Spanish strings, 315 keys) + a small `t()` helper
- `src/utils/` — parsers, merchant rules (with prefix-match), Schedule C categories, storage, backup (AES-256-GCM), backupMeta (last-backup tracker), iap (IAP provider abstraction), unlock (purchase persistence), mileage (Schedule C Line 9 tracker), **`money` (integer-cents conversion + formatting — NEW this session)**, **`fsAtomic` (atomic file-write helper — NEW this session)**
- `src/components/` — `BrandLogo` (the saffron wedge glyph), `ErrorBoundary`, `Paywall`
- `assets/` — Tajada app icons (icon, adaptive-icon, splash-icon, favicon)
- `docs/` — public privacy + support pages (Spanish); **`docs/landing.html`** (Spanish marketing page — NEW this session); `docs/app-store/` with App Store / Play Store listing drafts and submission checklist
- `app.config.js` — static Expo config; `eas.json` — build/submit profiles
- `onboarding-preview.html` in repo root — static HTML mock of the new welcome slide; delete when no longer needed (Phase 7)

## Storage (files inside `FileSystem.documentDirectory`)

All writes go through `src/utils/fsAtomic.js` `writeAtomic` (write-temp-then-rename pattern) — partial writes from app-kill mid-operation cannot corrupt these files.

- `tajada_sessions.json` — session list. Each session contains `transactions[]`. **Transaction schema (this session): `{ id, date, description, amountCents, type: 'credit'|'debit', source, isBusiness, category? }`. `amountCents` is ALWAYS an integer number of cents (`$9.99` → `999`); never a float, never dollars.** Old installs with float `.amount` are auto-migrated on first read by `migrateAmountsToCents` in `storage.js`.
- `tajada_rules.json` — merchant memory (key → { isBusiness, category, match })
- `tajada_backup_meta.json` — cleartext "last backup at" timestamp
- `tajada_unlock.json` — IAP unlock state (timestamp + product ID + transaction ID; not encrypted, see header in `src/utils/unlock.js` for the threat model)
- `tajada_mileage.json` — mileage log entries + current per-mile rate. Still in float dollars (post-launch refactor candidate; drift is negligible at realistic creator scale).
- `onboarding_done.flag` — onboarding completion marker (one-byte transient — not atomic-written, no need)

`storage.js` and `rules.js` auto-migrate from the SplitLedger-era filenames (`splitledger_*.json`) on first read. `storage.js` also auto-migrates the float-`amount` → integer-`amountCents` shape on first read after this session's update.

## Monetization

One-time non-consumable IAP, product ID `com.tajada.app.full_export`, $14.99 USD. Gates PDF + CSV export. `src/utils/iap.js` abstracts `react-native-iap` (v12.16.x — pre-Nitro API) with a dynamic require + stub fallback so Expo Go keeps working in dev. **As of this session, the stub is gated by `__DEV__` in `Paywall.js` so it cannot silently grant free unlocks in production builds when StoreKit fails to init.**

## Backup model

Opt-in encrypted backup. User picks a passphrase (≥12 chars), Tajada bundles sessions + rules into a JSON snapshot, encrypts it with **AES-256-GCM** using a key derived via **PBKDF2-SHA256 (250k iterations)** from the passphrase + a random per-backup salt. The envelope is handed to `expo-sharing` so the user stores it wherever (iCloud Drive, Google Drive, email, AirDrop). Restore prompts for the passphrase, decrypts, then atomically replaces local state after explicit confirmation. If the user forgets the passphrase, the backup is unrecoverable by design.

Old backups (created before this session's cents refactor) carry transactions with float `.amount`. On restore, `setAllSessions` runs `migrateAmountsToCents` so the restored data lands in the new shape immediately.

Crypto deps: `@noble/ciphers@^2.2.0`, `@noble/hashes@^2.2.0`, `expo-crypto@~15.0.9`. All pure JS or stable Expo modules — no native module setup beyond `npm install`.

## Money handling

Internally: **integer cents everywhere**. Parse strings to integer cents at ingest (`parseToCents` in `src/utils/money.js`), aggregate cents with integer math (exact across any number of rows), format cents at display via `fmtCents` / `fmtCentsK`. No raw `parseFloat` for money lives outside `parseToCents` — that's the single chokepoint between the string world and the integer world. The decision is captured in the schema comment at the top of `src/parsers/index.js` and the module header of `src/utils/money.js`.

## Run it

```
npm install
npx expo install expo-crypto
npx expo start
```

In Expo Go you get the full app except real IAP (the stub provider kicks in with a dev banner). To preview the new onboarding welcome slide without running Expo, open `onboarding-preview.html` in any browser.

## Build it

```
eas build --profile development           # dev client w/ react-native-iap (needed once)
eas build --profile production --platform all
eas submit --profile production --platform all
```

Bundle ID: `com.tajada.app`. Before submitting, fill the two `REPLACE_WITH_*` placeholders in `eas.json` (the inline `_TODO_*` keys tell you where to find each value).

## Future features (not in code yet, flagged for after launch)

- **Receipt photos** — `expo-image-picker`. When you wire it up, re-add `NSPhotoLibraryUsageDescription` to `app.config.js` (removed this session because audit caught it declared without being used).
- **1099-K reconciliation** — Stripe/PayPal/Venmo issue 1099-K with gross totals that include platform fees; Tajada doesn't yet surface the delta between what the 1099-K reports and what the bank statements show.
- **Optional debug-log share** — long-press version number → bundle recent errors locally → `expo-sharing`. Gives Pablo something to ask users for when debugging without breaking the no-telemetry promise.
- **Automated tests** — for parsers especially. Format changes from banks/platforms will keep breaking things; tests would catch regressions before users do.
- **Quarterly estimated-tax reminders** — push notifications at 4/15, 6/15, 9/15, 1/15 with safe-harbor estimate (last year × 110% / 4). All on-device.
- **Mileage in integer cents** — for full consistency with the transaction subsystem; drift is small enough today that it's polish, not bug.
