# Systematic Debugging

The method, always: **reproduce → narrow (binary-split the pipeline) → hypothesize →
test cheaply → fix the root cause → add regression coverage.** The five scenarios below
are realistic for *this* repo; each names the actual tools. Practice narrating them
aloud — debugging rounds in interviews grade the narration as much as the fix.

Tools of this repo: browser devtools (Application → Local Storage to inspect
`jobtracker:data`; Console; React DevTools for state), `npx vitest run -t "<name>"`,
`console.log` in the code under jsdom (prints to the vitest terminal), and the fastest
probe of all here — *reading the 6 relevant lines*.

---

## Scenario 1: "My data vanished after I refreshed"

Reproduction: user reports all applications gone; refresh shows the empty state.
First question: is the bug in **storage** (data gone from disk) or **load** (data present, not rendered)?
Narrowing path:
1. Devtools → Application → Local Storage → is `jobtracker:data` present and sane?
2. If present but unrendered → load path: is it valid JSON? An array? ([L513-L515](../../src/JobTracker.jsx#L513-L515) silently ignores non-arrays — [trace 2's kicker](../04-code-reading-gym/02-trace-tables.md)).
3. If present-but-corrupt → you're in the catch ([L517-L519](../../src/JobTracker.jsx#L517-L519)); the data is one save away from being overwritten — **stop the user from touching anything**, copy the blob out first.
4. If absent → who deleted? Different browser profile? Private window? Cleared site data? (localStorage is per-origin-per-profile — the #1 real-world cause.)
Useful probes: `JSON.parse(localStorage.getItem("jobtracker:data"))` in the console — one line distinguishes cases 2/3/4.
Likely root causes, ranked: different profile/private window ≫ cleared site data > corrupt blob > actual code bug.
Regression test to add: none for profiles (not a code bug); for case 3, the quarantine of [J13](../06-contribution-practice/01-good-first-tickets.md) plus a test.
Senior lesson: the empty state and the first-run state are indistinguishable *by design* ([pattern 5 drill](../03-architecture-and-patterns/05-pattern-catalog.md)) — this scenario is the cost of that design, surfacing as a support ticket.
Interview version: narrate the split "disk vs load," name the one-line console probe, and volunteer the design observation — that last move is what separates candidates.

## Scenario 2: "Loading… never goes away"

Reproduction: spinner text forever; list never renders.
First question: did the promise **never settle**, or did it settle and the **state update was lost**?
Narrowing path:
1. Console errors? An exception *outside* the try (e.g., `window.storage` undefined — shim never installed) rejects nothing; the await throws synchronously… trace it: actually `window.storage.get` on undefined throws inside the try → caught → `finally` still runs → loaded flips. So `loaded` stuck false means something *stranger*.
2. Check the actual invariant: `finally` at [L520-L522](../../src/JobTracker.jsx#L520-L522) guards with `!cancelled`. When is `cancelled` true at finally-time? Only if cleanup ran first — unmount/remount where the *second* mount's effect never fired.
3. Probe: `console.log` at effect start and in the cleanup; count executions.
Likely root causes: a hosting change broke remount assumptions; or someone edited the effect and moved `setLoaded` into the `try` and an early throw path skips it.
Regression test: the loading-gate test already pins settle-behavior; add one for the throw path if the effect gets edited.
Senior lesson: "cannot hang" is an invariant with exactly two load-bearing lines (`finally`, `!cancelled`) — know your invariants' addresses.
Interview version: this is a "read the code, prove the hang impossible, then question the premise" scenario — saying "as written, I can't reproduce this; what changed?" *with the proof* is a legitimate and strong answer.

## Scenario 3: "The relative dates are wrong for my teammate"

Reproduction: record dated 2026-07-30 shows "2 days ago" for you (Jul 31) but "1 day ago" for a teammate the same moment.
First question: clock skew or timezone semantics?
Narrowing path:
1. What timezone is each machine in? The comparison at [L115-L117](../../src/JobTracker.jsx#L115-L117) is *local* midnights against a *stored local* date.
2. Realize the stored date has no timezone at all — `"2026-07-30"` means "the day I hit apply, wherever I was." Two viewers in different zones legitimately disagree about how many midnights ago that was.
3. Cheap test: change your OS timezone, reload, watch labels move.
Likely root cause: not a bug — a *semantic decision* (dates are civil dates, not instants). The alternative (store UTC instants) creates the opposite bug: applying at 11pm in NY shows "yesterday" immediately.
Regression test: a comment, honestly — plus the midnight-crossing test from [recipe 6](02-writing-tests-here.md).
Senior lesson: date bugs are usually *undecided semantics*, not arithmetic. The fix is a sentence in the spec, then code to match.
Interview version: a classic. Practice saying "civil date vs instant" within the first thirty seconds.

## Scenario 4: "I deleted a row and the wrong notes stayed open"

Reproduction: can't reproduce on main — that's the point. A teammate's branch swaps row keys to `key={i}` "because ids felt redundant."
First question: identity bug or state bug?
Narrowing path:
1. Reproduce on the branch: expand row 2 of 3, delete row 1 → notes now open on what *was* row 3.
2. `expandedId` is unchanged and correct (React DevTools: state still holds the old id) — so the *state* is right and the *rendering identity* is wrong. That combination means: keys.
3. Diff the branch against [L748](../../src/JobTracker.jsx#L748).
Likely root cause: index keys + reorder/removal = React reuses DOM/state across *different* records ([trace 5](../04-code-reading-gym/02-trace-tables.md) predicted exactly this).
Regression test: expand-then-delete asserting the remaining rows' notes visibility — add it *on main* so the branch fails CI.
Senior lesson: when state is provably correct but the UI is wrong, suspect reconciliation identity. Bug class: "right data, wrong element."
Interview version: tell it as the narrowing insight — "state correct + render wrong ⇒ keys" is a deduction interviewers remember.

## Scenario 5: "The suite is green locally, red in CI — once a week"

Reproduction: the today-default test ([L169-L180](../../test/JobTracker.test.jsx#L169-L180)) fails at ~00:00 UTC runs.
First question: what's different about CI at midnight? (Nothing about CI — about *time*.)
Narrowing path:
1. Read the failing assertion: form default date vs `isoDaysAgo(0)` — both call "today," but *when*? The component captured today at `emptyForm()` during mount; the fixture computes it at assertion time.
2. Hypothesize: test starts 23:59:59.8, form opens before midnight, assertion runs after → off-by-one-day.
3. Test cheaply: `vi.setSystemTime("2026-07-30T23:59:59.900Z")` and run — reproduce deterministically instead of waiting a week.
Fix root cause: freeze time for the test (`vi.useFakeTimers` + `setSystemTime`), not "retry the suite."
Regression: the frozen-clock version *is* the regression test.
Senior lesson: flakes are bugs with a probability attached. The move is always: find the nondeterministic input (clock, order, network), pin it, reproduce at will.
Interview version: "tell me about a flaky test you fixed" — this is a complete STAR story ([story 6](../08-interview-prep/06-behavioral-star-stories.md)).

---

Rubric — **Solid:** for any two scenarios, you can narrate reproduce→narrow→probe without
notes. **Strong:** you can also state each scenario's *senior lesson* in one sentence,
and you added at least one of the regression tests for real.
