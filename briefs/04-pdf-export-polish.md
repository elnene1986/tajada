# Tajada — PDF export polish

Reference: the current 6-page export `Tajada_2025.pdf`.

## What's already good (be honest)

The bones are real. Three KPI cards mirror the app for visual continuity. The category tables are pre-structured for Schedule C (the column is there, ready to be populated). The personal-exclusions summary box is clearly labeled. The full transaction detail is itemized with dates, descriptions, source, and amount. Math ties out. Page 6 has an actual signature block ("Revisado por · Fecha · Preparador") which is a respectful, professional detail almost no consumer finance app bothers with. The Spanish-first language is consistent. Typography is clean.

A CPA receiving this would not be upset. They'd just be doing more work than they should have to.

## The two systemic issues

**1. "Sin categoría" everywhere.** 76 of 77 income rows and 71 of 71 expense rows are uncategorized. The Schedule C line column exists and is empty for almost everything. This means the CPA receives a tidy negocio/personal split — useful — but still has to categorize 148 lines into Schedule C buckets themselves. The export looks finished but isn't. Fixing this is the single highest-leverage PDF change you can make.

**2. Raw bank strings throughout the detail tables.** "Zelle from MARK MALATESTA," "APPLE COM BILL 866 712 7753 CA," "ATM Withdrawal - Walgreens, LAS VEGAS, NV." Same problem as the app screens, but now in a document the CPA opens cold. Fix is the same: the merchant cleanup from `01-merchant-cleanup.md`, applied at the rendering layer so the PDF uses `displayName` not `raw`. The original strings should still appear in the CSV export and optionally in a hidden audit appendix, never in the user-facing tables.

Fix these two and the document is transformed before any redesign work happens.

## Page-by-page changes

### Page 1 — Cover (currently functional, not document-grade)

Today, page 1 jams the executive summary and the start of the income detail onto the same page. A CPA receiving this opens to "REPORTE FISCAL DE CREADOR · AÑO FISCAL 2025" with no taxpayer name, no period range, no source breadcrumb.

Add to the cover, above the KPI cards:

```
PABLO VARONA
Creador / Solo operator
Año fiscal 2025  ·  Período: 1 de enero – 31 de diciembre, 2025
Generado a partir de: 360Checking_3138.csv (160 transacciones)
Reporte preparado: 26 de mayo, 2026
```

The taxpayer name should pull from a one-time setup field on first run ("¿Cómo aparece tu nombre en los documentos fiscales?"). The period range comes from `min(date)`–`max(date)` of the loaded transactions, not the calendar year, because the user might load a partial period. The source breadcrumb is already on the in-app Resumen screen — surface it here too. Report date pulls from `generated_at`.

Push the rest of the report to page 2. Page 1 should be a cover, not a cover-plus-list-start. The CPA's first impression is the cover.

### New page 2 — Executive summary with narrative

The three KPI cards stay. Add a single contextual sentence under "Ganancia neta," same logic as the in-app version from `03-brand-voice-copy.md`:

- Positive: "Cerraste el período con ganancia."
- Near zero (-$500 to +$500): "Cerraste el período casi a la par."
- Modest loss: "Cerraste en pérdida. Comentar con preparador para determinar arrastre o ajustes."
- Larger loss (<-$5,000): "Cerraste con pérdida significativa. Revisar con preparador prioritariamente."

For the *user's copy* of the PDF this lands as warmth. For the *CPA's copy*, the same line reads as a clear flag of what to discuss first. One line, dual purpose.

Also on this page: the personal-exclusions summary block, kept as is but renamed *Tu tajada personal* per the brand voice doc.

Net column color: when negative, render in the same deep red as the in-app Resumen. The current blue-grey tint mutes the signal. Don't soften the loss.

### New page 3 — Top sources of income

This is a new surface and it's the page CPAs will read most carefully. Group income by *cleaned merchant name*, descending by total:

```
PRINCIPALES FUENTES DE INGRESO

PAGADOR                          # TRANS    TOTAL          LÍNEA SUGERIDA
Benjamin Plaksin                 23         $6,975.00      Línea 1 — Ingresos brutos
Mark Malatesta                   10         $2,321.75      Línea 1 — Ingresos brutos
Dominic Nguyen                   7          $1,360.00      Línea 1 — Ingresos brutos
Venmo cashout (varios)           3          $3,100.00      Requiere desglose por fuente
Polina Tumarkin                  4          $450.00        Línea 1 — Ingresos brutos
...                              ...        ...            ...

Subtotal — fuentes principales              $XX,XXX.XX
Otros pagadores (X)                         $X,XXX.XX
Intereses bancarios                         $0.63          Línea 6 — Otros ingresos
Total ingresos del negocio                  $17,308.97
```

For a creator earning from named individuals, this *is* the Schedule C Line 1 picture. It also doubles as the user's "do I need to issue 1099s?" check — which is the next page.

### New page 4 — Pagos que requieren 1099-NEC

A creator who paid any non-employee more than $600 during the tax year is required to issue them a 1099-NEC. Most don't know this. Tajada can detect this trivially from the cleaned expense rows.

```
PAGOS A NO-EMPLEADOS DEL AÑO (POSIBLE 1099-NEC)

DESTINATARIO                     # PAGOS   TOTAL         ¿1099-NEC REQUERIDO?
Haroutyoun Demirjian             12        $16,500.00    Sí — supera $600
Sarai Monttedoro                 12        $3,240.00     Sí — supera $600
Julio Mendoza                    4         $745.00       Sí — supera $600
Wade Griffith                    2         $120.00       No — bajo $600
Miguel Velazquez-Garcia          1         $240.00       No — bajo $600
...

Aclaración: este resumen agrupa pagos por destinatario aparente.
Confirmar con tu preparador qué pagos califican como servicios profesionales (1099-NEC requerido)
versus pagos personales, rentas, o reembolsos (1099 no aplica).
```

