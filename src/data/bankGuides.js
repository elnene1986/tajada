// Per-bank CSV export guides — brief 12.
//
// The hardest step in Tajada is the first one: getting a CSV out of a
// bank app, before the user has seen any value. Plaid would erase the
// step but needs a backend and breaks the on-device promise (parked —
// see roadmap). This is the interim answer: TEACH the step.
//
// CONTENT AS DATA: bank UIs change and steps go stale, so every guide is
// pure data here and the screen (BankGuideScreen) is a dumb renderer.
// Updating a stale guide = editing strings in es.json, no UI work.
// `steps` are i18n keys so the English versions come free once brief 10
// lands. Every guide ends with the SAME reassurance line, rendered by
// the screen (bankGuide.privacyNote) — not repeated per bank.
//
// Coverage (brief 12): the sources the parsers understand + the home
// screen advertises — 8 specific banks/platforms + one generic entry.
// Bank names are proper nouns (same in ES/EN) so `name` stays literal.

export var BANK_GUIDES = [
  { id: 'capitalone', name: 'Capital One', steps: ['bankGuide.capitalone.s1', 'bankGuide.capitalone.s2', 'bankGuide.capitalone.s3', 'bankGuide.capitalone.s4', 'bankGuide.capitalone.s5'] },
  { id: 'chase', name: 'Chase', steps: ['bankGuide.chase.s1', 'bankGuide.chase.s2', 'bankGuide.chase.s3', 'bankGuide.chase.s4', 'bankGuide.chase.s5'] },
  { id: 'bofa', name: 'Bank of America', steps: ['bankGuide.bofa.s1', 'bankGuide.bofa.s2', 'bankGuide.bofa.s3', 'bankGuide.bofa.s4', 'bankGuide.bofa.s5'] },
  { id: 'wellsfargo', name: 'Wells Fargo', steps: ['bankGuide.wellsfargo.s1', 'bankGuide.wellsfargo.s2', 'bankGuide.wellsfargo.s3', 'bankGuide.wellsfargo.s4', 'bankGuide.wellsfargo.s5'] },
  { id: 'venmo', name: 'Venmo', steps: ['bankGuide.venmo.s1', 'bankGuide.venmo.s2', 'bankGuide.venmo.s3', 'bankGuide.venmo.s4', 'bankGuide.venmo.s5'] },
  { id: 'paypal', name: 'PayPal', steps: ['bankGuide.paypal.s1', 'bankGuide.paypal.s2', 'bankGuide.paypal.s3', 'bankGuide.paypal.s4', 'bankGuide.paypal.s5'] },
  { id: 'stripe', name: 'Stripe', steps: ['bankGuide.stripe.s1', 'bankGuide.stripe.s2', 'bankGuide.stripe.s3', 'bankGuide.stripe.s4', 'bankGuide.stripe.s5'] },
  { id: 'patreon', name: 'Patreon', steps: ['bankGuide.patreon.s1', 'bankGuide.patreon.s2', 'bankGuide.patreon.s3', 'bankGuide.patreon.s4', 'bankGuide.patreon.s5'] },
  { id: 'other', name: 'Otro banco', steps: ['bankGuide.other.s1', 'bankGuide.other.s2', 'bankGuide.other.s3', 'bankGuide.other.s4', 'bankGuide.other.s5'] },
];
