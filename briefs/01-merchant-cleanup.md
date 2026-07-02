# Tajada — merchant-name cleanup

## Why this first

Right now every row reads as bank-ese: `Zelle from MARK MALATESTA`, `APPLE COM BILL 866 712 7753 CA`, `ATM Withdrawal - Walgreens, LAS VEG…`. All caps, payment-rail prefixes, terminal codes, truncated cities. The dominant action (categorize) is gated on the user *reading* the row, and these strings make every read slightly painful. Clean them once at import time and the whole app suddenly reads like *your* ledger instead of a bank export.

Strategy: a deterministic regex layer that catches the ~80% of common patterns instantly, with an LLM fallback for the long tail. Results are cached forever — every cleanup happens once per unique raw string in the user's lifetime of using the app.

---

## Patterns observed in the recording

Direct mappings the regex layer should produce, with the input strings I actually saw:

| Raw input | Cleaned output |
|---|---|
| `Zelle from MARK MALATESTA` | `Mark Malatesta (Zelle)` |
| `Zelle from BENJAMIN PLAKSIN` | `Benjamin Plaksin (Zelle)` |
| `Zelle from JWAN WHIPPLE` | `Jwan Whipple (Zelle)` |
| `Zelle from TATIANA ARENAZA BRUCKM…` | `Tatiana Arenaza Bruckm… (Zelle)` |
| `Zelle from MAGALLI MACEDA CARRERA` | `Magalli Maceda Carrera (Zelle)` |
| `Zelle from DOMINIC NGUYEN` | `Dominic Nguyen (Zelle)` |
| `Zelle from THE BESTSELLING AUTHOR,…` | `The Bestselling Author (Zelle)` |
| `Zelle from EXPRESS TAX SERVICES LLC` | `Express Tax Services LLC (Zelle)` |
| `Zelle money returned from 17027575087` | `Zelle return` |
| `Deposit from VENMO CASHOUT` | `Venmo cashout` |
| `Venmo transfer received` | `Venmo received` |
| `Withdrawal from VENMO PAYMENT` | `Venmo sent` |
| `PayPal withdrawal` | `PayPal withdrawal` |
| `Check Deposit (Mobile)` | `Mobile check deposit` |
| `Monthly Interest Paid` | `Bank interest` |
| `ATM Withdrawal - Walgreens, LAS VEG…` | `Walgreens ATM — Las Vegas` |
| `APPLE COM BILL 866 712 7753 CA` | `Apple` |

## Pattern rules (deterministic layer)

Implement in this order. First match wins.

```
1. ZELLE_PERSON   /^Zelle from (.+?)$/i              → "{titleCased $1} (Zelle)"
2. ZELLE_RETURN   /^Zelle money returned from .+$/i  → "Zelle return"
3. VENMO_DEPOSIT  /^Deposit from VENMO (CASHOUT|PAYMENT)/i → "Venmo cashout" | "Venmo received"
4. VENMO_TRANSFER /^Venmo transfer (received|sent)$/i → "Venmo received" | "Venmo sent"
5. VENMO_WITHDRAW /^Withdrawal from VENMO/i           → "Venmo sent"
6. ATM            /^ATM Withdrawal - ([^,]+), ([A-Z ]+)/i → "{titleCased $1} ATM — {titleCased $2}"
7. CHECK_MOBILE   /^Check Deposit \(Mobile\)$/i      → "Mobile check deposit"
8. INTEREST       /^Monthly Interest Paid$/i         → "Bank interest"
9. CARD_BILL      /^([A-Z][A-Z ]+) COM BILL [\d ]+/i  → "{titleCased $1}"  // APPLE, GOOGLE, etc.
10. SQUARE        /^SQ \*(.+?)( [A-Z0-9]+)?$/i        → "{titleCased $1} (Square)"
11. AMAZON        /^(AMZN MKTP|AMAZON\.COM)/i        → "Amazon"
12. PAYPAL_WD     /^PayPal withdrawal$/i             → "PayPal withdrawal"
```

`titleCased` does standard Title Case but preserves: `LLC`, `LLP`, `LP`, `Inc`, `Co`, `Ltd`, `PLLC`. Truncate to 40 characters with `—` if longer (matches the truncation style already used in the UI).

## LLM fallback for the long tail

For any input that doesn't match a deterministic rule, batch up to 50 unknowns into a single LLM call. Use Claude Haiku (fast, cheap) or whatever you have wired. Cache results indefinitely keyed by the raw string.

```
You're cleaning raw bank-statement descriptions into short human-readable merchant names
for Tajada, a personal tax-ledger app. Return one cleaned name per input.

Rules:
- Title Case. Preserve LLC, Inc., Co., Ltd. if present in source.
- Drop phone numbers, transaction IDs, terminal numbers, state abbreviations standalone.
- For ATM withdrawals: "{Merchant} ATM — {City}".
- For card-network garbage (e.g. "SQ *DAN'S COFFEE 555NY"): "Dan's Coffee (Square)".
- For Zelle/Venmo from a person: "{Name} (Zelle)" or "{Name} (Venmo)".
- For internal payment-rail transfers: "Venmo cashout", "PayPal withdrawal", etc.
- Max 40 characters. Truncate with "—" if longer.
- Never invent information not present in the input. If unsure, return the input trimmed and Title Cased.

Output: JSON array of strings, same length and order as input.

Input:
[
  "AMZN MKTP US*RT4GZ8901",
  "TST* SWEETGREEN 1234 NEW YORK NY",
  "PAYPAL *FRAMEIO INC",
  ...
]
```

## Swift sketch

```swift
struct MerchantCleaner {
    private static let cache = NSCache<NSString, NSString>()

    static func clean(_ raw: String) -> String {
        if let cached = cache.object(forKey: raw as NSString) {
            return cached as String
        }

        let cleaned = applyDeterministicRules(raw) ?? raw.trimmingCharacters(in: .whitespaces)
        cache.setObject(cleaned as NSString, forKey: raw as NSString)
        return cleaned
    }

    // For misses, enqueue for batched LLM cleanup; the UI keeps showing
    // the raw string until the batch returns, then swaps in place.
    static func batchClean(_ unknowns: [String]) async -> [String: String] {
        // ... LLM call returning [raw: cleaned]
    }

    private static func applyDeterministicRules(_ raw: String) -> String? {
        // Implement the 12 rules above in order
        return nil
    }
}
```

Storage: persist the cache to disk (UserDefaults dict or SQLite) so cleanup survives app restarts. A cleaned merchant for "AMZN MKTP US*RT4GZ8901" should never be re-LLM'd, ever.

## Where this shows up

Apply at **import time**, immediately after CSV/OFX parse, before writing transactions to the local store. Store both `raw` and `displayName` on the Transaction model so the user can drill back to the original if they ever need to (audit trail).

Show `displayName` in:
- The Revisar list rows
- The undo toast (`Se cambió 'Walgreens ATM — Las Vegas'` instead of `Se cambió 'ATM Withdrawal - Walgreens, LAS VEG…'`)
- The Resumen breakdowns
- The PDF/CSV export (with raw as a hidden column in the CSV for the preparer)

## Bonus: one-line tap-target fix

Separately from cleanup, make the whole transaction row toggle the state, not just the checkbox. SwiftUI:

```swift
TransactionRow(tx)
    .contentShape(Rectangle())
    .onTapGesture { tx.toggle() }
```

That alone halves the physical work of a 160-row session.
