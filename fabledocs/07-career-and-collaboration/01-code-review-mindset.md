# Code Review Mindset

## The five layers, in order

1. **Does it work?** — run it, or trust the CI you verified exists. Cheapest to check, so check first.
2. **Is it correct?** — edge cases, error paths, the difference between "demo works" and "correct." (In this repo: does it handle `date: ""`? Old records missing fields? A failing write?)
3. **Will it stay correct?** — tests pinning the new behavior; invariants that survive the next edit. (Does the change keep all mutations inside `persist`? Does the fake still match the contract?)
4. **Does it fit?** — this codebase's patterns and *stated constraints*. (Single-file rule, [SPEC](../../SPEC.md) non-goals, store-raw-format-at-edge.) A technically fine change that fights the grain costs forever.
5. **Is it kind to future maintainers?** — names, comment quality where intent is non-obvious, diff reviewability (mechanical moves separated from behavior).

Juniors review layer 1. Mids review 2-3. Seniors spend most attention on 4-5 — because
layers 1-3 are what tests and CI are *for*, while 4-5 only humans can hold.

## This repo's review checklist

Before approving any PR here, verify:

- [ ] All mutations still flow through [`persist` L530](../../src/JobTracker.jsx#L530-L538) — grep for new `storage.set` callers
- [ ] No record field flows into [`dangerouslySetInnerHTML` L605](../../src/JobTracker.jsx#L605), `href`, or constructed markup ([security Q1](../05-quality-engineering/05-security-checklist.md))
- [ ] New reads of stored data tolerate missing fields (the [pattern 8](../03-architecture-and-patterns/05-pattern-catalog.md) discipline) — or go through the gate if [M1](../06-contribution-practice/02-mid-level-feature-tickets.md) landed
- [ ] Derived values stayed derived — no new `useState` shadowing a computable value
- [ ] Destructive-action state hygiene ([pattern 9](../03-architecture-and-patterns/05-pattern-catalog.md)): new referring state handled in `remove`?
- [ ] Tests assert behavior (DOM/storage payload), not internals; error path covered if one was added
- [ ] The change respects — or *explicitly renegotiates* — SPEC constraints; silent contradiction is a bounce
- [ ] If shared contracts changed (storage semantics, stored shape): was it flagged as breaking? ([pair 8](../04-code-reading-gym/03-fake-code-contrasts.md))

## Comment language that works

The shape: **observation → consequence → suggestion → openness.** Compare:

> ✗ "This breaks the count."
> ✓ "The prefs pseudo-record ends up in `apps`, so the header count at [L612](../../src/JobTracker.jsx#L612) will read one high — a separate `jobtracker:prefs` key would sidestep the whole class. Happy to pair if useful."

Severity words, used consistently, lower the temperature: **blocking** (correctness/
security/contract), **important** (should fix, could follow up), **optional/nit**
(take or leave — and mean it: never re-raise a taken-or-left nit).

Praise specifically, and first, when earned: "the negative-space assertion at
[test L103-L104](../../test/JobTracker.test.jsx#L103-L104) is exactly right" teaches as
much as a defect comment.

## Drill

Run the checklist against [review katas 1, 4, and 8](../04-code-reading-gym/04-review-katas.md).
Which checklist line catches each kata's blocking issue? (K1 → line 1; K4 → lines 3/7;
K8 → line 4-adjacent state modeling — which the checklist *misses*; add the line you'd
write, then compare with kata 8's finding. A checklist you've never amended is a
checklist you don't own.)
