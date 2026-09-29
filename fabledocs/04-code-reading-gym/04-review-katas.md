# Review Katas

Eight fake PRs against this repo. For each: read the diff summary, write your review
*before* opening the expected findings, grade findings as **Blocking / Important /
Optional**, and practice kind, specific comment language. The diffs are invented; the
files they touch are real.

Review layers to apply every time (from [07/01](../07-career-and-collaboration/01-code-review-mindset.md)):
does it work → is it correct → will it stay correct → does it fit this codebase → is it
kind to future maintainers.

---

## Kata 1: "Add a Clear All button"

Author intent: quick way to wipe data during testing.
Fake diff summary: adds a "Clear all" button next to the sort pills; onClick:
`window.storage.delete(STORAGE_KEY); setApps([])`.
Files this resembles: [controls block L640-L670](../../src/JobTracker.jsx#L640-L670), [`remove` L584-L589](../../src/JobTracker.jsx#L584-L589).

Expected findings —
**Blocking:** bypasses `persist` (breaks the single-mutation-path invariant, [pattern 3](../03-architecture-and-patterns/05-pattern-catalog.md)); no confirmation on the most destructive action in the app (delete-one has one! — inconsistency, [L585](../../src/JobTracker.jsx#L585)); calls `storage.delete`, which the *component contract* doesn't include ([JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12) documents get/set only — the fake in tests doesn't implement delete, so tests can't even exercise this).
**Important:** no state hygiene (`expandedId`/`editingId`/form left dangling); no test.
**Optional:** is this a user feature at all, or a dev tool? (Scope question — ask, don't assume.)
Good review comment example:
> All mutations currently flow through `persist` (L530), which is what gives us the error bar and will give us undo later — could we route this through `persist([])` instead of calling storage directly? Also worth mirroring the existing confirm() from `remove` — deleting everything with one misclick would hurt.

## Kata 2: "Show newest first within same-day applications"

Author intent: same-day records should show most-recently-added first.
Fake diff summary: changes the date comparator to `b.id.localeCompare(a.id)` as a tiebreak (ids are timestamps, right?).
Files this resembles: [L592-L597](../../src/JobTracker.jsx#L592-L597).

Expected findings —
**Blocking:** base-36 timestamp strings do NOT compare correctly with `localeCompare` across length boundaries (a 7-char id sorts against an 8-char id lexicographically, not numerically) — works today, breaks in 2059, and breaks *now* for any imported/hand-edited short id. Also couples display order to id *format* — ids become load-bearing ([risk R3](../09-reference/risk-register.md) explicitly warns ids are uniqueness-only).
**Important:** no test for the tiebreak; spec silent on tie order ([SPEC §6.5](../../SPEC.md)) — should update spec.
**Optional:** a `createdAt` field is the honest fix (spec lists it as future work, §9).
Comment practice: write the one that says "this works today but couples X to Y" without condescension.

## Kata 3: "Memoize everything"

Author intent: performance — wrap `sorted`/`noted` in `useMemo`, all sub-components in `React.memo`, all handlers in `useCallback`.
Files this resembles: [L592-L600](../../src/JobTracker.jsx#L592-L600), sub-components [L383-L491](../../src/JobTracker.jsx#L383-L491).

Expected findings —
**Blocking:** none — it probably works. That's the kata's trick: correctness isn't the bar.
**Important:** no measurement motivating it ([perf guide](../05-quality-engineering/04-performance-thinking.md): measure first); `React.memo` on `ApplicationRow` is *defeated anyway* by the inline arrow props at [L752-L754](../../src/JobTracker.jsx#L752-L754) unless those also become useCallback — half the diff is dead weight; every dep array is a new bug surface (stale `apps` in a memoized handler = the [risk R2](../09-reference/risk-register.md) closure bug, now *persistent*).
**Optional:** if list perf ever matters, virtualize first.
Good review comment example:
> What renders slow today? With ~100 rows this recompute is microseconds, and each dep array we add is a place stale-closure bugs can hide. I'd want a profiler trace showing a problem before we take on that risk.

## Kata 4: "Persist the active tab and sort"

Author intent: remember UI preferences across sessions.
Fake diff summary: adds `tab` and `sortBy` into the same `jobtracker:data` array's first element as a `__prefs` pseudo-record.
Files this resembles: [L15](../../src/JobTracker.jsx#L15), [L592](../../src/JobTracker.jsx#L592).

Expected findings —
**Blocking:** a pseudo-record in the apps array poisons every consumer — sort comparators, `noted`, the count ([L612](../../src/JobTracker.jsx#L612) would say "3 sent" with 2 real apps), gutter numbers. Mixing config into a collection is a data-modeling error.
**Important:** the right shape is a *second key* (`jobtracker:prefs`) or the envelope from [M1](../06-contribution-practice/02-mid-level-feature-tickets.md); old-data handling unstated (what does the current code do when it loads the pseudo-record? — trace it: it renders as a row).
**Optional:** is persisting sort worth it at all? (Cheap, sure — but ask.)
This kata trains: spotting *schema* mistakes inside innocent-looking UI PRs.

## Kata 5: "Extract helpers to utils.js" (the pure-motion PR)

Author intent: cleanliness — move [L86-L137](../../src/JobTracker.jsx#L86-L137) to `src/utils.js`.

Expected findings —
**Blocking:** none technically — but it violates the repo's *stated* single-file portability constraint ([SPEC §2](../../SPEC.md): "single-file portability"; [README](../../README.md): "deliberately self-contained… can be dropped into any host"). A PR that contradicts a documented design decision needs an RFC-shaped conversation, not a merge ([07/02](../07-career-and-collaboration/02-writing-prs-and-rfcs.md)).
**Important:** if it proceeds: exports enable direct unit tests (genuine win — say so!); import churn is the whole diff, keep it free of behavior changes.
**Optional:** naming (`utils.js` is a junk drawer; `dates.js` + `records.js` say something).
This kata trains: reviews that engage with *intent documents*, not just code — and disagreeing with a PR while naming what's good in it.

## Kata 6: "Fix the midnight bug"

Author intent: form default date goes stale if the tab stays open past midnight ([risk R5](../09-reference/risk-register.md)).
Fake diff summary: in `toggleForm`, when opening, `setForm(f => ({...f, date: todayISO()}))`.
Files this resembles: [L549](../../src/JobTracker.jsx#L549), [L137](../../src/JobTracker.jsx#L137).

Expected findings —
**Blocking:** the reset clobbers a *draft* — open form, type, close (draft is reset by `closeForm`, fine)… but the diff as written also fires when `toggleForm` opens after an `startEdit`? No — trace carefully: `startEdit` sets the form *then* `setShowForm(true)` directly ([L558-L559](../../src/JobTracker.jsx#L558-L559)), never through `toggleForm` — so the edit path is safe. Verifying that trace *is the review*; findings claimed without the trace are guesses.
**Important:** simpler fix exists — `closeForm` already resets via `emptyForm()` ([L546](../../src/JobTracker.jsx#L546)); the only stale case is the *never-yet-opened* form using mount-time init ([L505](../../src/JobTracker.jsx#L505)). So the minimal fix is in the open path only, and the test is "advance fake timers past midnight, open form, assert date" — needs `vi.setSystemTime`.
**Optional:** is a bug this small worth the diff? (Yes — but say why: correctness of defaults is cheap here, and the test documents time-dependence.)

## Kata 7: "Add PropTypes" vs "Add TypeScript" (competing PRs)

Two authors, same week. PR-A adds `prop-types` runtime checks to the four sub-components. PR-B converts the repo to TS.
Files: [L383-L491](../../src/JobTracker.jsx#L383-L491) vs everything.

Expected findings — this kata is about *choosing*, not line comments:
PropTypes: runtime cost, dev-only value, checks props but not the storage boundary (the actual risk surface, [02/03](../02-stack-and-language-mastery/03-type-system-and-contracts.md)); near-obsolete ecosystem-wise.
TS: real value but a *project decision* (build, contributor expectations, spec explicitly deferred it) — needs the maintainer conversation first; if it proceeds, boundary types + `parseApps` gate are the payload, annotations are the vehicle.
Correct review outcome: neither merges as-is; PR-B becomes an RFC. Practicing "the right answer is a conversation" is the point.

## Kata 8: "Make the error bar dismissible"

Author intent: let users close the save-error banner.
Fake diff summary: adds `dismissed` state; bar renders when `saveError && !dismissed`; X button sets `dismissed=true`.
Files this resembles: [L672-L676](../../src/JobTracker.jsx#L672-L676), [L498](../../src/JobTracker.jsx#L498).

Expected findings —
**Blocking:** `dismissed` is never reset — after one dismissal, all *future* save failures are invisible (the exact silent-failure state the design exists to prevent). Must reset on the next `setSaveError(true)` transition… which reveals the real modeling issue: two booleans encoding one concept. Better: `saveError: "visible" | "dismissed" | null`, or reset `dismissed` inside `persist`'s catch.
**Important:** a11y — the X needs an accessible name; focus handling on dismiss.
**Optional:** auto-clear already exists on next success ([L534](../../src/JobTracker.jsx#L534)) — is dismissal even needed?
This kata trains: state-machine thinking sneaking into a "one-line UI tweak."

---

Rubric per kata — **Basic:** caught the blocking issue. **Solid:** correct severity tiers +
one comment written in door-opening language ("could we… because…"). **Strong:** also
caught what's *good* in the PR and said it first, and correctly identified the two katas
where the right outcome is a conversation, not line comments (5 and 7).
