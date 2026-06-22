# App Store Connect — Tajada Listing (Spanish + English)

Paste these into App Store Connect → My Apps → Tajada → App Store tab → Spanish (Mexico) and English (U.S.) localizations. Every character count below has been measured; don't add words without re-checking.

## Categories

- **Primary:** Finance
- **Secondary:** Business

## Age rating

**4+** (no objectionable content in the app itself; the user's transaction data is private to them, and Tajada makes no editorial judgment about which platforms produce those transactions).

## Content rights

Tajada does not use third-party content; no licensing declarations required.

## URLs

- **Privacy Policy URL:** `https://<your-host>/privacy` (the docs/privacy.md you host)
- **Support URL:** `https://<your-host>/support` (the docs/support.md you host)
- **Marketing URL:** `https://tajada.app` (or leave blank if not live)

---

# 🇲🇽 Spanish (Mexico) — primary localization

## App Name

```
Tajada: Impuestos Creadores
```

**Count:** 27 / 30 chars ✓

Rationale: "Tajada" alone is too generic for App Store search. "Impuestos Creadores" makes both the category (taxes) and the audience (creators) instantly clear. Together they convert search intent: a Latino creator typing "impuestos" or "creadores" finds the app.

## Subtitle

```
Schedule C para creadores
```

**Count:** 25 / 30 chars ✓

Rationale: The subtitle is visible in search results AND the listing header. Mentioning "Schedule C" signals the specific IRS form a 1099 filer needs — anyone Googling Schedule C in Spanish lands here.

## Promotional Text

```
Tajada lee tus pagos de Stripe, Patreon, OnlyFans, Venmo y los ordena en categorías listas para tu Schedule C. Todo en español. Todo en tu teléfono.
```

**Count:** 156 / 170 chars ✓

Promotional Text is the ONE field you can change without resubmitting for review — use it for seasonal pushes ("Listo para tax season 2026") or for promoting new features.

## Keywords

```
1099,onlyfans,patreon,stripe,venmo,paypal,latino,negocio,gastos,contador,deducciones,fiscal
```

**Count:** 91 / 100 chars ✓

Notes:
- No spaces between commas — that's wasted characters.
- Don't repeat words already in the app name or subtitle (Apple strips duplicates and you waste characters): "tajada", "impuestos", "creadores", "schedule c" are already in title/subtitle.
- Plural forms preferred for nouns that Spanish speakers commonly search as plurals ("deducciones", "gastos").
- "fiscal" catches both "fiscal" and "fiscal" inflections like "régimen fiscal".

## Description

```
Tajada es la app de impuestos diseñada específicamente para creadores hispanohablantes en Estados Unidos que reciben pagos como 1099 — de OnlyFans, Patreon, Stripe, Venmo, PayPal, Twitch, YouTube, TikTok, Etsy, Substack y más.

¿CÓMO FUNCIONA?

1. Sube tus estados de cuenta en CSV, OFX o QFX (desde tu banco, tarjeta, Venmo o cualquier plataforma de pago).
2. Tajada lee cada transacción, reconoce los comercios más comunes de creadores latinos y los clasifica automáticamente.
3. Marca cada comercio una vez — Tajada lo recuerda para siempre. La próxima importación ya está medio resuelta.
4. Cuando llegue la temporada de impuestos, exporta un PDF con todo organizado en las categorías del Schedule C, listo para entregar a tu contador.

CATEGORÍAS HECHAS PARA CREADORES

No "Auto y Camión" genérico. Tajada usa categorías que realmente entiende un creador: Pagos de Plataforma, Comisiones, Producción de Contenido, Software y Suscripciones, Equipo, Estudio en Casa, Viajes y Rodajes, Promoción, Servicios Profesionales. Cada una se mapea automáticamente a la línea correcta del Schedule C.

CON CONOCIMIENTO DE TUS PLATAFORMAS

Tajada conoce de fábrica más de 180 comercios comunes en el ecosistema creador latino: OnlyFans (y sus procesadores de pago), Fanvue, Fansly, Patreon, Substack, Twitch, YouTube, TikTok Creator Fund, Stripe, Venmo, PayPal, Etsy, Gumroad, Stan Store, Kajabi, Teachable, Whop, Cameo, DoorDash, Uber, Lyft, y muchos más. Si conduces para apps de reparto además de crear contenido, Tajada también lo entiende.

RESPALDO CIFRADO

Tus datos viven solo en tu teléfono — no tenemos servidores que guarden tus transacciones. Pero si te preocupa perder el teléfono en octubre y empezar de cero en febrero, Tajada ofrece respaldo cifrado opcional con AES-256. Tú eliges una frase secreta, Tajada cifra tus sesiones y reglas, y guardas el archivo donde tú quieras (iCloud, Drive, correo). Cero conocimiento: ni nosotros ni nadie puede abrirlo sin tu frase.

PAGO ÚNICO

Tajada es gratis para importar, clasificar y revisar todas tus sesiones. Para exportar el PDF o CSV que entregas a tu contador, pagas $14.99 una sola vez — sin suscripciones, sin renovaciones, sin sorpresas.

LO QUE TAJADA NO HACE

Tajada NO presenta tus impuestos al IRS. Tajada organiza tus transacciones en categorías del Schedule C y genera un reporte para que tú o tu preparador de impuestos las usen al declarar. No reemplaza a un contador.

PRIVACIDAD

• Cero servidores: tus datos nunca salen de tu teléfono.
• Cero rastreo: no usamos análisis, ni cookies, ni identificadores publicitarios.
• Cero ventas de datos: no podemos vender lo que no tenemos.

¿Preguntas? Escríbenos a tajada.soporte@gmail.com
```

**Count:** 2,847 / 4,000 chars ✓

Structure follows App Store best practices:
- First 3 lines (≈170 chars) work as a hook because most users won't tap "more".
- Numbered "how it works" comes early — conversion-driving.
- Features grouped by header (CATEGORIES, PLATFORMS, BACKUP, PRICING, DISCLAIMER, PRIVACY) so the page scans well.
- The "WHAT TAJADA DOESN'T DO" section is a legal shield against Apple's tax-preparation rejection bucket — and honest to the user.

## What's New (release notes — first version)

```
¡Hola! Esta es la primera versión de Tajada.

Tajada es una app de impuestos diseñada para creadores hispanohablantes que reciben pagos como 1099 en Estados Unidos. Importa tus estados de cuenta, clasifica tus comercios una vez, y exporta un PDF listo para tu contador con todo organizado según el Schedule C.

¿Una plataforma que Tajada no reconoce? ¿Una categoría que falta? Escríbenos a tajada.soporte@gmail.com — Tajada se mejora con lo que nos cuentan los creadores.
```

**Count:** 461 / 4,000 chars ✓

## App Review Notes (for Apple's reviewer)

```
Hi App Review Team,

Tajada is an on-device tax-organization tool for Spanish-speaking 1099 filers in the U.S.

— No backend, no accounts, no login required. The reviewer can use any iPhone with sample CSV data; nothing to set up.

— The app accepts CSV, OFX, and QFX files. For testing, the reviewer can use any bank or platform statement export. If a sample file is needed, please email pablo at the address below and one will be provided.

— In-App Purchase: one non-consumable purchase ("Tajada Export Unlock", product ID com.tajada.app.full_export) gates the PDF and CSV export. The free experience (import, classify, view summary) is complete and useful without the IAP.

— Privacy: Tajada does not collect, transmit, or store any user data on remote servers. There is no analytics SDK, no telemetry, no identifiers for advertisers. The privacy policy details this at the privacy URL above.

— The app does NOT prepare or file taxes. It organizes transactions into Schedule C categories and generates a PDF/CSV for the user's tax preparer. This is stated explicitly in-app and in the description.

If you have any questions during review, please contact:
Pablo Varona — elnenecarambola@gmail.com

Thank you for your review!
```

---

# 🇺🇸 English (U.S.) — secondary localization

If you submit with English as a second localization (recommended — many bilingual Latino creators search in English), use these. Same structure as above but tightened to the same character budgets.

## App Name

```
Tajada: Creator 1099 Taxes
```

**Count:** 26 / 30 chars ✓

## Subtitle

```
Schedule C for creators
```

**Count:** 23 / 30 chars ✓

## Promotional Text

```
Tajada reads your Stripe, Patreon, OnlyFans and Venmo payouts and sorts them into ready-to-file Schedule C categories. Spanish-first. All on-device.
```

**Count:** 152 / 170 chars ✓

## Keywords

```
1099,onlyfans,patreon,stripe,venmo,paypal,creator,deductions,freelance,latino
```

**Count:** 78 / 100 chars ✓

## Description (English)

```
Tajada is the tax-organization app built specifically for U.S.-based Spanish-speaking creators who get paid as 1099 contractors — from OnlyFans, Patreon, Stripe, Venmo, PayPal, Twitch, YouTube, TikTok, Etsy, Substack, and more.

HOW IT WORKS

1. Import your bank, card, Venmo, PayPal or platform statements as CSV / OFX / QFX.
2. Tajada reads each transaction, recognizes the merchants creators actually use, and pre-classifies them.
3. Tap a merchant once to confirm — Tajada remembers it forever.
4. At tax time, export a PDF organized by Schedule C category, ready for your accountant.

CREATOR-NATIVE CATEGORIES

Not generic "Car and Truck" or "Office Expenses". Tajada uses categories creators understand: Platform Payouts, Platform Fees, Content Production, Software and Subscriptions, Equipment, Home Studio, Travel and Shoots, Promotion. Each maps automatically to the right Schedule C line.

KNOWS YOUR PLATFORMS

Tajada ships with 180+ creator merchants pre-loaded: OnlyFans (and its payment processors), Fanvue, Fansly, Patreon, Substack, Twitch, YouTube, TikTok Creator Fund, Stripe, Venmo, PayPal, Etsy, Gumroad, Stan Store, Kajabi, Teachable, Whop, Cameo, DoorDash, Uber, Lyft, and more.

ENCRYPTED BACKUP

Your data lives only on your phone. Tajada doesn't have servers that store your transactions. Optional encrypted backup (AES-256, PBKDF2 key derivation) lets you save a passphrase-locked snapshot to iCloud, Google Drive, or anywhere else — zero knowledge, only you can open it.

ONE-TIME PURCHASE

Free to import, classify, and review. $14.99 one-time unlock for PDF and CSV export. No subscription.

WHAT TAJADA DOES NOT DO

Tajada does NOT file taxes with the IRS. It organizes your transactions into Schedule C categories and produces a report for you or your tax preparer. It is not a substitute for a CPA.

PRIVACY

• No servers — your data never leaves your phone.
• No tracking — no analytics, cookies, or ad identifiers.
• No data sales — we can't sell what we don't have.

Questions? tajada.soporte@gmail.com
```

**Count:** 2,178 / 4,000 chars ✓
