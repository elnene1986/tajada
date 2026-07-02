# Tajada — concept brief (bilingual bill-splitter)

## One-line pitch

Tajada is the warm, bilingual way to split the bill — receipt in, fair share out, awkward text drafted for you in the tone you'd actually use.

## Why this exists

Splitting expenses is a solved math problem and an unsolved social one. Splitwise handles the arithmetic and feels like a spreadsheet doing it. Venmo moves the money but doesn't help you decide what's owed. The real friction is in the middle — typing out line items from a receipt, remembering who ate the salmon, and writing the "hey can you Venmo me $24" message without sounding like a nag. Tajada compresses those three steps into roughly ninety seconds, and does it in a voice that sounds like a friend rather than a debt collector.

The wedge against Splitwise is tone and speed; the wedge against doing-it-in-your-head is that the message gets drafted *for* you, so you actually send it instead of letting it slide.

## Target user

The primary user is a bilingual millennial or Gen-Z in a major US or Latin American city — NYC, Miami, LA, Houston, Chicago, CDMX, Madrid, Bogotá, Lima — who splits expenses several times a week. Brunch with friends, roommate groceries, group trips, dating, family dinners. They already use Venmo, Zelle, or Cash App for the payment leg. For the *math* leg, they currently calculate it in their head or on a napkin, because Splitwise feels like too much work for a $34 brunch.

This user is the right wedge for three reasons. They have the most splitting events per month, so retention is mechanical. They're bilingual, so the brand feels for them rather than at them. And they're trend-leaders within mixed friend groups — when Sofia uses Tajada for brunch, her non-Latin friends end up on it too. That's the natural broadening path without diluting the voice.

## Day-one experience, scene by scene

**Scene 1 — first open.** No login required to try. A single screen: "Soy Tajada. Te ayudo a partir la cuenta sin que se ponga raro." A language toggle for English-default users sits in the corner. One primary button: *Try with a receipt.*

**Scene 2 — scan or use sample.** Camera opens to a real receipt, or the user taps "use a sample" and gets a pre-loaded brunch tab. Tajada parses line items in about two seconds, with low-confidence items highlighted softly rather than flagged aggressively. The user does nothing except watch the magic happen.

**Scene 3 — assign.** Items appear as cards. Tap a card, tap the friend who had it. Or tap "split evenly" and skip the whole step. For the demo, no assignment is required — the point is to demonstrate the path, not test the user.

**Scene 4 — the draft message.** Tajada shows a mocked-up text it would send: "Hola guapa, tu tajada del brunch fue $34.50. Mándamelo cuando puedas, te quiero 💛 — sent via Tajada." A small slider offers *Más warm / Más directo / Más relajado*, with English and Spanglish options. The user taps Send, and the demo animates the message landing.

**Scene 5 — the payback path.** Tajada shows what the recipient sees: a text with a link. The link opens a static, no-auth web page: "Pay $34.50 to Pablo," with Venmo, Zelle, Cash App, and Apple Pay buttons. The recipient never has to install Tajada. This is the linchpin of the whole loop.

**Scene 6 — sign-up.** Now Tajada asks the user to save the demo as a real split. Phone number, or Apple/Google. Two onboarding questions: what languages do your friends use, and how do you usually get paid back. From this point on, every message is tuned to those answers.

The aha moment lands inside ninety seconds. The user has seen scan → math → draft → paid, end to end.

## First three features to build

The first feature is **receipt-to-line-items-to-assignment**. Modern multimodal models can read US restaurant receipts to a quality that was impossible two years ago; that's the technical bet that makes Tajada possible now. The MVP needs to handle US receipt formats reliably, allocate tax and tip proportionally, support tap-to-tag and even-split fallback, and let users hand-edit anything in under five seconds.

The second feature is **AI-drafted, tone-tunable request messages sent over SMS with a no-auth payment link**. The drafting is the personality. The SMS-plus-static-link is the distribution: the recipient never has to install anything, and the existing payment rail does the actual money. Tone presets in Spanish, English, and Spanglish, with sliders for warm, direct, and relaxed. This is the feature that makes Tajada feel like a friend instead of an app.

The third feature is **the persistent group thread**. Every split becomes a named thread — "Brunch del sábado," "Cumple de Sofia," "Roomies" — where contributions, payments, and comments live. This is the retention surface. Splitwise has lists; Tajada has threads with personality, where future expenses can be added in one tap. Threads are where features like *yo invito* (I'm covering this one, don't track it), recurring roommate splits, and trip splits will live in v2.

Everything else waits. No integrated payment rail in v1 — deep-link to the wallet the user already has. No social feed; Venmo's biggest mistake was making transactions public, and Tajada's brand is private warmth, not public performance. No multi-currency, no business expenses, no enterprise mode.

## Brand voice, in one paragraph

Bilingual but never decorative. Warm without being saccharine. Lightly cheeky, never sarcastic. Spanish phrases land naturally inside English sentences the way they actually land in conversation, not as performance. References cultural moments without caricature. The vibe is closer to a thoughtful friend than to a finance app — closer to Duolingo's warmth (without the unhinged owl) than to Cleo's savagery.

## Risks worth naming up front

Receipt OCR has to be near-perfect on the most common case (US dine-in restaurant receipts), because every manual correction kills the magic. The no-auth payment link page has to be flawless on the recipient side, because friction there breaks the whole loop. Splitwise users are sticky, so the wedge is people who don't currently use any app — and that's the majority. The cultural-fit positioning is a double-edged sword: lean too hard and the audience caps and the brand reads as caricature, lean too softly and the differentiator dissolves. The right calibration is Spanglish-native by default, English-native if you toggle it. Universal warmth, Latin DNA.

## Suggested next moves

The fastest test of the riskiest assumption is a one-day technical spike on receipt OCR quality against a set of fifty real US restaurant receipts, before any UI work. After that, a clickable prototype of the day-one storyboard — testable on five real users splitting a real bill — would tell you in a week whether the tone and flow land the way the brief assumes.

If you want, I can do either next: build the receipt-OCR test plan, or wireframe the day-one flow as a working HTML clickable prototype.
