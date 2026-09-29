# Refactor and Design Katas

Six katas. Unlike tickets, katas are judged on the *artifact of reasoning* (notes, diffs,
RFCs) more than the end state. Each has self-grading criteria; several are
timeboxed — stopping on time is part of the exercise.

---

## Kata K1: Split the module without breaking the constraint (90 min, timeboxed)

Task: produce the file-split plan you'd use *if* the single-file constraint
([SPEC §2](../../SPEC.md)) were lifted: name each new file, what moves ([helpers L86-L137](../../src/JobTracker.jsx#L86-L137)?
styles [L141-L379](../../src/JobTracker.jsx#L141-L379)? sub-components [L383-L491](../../src/JobTracker.jsx#L383-L491)?),
what *stays* co-located and why, and the commit sequence (mechanical moves separated from
anything else).
Self-grade — Solid: split follows the [boundary map](../03-architecture-and-patterns/01-boundaries-and-layers.md),
not file size; commit plan is bisect-friendly. Strong: you kept at least one thing
together that a naive splitter would separate, with a one-sentence defense (e.g.,
`AutoTextarea` stays with the form that owns its only use).

## Kata K2: Design the outbox (paper only, 60 min)

Task: sync (S1) needs writes to survive offline periods. Design the write-queue/outbox:
where queued mutations live, replay order, idempotency keys, what the UI shows for
queued-not-synced records. Deliverable: one page + a state diagram.
Self-grade — Solid: queue in storage (survives refresh), FIFO replay, per-mutation id.
Strong: you noticed whole-array writes make the queue *collapsible* (only the latest
state matters — the "outbox" degenerates to one pending blob + a dirty flag) and said so;
recognizing when a famous pattern *simplifies* in context beats applying it verbatim.

## Kata K3: Kill the global error flag (2 hrs, code)

Task: replace `saveError: boolean` ([L498](../../src/JobTracker.jsx#L498)) with an honest
model of write state (`idle | saving | error`, or per-write tracking — your call), driven
by [kata 8's dismissal bug](../04-code-reading-gym/04-review-katas.md) as motivation.
Tests updated; behavior preserved except where you *documentedly* improved it.
Self-grade — Solid: no UI regression, both failure tests still meaningful. Strong: your
model made the [R2 flag-lying window](../09-reference/risk-register.md) *representable*
(you can now write the test that exposes it), even if you didn't fix it — making a bug
expressible is a refactor outcome worth naming in the PR.

## Kata K4: TypeScript migration, first commit only (2 hrs, timeboxed)

Task: the *first* PR of a TS migration — per [02/03's plan](../02-stack-and-language-mastery/03-type-system-and-contracts.md):
config + `App`/`FormState`/`Storage` types + `parseApps` boundary gate, with `allowJs`
so nothing else must move. Stop at the timebox even if unfinished; write the
"remaining work" list.
Self-grade — Solid: compiles, tests pass, zero `any` in new code (`unknown` at the parse
boundary). Strong: your remaining-work list is ordered by risk (storage boundary first,
style objects last) and estimates honestly.

## Kata K5: Write the RFC for markdown notes (90 min, paper)

Task: [SPEC §9](../../SPEC.md) lists markdown rendering as future work; the
[security checklist](../05-quality-engineering/05-security-checklist.md) flags it as the
XSS cliff. Write the RFC per [07/02's template](../07-career-and-collaboration/02-writing-prs-and-rfcs.md):
motivation, design (rendering library vs subset parser; sanitization strategy;
`dangerouslySetInnerHTML` policy change), alternatives (plain-text forever;
`white-space: pre-wrap` + linkify-only as a middle path), risks, test plan.
Self-grade — Solid: sanitization is a named library + config, not "we'll sanitize."
Strong: you seriously costed the middle path (linkify-only) and your recommendation
section picks it — or beats it with an argument. RFCs that recommend the smaller thing
earn trust.

## Kata K6: Review the flawed PR, full protocol (45 min)

Task: take [review kata 4](../04-code-reading-gym/04-review-katas.md) (prefs-in-the-array)
and write the *complete* review as you'd post it: summary comment first (tone-setting,
what's good, the core issue, suggested path), then line comments, then the follow-up
message after the author pushes back with "it works though."
Self-grade — Solid: severity-tiered, kind, concrete alternative offered. Strong: the
pushback response neither caves nor pulls rank — it makes the *cost* concrete ("the
count at [L612](../../src/JobTracker.jsx#L612) reads 3 with 2 real apps — here's the
failing test") and offers to pair. Practicing the second round is the rare skill;
first-round comments are easy.
