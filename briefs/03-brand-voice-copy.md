# Tajada — brand voice copy pass

## The calibration

The voice is already set on the home screen: *"Tu tajada. Limpia, contada, tuya."* Restrained, dignified, warm without being cute. The rest of the app reads as neutral utility Spanish — fine, but not Tajada. The job here is to extend the home-screen voice into the rest of the surfaces without overdoing it. The risk of over-cuteness is real; this should feel like the same person wrote everything.

Rules of thumb for everything below: short, lowercase-feeling, present tense, second-person familiar (*tú*, not *usted*), Spanish-first with Spanglish only where it lands naturally. No emoji unless it earns its place. Never explain the joke.

---

## Toasts (after a state change)

| Where | Current | Proposed |
|---|---|---|
| After toggling a row | `Se cambió "X"` | `"X" — al otro lado` |
| After undo | (none visible) | `Listo, "X" regresó` |
| After "Marcar como listo" | (unknown) | `Tajada lista. Empacada.` |
| After CSV import success | (unknown) | `Listo. 160 transacciones cargadas.` |
| After PDF export success | (unknown) | `Tu tajada está empacada. Lista para tu preparador.` |

The "al otro lado" line works because the user just literally moved the row across the negocio/personal line. It's specific to the action, not generic.

## Progress text on the Revisar screen

Currently: `85 de 89 marcadas como negocio.` Replace with a state-aware line that surfaces just above the list:

| State | Proposed line |
|---|---|
| First open of a session | `89 ingresos por revisar. Empezamos.` |
| Mid-session, <50% done | `35 de 89. Buen ritmo.` |
| Mid-session, 50–89% done | `Mitad y mitad. Vamos.` |
| Mid-session, 90–99% done | `Ya casi. Quedan 4.` |
| All reviewed | `Todas marcadas. Mira tu resumen.` |
| Returning after >24h pause | `Bienvenido de vuelta. Estabas en el 71 de 89.` |

Pick the line based on session progress + time since last open. Same data Tajada already has.

## Empty / loading / error states

| Where | Current | Proposed |
|---|---|---|
| Loading import | (unknown — probably "Importando…") | `Acomodando tu tajada…` |
| No search results | (unknown) | `Nada por acá. Probá otra palabra.` |
| Empty Revisar (shouldn't happen) | (unknown) | `Nada que revisar todavía. Sube un estado.` |
| Unsupported file format | (unknown — probably generic) | `No reconozco este archivo. ¿Es CSV u OFX?` |
| File too big | (unknown) | `Ese estado es muy grande. Probá uno por mes.` |
| Bank format Tajada doesn't parse yet | (unknown) | `Tu banco lo manda en un formato nuevo para mí. Avísame y lo agrego.` |
| No network | (unknown) | `Sin internet. Esto sí funciona local.` (because the privacy promise — "se queda en tu teléfono" — should land as benefit, not bug) |

## Section headers (kept restrained)

| Current | Proposed | Notes |
|---|---|---|
| `SESIONES RECIENTES` | `TUS TAJADAS RECIENTES` | Stronger ownership, on-voice. |
| `INGRESOS` (KPI) | keep | Already clean. |
| `GASTOS` (KPI) | keep | Already clean. |
| `GANANCIA` (KPI) | keep | Already clean. |
| `GANANCIA NETA DEL NEGOCIO` | `TU GANANCIA NETA` | Drops the formal "del negocio" — feels more like *yours*. |
| `INGRESOS DEL NEGOCIO` | `INGRESOS DE TU NEGOCIO` | Same logic. |
| `GASTOS DEL NEGOCIO` | `GASTOS DE TU NEGOCIO` | Same. |
| `EXCLUIDAS (PERSONALES)` | `TU TAJADA PERSONAL` | Reframes the "excluded" pile from negative to positive — these aren't excluded, they're a separate slice. |
| `X de 89 marcadas como negocio` | replace with the state-aware lines above. | |

## Buttons

| Current | Proposed | Notes |
|---|---|---|
| `Subir estados de cuenta` | keep | Clear, on-voice. |
| `Banco, Stripe, PayPal, Patreon — CSV u OFX` (subtitle) | keep | Useful. |
| `+ Agregar archivo` | `+ Sumar archivo` | *Sumar* feels more idiomatic in this context. *Agregar* is fine; this is a small lift. |
| `Ver resumen` | keep | Already on-voice. |
| `Editar` | keep | Standard. |
| `Deshacer` | keep | Standard, on-voice. |
| `Exportar PDF` | `Empacar PDF` | *Empacar* (to pack) is more Tajada-coded — you're packing the slice up to send. Optional; *Exportar* is fine and more standard. |
| `Exportar CSV` | keep | The CSV is functional, not emotional. |
| `Marcar como listo` | keep | Already great. |

## The Resumen — context line under the big number

This is the most important copy moment in the app. Currently the screen shows the ganancia neta as a bare number. Add one warm context line directly under it, conditional on the value:

| State | Line under "Ganancia neta" |
|---|---|
| Ganancia > 0 (positive) | `Cerraste con ganancia. Bien.` |
| Ganancia near zero (-$500 to +$500) | `Casi a la par este período.` |
| Ganancia between -$5k and -$500 | `Cerraste en pérdida. Pasáselo a tu preparador — puede ayudarte.` |
| Ganancia < -$5k | `Cerraste en pérdida importante. Tu preparador debería verlo cuanto antes.` |
| Período incompleto (e.g. partial year) | `Esto es solo del período cargado. Sumá más estados para ver el año completo.` |

These lines do two things: confirm the user reads the number correctly (sign + magnitude), and route them toward the *next action* (talk to the preparer, or load more data). Without them the negative number is just there, scary and inert.

## Onboarding / first-run lines (if you don't have these yet)

The first open after install, before any CSV is uploaded:

```
Hola. Soy Tajada.
Sube un estado de cuenta y te lo dejo limpio,
contado, listo para tu preparador.
Todo se queda en tu teléfono.
```

The first time the user lands on Revisar after their first import:

```
Aquí están tus 160 transacciones.
Marca cada una como negocio o personal.
Yo voy sumando.
```

The first time the user opens Resumen:

```
Esto es tu tajada del período.
Cuando esté lista, la empacas y se la pasas a tu preparador.
```

These first-run lines are explicit teaching but stay in voice. They appear once, then never again.

## What NOT to do

- No exclamation marks. The brand is calm, not perky.
- No emoji except in carefully chosen onboarding moments (and probably none at all).
- No second-person formal (*usted*). The voice is friend-of-yours, not bank.
- No "¡Vamos!" or pump-up language. That's a different app.
- No translations like "Hi! Let's get started!" leaking through. Spanish-first means Spanish-default; English is the secondary toggle.
- Don't repeat the word *tajada* on every screen. It's powerful precisely because it's used sparingly. Once per surface, max.

## Implementation note

Strings should live in a single localization file (`es.lproj/Localizable.strings`) keyed by purpose, not by location. That way a future copy pass can iterate without code changes. Add a second key set for English (`en.lproj/Localizable.strings`) — the toggle in the corner of the home screen suggests EN is supported. The English versions should preserve the restrained-warm tone, not become more formal:

```
"toast.row_toggled"          = "Moved to the other side";
"toast.undo_complete"        = "X is back where it was";
"resumen.context.positive"   = "You closed with a profit. Nice.";
"resumen.context.loss"       = "You closed in the red. Show this to your preparer — they can help.";
```

Same voice, English vocabulary.
