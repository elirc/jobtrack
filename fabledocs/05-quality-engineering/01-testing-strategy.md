# Testing Strategy

## The three layers in this repo

| Layer | File | What it pins | Count |
|---|---|---|---|
| **Behavior** (through the DOM) | [JobTracker.test.jsx](../../test/JobTracker.test.jsx) | What a user can observe: rendered rows, disabled buttons, persisted payloads | 22 |
| **Contract** | [storage.test.js](../../test/storage.test.js) | The storage port's semantics — especially reject-on-missing | 4 |
| **Smoke** (entry point) | [smoke.test.jsx](../../test/smoke.test.jsx) | Boot order: shim install → mount → data visible | 1 |

No E2E-in-a-real-browser layer. Known gap, consciously accepted: jsdom covers behavior;
what it can't cover (layout, real fonts, actual scrolling) is cosmetic here.
[Mid ticket M9](../06-contribution-practice/02-mid-level-feature-tickets.md) adds Playwright.

## What makes this suite good — steal these habits

1. **Tests assert through contracts, not internals.** No test reaches into component
   state; they drive the DOM (`userEvent`) and assert either the DOM or the *storage
   payload* ([`lastWrite` L53](../../test/JobTracker.test.jsx#L53) parses what was written).
   Refactor the component freely; these tests hold.
2. **The fake mirrors a pinned contract.** [`fakeStorage`](../../test/JobTracker.test.jsx#L32-L51)
   could drift from the real shim — except [storage.test.js](../../test/storage.test.js)
   pins the real one to the same semantics. Fake + contract test = the two halves of
   trustworthy isolation. (Interview line: "how do you know your mocks are honest?")
3. **Negative-space assertions.** The dismissed-confirm test asserts `storage.set` was
   *never called* ([L239-L241](../../test/JobTracker.test.jsx#L239-L241)); the corrupt-JSON
   test asserts the blob *wasn't overwritten* ([L103-L104](../../test/JobTracker.test.jsx#L103-L104)).
   Asserting what didn't happen is how you pin safety properties.
4. **Intermediate states are tested by controlling time.** The loading-gate test
   ([L107-L125](../../test/JobTracker.test.jsx#L107-L125)) holds the promise open manually —
   no sleeps, no flakiness, deterministic.
5. **Error paths get equal billing.** Two write-failure tests
   ([L380-L404](../../test/JobTracker.test.jsx#L380-L404)), including recovery.

## Flake prevention as designed-in properties

- **Time:** no test sleeps; relative-date fixtures ([`isoDaysAgo` L11-L17](../../test/JobTracker.test.jsx#L11-L17))
  keep assertions clock-independent. Residual risk: a test starting at 23:59:59.9 can
  cross midnight between fixture creation and assertion — astronomically rare, worth
  knowing the shape of ([debugging scenario 5](03-systematic-debugging.md)).
- **Randomness:** none in the app (ids are clock-based — tests assert `expect.any(String)`,
  [L163](../../test/JobTracker.test.jsx#L163), not exact ids. Never assert what you don't control).
- **Isolation:** fresh fake + `cleanup()` + `delete window.storage` per test
  ([setup.js](../../test/setup.js), [teardown L74-L77](../../test/JobTracker.test.jsx#L74-L77)).

## What NOT to test (and this suite doesn't)

Style objects, exact class names, the CSS string, gutter padding widths — appearance
churns; behavior is the contract. Also untested: the pure helpers *directly* (they're
unexported — tested through behavior). Defensible either way; see
[boundary 2 discussion](../03-architecture-and-patterns/01-boundaries-and-layers.md).

## Interview angle

"Unit vs integration vs E2E — how do you split?" Answer with this repo's real split and
*why the middle layer dominates*: one component + one port means behavior tests ARE
integration tests, and they're cheap. The testing-pyramid shape is a *consequence* of
architecture, not a law — that inversion of the usual answer is a mid-level marker.
[Cards Q-D1..D4](../08-interview-prep/05-debugging-and-code-review-rounds.md).
