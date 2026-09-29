# Language and Runtime Model

## The event loop, seen through this repo

Mental model: JS runs one task at a time. `await` doesn't pause the world — it *splits
your function* into "now" and "later," and "later" runs as a microtask when the promise
settles. Everything between is other code running.

Real anchor — the load effect, [JobTracker.jsx#L508-L527](../../src/JobTracker.jsx#L508-L527):

- The effect body runs synchronously after commit; the IIFE at [L510](../../src/JobTracker.jsx#L510)
  starts, hits `await window.storage.get(...)` at [L512](../../src/JobTracker.jsx#L512),
  and *returns control*. React finishes its work; the browser can paint "Loading…".
- Even though the shim's `get` ([storage.js#L17-L23](../../src/storage.js#L17-L23)) does
  no real I/O — `localStorage.getItem` is synchronous — marking it `async` forces the
  resolution onto the microtask queue. That's why "Loading…" is *observable at all* in
  the loading-gate test ([JobTracker.test.jsx#L107-L125](../../test/JobTracker.test.jsx#L107-L125)):
  there is a real moment when the component has rendered but data hasn't arrived.
- Transferable rule: **an async contract stays async even when today's implementation is
  synchronous.** Callers must not depend on same-tick resolution. This repo's UI is
  correct for a slow network-backed `window.storage` without changing a line — that's the
  payoff.

Why it matters in production: "sometimes works locally, breaks with real latency" bugs
are almost always code that accidentally depended on same-tick resolution.

Failure modes: `await` in a loop when work could be parallel (not present here — the app
does one storage call per event, which is *why* single-key whole-array storage was chosen,
[SPEC.md §3](../../SPEC.md)); forgetting that `finally` runs on both paths
([L520-L522](../../src/JobTracker.jsx#L520-L522) leans on this).

## Closures — where this repo genuinely uses them

1. **Curried event handlers.** [`setField` L541](../../src/JobTracker.jsx#L541):
   `setField("company")` returns a function that closed over `"company"`. One factory,
   four fields — closure as parameterization.
2. **The stale-closure hazard, real and load-bearing.** [`submit` L568-L582](../../src/JobTracker.jsx#L568-L582)
   closes over `apps` *as it was when this render ran*. React re-creates `submit` every
   render, so it's normally fresh — but between a click and the state update, `apps` in
   that closure is a snapshot. Two mutations in one render window → the second uses a
   stale base. This is the textbook stale-closure/lost-update case, sitting live in
   [L577](../../src/JobTracker.jsx#L577)/[L579](../../src/JobTracker.jsx#L579)
   ([risk R2](../09-reference/risk-register.md)).
3. **The cancellation flag.** `cancelled` at [L509](../../src/JobTracker.jsx#L509) is
   *shared mutable state between two closures*: the async IIFE reads it; the cleanup
   function ([L524-L526](../../src/JobTracker.jsx#L524-L526)) writes it. That pairing —
   a `let` captured by both a task and its canceller — is the fundamental cancellation
   pattern under all the fancier abstractions (AbortController is this with a standard API).

## Value vs reference, immutability

Every mutation builds a **new array**: spread-append [L579](../../src/JobTracker.jsx#L579),
`map` [L577](../../src/JobTracker.jsx#L577), `filter` [L588](../../src/JobTracker.jsx#L588),
copy-before-sort [L592](../../src/JobTracker.jsx#L592). React's change detection is
reference equality — mutate in place and nothing re-renders. The one method here that
*would* mutate is `.sort()`, which is exactly where the copy appears.

`Date.now().toString(36)` ([L579](../../src/JobTracker.jsx#L579)): base-36 keeps ids short
(`"m9zk3f4"`-ish). Know your radix conversions — small interview flex, occasionally asked.

## Numbers and dates — the two classic traps, both dodged here

- **UTC shift:** `new Date().toISOString().slice(0,10)` gives *UTC* today — wrong date
  for anyone east of Greenwich in the evening. [`todayISO` L97-L102](../../src/JobTracker.jsx#L97-L102)
  hand-builds from local getters instead. The comment on [L96](../../src/JobTracker.jsx#L96) says why.
- **DST arithmetic:** naive `(a - b) / 86400000` is off by ±1 hour across DST changes.
  [`relativeLabel` L112-L123](../../src/JobTracker.jsx#L112-L123) survives because both
  operands are *local midnights* and `Math.round` absorbs the 23/25-hour day. Fragile if
  someone "simplifies" `Math.round` to `Math.floor` — that's [debugging scenario 3](../05-quality-engineering/03-systematic-debugging.md).

## Interview angle

| Question | Card |
|---|---|
| "Is `await` blocking? What actually happens at an await?" | [J1](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "What's a stale closure? Show me one that matters." | [J3](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "Why did your UI show a date one day off for users in Sydney?" | [J6](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "Which array methods mutate? Why does React care?" | [J4](../08-interview-prep/01-js-ts-node-deep-dive.md) |
| "Design an async API over a sync store — why bother?" | [J2](../08-interview-prep/01-js-ts-node-deep-dive.md) |
