# Tajada — per-bank CSV export guides

## The problem this solves

The hardest step in Tajada is the first one: getting a CSV out of a bank app. It happens before the user has seen any value, it's the step they've never done before, and failing it means deleting the app in minute one. Plaid-style auto-sync would erase the step entirely, but it requires a backend, recurring per-user fees, and breaking the "Cada transacción se queda en tu teléfono" promise — a deliberate later-maybe (see decision log). This brief is the interim answer: **teach the step instead of removing it.**

In one line: a "¿Cómo saco el archivo de mi banco?" guide on the import screen, with exact steps per bank.

## What it is

On the Import screen, below the dropzone / "Fuentes compatibles" area, one quiet affordance: `¿Cómo saco el archivo? →`. Tapping opens a bank picker (grid of names, most common first), and picking a bank shows a numbered step list, in the brief 03 voice, e.g.:

> **Capital One**
> 1. Abre la app de Capital One
> 2. Toca tu cuenta → **Ver estados de cuenta** (o "Download Transactions" en la web)
> 3. Elige el rango de fechas — para impuestos, todo el año
> 4. Formato: **CSV** → Descargar
> 5. Regresa a Tajada y toca "Subir estados de cuenta"

Each guide ends with the same reassurance line: *"El archivo se queda en tu teléfono. Tajada no se conecta a tu banco."* — turning the manual step into a privacy feature instead of a chore.

## Coverage

Start with what the parsers already understand plus the sources the home screen advertises: **Capital One, Chase, Bank of America, Wells Fargo, Venmo, PayPal, Stripe, Patreon**, plus one generic entry ("Otro banco") explaining what to look for anywhere: "busca 'Download', 'Export' o 'Estados de cuenta', y elige CSV." Eight specific + one generic is enough for v1; add banks when support emails reveal gaps.

## Structure — content as data

Bank UIs change and steps go stale; the design must make updating them trivial. All guides live in one data module (`src/data/bankGuides.js`): `{ id, name, steps: [i18n keys], note? }`. The screen is a dumb renderer. Updating a stale guide = editing strings, no UI work. i18n through `t()` as always, so the English versions come free once brief 10 lands.

**No screenshots in v1.** Images of bank UIs go stale faster than text, bloat the bundle, and arguably invite trademark questions. Numbered text steps, bold on the button names the user must find.

## What not to build

No in-app browser to the bank's site (security posture nightmare). No deep links into bank apps (fragile, undocumented). No auto-detection of "which banks does this user have" (the app deliberately knows nothing). No Plaid — that decision stays parked until distribution is proven.

## Placement beyond the import screen

The empty state matters most: a fresh install with zero sessions should surface the guide link prominently, because that user is exactly the one stuck on the step. Once sessions exist, the affordance can shrink to a small link.

## Dependencies and sequencing

None — pure content + one screen, S-sized, no gates in either direction. Good filler PR between larger phases (slot after settings screen, or whenever a small win is needed). Feeds every metric that matters: it exists to raise the % of installs that complete a first import.

## What to measure

First-import completion rate before vs. after (the only number this brief cares about); which banks get opened in the guide (tells you which parsers/guides to invest in next); support emails about "cómo descargo el archivo" trending to zero.
