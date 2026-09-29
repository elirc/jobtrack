# Side Effects, Async, and Reliability

## The complete side-effect inventory

Small enough to enumerate exhaustively — do this on every codebase you join; the size of
the list you *can't* complete tells you where the risk is.

| # | Effect | Where | Trigger | Failure visibility |
|---|---|---|---|---|
| 1 | `storage.get` | [L512](../../src/JobTracker.jsx#L512) | Mount | Silent by design (first-run) — see critique |
| 2 | `storage.set` | [L533](../../src/JobTracker.jsx#L533) | Every mutation | Error bar [L672-L676](../../src/JobTracker.jsx#L672-L676) |
| 3 | DOM mutation (textarea height) | [L413-L415](../../src/JobTracker.jsx#L413-L415) | Notes value change | None needed (best-effort) |
| 4 | `window.scrollTo` | [L562](../../src/JobTracker.jsx#L562) | Edit click | Swallowed try/catch — best-effort |
| 5 | `window.confirm` | [L585](../../src/JobTracker.jsx#L585) | Delete click | Blocking dialog (it *is* the UX) |
| 6 | Font fetch (CSS `@import`) | [L36](../../src/JobTracker.jsx#L36) | Style injection | Silent fallback to system fonts |
| 7 | `<style>` injection | [L605](../../src/JobTracker.jsx#L605) | Every render (same constant) | n/a |

No network calls you own, no queues, no timers, no webhooks. The reliability surface is
effects 1 and 2 — both storage.

## Reliability vocabulary, grounded in effects 1 and 2

These are the interview words; each gets a concrete meaning *in this repo*:

- **Idempotency.** Effect 1 is idempotent (reading twice = reading once), which is what
  makes the StrictMode double-mount harmless ([flow 1](../01-codebase-cartography/05-key-flows.md)).
  Effect 2 is idempotent *per payload* (writing the same array twice is fine) — a property
  inherited from whole-state writes. Contrast: an append-style API (`storage.append(record)`)
  would NOT be — retry a timeout and you get duplicates. **Whole-state writes buy
  idempotency; delta writes buy efficiency and lose it unless you add dedup keys.**
  That sentence, with this example, is a strong interview answer.
- **Retries.** None exist. Defensible because: the failure is surfaced honestly, the next
  user action retries implicitly (every mutation rewrites everything), and blind retry
  against a *quota* error (the realistic localStorage failure) would loop uselessly.
  Retry design rule this illustrates: **only retry errors that are plausibly transient,
  and know which yours are.**
- **Ordering / serialization.** Two in-flight `persist` calls have no ordering guarantee
  ([risk R2](../09-reference/risk-register.md)). Unreachable with one human; the moment a
  second writer exists (sync, timer, import), you need a write queue. The upgrade is
  ~6 lines (chain each write onto a module-level promise) — knowing *where the line is*
  (one writer: skip it; two: mandatory) is the judgment being trained.
- **Backpressure, timeouts, outbox, compensation.** Absent, correctly — there's no
  downstream to pressure, no network to time out, no distributed transaction to
  compensate. Being able to say "this system doesn't need X because Y" is worth more in
  interviews than defining X. The system-design file
  ([08/04](../08-interview-prep/04-system-design-from-this-repo.md)) adds a backend and
  makes you re-answer each.

## The one genuinely debatable call

Effect 4's silent catch ([L561-L565](../../src/JobTracker.jsx#L561-L565)) and effect 1's
silent catch ([L517-L519](../../src/JobTracker.jsx#L517-L519)) are different beasts wearing
the same syntax. Scroll failure is *cosmetic* — swallowing is right. Load failure
conflates "first run" with "corrupt data" — swallowing is *convenient*, and the cost is a
user who can't distinguish "empty because new" from "empty because broken"
([critique](06-architecture-critique.md), [risk R1](../09-reference/risk-register.md)).
Rule to carry: **an empty catch needs a comment naming every error class it intends to
swallow** — this repo's comment ([L518-L519](../../src/JobTracker.jsx#L518-L519)) names
both, which is what makes the call reviewable at all.

## Drill

For each of the seven effects: is it idempotent, and what happens if it runs twice
concurrently? Self-grade — Solid: 1, 2, and 5 answered correctly (5 can't run
concurrently — `confirm` blocks the thread; noticing that is the point). Strong: all
seven, plus you caught that 7 re-runs every render but React reconciles the identical
`<style>` cheaply, and can say why moving it to `index.html` would still be better
([ticket J8](../06-contribution-practice/01-good-first-tickets.md)).
