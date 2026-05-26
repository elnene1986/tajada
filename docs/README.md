# Tajada — Public Docs

These two pages are the public-facing documentation Tajada needs for App Store / Google Play submission. Both stores require a working privacy policy URL or the listing is auto-rejected.

## Files

- **`privacy.md`** — Privacy policy (Spanish). Required for both stores.
- **`support.md`** — Support / FAQ page (Spanish). Required for App Store; Google Play requires a support email or URL.

## How to host

Pick one — anywhere with a stable HTTPS URL works:

### Option A: GitHub Pages (free, recommended)

1. Push this repo to GitHub.
2. In Settings → Pages, enable Pages with the `main` branch and `/docs` folder as source.
3. URLs will be:
   - Privacy: `https://<user>.github.io/<repo>/privacy`
   - Support: `https://<user>.github.io/<repo>/support`

### Option B: Tajada's own site

If `tajada.app` is hosted (Netlify / Vercel / etc.), drop these files under `/privacy` and `/support` routes:

- Privacy: `https://tajada.app/privacy`
- Support: `https://tajada.app/support`

### Option C: Notion / any static host

Paste the Markdown into a public Notion page or any other Markdown-rendering host. App Store accepts any working HTTPS URL.

## App Store / Play Store fields

When you fill out the store listings, use:

- **Privacy Policy URL** → URL of the hosted `privacy.md`
- **Support URL** → URL of the hosted `support.md`
- **Marketing URL** → `https://tajada.app` (or omit)

## Updating

Bump the "Última actualización" date at the top of `privacy.md` whenever you make a substantive change. Re-deploy. Apple doesn't require you to re-submit the app for a privacy policy update unless the data-handling practices themselves change.
