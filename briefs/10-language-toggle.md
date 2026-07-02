# Tajada — language toggle + English PDF export

## Two features, one insight

These look like one i18n task but serve two different people. The **app toggle** serves the user — a bilingual creator who may simply prefer English UI, or a non-Spanish-speaking user who got recommended the app. The **PDF language option** serves the *recipient* — and most US tax preparers work in English, even many serving Spanish-speaking clients. Today a Spanish-only PDF quietly narrows who can receive the document brief 09 wants traveling as widely as possible.

Decoupling them is the design decision: **app language and PDF language are independent settings.** A user living in Spanish should be able to send an English PDF without touching their app experience, and vice versa.

## App toggle

Default stays Spanish — that's the brand and the wedge (per the scoping brief, Spanish-first is the identity, not a localization). The toggle lives in settings plus a quiet `EN` affordance on first launch, mirroring the concept brief's pattern ("a language toggle for English-default users sits in the corner").

Mechanics, within the stack: a plain JS string table — `strings.es.js` / `strings.en.js` (brief `.ts` refs mean `.js`) behind one `t(key)` helper. No i18n library needed at two locales; no native modules; locale preference persisted with the rest of app state. `Intl` handles number/date formatting per locale and works in Hermes.

> **Phase 0 note (2026-07-01).** The Spanish table already exists: `src/i18n/es.json` (427 keys) + a `t(key, params)` helper in `src/i18n/index.js`, used by 16 files. So the *extraction* this brief worries about is largely done for Spanish. **The remaining work is switchability, not extraction:** today `t()` is a pure function over a static import (it won't re-render on a locale change), there's no `en.json`, no persisted locale, and no toggle. Making `t()` reactive (locale context + persisted pref), writing `en.json` (a rewrite, not MT), and adding the toggle is the M–L job. The **PDF-language-independent-of-app-language** setting is also new — SummaryScreen's PDF is a large Spanish-literal HTML string that must read from the tables too.

**The English copy is a rewrite, not a translation.** Brief 03's voice rules (short, lowercase-feeling, present tense, never explain the joke) apply in English too, and machine-translated warmth reads as neither. "Tajada lista. Empacada." becomes something like "Packed and ready." — same restraint, native rhythm. Brand moments keep their Spanish: the app is still *Tajada*, the home line can stay "Tu tajada. Limpia, contada, tuya." with an English subtitle, and words like *tajada* itself never translate. English UI with Spanish soul, not a bleached second app.

## English PDF export

One toggle on the export screen: `PDF en español / in English`, defaulting to the app language, remembered per export. Everything else about brief 04 holds — same layout, same KPI cards, same signature block ("Reviewed by · Date · Preparer").

Details that matter:

- **Schedule C category names are already English** — they're IRS line items. In the Spanish PDF they stay English with the Spanish gloss the app uses; in the English PDF the gloss drops. This is the easiest part, and it's why the English PDF is *more* natural for a CPA, not less.
- **Number and date formats** follow the document language (`1,234.56` and `Sep 15, 2026` in English).
- **The brief 09 footer** localizes too: `Prepared with Tajada · tajada.app/preparers` — which means the preparer landing page eventually needs an English version. Note it in 09; don't gate this brief on it.
- Rendering-layer change only: the PDF generator reads from the same string tables as the app. No second template.

## Why this is worth doing before it feels urgent

Retrofitting string extraction is the classic i18n tax — every screen shipped before the string table exists is future migration work. Doing the extraction now, while surfaces are few (Ingresos, Gastos, Revisar, export, settings), costs days; doing it at twenty screens costs weeks. The English PDF alone justifies the plumbing: it directly widens brief 09's referral loop to every English-speaking preparer who receives the document.

## What not to build

No third language (the table structure makes adding one cheap later; don't spend now). No per-section mixed-language PDFs. No auto-detection overriding the user's explicit choice — device locale can set the *initial* default, never fight a manual selection.

## Dependencies and sequencing

Best sequenced right after 03 (the copy pass produces the canonical Spanish set; extract it into the string table as it lands, then write the English set against it). The PDF side touches 04's rendering layer, so land it with or after 04. Feeds 09 directly — an English PDF plus footer is what makes the preparer loop work outside Spanish-speaking preparers.

## What to measure

Share of users who switch to English UI (brand health check — if it's most of them, the Spanish-first assumption needs a look, not a panic); share of exports in English (expect it to exceed English UI share, which would confirm the decoupling was right); `/preparers` vs `/preparadores` traffic once 09 ships.
