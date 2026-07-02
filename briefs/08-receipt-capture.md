# Tajada — receipt photo capture

## The gap

CSV/OFX import only sees what touched the bank. Cash expenses, paper receipts, and anything paid from an account the user didn't export are invisible — and for this audience that's not an edge case. Cash-heavy vendors (mercados, food trucks at a shoot, a handyman fixing the studio), co-paid group expenses, and reimbursables all die undocumented. Every one is a deduction the counter (brief 06) never gets to count.

There's a second, quieter gap: even for transactions that *are* in the bank export, the receipt is the substantiation. A `HOME DEPOT #4512` line proves a purchase happened; the receipt proves it was lumber for the set build and not a patio chair. If the IRS ever asks, the ledger without receipts is a claim; with receipts it's a record.

In one line: **photo in, transaction out — attached to evidence.**

> **Phase 0 note (2026-07-01) — rescoped, and Flow 2 already shipped.** The 2026-06-29 code session built `src/utils/receipts.js` + the ReviewScreen 📎 flow: attach a photo to an existing row (camera or library via `expo-image-picker`), view it full-screen, replace/remove it, and it survives encrypted backup/restore. That **is Flow 2** — so the brief's "Flow 2 is nearly free once Flow 1 exists" is inverted in reality: **Flow 2 exists; Flow 1 is the unbuilt part.** And Flow 1's vision extraction is **blocked** — there is no LLM, no `fetch`, no backend anywhere in the app (it's local-first / no-telemetry by design), and brief 01's "cloud LLM for merchant cleanup" was never wired. You also can't embed an API key in an Expo bundle. **Decision (B2): v1 ships Flow 1 as manual-from-photo — no extraction.** Vision extraction moves to the deferred section at the bottom.

## Two flows, one feature

**Flow 1 — new transaction from a receipt (cash path), v1 = manual.** User taps the plus, photographs the receipt (or picks from the library), and gets a **draft with the photo attached and empty fields**: they type merchant, date, and total; the brief 05 classifier suggests a Schedule C category from the merchant name they enter. One confirm tap and it's a row like any other, flagged with a receipt icon and `efectivo` as source. The photo is evidence and a memory aid — not parsed in v1. (Auto-extraction is the deferred upgrade below; the manual path is the permanent fallback regardless.)

**Flow 2 — attach to an existing row. ✅ Shipped (2026-06-29).** Tap the 📎 on a transaction, camera or photo library, the row gains the receipt icon. No parsing — the row already has its data; the photo is pure evidence. Already on disk in `receipts.js` + ReviewScreen; v1 of this brief only needs to add Flow 1's manual draft path on top.

## Extraction — deferred (pending backend decision)

The original brief called for a cloud vision call to pre-fill the draft. That's blocked on architecture, not effort, so it's out of v1:

- **No network layer exists** and the app's whole posture is local-first / no upload of financial data. A vision call means standing up a backend proxy (keys can't ship in the bundle) and revising the privacy policy — a product decision, not a coding task.
- `expo-image-manipulator` (for downscale/compress before upload) is **not installed**.
- When/if a backend is decided: `expo-image-picker` → `expo-image-manipulator` (~1024px longest side) → vision call returning `{merchant, date, total, tip, line_items?}` with a confidence field → below threshold, fall back to the manual draft (which is exactly v1, so v1 *is* the fallback already). One call per receipt, cached per image hash.

## Storage

Photos stay on-device (`expo-file-system`, app documents directory), referenced by path from the transaction record. No cloud upload of images beyond the transient extraction call — this is financial data and the app's posture so far is local-first; keep it. The PDF export (brief 04) gets an optional appendix: thumbnail grid of receipts keyed to transaction IDs, off by default, one toggle at export time. CPAs preparing an audit-sensitive return will turn it on.

## What not to build

No line-item splitting in v1 (that's the bill-splitter concept brief's territory and a different product muscle). No mileage tracking bolted on here — tempting, but it's location/background tracking and a different consent posture; separate brief if ever. No receipt inbox/email forwarding in v1 — real feature, real infra, later.

## Voice (per brief 03)

Camera screen: `A ver ese recibo.` Success: `Listo. $34.50 — Home Depot, anotado.` Extraction failure: `No lo leí bien. Dime tú los números.` — the app takes the blame, never the user's photography.

## Dependencies and sequencing

Uses 01's cleanup on extracted merchant names and 05's classifier for the category suggestion; both shipped or in flight. Feeds 06 directly — every cash receipt captured is counter movement, which is the demo: photograph a receipt, watch the deduction number tick up. That moment is the App Store preview video.

## What to measure

Receipts captured per active user per month; % of captures that become confirmed transactions without edits (extraction quality); share of users whose *first* transaction is a photo rather than an import — if that share is meaningful, receipt capture belongs in onboarding, not behind the plus button.
