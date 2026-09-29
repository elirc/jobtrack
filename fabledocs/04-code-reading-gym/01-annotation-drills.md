# Annotation Drills

For each excerpt: open the anchor, and annotate — **inputs** (and their trust level),
**outputs**, **dependencies**, **invariants** (what must hold before/after), **side
effects**, **failure modes**. Write it down, then check against the notes.

Shared rubric — **Basic:** inputs/outputs right. **Solid:** + real invariants and side
effects, no invented ones. **Strong:** + failure modes ranked by likelihood, and one
"what would I test" per excerpt.

---

## Drill 1: `parseISO` — [JobTracker.jsx#L89-L94](../../src/JobTracker.jsx#L89-L94)

Annotate, then check:

- Inputs: `iso` — untrusted (comes from stored data or form). `|| ""` on L90 means
  null/undefined are handled, not just strings.
- Output: `Date` (local midnight) or `null` — never throws. Callers branch on null.
- Invariant: regex guarantees *format*, not *calendar validity* — `"2026-02-31"` passes
  the regex, and JS Date rolls it to Mar 3. The `Number.isNaN` check (L93) only catches
  fully impossible dates. Did you catch that the function can return a *valid Date for an
  invalid input*? That's the drill's teeth.
- Failure modes: rollover (above); `"0000-00-00"` → NaN-date → null (correct).
- Test to write: `parseISO("2026-02-31")` — assert current behavior, then decide if it's
  the *wanted* behavior (spec is silent; the date input prevents it in practice).

## Drill 2: `persist` — [JobTracker.jsx#L530-L538](../../src/JobTracker.jsx#L530-L538)

- Inputs: `next` — trusted (built by callers from current state).
- Side effects: state write (sync), storage write (async), error-flag write (both branches — note `setSaveError(false)` on success is what *clears* old errors).
- Invariant: memory is updated *unconditionally*; storage *eventually matches or the flag is up*. Write down the weaker invariant precisely — "flag up OR storage current" — and notice it's only guaranteed **at rest** (no in-flight writes), not during.
- Failure modes: quota exceeded; interleaved calls resolving out of order (flag can lie transiently — [risk R2](../09-reference/risk-register.md)).
- Test: both exist — [L381](../../test/JobTracker.test.jsx#L381-L391), [L392](../../test/JobTracker.test.jsx#L392-L403). Read them *after* annotating.

## Drill 3: `relativeLabel` — [JobTracker.jsx#L112-L123](../../src/JobTracker.jsx#L112-L123)

- Dependency you must annotate: **the clock** (`new Date()` L115) — this function is
  impure; same input, different output tomorrow. Consequence: a row rendered at 23:59
  shows "today" and is stale one minute later with no re-render to fix it.
- Invariant: both compared values are local midnights, so the division is DST-safe only
  because of `Math.round`.
- Failure modes: the stale-label issue (cosmetic); future dates (handled — "in N days").
- Test: tests use *relative* fixtures ([`isoDaysAgo`, JobTracker.test.jsx#L11-L17](../../test/JobTracker.test.jsx#L11-L17)) precisely because of the clock dependency. Annotating "how do the tests cope with impurity?" is the Strong-level move.

## Drill 4: `fakeStorage` — [JobTracker.test.jsx#L32-L51](../../test/JobTracker.test.jsx#L32-L51)

Test code deserves annotation too — it has its own contracts.

- Inputs: `seed` (array *or* raw string — the string form exists solely for the corrupt-JSON test), `failWrites`.
- Invariant to catch: it must match the *real* contract exactly — reject on missing key (L34-L37 mirror [storage.js#L19-L21](../../src/storage.js#L19-L21)). If the fake drifts from the shim, tests pass against a fiction. What pins the real one? ([storage.test.js](../../test/storage.test.js) — the pair together is the safety net.)
- Side effect: installs on `window` — global; teardown at [L74-L77](../../test/JobTracker.test.jsx#L74-L77) is load-bearing.

## Drill 5: The load effect — [JobTracker.jsx#L508-L527](../../src/JobTracker.jsx#L508-L527)

The richest excerpt; expect 10+ annotation points. Must-catches: `cancelled` written by
cleanup, read at *two* sites (L515, L521); `Array.isArray` as boundary defense; catch
conflating two causes; `finally` guaranteeing gate release; the IIFE existing because
effect callbacks can't be async (return-value contract — an async function returns a
promise, and React would treat it as a cleanup function. If you didn't know *why* the
IIFE, that was the drill).

## Drill 6: `AutoTextarea` — [JobTracker.jsx#L408-L418](../../src/JobTracker.jsx#L408-L418)

- Dependencies: the DOM node via ref; **layout** (scrollHeight) — which is why jsdom needs the L415 guard.
- Invariant: height reset to `auto` *before* measuring (L413) — otherwise shrinking never happens (measure would read the old fixed height). This ordering is the excerpt's hidden load-bearing line; most readers gloss it.
- Failure mode: effect runs per keystroke (deps `[value]`) — layout thrash at pathological sizes; fine here.
- Props spread `{...rest}` — the component is transparent to styling/placeholder; annotate what it does NOT own.

## Drill 7: The tab bar — [JobTracker.jsx#L616-L638](../../src/JobTracker.jsx#L616-L638)

- Accessibility contract: `role="tablist"`/`role="tab"`/`aria-selected`, panels with
  `role="tabpanel"` (L741, L761). What's *missing* for the full ARIA pattern? (Arrow-key
  navigation, `aria-controls`/ids linking tabs to panels, roving tabindex — [ticket J6](../06-contribution-practice/01-good-first-tickets.md).) Annotating *absences* against a known spec is a senior reading skill.
- The badge (L636) renders only when `noted.length > 0` — derived, never stored.

## Drill 8: `submit` — [JobTracker.jsx#L568-L582](../../src/JobTracker.jsx#L568-L582)

- Trust levels: `form.company` untrusted-ish (user), re-validated; `editingId` trusted (set only by `startEdit`).
- Invariant: create *appends* (order = insertion order in storage); update *maps in place* (position preserved). Neither re-sorts — display order is a projection ([pattern 4](../03-architecture-and-patterns/05-pattern-catalog.md)).
- The `{...a, ...values}` merge (L577): fields not in `values` survive. Annotate which field that is (`id`) — the merge direction is the whole correctness of edit.
- Failure mode: closure-captured `apps` ([drill answer in 02/01](../02-stack-and-language-mastery/01-language-runtime-model.md)).
