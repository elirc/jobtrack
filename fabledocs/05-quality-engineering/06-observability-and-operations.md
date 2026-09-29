# Observability and Operations

The operative question for every flow: **"How would I know this broke?"** For a
local-first app, the honest answer is often "the user tells me" — which makes this the
right place to learn what logging/metrics/tracing would *buy*, because you can see
exactly what's missing and what it would cost.

## Current state, mapped

| Signal | Present? | Where |
|---|---|---|
| User-facing error surface | Yes — save failures only | The alert bar [L672-L676](../../src/JobTracker.jsx#L672-L676), `role="alert"` (announced by screen readers — observability includes assistive tech) |
| Logging | None — zero `console.*` in src/ (verify by search) | Deliberate: nothing actionable to log locally |
| Metrics / tracing | None | No telemetry — which is also a *privacy feature* worth stating |
| Health checks / deploy / rollback | N/A — static files; "deploy" is copying `dist/`; rollback is copying the previous `dist/` | The simplest possible ops story — know it as your baseline for comparison |
| Crash visibility | None — an uncaught render error white-screens with console-only evidence | The real gap: no error boundary. [Junior ticket J12](../06-contribution-practice/01-good-first-tickets.md) |

## "How would I know?" per flow

| Flow | Failure | Today's signal | Gap |
|---|---|---|---|
| [1 — load](../01-codebase-cartography/05-key-flows.md) | Corrupt blob discarded | **Nothing** — renders as first-run | The worst observability hole in the app ([risk R1](../09-reference/risk-register.md)); minimum fix is a distinguishable UI state |
| 2 — create/edit | Write failed | Alert bar | Good; the memory/storage divergence is disclosed |
| 3 — delete | Write failed after optimistic remove | Alert bar — but re-read [trace 3's kicker](../04-code-reading-gym/02-trace-tables.md): after refresh the row *returns*, with no explanation | Wording covers it ("may not survive a refresh") — barely. Judge for yourself |
| 4 — sort/notes | Pure render — can't fail partially | React error boundary… doesn't exist | A throwing render (bad data despite guards) = white screen |
| 5 — error path itself | The bar fails to render | None (meta-observability is a real concern in big systems — alerting on the alerting) | Out of scope; know the concept |

## What minimal, correct observability would look like here

Not a metrics stack. Three moves, in value order:

1. **Error boundary** wrapping the app: catches render crashes, shows "something broke —
   your data is untouched in storage," offers a JSON export of the raw blob. Converts
   white-screen + data-fear into a recoverable moment. (~30 lines; [J12](../06-contribution-practice/01-good-first-tickets.md).)
2. **Corrupt-load distinguishability**: the load catch ([L517-L519](../../src/JobTracker.jsx#L517-L519))
   sets a `loadWarning` state when `result` existed but parsing failed — one honest
   sentence in the UI instead of silence. ([J13](../06-contribution-practice/01-good-first-tickets.md).)
3. **A debug affordance**: a hidden "copy diagnostic info" action (record count, blob
   size, last error) — the local-first analogue of structured logging: you're designing
   *what the user pastes into a bug report*.

The transferable frame: observability is **designing the evidence trail before the
incident**. Servers emit logs/metrics/traces; local apps emit UI states and exportable
diagnostics. Same discipline, different sink.

## Interview angle

"How would you debug a production issue you can't reproduce?" — for a local-first app
the answer is the diagnostic-export design above, and saying so shows you adapt the
discipline to the architecture instead of reciting "check Datadog." Pairs with
[scenario 1](03-systematic-debugging.md)'s support-ticket walkthrough.
