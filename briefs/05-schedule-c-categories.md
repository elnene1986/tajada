# Tajada — Schedule C categorization in-app

## Why this is the next thing

Brief 04 names "replace 'Sin categoría' with AI-suggested Schedule C categories" as the single highest-leverage change to the PDF. That brief can't actually land, though, because today the app has no place to put a category. The toggle is binary: gold check = business, grey X = personal. There's no third axis. Brief 04 is gated on this brief.

Underlying tension: the current binary toggle is *good*. It's fast, legible, and the user already knows how it works. Adding categorization without breaking that flow is the design problem. The wrong move is forcing a category every time the user marks something business — that turns a 1-tap action into a 2-tap action across 71 expense rows. The right move is making the app *guess* the category, mark it with appropriate confidence, and let the user override only when they want to.

In one line: **categorization is automatic at import; the user confirms or corrects, but never has to author.**

## The four options, honestly

**1. Third tap state (cycle business → personal → ???).** A non-starter. The two-state toggle works precisely *because* it's binary. Adding a third state on the same control makes every tap ambiguous ("which way is it cycling now?") and breaks the muscle memory of fast review. Reject.

**2. Long-press for a category sheet.** Works as an *override*, not a primary flow. Long-press is discoverable enough for power users but invisible for everyone else. It can be one of the override paths, but if it's the *only* path the categorization will stay empty for the same reason it's empty today: the user has nothing pushing them to enter a category. Partial answer.

**3. ML-assisted auto-categorization from merchant name.** The right primary mechanism. Every business transaction gets a suggested Schedule C category at import time, using the same classifier infrastructure as `02-smart-defaults-gastos.md` extended to map merchant → Schedule C line. The user sees the suggestion as a small chip on the row. If it's right (~80% of the time for a creator's expenses, which are dominated by software and contract labor), the user does nothing. If wrong, they tap to change.

**4. Punt to CPA review step.** A reasonable fallback for *low-confidence* rows but a bad primary strategy. If the export goes to the CPA with 71 "Sin clasificar" lines, the document looks unfinished and the CPA does the work Tajada was supposed to do. As a graceful exit for the ~5–10% of rows the classifier can't confidently call, fine. Not the main flow.

**Recommendation: 3 as the engine, 2 as the override path, 4 as the safety net.** The user's primary experience is: the app already filled in a category, and they only touch it when they disagree.

## The Schedule C category set for creators

The full Schedule C has 19 expense lines (8–27a). Most don't apply to a solo creator. The subset that actually shows up in a creator's bank export — based on the data already seen in `Tajada_2025.pdf` — is small:

| Schedule C line | Internal category key | Spanish label (in-app) | What goes here |
|---|---|---|---|
| 8 | `advertising` | Publicidad | Meta ads, Google ads, sponsored posts, podcast spots |
| 10 | `commissions_fees` | Comisiones y plataformas | Stripe fees, Patreon fees, PayPal fees, Substack fees, Gumroad cuts |
| 11 | `contract_labor` | Servicios profesionales contratados | Editors, VAs, designers, illustrators paid via Zelle/Venmo/Stripe |
| 17 | `legal_professional` | Servicios legales y contables | Lawyer, CPA, tax preparer fees |
| 18 | `office_expense` | Gastos de oficina | Small office supplies, paper, printer ink (not equipment) |
| 20b | `rent_business` | Renta de espacio | Coworking, studio rent |
| 22 | `supplies` | Insumos del trabajo | Production consumables — batteries, cables, gels, blank media |
| 23 | `taxes_licenses` | Impuestos y licencias | Business license fees, state filings, sales tax remitted |
| 24a | `travel` | Viajes de negocio | Flights, hotels, train, business mileage *if* the user logs it |
| 24b | `meals` | Comidas de trabajo | Client meals, on-set meals — note 50% deduction in PDF copy |
| 25 | `utilities` | Servicios | Business internet, business phone share — *usually* mixed-use, flag for review |
| 27a (Part V) | `software_subscriptions` | Software y suscripciones | Adobe, Figma, Notion, ChatGPT, hosting, domain — by far the largest bucket for creators |
| 27a (Part V) | `professional_development` | Educación y formación | Courses, books, conferences, masterclasses |
| 27a (Part V) | `bank_fees` | Cargos bancarios | Business bank fees, wire fees |
| — | `equipment` | Equipo (depreciar) | Cameras, computers, lenses > $200 — flag separately; goes on Line 13 / Form 4562 *not* a normal expense |
| — | `uncategorized` | Sin categoría — revisar | Confidence below threshold |

