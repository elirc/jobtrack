# Writing PRs and RFCs

## PR description anatomy

Five sections, always, even for small PRs (small PRs with good descriptions build the
reputation that gets big PRs merged):

```markdown
## What
One paragraph. The behavior change, user-visible first.

## Why
The problem or ticket. Link it. If a spec/constraint is involved, cite it —
"SPEC §6.4 requires…" or "renegotiates the §2 single-file rule, discussed in #12".

## How tested
Exact commands + what you added. "npm test — 29 passing (2 new: quarantine-key
written, first-run unaffected)". Screenshots for UI. If untested, say so and why.

## Risks
What could break, blast radius, rollback. "Readers accept both shapes, so
reverting the writer is safe" beats "low risk."

## Follow-ups
What you deliberately didn't do. Scope discipline made visible.
```

Worked example — the description for [ticket J13](../06-contribution-practice/01-good-first-tickets.md):

> **What:** Corrupt stored data is now copied to `jobtracker:data.corrupt-<epoch>` before
> the app continues with an empty list; previously the next save silently overwrote it.
> **Why:** [risk R1] — a parse failure is unrecoverable today. **How tested:** new test
> asserts the quarantine key + payload; updated the corrupt-JSON test (it asserted *no*
> writes — that contract intentionally changes, see diff comment). **Risks:** one extra
> localStorage key on a rare path; quota-full during quarantine is caught and ignored
> (data loss no worse than status quo). **Follow-ups:** surfacing a recovery UI (J13b).

## Commit messages

This repo's history is young; set the standard: imperative subject ≤72 chars, body says
*why*. Mechanical changes separate from behavior changes — the reviewer of
[M1](../06-contribution-practice/02-mid-level-feature-tickets.md) should see
`add parseApps gate` and `remove now-redundant scattered guards` as different commits,
per its acceptance criteria.

## When to RFC instead of PR

Any of: changes a **contract** (storage semantics, stored shape — [pair 8](../04-code-reading-gym/03-fake-code-contrasts.md));
contradicts a **stated constraint** ([SPEC](../../SPEC.md) non-goals, single-file rule —
[kata 5's lesson](../04-code-reading-gym/04-review-katas.md)); adds a **dependency** or
external service; or you'd write >2 paragraphs of "Why" — that's an RFC trying to be born.

## RFC template (tailored to this repo)

```markdown
# RFC: <title>
Status: Draft | Discussed | Accepted | Rejected

## Problem
What breaks or is impossible today. Anchor it: file:lines, risk-register entry, ticket.

## Constraints in play
Which SPEC sections / patterns this touches. (This repo: §1 non-goals, §2 single-file,
§3 data shape, the storage contract, pattern 3's mutation funnel.)

## Proposal
The design. Data-shape changes shown as before/after JSON. Migration path per
03/02's expand-migrate-contract discipline.

## Alternatives considered
≥2, each with the reason it lost. "Do nothing" is always one of them, costed honestly.

## Risks and rollback
Blast radius; how we back out after partial rollout.

## Test plan
What pins the new behavior; which existing tests change meaning (call these out —
changed test expectations are contract changes).
```

First real exercise: [kata K5](../06-contribution-practice/04-refactor-and-design-katas.md)
(markdown notes RFC). Second: [M5](../06-contribution-practice/02-mid-level-feature-tickets.md)'s
spec-change argument.

## Interview angle

Interviewers read your PRs if you link them, and ask "walk me through a recent PR" either
way. A candidate who narrates in this five-section shape — ending with risks and
follow-ups unprompted — sounds mid-level+ before any code is discussed.
[STAR story 4](../08-interview-prep/06-behavioral-star-stories.md) builds on this.
