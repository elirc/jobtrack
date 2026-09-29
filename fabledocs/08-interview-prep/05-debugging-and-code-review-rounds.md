# Debugging and Code-Review Rounds (Timed Simulations)

Seven simulations converted from earlier modules into interview format: a timer, an
"interviewer" script with follow-ups, and a grading rubric. Do them cold — no notes, code
open (interviewers give you the code).

## How these rounds are graded in real life

Interviewers score the *process*: do you form hypotheses before poking? narrate your
reasoning? test cheaply? know when you're wrong? The fix itself is table stakes.
Narrate constantly — silence reads as flailing.

---

## Round D1 (15 min): The vanishing data

Setup: interviewer plays a user — "I opened the app and everything's gone."
Source: [debugging scenario 1](../05-quality-engineering/03-systematic-debugging.md).
Your script: triage questions first (same browser/profile? private window? anything in
the list header count?), then the disk-vs-load split, then the one-line console probe.
Interviewer follow-ups: "localStorage has the data and it's valid JSON — now what?"
(→ non-array shape? check [L515](../../src/JobTracker.jsx#L515)); "it's `{"apps": [...]}`
— who wrote that?" (→ someone's half-migrated envelope; connects to [M1](../06-contribution-practice/02-mid-level-feature-tickets.md)).
Grading — pass: systematic split + probe. Strong: asked triage questions *before*
touching code, and named the design observation (first-run and empty are
indistinguishable) unprompted.

## Round D2 (15 min): Stuck on Loading…

Source: [scenario 2](../05-quality-engineering/03-systematic-debugging.md).
The twist: as written, the code *can't* hang — the strong move is proving it
([`finally` L520-L522](../../src/JobTracker.jsx#L520-L522)) and then asking "what changed?"
Interviewer follow-ups: "a teammate's diff moved `setLoaded(true)` into the try, after
the parse" (→ now corrupt JSON skips it — hang reproduced; which existing test catches
it? [L97-L105](../../test/JobTracker.test.jsx#L97-L105) — walk through *why* it fails).
Grading — pass: found the diff's consequence. Strong: proved impossibility first,
demanded the diff, then named the failing test without running it.

## Round D3 (20 min): The flaky CI test

Source: [scenario 5](../05-quality-engineering/03-systematic-debugging.md) — midnight
UTC flake in the today-default test ([L169-L180](../../test/JobTracker.test.jsx#L169-L180)).
Your script: "flakes are nondeterministic inputs — clock, order, network. This suite has
no network, tests are isolated… clock." Then the two-clock-reads analysis and the
`vi.setSystemTime` reproduction.
Interviewer follow-ups: "why not just re-run failed tests in CI?" — have the principled
answer (masks real races; budget one retry *with* a tracking issue, never as the fix).
Grading — pass: found the midnight window. Strong: reproduced deterministically before
fixing, and articulated the retry policy tradeoff.

## Round D4 (15 min): Wrong notes after delete

Source: [scenario 4](../05-quality-engineering/03-systematic-debugging.md) — the
index-keys branch.
Your script: reproduce → React DevTools shows `expandedId` correct → "state right,
render wrong ⇒ reconciliation identity ⇒ keys" → diff confirms.
Interviewer follow-ups: "why did React reuse the wrong DOM?" (keys are the identity
heuristic; index = position identity); "when ARE index keys fine?" ([Q-F5](02-frontend-framework-questions.md)).
Grading — pass: reached keys within 10 min. Strong: the deduction was *stated as a
deduction* before checking the diff.

---

## Round R1 (20 min): Review the Clear-All PR

Source: [kata 1](../04-code-reading-gym/04-review-katas.md). Interviewer plays the author.
Deliver: verbal review, severity-tiered, kind. The author pushes back: "confirm() is
ugly and users asked for this."
Grading — pass: caught funnel bypass + missing confirm + contract violation. Strong:
pushback response separated the three concerns (UX opinion vs correctness vs contract)
and conceded the right one (the UX point is arguable; the funnel bypass isn't).

## Round R2 (20 min): Review the memoize-everything PR

Source: [kata 3](../04-code-reading-gym/04-review-katas.md). The author is senior to you —
practicing *upward* disagreement.
Grading — pass: asked for the measurement. Strong: named the memo-defeated-by-inline-props
detail ([L752-L754](../../src/JobTracker.jsx#L752-L754)) — concrete beats ideological when
disagreeing upward — and offered the profiler session as a pairing, not a gotcha.

## Round R3 (25 min): Review the prefs-in-array PR, full cycle

Source: [kata 4](../04-code-reading-gym/04-review-katas.md) + [kata K6's](../06-contribution-practice/04-refactor-and-design-katas.md)
second-round protocol. Includes the "it works though" rebuttal.
Grading — pass: schema objection with the count-bug concrete ([L612](../../src/JobTracker.jsx#L612)).
Strong: the rebuttal response produced a *failing test* as the argument and offered the
two-line alternative (separate key) with an offer to pair — cost made concrete, door left open.

---

## Logistics for real practice

Do at most two rounds per day. Record audio; on playback, count: hypotheses stated before
evidence, silences over 15s, and times you said "let me verify that claim" — the first
should be high, the second low, the third at least once per round.