This single page can transform Tajada's value to the CPA. It catches a tax obligation that most creators forget about and that CPAs spend hours chasing in January. It's also a feature competitors don't have — Hurdlr and QuickBooks Self-Employed do not produce this directly.

### Restructured pages 5+ — Category breakdown with suggestions

The current category tables are correct in shape but empty. Replace "Sin categoría" with AI-suggested Schedule C categories using the same logic from `02-smart-defaults-gastos.md`, extended to map to Schedule C lines:

```
GASTOS POR CATEGORÍA SUGERIDA

CATEGORÍA              LÍNEA DEL SCHEDULE C            # TRANS    TOTAL
Servicios profesionales Línea 11 — Contract labor      30         $19,460.00
Suscripciones de SW    Línea 22 — Supplies / 27a       5          $164.84
Retiros en efectivo    Requiere clasificación manual   8          $1,820.00
Comisiones de pago     Línea 27a — Otros               18         $401.31
Otros                  Sin clasificar                  10         $2,804.59
TOTAL                                                  71         $24,650.74

Nota: las categorías son sugerencias automáticas basadas en patrones de descripción.
Confirmar y ajustar antes de declarar.
```

Same for the income side with the appropriate Schedule C lines.

Even when the AI is unsure, *something* in the category column beats "Sin categoría" 71 times in a row. "Sugerido: Servicios profesionales — confirmar" is more useful than blank.

### Detail tables — minor polish

Keep these but apply the cleanup:

- Use `displayName` from the merchant cleanup, not the raw bank string.
- Drop the "ORIGEN" column when there's only one source (it's "Bank" 148 times — noise). Reintroduce when the user has multiple statements imported.
- Add a small `# de repetición` indicator on rows for recurring payors ("23x") matching the in-app ↻ marker. The CPA scanning the table sees "Benjamin Plaksin · 23x · $300.00" and immediately understands this is a regular client.
- Add quarterly subtotals as faint horizontal dividers. Most CPAs reconcile quarter-by-quarter against bank statements.

### Final page — Methodology + signature (replacing current page 6)

Currently page 6 has the signature block in the top quarter and the rest is blank. Fill that white space with a short methodology section the CPA can rely on:

```
NOTAS METODOLÓGICAS

· Fuente: estado de cuenta cargado por el usuario el 15 de abril, 2026.
· Clasificación negocio/personal: realizada por el usuario en la app Tajada.
· Categorías Schedule C: sugeridas automáticamente por Tajada;
  requieren confirmación del preparador antes de presentar.
· Limitaciones de este reporte:
  – Solo incluye transacciones presentes en los estados cargados.
  – No incluye millas de vehículo, oficina en casa, depreciación, ni gastos en efectivo
    no documentados en los estados.
  – No incluye 1099 emitidos al contribuyente (verificar por separado).
· Los nombres de comerciantes han sido limpiados desde las descripciones bancarias originales
  para legibilidad. Las descripciones originales están disponibles en el CSV adjunto.

Este reporte es solo para fines informativos.
Consulta a un profesional de impuestos para asesoría sobre la declaración.


_____________________________     _______________     _____________________________
Revisado por (nombre)             Fecha                Preparador (si aplica)
```

The methodology section is gold to a CPA: it tells them exactly what they're looking at and what's *not* in the report. The limitations bullets are pre-empting the most common questions they'd otherwise have to ask the user. Most accounting exports don't bother with this, which is why CPAs end up asking the same five questions every year.

## Color and typography

- Net loss should render in the same deep red as the in-app Resumen (`#A33037` or whatever the app uses), not the muted blue-grey of the current `Ganancia Neta` card. A loss should *look* like a loss.
- Profit renders in the warm gold of the brand (`#B68427` or thereabouts), not generic green.
- The Tajada wordmark on the cover should be at least 1.5x its current size; the cover is a cover.
- Section dividers under "Ingresos por categoría" and similar headers should be the same warm cream/mustard combination used in the app, not generic black underlines.
- Detail-table row stripes should be very subtle (5% tint of the cream background, not pure alternating white).

## Implementation notes

- Render the PDF from the same data model the in-app Resumen uses, so the two stay in sync forever. No second source of truth.
- Generate two variants of the PDF: a *taxpayer copy* (with the optional "Para ti — antes de enviarle esto a tu preparador" appendix listing common deductions the user might be missing — mileage, home office, retirement contributions, health insurance, business meals) and a *preparer copy* (without that appendix; the CPA doesn't need it). One toggle on the export screen: *¿Es para ti o para tu preparador?*
- File naming: `Tajada_{taxpayer_last_name}_{tax_year}_{generated_date}.pdf` — e.g. `Tajada_Varona_2025_2026-05-26.pdf`. The current `Tajada_2025.pdf` is too generic if the user generates multiple drafts.
- Always also export the CSV alongside the PDF. The CSV should include both `clean_description` and `raw_description` columns so the CPA can drill back to the bank source if anything looks off.

## Priority within this doc

If you can only do three things this week on the PDF:

1. Add the cover-page taxpayer + period + source breadcrumb block. Lowest-effort, highest-perceived-quality jump.
2. Apply merchant cleanup to the detail tables (depends on doc `01`).
3. Replace "Sin categoría" with AI-suggested Schedule C categories on both tables (depends on doc `02` extended to Schedule C lines).

The new pages (Top sources of income, 1099-NEC issuance check, methodology) are tier 2 — high value, more engineering. Do them in the second pass.
