# Tajada — smart defaults on the Gastos tab

## The problem

Right now on Gastos every row defaults to "marcadas como negocio" (gold checkmark on). For a creator who runs business and personal on the same card, the *majority* of expense rows are personal — ATM cash, groceries, Apple iCloud, pharmacy, etc. So the user's actual job is reading 71 rows and un-marking most of them. That's the worst possible default. The user feels the app is fighting them.

Goal: flip the model from "everything is business until you say otherwise" to "the app makes its best guess and shows its confidence; you confirm or correct." Same number of taps in the worst case, far fewer in the common case.

## Three-state defaults, not two

Each expense at import time gets classified into one of:

- **Likely business** (gold check, default on) — the merchant is on the known-business list, or the LLM is >70% confident.
- **Likely personal** (grey X, default off) — known-personal list or LLM >70% confident the other way.
- **Ambiguous** (no default, surfaced at the top of the list with a small "?" pill) — confidence below threshold or merchant unknown.

The user reviews the ambiguous bucket first (small, focused), then optionally scans the rest to catch misclassifications.

## Known lists

These are static lookups against the cleaned merchant name. They catch the obvious cases without an LLM call.

### Likely personal (default OFF on Gastos)

```
Grocery:     WHOLE FOODS, TRADER JOE'S, KROGER, SAFEWAY, PUBLIX, H-E-B,
             WEGMANS, ALDI, FOOD LION, COSTCO* (see ambiguous note),
             WALMART GROCERY, INSTACART, AMAZON FRESH

Pharmacy:    CVS, WALGREENS, RITE AID, DUANE READE

Convenience: 7-ELEVEN, WAWA, SHEETZ, CIRCLE K

Gas:         SHELL, CHEVRON, BP, EXXON, MOBIL, 76, ARCO, VALERO,
             SPEEDWAY, MARATHON

Entertainment: NETFLIX, HULU, DISNEY PLUS, MAX, PARAMOUNT PLUS, APPLE TV,
             SPOTIFY (see note), APPLE MUSIC, YOUTUBE PREMIUM, AUDIBLE,
             KINDLE UNLIMITED

Personal care: SEPHORA, ULTA, BATH & BODY WORKS

Cash/transfers: ATM (any) — default personal, see ATM note below

Apple non-business: APPLE.COM/BILL when amount < $10 (iCloud-tier subs)
```

### Likely business (default ON)

```
Creator software / SaaS:
  ADOBE, FIGMA, NOTION, CANVA, FRAME.IO, RIVERSIDE, DESCRIPT, LOOM,
  SLACK, ZOOM, GOOGLE WORKSPACE, MICROSOFT 365, ASANA, AIRTABLE,
  LINEAR, MIRO, CALENDLY, TYPEFORM, MAILCHIMP, BEEHIIV, SUBSTACK,
  CONVERTKIT, GHOST, GUMROAD, LEMONSQUEEZY, STRIPE FEES, PATREON FEES

AI / dev tools:
  OPENAI, ANTHROPIC, CLAUDE, CHATGPT, MIDJOURNEY, RUNWAY, ELEVENLABS,
  GITHUB, REPLIT, VERCEL, NETLIFY, CLOUDFLARE, AWS, GOOGLE CLOUD,
  DIGITALOCEAN, LINODE

Domain / hosting:
  GODADDY, NAMECHEAP, GOOGLE DOMAINS, SQUARESPACE, WEBFLOW, WIX,
  WORDPRESS, BLUEHOST, DREAMHOST

Stock media / production:
  STORYBLOCKS, ENVATO, SHUTTERSTOCK, GETTY, ADOBE STOCK,
  EPIDEMIC SOUND, ARTLIST, MUSICBED, SOUNDSTRIPE

Creator gear retailers (almost always business for this user):
  B&H PHOTO, ADORAMA, SWEETWATER, MUSICIAN'S FRIEND,
  GUITAR CENTER, REVERB, KEEBIO

Coworking / office:
  WEWORK, INDUSTRIOUS, REGUS, SPACES, CONVENE, DESKPASS
```

### Ambiguous (no default, surfaced for review)

