# Good First Tickets (Junior)

Fifteen tickets, each small-blast-radius, each following an existing pattern. Template
fields compressed to keep this scannable; expand any ticket into the full template before
starting it. Estimated times assume the fast-track is done.

---

## Ticket J1: Company name in the delete confirmation
Difficulty: Easy — 30 min. Skills: safe string change, test maintenance.
Story: As the user, I want the confirm dialog to name the company so I don't delete the wrong row.
Why good: one function, two tests; teaches "grep for who asserts this string."
Anchors: [`remove` L584-L589](../../src/JobTracker.jsx#L584-L589); tests [L222-L243](../../test/JobTracker.test.jsx#L222-L243).
Acceptance: dialog reads `Delete the application to <company>? This can't be undone.`; both delete tests updated; suite green.
What could go wrong: forgetting the dismissed-path test also matches on the string.
Interview story potential: smallest possible "changed behavior + its tests together" example — good for explaining test-as-contract.

## Ticket J2: Show a count on the Applications tab too
Difficulty: Easy — 45 min. Skills: derived rendering, symmetry.
Story: The Notes tab shows a badge count; Applications should match.
Anchors: badge pattern [L635-L636](../../src/JobTracker.jsx#L635-L636); style [L189-L197](../../src/JobTracker.jsx#L189-L197).
Acceptance: badge with `apps.length` when > 0; reuses `S.badge`; a test asserting both badges.
Reject-risk: inventing a new style instead of reusing `S.badge` — pattern-following is the graded skill.
Interview story potential: "I extended a UI by finding and following the existing pattern."

## Ticket J3: Empty-form Escape key closes the form
Difficulty: Easy — 1 hr. Skills: keyboard events, accessibility.
Anchors: form [L678-L736](../../src/JobTracker.jsx#L678-L736), `closeForm` [L543-L547](../../src/JobTracker.jsx#L543-L547).
Acceptance: Escape anywhere in the form calls `closeForm`; test via `user.keyboard("{Escape}")`.
What could go wrong: Escape while typing in the textarea — decide (and document) whether that should also close. Check how native dialogs behave; consistency beats cleverness.
Interview story potential: a11y/keyboard-UX conversation starter.

## Ticket J4: Relative label for "in N days" tests
Difficulty: Easy — 45 min. Skills: test-gap analysis.
Story: [`relativeLabel` L121-L122](../../src/JobTracker.jsx#L121-L122) handles future dates; no test covers it (verify: search the test file for "in 1 day" — absent).
Acceptance: tests for +1 day and +9 days using `isoDaysAgo(-1)`/`(-9)`; no product change.
Interview story potential: "I found untested behavior by diffing code paths against test names" — a real reviewable skill.

## Ticket J5: Placeholder consistency
Difficulty: Easy — 20 min. Skills: UX copy discipline.
Story: Company placeholder is "Vercel" ([L690](../../src/JobTracker.jsx#L690)) — a real company; notes placeholder is instructional ([L724](../../src/JobTracker.jsx#L724)). Standardize (all real-example style or all instructional) and say why in the PR.
Acceptance: consistent voice; no test changes (nothing asserts placeholders — should it? one-line PR-description opinion wanted).
Interview story potential: tiny, but practices writing a PR whose *description* carries the value.

## Ticket J6: Arrow-key navigation for tabs
Difficulty: Medium-easy — 2 hrs. Skills: ARIA tab pattern.
Anchors: tablist [L616-L638](../../src/JobTracker.jsx#L616-L638); the gap named in [annotation drill 7](../04-code-reading-gym/01-annotation-drills.md).
Acceptance: Left/Right arrows move focus and selection between tabs; `aria-controls`/`id` pairs link tabs to panels; tests for arrow behavior.
What could go wrong: roving tabindex is fiddly — follow the WAI-ARIA Authoring Practices tab pattern exactly, cite it in the PR.
Interview story potential: strong a11y story — "implemented the ARIA tab pattern properly, with tests."

## Ticket J7: Sort mode persists per session
Difficulty: Medium-easy — 1.5 hrs. Skills: storage contract reuse — **design constraint: do NOT touch `jobtracker:data`** (see [kata 4's lesson](../04-code-reading-gym/04-review-katas.md)).
Acceptance: `sortBy` restored on load from its own key `jobtracker:prefs`; corrupt/missing prefs fall back silently; tests for both.
Reject-risk: mixing prefs into the apps array (kata 4 explains why that's blocking).
Interview story potential: "schema separation of config vs data, in miniature."

## Ticket J8: Move font loading to index.html
Difficulty: Easy — 1 hr. Skills: build-visibility reasoning.
Story: [02/04](../02-stack-and-language-mastery/04-tooling-and-build-system.md) — the `@import` at [L36](../../src/JobTracker.jsx#L36) is invisible to Vite and render-blocking-late.
Acceptance: `<link rel="preconnect">` + stylesheet link in [index.html](../../index.html); `@import` removed; visual check in the browser; PR explains the loading-order difference.
Interview story potential: small but real performance-reasoning story (why the fix matters is the story).

## Ticket J9: Extract the confirm message builder
Difficulty: Easy — 45 min. Skills: pure-function extraction (pairs with J1).
Acceptance: `confirmDeleteMessage(app)` helper beside the others ([L86-L137](../../src/JobTracker.jsx#L86-L137)); `remove` uses it; behavior tests unchanged and green (proving the refactor was behavior-preserving — that proof is the lesson).
Interview story potential: "refactor under green tests" — the habit, articulated.

## Ticket J10: Character count on notes
Difficulty: Medium-easy — 1.5 hrs. Skills: controlled-input derived UI.
Acceptance: live `N characters` under the textarea (derived from `form.notes.length` — no new state; reviewers reject a `useState` here); styled with existing `S.hint` ([L303](../../src/JobTracker.jsx#L303)); test.
Interview story potential: derived-vs-stored state, enforced on yourself.

## Ticket J11: Export the pure helpers for direct testing
Difficulty: Easy — 1 hr. Skills: testability tradeoffs.
Story: [boundary 2's debate](../03-architecture-and-patterns/01-boundaries-and-layers.md) — helpers are test-only-through-UI today.
Acceptance: `export` on `parseISO`/`todayISO`/`formatDate`/`relativeLabel`/`stackTokens`; a new `test/helpers.test.js` covering `parseISO` edge cases (incl. the `"2026-02-31"` rollover from [drill 1](../04-code-reading-gym/01-annotation-drills.md)); PR description argues both sides and picks one.
Interview story potential: "I made a testability tradeoff explicit" — better story than the code.

## Ticket J12: Error boundary
Difficulty: Medium — 2-3 hrs. Skills: React error boundaries (class component — the one place hooks can't go).
Story: [05/06's gap](../05-quality-engineering/06-observability-and-operations.md) — render crash = white screen.
Acceptance: boundary wraps `<JobTracker/>` in [main.jsx](../../src/main.jsx); fallback states data is safe in storage; test that throws from a child and asserts the fallback.
What could go wrong: boundaries don't catch event-handler or async errors — the PR description must say what it does *not* cover, or reviewers should bounce it for overclaiming.
Interview story potential: solid — "added crash containment and was precise about its limits."

## Ticket J13: Quarantine corrupt data instead of silently outliving it
Difficulty: Medium — 2 hrs. Skills: failure-path care.
Story: [risk R1](../09-reference/risk-register.md); [critique change #2](../03-architecture-and-patterns/06-architecture-critique.md).
Anchors: the catch [L517-L519](../../src/JobTracker.jsx#L517-L519); corrupt-JSON test [L97-L105](../../test/JobTracker.test.jsx#L97-L105).
Acceptance: when `get` succeeded but parse failed, copy the blob to `jobtracker:data.corrupt-<epoch>` before continuing; existing corrupt test updated (it currently asserts *no* writes — your PR changes that contract knowingly and must say so); new test asserting the quarantine key.
What could go wrong: distinguishing "get threw" (first run — no quarantine!) from "parse threw" requires restructuring the single catch — that's the actual work.
Interview story potential: excellent — a real data-loss-prevention change with a subtle catch-restructure.

## Ticket J14: GitHub Actions CI
Difficulty: Medium — 2 hrs. Skills: CI basics.
Acceptance: workflow runs `npm ci`, `npm test`, `npm run build` on push/PR; README badge; documented in the PR why build is included (type of regression it catches that tests don't: import errors in files tests don't reach).
Interview story potential: "I set up CI from zero" — table stakes, but a story juniors often lack.

## Ticket J15: Stack-token de-duplication decision
Difficulty: Easy-medium — 1 hr, mostly thinking. Skills: spec-first bug handling.
Story: `stack = "React, react"` renders two visually-identical-but-for-case chips ([`stackTokens` L126-L131](../../src/JobTracker.jsx#L126-L131) doesn't dedupe). Bug or fidelity? ([Pattern 6](../03-architecture-and-patterns/05-pattern-catalog.md) says: the *stored* value must keep both; render is a judgment call.)
Acceptance: a written decision (3 sentences, added to SPEC §6.2 as a PR) + implementation *only if* you decided to dedupe + tests either way.
Interview story potential: "I turned an ambiguity into a spec change before touching code" — genuinely senior behavior at junior scale.