**Notes on line choices:**

- **Software subscriptions live on Line 27a (Other expenses) with a detail line in Part V.** Some preparers route SaaS to Line 22 (Supplies) instead. The internal key stays `software_subscriptions`; the PDF can be configured per preparer preference in a future setting if it comes up. For now, 27a is the modern norm.
- **Platform fees on Line 10, not 27a.** Brief 04 currently routes "Comisiones de pago" to "Línea 27a — Otros." That's wrong for 2025 Schedule C — Line 10 "Commissions and fees" is the correct home for Stripe/Patreon/PayPal cuts. Update brief 04 alongside this one.
- **Equipment is its own thing.** Cameras, computers, lenses over the de minimis threshold ($200ish, varies by year) are technically Section 179 / Form 4562 territory, not a Schedule C expense line. Tajada should *flag* these for the user ("Esto parece equipo — tu preparador podría depreciarlo en lugar de deducirlo completo") but should not try to file them itself. Surface in the PDF under a separate "Posible equipo a depreciar" block; do not roll into a regular Line.
- **Mileage is not in this list.** Vehicle expenses (Line 9) require either actual cost tracking or mileage logging, neither of which Tajada has data for. The PDF methodology section already disclaims this; the app should not pretend to categorize it.

## Merchant → category mapping (extends brief 02)

Brief 02 produces a business/personal/ambiguous verdict per merchant. This brief extends each *business* verdict with a Schedule C category. Same architecture: deterministic lookup first, LLM for the long tail, cached forever.

```
Adobe, Figma, Notion, Canva, Frame.io, Riverside, Descript,
Loom, Slack, Zoom, Google Workspace, Microsoft 365, Asana,
Airtable, Linear, Miro, Calendly, Typeform, Mailchimp,
Beehiiv, Substack (paid tier), ConvertKit, Ghost, Gumroad,
LemonSqueezy, OpenAI, Anthropic, Claude, ChatGPT, Midjourney,
Runway, ElevenLabs, GitHub, Replit, Vercel, Netlify,
Cloudflare, AWS, Google Cloud, DigitalOcean, Linode,
GoDaddy, Namecheap, Squarespace, Webflow, Wix, WordPress,
Bluehost, Dreamhost, Storyblocks, Envato, Shutterstock,
Adobe Stock, Epidemic Sound, Artlist, Musicbed, Soundstripe
                                                  → software_subscriptions (27a)

Stripe fees, Patreon fees, PayPal fees, Substack fees,
Gumroad fees, LemonSqueezy fees, Square fees             → commissions_fees (10)

WeWork, Industrious, Regus, Spaces, Convene, Deskpass    → rent_business (20b)

B&H Photo, Adorama, Sweetwater, Musician's Friend,
Guitar Center, Reverb, Keebio  → equipment IF amount > $200 ELSE supplies (22)

Apple.com/Bill amount > $200   → equipment (flag for depreciation)
Apple.com/Bill amount $10–200  → software_subscriptions (27a)

Zelle/Venmo to known recurring payee (≥3 payments to same name)
                               → contract_labor (11)

Meta Ads, Facebook Ads, Google Ads, X/Twitter Ads,
TikTok Ads, LinkedIn Ads, Promoted Posts                 → advertising (8)

Bank fees, wire fees, Zelle return fees                  → bank_fees (27a)

Tax prep services, CPA fees, lawyer fees                 → legal_professional (17)
```

The contract-labor heuristic ("≥3 payments to same payee") is worth highlighting: it's how Tajada knows that "Haroutyoun Demirjian" with 12 payments totaling $16,500 is a contractor and not a one-off gift. This is also exactly the data brief 04 uses for the 1099-NEC page. Same signal, two outputs.

## UI: the category chip

