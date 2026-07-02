# Tajada — the "deducciones potenciales" counter

## Why this is the sales feature, not a feature

Everything in briefs 01–05 makes the ledger *correct*. Nothing yet makes the value *visible*. The user does the review work, exports a tidy PDF, and the payoff lands months later in their CPA's office — invisible, unattributed. The counter closes that loop: every row marked negocio increments a number denominated in dollars, and dollars are the only unit the user actually cares about.

In one line: **turn categorization work the user already does into a running total of money the app found them.**

This is also the entire marketing story. "Tajada me encontró $2,340 en deducciones" is a screenshot, a testimonial, and an App Store review in one sentence. No other brief produces a shareable number.

## What the number is (and isn't)

The honest version: the counter shows **estimated tax savings**, not deduction totals. A $500 software expense is not $500 back; at a combined ~25–30% effective rate it's ~$125–150. Two candidate framings:

| Framing | Example | Risk |
|---|---|---|
| Potential deductions | "Deducciones potenciales: $8,420" | Bigger number, but users may confuse it with savings |
| Estimated savings | "Ahorro estimado: ~$2,340" | Smaller number, but honest and defensible |

**Recommendation: lead with deductions, subtitle with savings.** `$8,420 en deducciones potenciales · ~$2,340 menos de impuestos (est.)`. The big number does the emotional work; the subtitle keeps it honest. The `~`, `(est.)`, and *potenciales* are load-bearing — this is not tax advice, and the copy must never promise a refund.

## Mechanics

The input already exists: every expense row with the gold check (negocio) and a Schedule C category from brief 05. The counter is:

```
deducciones = sum(amount of rows marked negocio on Gastos)
ahorro_estimado = deducciones × tasa_efectiva
```

`tasa_efectiva` defaults to 0.25 (a reasonable blended federal + SE-tax proxy for a solo creator) and lives in one constant, adjustable later via a settings row ("¿Tu tasa? La mayoría de creadores: 22–30%"). Do not attempt real tax math — no brackets, no SE-tax formula, no state logic. That's brief 07's territory and even there it stays an estimate.

Pure JS derivation from existing state. No new storage, no LLM calls, no native modules. This is the cheapest brief in the stack relative to impact.

> **Phase 0 note (2026-07-01):** all prereqs exist — Schedule C categories, `isBusiness` marking, integer-cents expense sums, `fmtCents`. This is the only brief with fully-satisfied dependencies, so it ships first (size S). `taxEstimate.js` already computes a *different* number (tax owed / "set aside"); this counter is money *found* and reuses nothing but the sum. Core PR = counter on Home; the share card ("view-shot of a styled component") needs `react-native-view-shot`, which is **not installed** — it splits into a later PR (roadmap phase 9). The adjustable-rate "settings row" waits on the Settings screen (roadmap phase 4); ship the rate as one constant first.

## Where it lives

**Home screen, above the fold.** The hero number. The current home already carries the brand line ("Tu tajada. Limpia, contada, tuya.") — the counter sits with it as proof the line is true.

**After each review session.** When the user finishes a pass on Gastos, the toast (brief 03 voice) reports the delta, not the total: `+$340 en deducciones. Eso es tuyo.` The increment is the dopamine; the total is the anchor.

**On the PDF (brief 04).** The cover's KPI cards should include it — it reframes the document for the CPA from "here's my mess" to "here's my organized claim."

## Voice (per brief 03)

Restrained, never salesy. The number speaks; the copy stays quiet. `Tu tajada este año: $8,420 en deducciones potenciales.` Never "You're crushing it!" — the brand doesn't cheer, it counts.

## Compliance posture

The counter never asserts deductibility — it sums what the *user* marked as negocio, the same way a spreadsheet totals a column. Three rules keep it defensible:

1. **"Potenciales," always.** The app suggests; the preparer decides. This matches the product's whole posture — the PDF ends in a CPA signature block (brief 04) precisely because the preparer is the authority. The counter must not undercut that.
2. **The expanded view carries the handoff line.** Tapping the counter shows the math plus one sentence: `Esto es una estimación, no asesoría fiscal. Tu preparador tiene la última palabra.` Same disclaimer family as brief 07.
3. **Marketing never promises outcomes.** "Organiza tus deducciones potenciales" is fine; "get $2,340 back" is not — that's FTC exposure, not IRS. Category precedent exists (Keeper, QuickBooks Self-Employed both surface deduction/savings estimates), and the pattern that keeps them safe is exactly this: estimates labeled as estimates, decisions left to the professional.

## The one screenshot-able moment

Year-end summary card: total deductions, estimated savings, top three categories. Rendered as a clean shareable image (view-shot of a styled component works in Expo Go). This is the referral artifact — a creator posting "lo que Tajada me encontró este año" to their story is worth more than any ad spend.

## Dependencies and sequencing

Gated on 05 (needs categorized business expenses to be meaningful — an uncategorized counter is just "total spend," which is not a benefit). Feeds 04 (cover KPI) and the future share loop (brief 09's referral logic applies here too). Build immediately after 05 lands.

## What to measure

Sessions that end with the counter visibly incrementing vs. not; share-card generations; whether users who see the counter in week one retain into month two. If the counter doesn't move retention, the number isn't prominent enough — the failure mode is burying it, not overexposing it.
