# App Store Submission Materials — Tajada

Everything you need to submit Tajada to the App Store and Google Play.

## Files in this folder

| File | What it's for |
|---|---|
| `app-store-listing.md` | Apple App Store Connect listing copy (Spanish + English) — app name, subtitle, keywords, description, review notes. |
| `play-store-listing.md` | Google Play Console listing copy (Spanish + English) — title, short description, full description, data safety. |
| `screenshot-captions.md` | The headline + subhead pairs that overlay each screenshot, in Spanish and English. |
| `submission-checklist.md` | Step-by-step submission checklist for both stores. Print this and tick as you go. |

## Quick start

1. Read `submission-checklist.md` end-to-end to see what's needed.
2. Host `../privacy.md` and `../support.md` somewhere with stable HTTPS URLs (GitHub Pages is the easy path — see `../README.md`).
3. Create the app records in App Store Connect and Play Console.
4. Paste the listing copy from `app-store-listing.md` and `play-store-listing.md`.
5. Configure the IAP product in each store (`com.tajada.app.full_export`, $14.99, non-consumable / managed product).
6. Take screenshots, overlay the captions from `screenshot-captions.md`.
7. Run `eas build --profile production` and `eas submit --profile production` for each platform.
8. Submit for review.

## Why the listing copy is written the way it is

- **Positioning:** "Schedule C para creadores" / "1099 Taxes" — narrower and sharper than "tax app." Latino creators searching for help with their 1099 land directly.
- **Legal framing:** every description has an explicit "WHAT TAJADA DOES NOT DO" section. Apple has rejected apps that imply they prepare or file taxes; Tajada explicitly says it organizes for a CPA / preparer.
- **Privacy as feature:** "Solo en tu teléfono / Cero servidores" appears prominently because it's both true and a competitive advantage against QuickBooks Self-Employed / Keeper which require accounts.
- **Platform name-dropping:** explicitly listing OnlyFans, Fanvue, TikTok, etc. in the description boosts search ranking for those terms AND signals to creators that Tajada actually knows their world.

## Character budgets used

| Field | Apple limit | Play limit | What we drafted |
|---|---|---|---|
| App name / title | 30 | 30 | 27 chars Spanish, 26 English |
| Subtitle / short desc | 30 | 80 | 25 chars Apple, 78 Play |
| Promotional text | 170 | — | 156 chars |
| Keywords | 100 | — | 91 chars |
| Description | 4000 | 4000 | 2,800 Apple / 2,450 Play |

Every count has been measured. If Pablo wants to edit, re-check against the limit before pasting into the console.
