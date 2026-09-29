# 08 — Interview Prep

Target: **mid-level fullstack interviews.** The premise of this module: you answer with
concrete evidence from a codebase you know completely, instead of memorized trivia.
Over 60% of the question cards anchor to real lines in this repo — when an interviewer
asks about stale closures, you don't recite a definition; you describe
[JobTracker.jsx#L577](../../src/JobTracker.jsx#L577) and what makes it safe today and
dangerous tomorrow.

## How mid-level fullstack loops are structured

| Round | Typical shape | Prep file |
|---|---|---|
| Screen | 30-45 min, one coding exercise or rapid-fire concepts | [01](01-js-ts-node-deep-dive.md) + [02](02-frontend-framework-questions.md) |
| Technical deep-dive | "Walk me through a project" + follow-ups probing depth | Whole curriculum; rehearse via [06](06-behavioral-star-stories.md) story 1 |
| Practical coding | Build/extend a small feature, tests encouraged | [06-contribution-practice](../06-contribution-practice/README.md) tickets are the rehearsal |
| System design | Design a product like this one, scaled | [04](04-system-design-from-this-repo.md) |
| Debugging / code review | Find the bug; review this PR | [05](05-debugging-and-code-review-rounds.md) |
| Behavioral | STAR prompts | [06](06-behavioral-star-stories.md) |

## The golden rule

**Answer with a concrete example, a tradeoff, and a failure mode — never a bare
definition.** Definition answers cap at junior. The card format trains the upgrade:
every card shows what the junior answer sounds like, what the mid answer *adds*, and
what the senior answer *includes*. Your job is to reliably produce the mid answer and
reach for the senior one.

## Files

| File | Cards |
|---|---|
| [01-js-ts-node-deep-dive.md](01-js-ts-node-deep-dive.md) | J1–J12 |
| [02-frontend-framework-questions.md](02-frontend-framework-questions.md) | F1–F10 |
| [03-api-and-data-modeling-questions.md](03-api-and-data-modeling-questions.md) | A1–A10 |
| [04-system-design-from-this-repo.md](04-system-design-from-this-repo.md) | Full walkthrough + 4 variations |
| [05-debugging-and-code-review-rounds.md](05-debugging-and-code-review-rounds.md) | 4 debugging + 3 review simulations, timed |
| [06-behavioral-star-stories.md](06-behavioral-star-stories.md) | 8 STAR worksheets |
| [07-two-week-cram-plan.md](07-two-week-cram-plan.md) | Day-by-day |

32 question cards + 7 timed simulations + the design walkthrough ≈ 40+ practiced answers,
~80% repo-anchored.
