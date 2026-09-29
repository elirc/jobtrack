# Architecture Critique

An honest review, as if written for the maintainer. Doubles as system-design interview
material — [08/04](../08-interview-prep/04-system-design-from-this-repo.md) turns it into a
whiteboard exercise. Confirmed observations are anchored; hypotheses are labeled.

## Strongest design choices

1. **The storage port.** One async contract ([JobTracker.jsx#L6-L12](../../src/JobTracker.jsx#L6-L12)),
   one adapter ([storage.js](../../src/storage.js)), contract-tested
   ([storage.test.js](../../test/storage.test.js)), faked cleanly in tests. The app is
   backend-ready without a line of speculative code. This is the repo's best idea.
2. **Whole-array atomic writes.** Torn state is impossible; idempotent retries are free;
   last-write-wins semantics are trivial to reason about
   ([03/02](02-data-model-and-persistence.md)). Right choice *at this scale* — and the
   scale at which it flips (payload growth, partial-update needs) is knowable in advance.
3. **Projections over copies.** The Notes tab and both sort orders are derivations
   ([L592-L598](../../src/JobTracker.jsx#L592-L598)); a whole class of sync bugs is
   structurally absent.
4. **Honest failure UX.** The error bar ([L672-L676](../../src/JobTracker.jsx#L672-L676))
   tells the user exactly the truth — change kept, durability uncertain. Most apps lie in
   one direction or the other.
5. **Spec discipline.** Non-goals written down, edge-case table mapped to tests,
   deviations documented ([pattern 14](05-pattern-catalog.md)).

## Risks and tradeoffs (prioritized)

| # | Issue | Status | Evidence |
|---|---|---|---|
| 1 | Corrupt stored data is silently discarded on next save | **Confirmed behavior**, low likelihood, high annoyance | [L517-L519](../../src/JobTracker.jsx#L517-L519) + [test L97-L105](../../test/JobTracker.test.jsx#L97-L105); [risk R1](../09-reference/risk-register.md) |
| 2 | No schema version envelope → future migrations are guesswork | **Confirmed absence** | bare array at [L533](../../src/JobTracker.jsx#L533); [risk R4](../09-reference/risk-register.md) |
| 3 | Mutations read render-closure state → lost update under concurrent writers | **Confirmed pattern, currently unreachable** — no second writer exists | [L577](../../src/JobTracker.jsx#L577), [L588](../../src/JobTracker.jsx#L588); [risk R2](../09-reference/risk-register.md) |
| 4 | `Date.now()` ids collide under bulk creation | **Confirmed pattern, currently unreachable** | [L579](../../src/JobTracker.jsx#L579); [risk R3](../09-reference/risk-register.md) |
| 5 | Styling is 31% of the app file; second component forces extraction | **Confirmed**, cost deferred knowingly | [L19-L379](../../src/JobTracker.jsx#L19-L379) |
| 6 | Global (not per-record) save-error state can mislead under interleaved writes | Hypothesis — needs a concurrency source to matter | [L498](../../src/JobTracker.jsx#L498), [L534-L536](../../src/JobTracker.jsx#L534-L536) |

Note the shape of 3 and 4: **correct today, wrong under a future that's easy to imagine.**
Most senior-level architecture judgment is deciding which of these to pre-pay. My call:
pre-pay nothing here, but *write them down* (this table is the write-down) — the fixes
are small and better made when the forcing feature arrives.

## What I'd change owning this for 3 months

In order:

1. **Envelope + `parseApps()` gate** ([M1](../06-contribution-practice/02-mid-level-feature-tickets.md)) —
   unlocks every future schema change; centralizes the scattered guards
   ([pattern 8](05-pattern-catalog.md)). Migration path: write `{version:1, apps}`, read
   both shapes forever, test with a fixture of every historical shape. Rollback: readers
   accept both, so reverting the writer is safe.
2. **Corrupt-blob quarantine** ([J13](../06-contribution-practice/01-good-first-tickets.md)) —
   two lines in the catch; converts silent data loss into recoverable annoyance.
3. **Export/import (JSON)** ([M2](../06-contribution-practice/02-mid-level-feature-tickets.md)) —
   the single-key design makes this nearly free, and it's the real mitigation for both
   quota failures and the multi-tab hazard. Forces the id-collision fix
   (`crypto.randomUUID()` on import).
4. **Extract styles + tokens to a module** — only if a second component/file appears.
5. Not TypeScript first — the envelope gate gives more safety per hour at this size.
   (Reasonable people disagree; the argument either way is
   [02/03](../02-stack-and-language-mastery/03-type-system-and-contracts.md).)

## What I would *not* change

No state library, no router, no memoization, no folder structure. Every one would add
concept count to a codebase whose entire value is that a junior can read all of it in an
evening. **Architecture is spent complexity budget; this repo is under budget and should
stay there.** — usable verbatim as an interview closing line.

## Interview angle

This file *is* the answer to "critique a codebase you know" / "what would you change and
why." Rehearse it as: strengths (2) → risks with the reachable/unreachable distinction (2) →
prioritized changes with migration+rollback (2) → what you'd refuse to change (1).
That last category is what distinguishes senior answers — juniors only add.
