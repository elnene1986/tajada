# Tajada — roadmap & working agreement

**Workflow:** planning and briefs live in this folder (written with Claude in Cowork). Implementation happens in Claude Code inside the app repo, one brief per PR-sized change. Claude Code should treat briefs as intent, not gospel — they were written from docs, not code. When a brief assumes something the codebase doesn't have, correct the brief and note it here.

## Build order

Revised 2026-07-01 after the Phase 0 feasibility review. Two corrections drove the reshuffle: (a) chunks of 07 and 08 already shipped in the 2026-06-29 code session, so those are extensions, not greenfield; (b) the 10/11 "plumbing week" is heavier than billed (making `t()` and the color tokens *runtime-switchable* is the real work, not extraction), so it must not block the cheap sales win (06). See the feasibility notes in each brief.

| Phase | Brief / work | Why this order | Size | Status |
|---|---|---|---|---|
| 0 | Feasibility review | Cross-check briefs 06–11 against the actual codebase before writing code | — | ✅ done 2026-07-01 |
| 1 | 01–05 | Cleanup → smart defaults → voice → PDF → Schedule C. 05 gates most of what follows. (Much shipped in prior sessions; 03 voice + 04 PDF polish still in flight) | — | ◐ in flight |
| 2 | 06 counter (core) | The sales feature. All prereqs met. Pure derivation, no new storage, no native modules. Ship first for momentum | S | ☐ |
| 3 | 09 footer + share screen | Distribution. Cheap and compounding; PDF already exists. Footer points at the live GH Pages URL for now | S–M | ☐ |
| 4 | Settings screen (minimal) | Shared prerequisite — 07/10/11 all want a settings row and none exists. Build once, early, as its own small PR | S | ☐ |
| 5 | 11 dark-mode plumbing | Theme hook + dark token map + refactor 13 files off module-scope `StyleSheet.create`. Do before 07/08 UI adds more hard-coded hexes | L | ☐ |
| 6 | 10 i18n reactivity + toggle | Make `t()` reactive + persisted locale + `en.json` (rewrite) + PDF-language setting. Spanish table already exists | M–L | ☐ |
| 7 | 07 extension | On top of the shipped reminders: safe-harbor math, mark-as-paid, `taxConstants2026.js` | M | ☐ |
| 8 | 08 receipt capture (manual) | v1 = manual-from-photo (evidence + typed amount/merchant). Flow 2 attach already shipped. Vision extraction deferred (needs backend) | M | ☐ |
| 9 | 06 share card | The referral artifact. Needs `react-native-view-shot`. Not blocking | S | ☐ |

## Per-phase Claude Code prompts

**Phase 0 (done):**
> Read briefs 06–11 in the tajada planning folder. Cross-check each against this codebase: feasibility under Expo Go / JS constraints, which prerequisites from 01–05 actually exist in code, rough size (S/M/L), and anything a brief assumes that doesn't exist. Don't implement. End with: build order, blockers, and the smallest first PR for brief 06.

**Phase 5 (theme plumbing):**
> Add a dark token map alongside the existing light `colors`, expose both behind a `useTheme()` hook (system default via `useColorScheme`, persisted manual override), and refactor the 13 files that call `colors.*` inside module-scope `StyleSheet.create` to build styles in component scope. No per-screen theming. Screens must be pixel-identical in light mode after.

**Phase 6 (i18n reactivity):**
> Make `t()` reactive behind a locale context + persisted preference, add `strings.en.js` (a rewrite, not a translation), and give the PDF its own independent language setting. The Spanish `es.json` table already exists — this is about switchability, not extraction.

**Single-brief phases:** point Claude Code at the one brief, e.g.:
> Implement 06-deduction-counter.md. One PR. Follow the brief's "what not to build" section strictly. Push back before coding if anything conflicts with the codebase.

## Standing rules for implementation

**JavaScript, not TypeScript** — the codebase is all `.js` (no `tsconfig`, no `.ts` files); brief references to `taxConstants2026.ts` / `strings.es.ts` mean plain `.js` modules. Expo Go only, no custom native modules. No real tax math beyond brief 07's documented simplifications. **No backend / no network calls / no telemetry** — the app is local-first by design (it's a stated privacy promise); any brief that assumes a cloud call (e.g. 08's vision extraction) is blocked on a backend decision. "Potenciales/estimado" language is load-bearing — never strip it for space. The PDF stays light-theme forever. The app never moves money.

## Decision log

- 2026-07-01 — Counter renamed "deducciones potenciales" (compliance posture; see brief 06)
- 2026-07-01 — App language and PDF language are independent settings (brief 10)
- 2026-07-01 — Plan-here/build-there workflow adopted
- 2026-07-01 (Phase 0) — **JavaScript, not TypeScript.** Codebase is all JS; keep it that way. Brief `.ts` refs mean `.js`. (B1)
- 2026-07-01 (Phase 0) — **Receipt capture v1 is manual-from-photo only** — photo as evidence, user types amount/merchant. Vision/LLM extraction deferred pending a backend decision (the app has no network layer today, by design). (B2)
- 2026-07-01 (Phase 0) — **Build a minimal Settings screen early**, as its own small PR, before the briefs that need settings rows (07/10/11). (B3)
- 2026-07-01 (Phase 0) — **Brief 09 footer points at the live GitHub Pages URL** (`https://elnene1986.github.io/tajada/`) via a single constant; swap for `tajada.app/preparadores` when the domain is registered. (B4)
- 2026-07-01 (Phase 0) — Briefs 07 and 08 updated to reflect what already shipped in the 2026-06-29 code session (reminders module, receipt attach/backup). (B5)
- 2026-07-01 (Phase 0) — Build order revised: 06 core → 09 footer → settings → 11 theme → 10 i18n → 07 extension → 08 manual → 06 share card.
