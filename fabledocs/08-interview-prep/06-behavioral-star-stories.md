# Behavioral STAR Stories

Eight worksheets. Sources: studying this repo (stories 1-2 work even before you've
contributed) and the tickets/projects in [06-contribution-practice](../06-contribution-practice/README.md)
(complete the source item first — never tell a story about work you haven't done; these
worksheets are *forms to fill after the work*, pre-structured so the work produces a
story). Rehearsal check for all: under 2 minutes? concrete? ends with impact?

---

## Story 1: Learning a codebase fast
Prompts this answers: "Tell me about ramping up on unfamiliar code" / "How do you approach a new codebase?" / the deep-dive round's opener.
Source: this curriculum's method itself, applied to jobtrack (and honestly framed as deliberate practice — interviewers respect training).
Situation: needed to build fluency in an unfamiliar React codebase, fast.
Task: full command — flows, patterns, risks — not just "it runs."
Action: mapped contracts before code (storage port, record shape); traced five flows end-to-end with tables; built a risk register separating confirmed issues from hypotheses; verified every claim against line numbers.
Result: could locate any behavior in seconds; found N real latent risks (quote [R1-R3](../09-reference/risk-register.md) specifics); the method transfers — contracts → flows → risks is now my default ramp-up.
Evidence to cite: the risk register; the flow traces.
Senior-signal details: "I distinguish what I verified from what I inferred" — say those words.
Resume bullet: Developed a contracts-first codebase ramp-up method; produced flow traces and a verified risk register on an unfamiliar React codebase in days.
Rehearsal check: name two *specific* risks with line-level detail or it sounds like fluff.

## Story 2: Diffing intent against implementation
Prompts: "Tell me about finding a bug nobody knew about" / "requirements ambiguity."
Source: [pattern 14's drill](../03-architecture-and-patterns/05-pattern-catalog.md) + [ticket J15](../06-contribution-practice/01-good-first-tickets.md) — auditing code against its SPEC.
Situation: codebase shipped against a written spec; nobody had audited the diff.
Task: find where implementation and intent diverge.
Action: table of spec claims vs anchored code behavior; classified divergences (documented deviation / silent deviation / spec ambiguity); for the ambiguities, proposed spec text *before* code changes.
Result: divergence list with severity; the habit — "ambiguity becomes a spec PR, not a silent judgment call."
Senior-signal: treating the spec as a living contract, not scripture or decoration.
Resume bullet: Audited implementation against specification; converted ambiguities into documented decisions.

## Story 3: The data-loss fix (do J13 first)
Prompts: "a time you improved reliability" / "a bug with real user impact."
Source: [ticket J13](../06-contribution-practice/01-good-first-tickets.md) — corrupt-blob quarantine.
Situation: corrupt stored data was silently discarded and then overwritten on next save — unrecoverable loss with zero signal.
Task: make the failure recoverable without changing the app's simple error model.
Action: restructured a catch that conflated two error classes (first-run vs corrupt); quarantined the blob under a timestamped key before proceeding; updated a test whose *contract had to change knowingly* (it asserted no writes) and said so in the PR.
Result: worst-case outcome downgraded from silent permanent loss to recoverable; error classes now distinguishable.
Senior-signal: the changed-test-contract callout — evidence you understand tests as contracts.
Resume bullet: Eliminated a silent data-loss path by separating failure classes and quarantining unparseable state.

## Story 4: A PR with risks and rollback (do M1 first)
Prompts: "walk me through a recent significant PR" / "a time you changed a data format."
Source: [M1](../06-contribution-practice/02-mid-level-feature-tickets.md) — the versioned envelope.
Action highlights: dual-read forever, writers-current-only, old-shape fixtures, mechanical-vs-behavioral commits separated, rollback documented ("readers accept both → reverting the writer is safe").
Senior-signal: you can say the deploy-ordering constraint a distributed version would add, unprompted ([Q-A8](03-api-and-data-modeling-questions.md)).
Resume bullet: Versioned an unversioned production data format with zero-downtime migration semantics and fixture-tested backward compatibility.

## Story 5: Disagreeing with a design (do M5 or kata K6 first)
Prompts: "conflict with a teammate/decision you disagreed with."
Source: [M5](../06-contribution-practice/02-mid-level-feature-tickets.md) (challenging a spec non-goal) or [K6](../06-contribution-practice/04-refactor-and-design-katas.md) (the pushback round).
Structure to rehearse: steelman their position first → concrete cost, not vibes (the failing test, the count bug) → explicit deference or escalation → relationship intact.
Senior-signal: "I made the cost concrete and then let the owner decide" — agency without power struggle.
Resume bullet: (only if M5 accepted) Drove a scope change from proposal through spec amendment to shipped feature.

## Story 6: The flaky test (do scenario 5's regression test first)
Prompts: "a hard bug" / "improving CI reliability."
Source: [debugging scenario 5](../05-quality-engineering/03-systematic-debugging.md).
Action highlights: refused to re-run-until-green; identified the nondeterministic input (clock); reproduced deterministically with a frozen clock; the reproduction *became* the regression test.
Result: flake rate to zero for that class; team vocabulary shift — "flakes are bugs with a probability attached."
Resume bullet: Eliminated a class of time-dependent test flakes by pinning nondeterministic inputs.

## Story 7: Scope discipline (do M8 or decline a ticket deliberately)
Prompts: "a time you pushed back on scope" / "a mistake" (inverted: the mistake you didn't make).
Source: [M8](../06-contribution-practice/02-mid-level-feature-tickets.md) — preparing a refactor and arguing *against* merging it yet.
The story: built the extraction branch, demonstrated it was mechanical and green, then recommended holding it because the triggering condition (second consumer) hadn't arrived — speculative generality declined with evidence instead of opinion.
Senior-signal: "I proved the refactor was cheap so we could do it *when needed*, and banked it."
Resume bullet: awkward as a bullet — use it live instead; it lands better spoken.

## Story 8: Building the reliability feature (do S1 or M6+M7 first)
Prompts: "most technically complex work" / "designing for failure."
Source: [S1 sync](../06-contribution-practice/03-senior-build-projects.md) or the [M6](../06-contribution-practice/02-mid-level-feature-tickets.md)+[M7](../06-contribution-practice/02-mid-level-feature-tickets.md) pair.
Action highlights: fixed the latent lost-update race *before* adding the second writer that would expose it (sequencing as risk management); contract-test suite run against both adapters; conflict UX chosen over silent merge with the reasoning.
Senior-signal: "the port meant zero component changes" — architecture claims backed by a diff stat.
Resume bullet: Extended a local-first app to multi-device sync via a storage-port architecture; core component diff: zero lines.

---

## Prompt coverage map

| Common prompt | Stories |
|---|---|
| Conflict / disagreement | 5, 7 |
| Ambiguity / requirements | 2, 5 |
| Mistake / failure | 6 (the class of bug), 3 (the near-miss framing) |
| Technical tradeoff | 4, 7, 8 |
| Leadership / initiative | 1, 3, 8 |
| "Walk me through complex work" | 4, 8, 1 |

Two gaps this repo can't fill: cross-team coordination and production-incident-under-
pressure stories. Source those from work experience; don't stretch these to cover them —
interviewers can tell.