The Revisar row gets a *third* visual element next to the existing checkbox and merchant name. Specifically, on rows marked business, a small chip appears under the merchant name showing the suggested category. On rows marked personal, the chip is hidden (it doesn't apply).

```
┌────────────────────────────────────────────────────────────────────┐
│ ✓  Adobe                                          $54.99   ↻ 12x   │
│    🏷 Software y suscripciones · sugerido          Mar 14           │
│                                                    Chase 3138       │
└────────────────────────────────────────────────────────────────────┘
```

Tap the chip → category sheet opens with the full creator-relevant list, current category pre-selected, "Sin categoría" at the bottom for opt-out.

Chip states:

- **High-confidence suggestion (≥85%):** chip background is the cream tint, no "sugerido" label, just the category name. Treated as accepted by default.
- **Medium-confidence suggestion (70–85%):** chip background is cream with a dotted outline, label reads `Sugerido: Software y suscripciones`. Tappable to confirm or change. User can ignore.
- **Low-confidence (<70%):** chip reads `Categorizar · sin clasificar`, in muted grey. Surfaced in the export-time review step.

The chip never blocks the negocio/personal toggle. The user can mark 71 rows as business, never touch a chip, and the export still works — every chip in the suggested or high-confidence state contributes its category to the PDF, and the rest fall into "Sin clasificar — revisar con preparador" exactly as brief 04 describes.

This is the key design constraint: **categorization is opt-in to *correct*, not opt-in to *fill in*.**

## Export-time review (the safety net)

When the user taps "Exportar PDF" on the Resumen screen, if any rows are in the low-confidence bucket *or* unclassified entirely, surface a one-screen review prompt before generating:

```
Antes de exportar

Quedan 7 transacciones sin categoría clara.
Tu preparador las puede revisar, pero si querés
asignarlas vos, tardás un minuto.

  [ Revisar 7 ahora ]   [ Exportar así ]
```

Tap *Revisar* → the seven rows show in a focused list with the category sheet inline. Tap *Exportar así* → the PDF generates with "Sin clasificar — revisar con preparador" on those rows.

Both paths are valid. Some users want to hand the CPA a finished doc; others trust the CPA to do the last 5%. Don't force one over the other.

## Bulk-apply (this also addresses gap #2 from the audit)

When the user manually changes a category on a row that has a repeat-frequency indicator (↻ 12x), prompt:

```
"Aplicar Servicios profesionales contratados a las 12 transacciones de Haroutyoun Demirjian?"
[ Solo esta ]   [ Las 12 ]
```

Same pattern as the bulk-apply we still owe for negocio/personal (gap #2 in the audit). This is the natural place to introduce it: the ↻ indicator already shows the count, the user already understands the rows are linked.

## Smart-default classifier extension

```swift
struct CategoryGuess {
    let category: ScheduleCCategory
    let confidence: Double
    let reason: String  // short Spanish phrase
}

enum ScheduleCCategory: String, CaseIterable {
    case advertising            // Línea 8
    case commissionsFees        // Línea 10
    case contractLabor          // Línea 11
    case legalProfessional      // Línea 17
    case officeExpense          // Línea 18
    case rentBusiness           // Línea 20b
    case supplies               // Línea 22
    case taxesLicenses          // Línea 23
    case travel                 // Línea 24a
    case meals                  // Línea 24b
    case utilities              // Línea 25
    case softwareSubscriptions  // Línea 27a (Part V)
    case professionalDevelopment // Línea 27a (Part V)
    case bankFees               // Línea 27a (Part V)
    case equipment              // Flag for depreciation — Form 4562
    case uncategorized
}

extension ExpenseClassifier {
    static func suggestCategory(
        merchant: String,        // cleaned displayName
        amount: Double,
        rawDescription: String,
        repeatCount: Int,        // from the ↻ indicator
        sessionContext: SessionContext
    ) -> CategoryGuess {

        // 1. Deterministic lookup against the maps above.
        if let hit = CategoryMaps.lookup(merchant: merchant, amount: amount) {
            return hit
        }

        // 2. Contract-labor heuristic.
        if isPersonalNamePayment(rawDescription) && repeatCount >= 3 {
            return CategoryGuess(
                category: .contractLabor,
                confidence: 0.88,
                reason: "Pagos recurrentes a una persona"
            )
        }

        // 3. LLM fallback for the long tail.
        return llmCategorize(merchant: merchant, amount: amount, context: sessionContext)
    }
}
```

The LLM prompt mirrors the one in brief 02, with an extra return field:

```
Return JSON: {
  "businessGuess": "BUSINESS|PERSONAL|AMBIGUOUS",
  "businessConfidence": 0.0-1.0,
  "categoryGuess": "advertising|commissions_fees|contract_labor|...|uncategorized",
  "categoryConfidence": 0.0-1.0,
  "reason": "short Spanish phrase combining both"
}
```

One LLM call per merchant produces both signals. No need to call twice.

## Data model

Add to the Transaction model:

```swift
struct Transaction {
    // existing
    let raw: String
    let displayName: String
    let amount: Double
    let date: Date
    var classification: Classification  // .business | .personal

    // new
    var categoryGuess: ScheduleCCategory      // populated at import
    var categoryConfidence: Double            // 0.0-1.0
    var categoryUserConfirmed: Bool           // true if user has touched it
    var categoryUserOverride: ScheduleCCategory?  // non-nil if user changed it
}
```

Two fields rather than one for the user state matters for analytics later: "what fraction of suggestions did the user accept?" is a quality signal worth tracking locally (no telemetry — just for the user's own "I've reviewed everything" surface).

## Migration

Existing sessions don't break. Every transaction in an existing session gets `categoryGuess = .uncategorized` and `categoryUserConfirmed = false`. The PDF for those sessions renders the same way it does today. New imports (from version X onward) get the full suggestion pipeline.

Optionally: an "Actualizar categorías sugeridas" button on old sessions, which runs the classifier retroactively over the existing rows without changing any user-confirmed states. Low-risk, opt-in.

## What about the binary itself — should *personal* rows get categories too?

No. Schedule C is a business document; personal categorization adds noise the CPA doesn't want. The chip is hidden on personal rows. If the user is curious where their personal money went, that's a Tajada *Insights* feature for a future brief, not part of this one.

## Priority within this doc

If you build only one thing this quarter:

1. The deterministic merchant → category map (the table above). Zero LLM dependency, catches the dominant cases — software subs, platform fees, coworking. This alone takes the PDF's "Sin categoría" rate from 100% to maybe 60%.

Then in order of return:

2. The category chip on the Revisar row, suggested-state only. Show it, make it tappable, open a category sheet. Don't worry about confidence styling yet.
3. The contract-labor heuristic (3+ payments to same personal name). This catches the largest single dollar bucket for most creators and ties to the 1099-NEC page in brief 04.
4. The export-time review prompt for low-confidence rows.
5. The bulk-apply prompt on repeat payors. (Also serves audit gap #2.)
6. LLM fallback for the long tail. Last because it's the most engineering and the least leverage — the deterministic map already covers most real expenses.

## Cross-references

- Brief 01 (`01-merchant-cleanup.md`) — the cleaned `displayName` is the lookup key for every map in this brief.
- Brief 02 (`02-smart-defaults-gastos.md`) — same classifier infrastructure; this brief is the categorization layer on top of business/personal.
- Brief 04 (`04-pdf-export-polish.md`) — the consumer. The "Sin categoría" replacement, the 1099-NEC page, and the top-sources page all use the data this brief produces. Worth a small edit to brief 04 to move "Comisiones de pago" from Line 27a to Line 10 — that was wrong.
- Audit gap #2 (bulk-apply on repeat payors) — addressed as a side effect of the category bulk-apply prompt. Remove it from the open-gap list once both ship.

## What this leaves open

After this ships, three of the four audit gaps remain:

- **Row-tappable target.** One-line SwiftUI fix from brief 01's "Bonus" section — still not landed.
- **Resumen emotional moment.** Untouched. Still its own brief.
- **Equipment/depreciation flagging.** This brief defers it to a *flag*, not a full feature. A future brief should think about whether Tajada wants to actually help with Section 179 / Form 4562 or just keep flagging and handing off.