```
AMAZON / AMAZON.COM         (mixed: supplies vs personal)
APPLE / APPLE.COM/BILL > $10 (could be software, equipment, services)
COSTCO                       (groceries + studio supplies often mixed)
BEST BUY                     (could be equipment or personal)
TARGET                       (mixed)
UBER / LYFT                  (business travel vs personal commute)
DOORDASH / UBER EATS         (sometimes client meals, mostly not)
RESTAURANTS > $50            (could be client meal)
HOTEL / AIRLINE / AIRBNB     (could be business travel)
SPOTIFY                      (creators legitimately deduct this — depends on user)
STARBUCKS / DUNKIN / LOCAL COFFEE (creators sometimes deduct as "office")
```

## ATM note

ATM withdrawals are always personal by default *for the categorization*, because the cash itself is untraceable. But: the app should add a soft prompt the first time a session has ATM withdrawals — "Sacaste $X en efectivo este período. Si usaste algo del efectivo para el negocio, podés agregarlo aparte." — pointing at a future "Gasto en efectivo" entry surface.

## Confidence-based UI

The visual treatment lets the user trust the guess at a glance:

- **High-confidence (≥85%) auto-applied:** normal row, normal checkmark. No special marker.
- **Medium-confidence (70-85%) auto-applied:** normal row, but the checkmark has a subtle dotted border. Tappable info icon explains: "Suposición: parece software de negocio." User accepts by ignoring, overrides by tapping.
- **Low-confidence (<70%) ambiguous:** the row appears at the top of the list, no default state, with a small "?" pill and the prompt "¿Negocio o personal?". Two equal-weight buttons.

The ambiguous pile drains first and shrinks visibly. That's the smart-queue lever — the user sees finite work, not a wall.

## Classifier sketch

```swift
enum DefaultGuess {
    case business(confidence: Double, reason: String)
    case personal(confidence: Double, reason: String)
    case ambiguous(reason: String)
}

struct ExpenseClassifier {
    static func classify(
        merchant: String,        // already cleaned
        rawDescription: String,
        amount: Double,
        date: Date,
        sessionContext: SessionContext  // recent income sources, user-set platforms
    ) -> DefaultGuess {

        let key = merchant.uppercased()

        if KnownLists.personal.contains(where: { key.contains($0) }) {
            return .personal(confidence: 0.95, reason: "Conocido como personal")
        }
        if KnownLists.business.contains(where: { key.contains($0) }) {
            return .business(confidence: 0.95, reason: "Conocido como software de negocio")
        }
        if KnownLists.ambiguous.contains(where: { key.contains($0) }) {
            return .ambiguous(reason: "Suele ser mixto")
        }

        // Long-tail: LLM with context (other transactions, user profile)
        return llmClassify(merchant: merchant, amount: amount, context: sessionContext)
    }
}
```

## LLM prompt for the long tail

```
You're classifying a single expense from a US-based content creator's bank statement.
The user uses one card for business and personal expenses.

Decide: BUSINESS, PERSONAL, or AMBIGUOUS.

Given:
- Cleaned merchant name
- Original raw description
- Amount in USD
- Date
- The platforms this user earns on (e.g. YouTube, Patreon, Stripe, Substack)

Return JSON: { "guess": "BUSINESS|PERSONAL|AMBIGUOUS", "confidence": 0.0-1.0, "reason": "short Spanish phrase" }

Rules of thumb:
- Creator software, hosting, gear retailers, coworking → BUSINESS
- Groceries, pharmacy, gas, streaming entertainment, ATM cash → PERSONAL
- Amazon, Costco, Apple > $10, Best Buy, Target, hotels, airlines, restaurants > $50 → AMBIGUOUS
- Default to AMBIGUOUS if confidence < 0.7. Never invent context.

Input:
{ "merchant": "...", "raw": "...", "amount": ..., "date": "...", "platforms": [...] }
```

## Migration: don't surprise existing users

If a user already has sessions with everything marked business, don't re-flip on app update. New behavior applies only to imports from version X onward. Or add a one-time "¿Quieres que te ayude a sugerir personales en esta sesión?" prompt on first open after the update.

## Why this matters more than it looks

The user's *emotional* experience of the Gastos tab today is "the app got it wrong about every single row and I have to fix it." With smart defaults, that flips to "the app got most of these right, I'm just confirming." Same number of decisions, but the user feels assisted instead of nagged. That's most of the friendliness delta in this whole tab.
