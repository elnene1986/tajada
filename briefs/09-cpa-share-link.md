# Tajada — CPA share link (extends 04, doesn't replace it)

## The insight

Brief 04 polishes the PDF; this brief changes *how it travels*. Today the export's last hop is "attach PDF to email/WhatsApp" — a dead end. The CPA opens a file with no idea what produced it, does their work, and the app gets nothing back: no attribution, no channel, no loop.

But look at who receives it. A tax preparer serving Spanish-speaking freelancers sees dozens of clients a season, almost all arriving with shoeboxes and screenshots. The one client who arrives with a clean, categorized, signature-blocked Tajada report is memorable — and the preparer is the single most trusted voice in that client's financial life. One preparer who starts *recommending* Tajada is worth more than any paid channel.

In one line: **make the CPA's copy of the report a doorway back to the app.**

## What it is, honestly scoped

This is not a client portal, not CPA accounts, not collaboration software. V1 is deliberately thin:

**1. A share screen instead of a bare file.** "Enviar a tu preparador" — chooses WhatsApp/email/etc. via the native share sheet (`expo-sharing`, works in Expo Go), sending the PDF plus a short pre-written message in the brief 03 voice: *"Mi resumen fiscal 2026, hecho con Tajada."* The message, not just the file, carries the brand.

**2. Attribution built into the document.** The PDF footer (touching only the rendering layer from brief 04) gains one restrained line: `Preparado con Tajada · <preparer URL>`. Every page, small, dignified — the document is seen by exactly the person we want to reach, at the moment they're most impressed by it.

> **Phase 0 note (2026-07-01) — B4.** `tajada.app` is **not registered** — the live pages are on GitHub Pages (`https://elnene1986.github.io/tajada/`). Put the URL in a **single constant** and point the footer at the live GH Pages URL for now (the `/preparadores` landing page can be a section there); swap the constant for `tajada.app/preparadores` when the domain is registered. Don't hard-code the URL across the template. Everything else in this brief holds — `expo-sharing` is already installed (used by backup), and the PDF exists.

**3. A preparer landing page.** `tajada.app/preparadores` — one static page, Spanish-first: what the export contains, how categories map to Schedule C lines, and "¿Tus clientes llegan con cajas de recibos? Recomiéndales Tajada." A referral code per preparer can come later; v1 just needs the page to exist so the footer link lands somewhere credible.

**4. (v1.5, optional) A hosted link instead of an attachment.** `tajada.app/r/<token>` serving the PDF plus a light HTML summary — enables "report updated, same link" and gives real analytics (did the CPA open it? which pages?). Requires hosting and token auth; defer until 1–3 prove the loop. Nothing else in this brief needs a backend.

## Why the footer matters more than the link

The PDF travels into exactly one inbox — but it's the *right* inbox. Consumer apps pay $30–80 CAC to reach a general user; this document lands, free, in front of a professional whose recommendation converts at near-100% trust. The footer is the entire distribution strategy compressed into one line of text. It costs nothing, offends no one (professional documents cite their tooling all the time), and it's the reason this brief exists.

## Guardrails

The report belongs to the user, not to Tajada's growth. No banner ads inside the document, no watermarks, no "made with the free version" nags — one footer line and done. The signature block from brief 04 stays the visual authority of the last page; the footer never competes with it. If the user wants the footer off, that's a fine paid-tier perk later, but the default ships on.

## Voice (per brief 03)

Share screen: `Tu tajada, empacada. ¿A quién se la mandas?` Post-send toast: `Enviada. Tu preparador te va a querer.` The pre-written message the CPA's client sends should sound like the *user*, not like marketing — short, factual, warm.

## Dependencies and sequencing

Gated on 04 (the document must be worth showing off — sending today's "Sin categoría" export through a proud share flow would be embarrassing at scale) and therefore on 05. Cheapest of the four new briefs: share sheet + footer line + one static page. Build last, ship the moment 04/05 land, because that's when the document becomes an advertisement.

## What to measure

Share-screen completion rate at export; traffic to `/preparadores` (the only source is the footer, so every visit is a CPA holding the report); and eventually preparer-attributed signups. If `/preparadores` gets visits but no action, the page's offer is wrong — iterate there, not in the app.
