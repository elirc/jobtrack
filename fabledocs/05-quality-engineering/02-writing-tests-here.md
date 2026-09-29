# Writing Tests Here — Six Recipes

Exact commands:

```bash
npm test                                  # full suite       __verified__
npx vitest run test/JobTracker.test.jsx   # one file         __verified__
npx vitest run -t "sorts A–Z"             # one test by name  __inferred__
npm run test:watch                        # watch mode        __inferred__
```

Every recipe uses the existing helpers — read
[JobTracker.test.jsx#L11-L78](../../test/JobTracker.test.jsx#L11-L78) once before starting:
`SEED` (three records: notes / no notes / whitespace notes), `fakeStorage({seed, failWrites})`,
`mount(opts)` (renders + waits out loading), `lastWrite(storage)`, `rowOrder()`, `openForm(user)`.

---

## Recipe 1: Happy-path mutation

Pattern: mount seeded → drive UI with `user` → assert `lastWrite(storage)` payload.
Model: ["appends a record…" L142-L167](../../test/JobTracker.test.jsx#L142-L167).
Your turn: *editing only the stack persists all other fields unchanged*. Assert the full
record via `toMatchObject`, and that `written.length` didn't grow.

## Recipe 2: Validation failure

Pattern: attempt the invalid action → assert the mutation *didn't* happen (negative space).
Model: ["blocks submit…" L128-L140](../../test/JobTracker.test.jsx#L128-L140).
Your turn: *submitting via Enter key with whitespace company writes nothing* —
`user.keyboard("{Enter}")` inside the form; assert `storage.set` uncalled. This closes the
gap Pair 6 ([fake-code contrasts](../04-code-reading-gym/03-fake-code-contrasts.md)) warns about.

## Recipe 3: Failure-path behavior

Pattern: `fakeStorage({failWrites: true})` → mutate → assert UI honesty, then flip the
mock to recover. Model: [L380-L404](../../test/JobTracker.test.jsx#L380-L404).
Your turn: *two consecutive failed writes show one bar, not two* (regression guard for a
future "stack the errors" refactor).

## Recipe 4: Old-data tolerance (the boundary recipe)

Pattern: seed records *missing fields* → assert render + mutations survive.
Model: the undated-record test [L260-L270](../../test/JobTracker.test.jsx#L260-L270).
Your turn: seed `[{id:"x", company:"OldCo"}]` (no stack/date/notes at all) → app renders,
edit pre-fills empty strings ([startEdit's guards L553-L556](../../src/JobTracker.jsx#L553-L556)
are the code under test), saving normalizes the record. This is the test that makes
schema evolution safe — write it before [M1](../06-contribution-practice/02-mid-level-feature-tickets.md).

## Recipe 5: Intermediate async state

Pattern: hand-rolled promise you resolve mid-test.
Model: the loading-gate test [L107-L125](../../test/JobTracker.test.jsx#L107-L125).
Your turn: *mutations during load* — hold `get` open, try to click "+ Add application",
decide what *should* happen (the button exists — is that right?), assert current
behavior, and file your conclusion as a spec question. Tests that surface undefined
behavior are contributions.

## Recipe 6: Time-dependent behavior

Pattern: `vi.setSystemTime` (none of the current tests use it — you're extending the toolkit).
Your turn: *the relative label crosses midnight correctly*: set system time to
`2026-07-30T23:00`, seed a record dated `2026-07-30`, assert "today"; advance to
`2026-07-31T01:00`, re-render (remount), assert "1 day ago". Anchors under test:
[`relativeLabel` L112-L123](../../src/JobTracker.jsx#L112-L123). Gotcha you'll hit:
`isoDaysAgo`-style fixtures also read the fake clock — decide whether that helps or hurts.

---

Rubric — **Solid:** recipes 1-4 written, green, each failing when you sabotage the code
under test (comment out a guard; watch it catch you — a test you've never seen fail is a
hypothesis, not a test). **Strong:** 5 and 6 too, plus each new test's *name* states
behavior, not implementation ("persists unchanged fields on edit", not "test persist merge").
