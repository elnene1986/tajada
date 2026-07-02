# Tajada — dark mode

## Why it earns a brief

Dark mode is table stakes for a 2026 consumer app, but for Tajada it's also a usage-pattern fit: expense review is a night-on-the-couch activity, and a glaring white ledger at 11pm is friction on exactly the sessions the app depends on. It's also a cheap perceived-quality signal — apps without it read as unfinished to the users most likely to review and recommend.

## Approach

**Follow the system by default, with a manual override in settings** (Sistema / Claro / Oscuro), same non-fighting rule as brief 10's language choice: device preference sets the default, an explicit user pick always wins.

Mechanics, within the stack: `useColorScheme()` from React Native (works in Expo Go) plus one theme context. All colors already flow — or must be made to flow — through a single token file: `background`, `surface`, `textPrimary`, `textSecondary`, `accent` (the gold), `positive`, `negative`, `border`. Two token maps, one hook, no library. Like brief 10's string extraction, the token extraction is the real work and the reason to do this early: every hard-coded hex shipped before the token file exists is retrofit debt.

> **Phase 0 note (2026-07-01) — bigger than "extraction" (size L).** The token file already exists (`src/brand/tajada.js` → `src/theme/index.js`), but it's **light-only and static**: exposed as a plain `colors` export and consumed by **13 files that reference `colors.*` inside module-scope `StyleSheet.create`**. Module-scope styles are captured at load and can't react to a theme switch — so the work isn't extraction, it's: (1) add a dark token map (this brief's palette guidance is good — warm near-black, gold tuned up); (2) a `useTheme()` hook with `useColorScheme` default + persisted manual override; (3) **refactor all 13 files** to build styles in component scope (`useMemo(() => makeStyles(colors), [colors])`). That refactor is the L. Do it before 07/08 UI adds more hard-coded hexes. The PDF stays light (separate HTML string — untouched).

## The palette decision

The gold checkmark is the brand's most loaded pixel — it means *negocio*, it means money that counts. On dark surfaces, saturated gold on near-black is actually the stronger look (gold reads richer on dark), so dark mode is an opportunity, not a compromise. Rules:

- **Near-black, not pure black** (`#111`–`#15150f` family, warm not blue) — pure black plus gold reads as luxury-brand kitsch; slightly warm dark reads as the same dignified Tajada.
- **Gold stays gold**, tuned up in luminance just enough to pass contrast on the new surfaces. The grey X and the "?" ambiguous pill (brief 02) each need a dark-surface variant checked for contrast, since grey-on-dark disappears fast.
- **Semantic colors, not decorative ones.** Income/expense/positive/negative must survive the swap with meaning intact; check every place color alone carries state.
- Test the three review screens (Ingresos, Gastos, Revisar) first — that's where the hours are spent.

## What stays light

**The PDF.** Documents are light; a CPA prints them. Brief 04's export is untouched by theme, permanently. Also unaffected: the share card from brief 06 *can* ship a dark variant later (dark share cards screenshot beautifully against social feeds), but v1 keeps one canonical light design.

## What not to build

No scheduled auto-switching (the system setting already does this), no per-screen theming, no custom theme colors. Two themes, one token file, done.

## Dependencies and sequencing

Independent of every other brief — no gates either direction. The only sequencing pressure is the retrofit argument: do the token extraction before new surfaces from 06–08 multiply the hard-coded colors. Pairs naturally with brief 10 as one "plumbing week": strings into a table, colors into tokens, both futures get cheap.

## What to measure

Share of users on dark (expect majority-follow-system); any drop in review-session length after launch (would signal a contrast/readability miss on the ledger rows, the only real risk in this brief).
