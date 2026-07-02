# Tajada — cuánto apartar (quarterly estimated-tax nudge)

## The anxiety this answers

The solo creator's number-one tax fear isn't disorganized receipts — it's the silent quarterly obligation. W-2 life withholds for you; 1099 life doesn't, and nobody tells you until the April bill (plus underpayment penalty) arrives. The question the user is actually carrying around is: *"¿cuánto debo apartar, y cuándo?"*

Tajada already knows the two inputs — income marked negocio and deductions marked negocio. Answering the question is arithmetic on data the user has already reviewed. Not answering it is leaving the app's most retentive feature on the table: four IRS deadlines a year are four built-in, high-urgency reasons to reopen the app.

In one line: **the app tells you a number to set aside and a date to send it, four times a year.**

> **Phase 0 note (2026-07-01) — partly shipped already.** The 2026-06-29 code session built `src/utils/quarterlyReminders.js`: it computes the four deadlines (Apr/Jun/Sep/Jan 15, incl. the Dec→Jan boundary), schedules a local notification per deadline carrying a per-quarter amount, and persists prefs. `expo-notifications` is installed and wired; SummaryScreen already shows a "Recordatorios trimestrales" card. `src/utils/taxEstimate.js` already does the SE-tax + federal-rate math (see "The math" below — it's live, for tax year **2025**). So this brief is now an **extension (size M)**, not greenfield. What remains new: (1) **safe-harbor math** (the 100%/110%-of-last-year path — one optional field; today's math is just estimate÷4); (2) **mark-as-paid** → `pagos_ya_hechos` → PDF estimated-payments table; (3) **3 notifications per deadline** (30d/7d/day-of — today it's 1); (4) split the constants into `taxConstants2026.js` and bump 2025→2026. Notification *delivery* is unverified in Expo Go — needs a dev build (flag for QA).

## What it is not

Not tax preparation, not filing, not advice. The app never touches money (no payments, no transfers — hard line). It computes an *estimate*, shows its work, and links out to IRS Direct Pay. Every surface carries the estimate framing: `estimado`, `~`, and a one-line disclaimer ("Esto es una estimación, no asesoría fiscal. Confírmalo con tu preparador."). The signature block on the PDF (brief 04) already establishes the CPA as the authority; this feature keeps that posture.

## The math (deliberately simple)

```
ganancia_neta   = ingresos_negocio − gastos_negocio       (YTD, from existing data)
se_tax          = ganancia_neta × 0.9235 × 0.153
ingreso_gravable≈ ganancia_neta − (se_tax / 2) − deducción_estándar_proporcional
impuesto_est    = ingreso_gravable × tasa_marginal_simple + se_tax
cuota_trimestre = (impuesto_est × safe_harbor_factor) / 4 − pagos_ya_hechos
```

Design choices, made once and documented in code:

- **Safe harbor over precision.** Offer the 100%/110%-of-last-year path if the user enters last year's tax (one optional field), else current-year estimate. Safe harbor is what a CPA would actually recommend and it's penalty-proof — which matches the anxiety being solved.
- **Single filing status assumption (soltero) with one settings override.** Do not build a filing-status wizard.
- **No state tax in v1.** Show "no incluye impuestos estatales" honestly. A state picker with flat estimates can come later.
- All constants (rates, brackets, standard deduction, deadline dates) in one `taxConstants2026.js` file — they change yearly and must be swappable without touching logic. Pure JS, unit-testable, no dependencies. (Today these live inside `taxEstimate.js` for 2025 — extract and bump.)

## Surfaces

**Home screen card.** Below the deduction counter (brief 06), a quiet card: `Próxima cuota estimada — 15 sep · aparta ~$1,150`. Tapping expands the math in plain language: this is what you earned, this is what you deducted, this is the slice that isn't yours. The brand frame writes itself: *tu tajada is what you keep; this is the IRS's tajada.*

**Notifications.** Three per deadline: 30 days out ("El 15 de junio se acerca. Vas apartando ~$1,150?"), 7 days out, day-of. Expo notifications work in Expo Go; local scheduled notifications, no push infra needed. Deadlines: Apr 15, Jun 15, Sep 15, Jan 15 — pulled from the constants file, adjusted for weekends/holidays at generation time.

**Mark-as-paid.** One tap: "Ya lo pagué" records amount and date, feeds `pagos_ya_hechos`, and lands in the PDF as an estimated-payments table — something the CPA genuinely needs at filing time and currently has to ask the client for.

## Why this is the retention feature

Brief 06 makes value visible; this makes the app *scheduled*. A ledger app's natural failure mode is "open it in March, forget it exists." Quarterly deadlines are external, non-negotiable, and recurring — the app doesn't have to manufacture a habit, the IRS provides one. Each notification re-engagement is also a review prompt ("revisa tus gastos antes de calcular"), which feeds data quality for everything else.

## Dependencies and sequencing

Needs income/expense negocio marking (already shipped) — not gated on 05, though categorization improves the estimate's credibility. Build after 06 so the home screen lands as one coherent money story: what you found (06), what to set aside (07).

## What to measure

Notification opt-in rate; app opens in deadline weeks vs. baseline; mark-as-paid usage (the strongest possible signal the estimate was trusted). If users see the number but never mark paid, the estimate isn't credible enough — the fix is showing the math, not hiding it.
