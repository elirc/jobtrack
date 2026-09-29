# File Reading Order

Every file in the repo, ordered for learning. Small repo, so read all of it — but read
*in this order*, because each file assumes the mental model of the one before.

## Junior path (locate and explain)

| # | File | Look for | Safe to skim |
|---|---|---|---|
| 1 | [SPEC.md](../../SPEC.md) | §3 data model, §5 persistence, §8 edge cases — the intent | §7 design tokens |
| 2 | [README.md](../../README.md) | The two documented deviations from spec | — |
| 3 | [package.json](../../package.json) | The five scripts; note there are only two runtime deps | devDependencies versions |
| 4 | [index.html](../../index.html) | One root div; the inline background color (why? — avoid white flash before JS loads) | — |
| 5 | [src/main.jsx](../../src/main.jsx) | Order: [`installStorage()` on L7](../../src/main.jsx#L7) *before* render on L9. Predict what breaks if reversed | — |
| 6 | [src/storage.js](../../src/storage.js) | [L12](../../src/storage.js#L12) (host wins), [L19-L21](../../src/storage.js#L19-L21) (missing key **throws** — this is contract, not accident) | — |
| 7 | [src/JobTracker.jsx#L84-L137](../../src/JobTracker.jsx#L84-L137) | Pure helpers. Why does [`todayISO` L97-L102](../../src/JobTracker.jsx#L97-L102) hand-format instead of `toISOString()`? | — |
| 8 | [src/JobTracker.jsx#L495-L600](../../src/JobTracker.jsx#L495-L600) | The whole brain: 9 states, load effect, `persist`, handlers, derived `sorted`/`noted` | — |
| 9 | [src/JobTracker.jsx#L602-L778](../../src/JobTracker.jsx#L602-L778) | Render tree; find where each of the 9 states is consumed | style props |
| 10 | [test/JobTracker.test.jsx#L1-L78](../../test/JobTracker.test.jsx#L1-L78) | The harness: `fakeStorage`, `lastWrite`, `rowOrder`, `mount` | — |

## Mid path (add after junior path)

| # | File | Look for |
|---|---|---|
| 11 | [test/JobTracker.test.jsx#L80-L125](../../test/JobTracker.test.jsx#L80-L125) | Loading-gate test [L107-L125](../../test/JobTracker.test.jsx#L107-L125): how do you test an *intermediate* state? (Answer: hold the promise open yourself) |
| 12 | [test/JobTracker.test.jsx#L380-L404](../../test/JobTracker.test.jsx#L380-L404) | Write-failure tests — error paths are tested, not just happy paths |
| 13 | [src/JobTracker.jsx#L381-L491](../../src/JobTracker.jsx#L381-L491) | Sub-components: which are pure render, which own state ([`AutoTextarea` L408-L418](../../src/JobTracker.jsx#L408-L418) owns a ref + effect) |
| 14 | [vite.config.js](../../vite.config.js) | Test config co-located with build config |
| 15 | [test/setup.js](../../test/setup.js) | Why `window.scrollTo` is stubbed ([L7](../../test/setup.js#L7)) |
| 16 | [test/smoke.test.jsx](../../test/smoke.test.jsx) | Testing the *entry point*, not the component — different failure class |

## Senior path (add after mid path)

| # | File | Look for |
|---|---|---|
| 17 | [src/JobTracker.jsx#L35-L82](../../src/JobTracker.jsx#L35-L82) | The CSS escape hatch: what inline styles *can't* do, and the cost of this workaround |
| 18 | [src/JobTracker.jsx#L141-L379](../../src/JobTracker.jsx#L141-L379) | Style objects as a de-facto design system; where it would crack at 10 components |
| 19 | [test/storage.test.js](../../test/storage.test.js) | A contract test in 40 lines: it pins the *reject-on-missing* behavior the app depends on |
| 20 | [.gitignore](../../.gitignore) | 30 seconds — but note what's absent: no `.env`, because there are no secrets |

Then read [03/06-architecture-critique.md](../03-architecture-and-patterns/06-architecture-critique.md)
and argue with it.

## Pause-and-predict checkpoints

At each, stop and answer *before* reading on:

1. After file 5: if `installStorage()` ran *after* `createRoot(...).render(...)`, would the
   app break? (Careful — render is synchronous but the effect's `storage.get` happens
   after paint. Investigate; the answer is subtler than yes/no.)
2. After file 7: `parseISO("2026-02-31")` — what does [L89-L94](../../src/JobTracker.jsx#L89-L94)
   return? (Trick: JS `Date` rolls over to Mar 3; the regex passes; the function returns a
   valid Date. Is that a bug? Check what the spec demands.)
3. After file 8: two rapid deletes before React re-renders — what does the second
   `remove` see in `apps`? (See [risk-register R2](../09-reference/risk-register.md).)
