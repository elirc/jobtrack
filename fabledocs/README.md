# jobtrack Upskill Curriculum

> **Note — this curriculum was written against v1.0 (2026-07-31).** The repo has since grown
> a calendar section and an app shell — "Daybook", [SPEC.md](../SPEC.md) v2.0. JobTracker's
> behavior and every anchor's *content* are intact, but line numbers have shifted and a few
> file claims have drifted: the app is no longer single-file, and styles and date helpers now
> live in `src/theme.js` and `src/dates.js`. Trust path + symbol over line number. Everything
> here still holds for the job-tracker section — and
> [ticket M8](06-contribution-practice/02-mid-level-feature-tickets.md)'s premise has changed:
> its extraction condition has genuinely occurred, and the `theme.js` extraction has happened.

A training lab built on this repository for one learner: a **junior fullstack engineer**
(CRUD web dev — .NET/C#, React/Node/TS or similar) who wants to reach mid-level fast,
build senior judgment, and pass interviews for mid-level fullstack roles.

Every page teaches two things at once:

1. **This codebase** — where things live, how its real flows work, with exact file/line anchors.
2. **The transferable skill** — why the pattern exists, what the alternatives are, how it
   fails, and how to talk about it in an interview.

## What this repo is (the 60-second version)

jobtrack is a deliberately minimal single-user job-application tracker: React 18 function
components, no router, no state library, no backend, no auth. One component
([JobTracker.jsx](../src/JobTracker.jsx)) owns all state, styling, and persistence. Data is
one JSON array under one key in an async key-value store (`window.storage`), shimmed over
`localStorage` by [storage.js](../src/storage.js). Vite builds it; Vitest + Testing Library
verify 27 behaviors. It was built to a written spec ([SPEC.md](../SPEC.md)) — rare in open
source and gold for learning: you can diff *intent* against *implementation*.

Don't mistake small for trivial. This repo contains, in miniature, the exact ideas
mid-level interviews probe: optimistic writes, last-write-wins persistence, projections vs
copies, contract boundaries, loading gates, timezone-safe dates, effect cleanup, test
seams. Because it's small, you can hold **all of it** in your head — which is the point.
The skill you're building is *seeing these ideas*, so you can find them again in a
500k-line codebase.

## Tracks

| Dir | What it trains |
|---|---|
| [01-codebase-cartography](01-codebase-cartography/README.md) | Mapping a repo fast: shape, reading order, key flows |
| [02-stack-and-language-mastery](02-stack-and-language-mastery/README.md) | JS runtime, React mental models, contracts, Vite tooling |
| [03-architecture-and-patterns](03-architecture-and-patterns/README.md) | Boundaries, data model, validation, side effects, pattern catalog, critique |
| [04-code-reading-gym](04-code-reading-gym/README.md) | Annotation drills, trace tables, fake-code contrasts, review katas |
| [05-quality-engineering](05-quality-engineering/README.md) | Testing strategy, debugging method, performance, security, observability |
| [06-contribution-practice](06-contribution-practice/README.md) | Tickets and projects, junior → senior |
| [07-career-and-collaboration](07-career-and-collaboration/README.md) | Review mindset, PRs/RFCs, maintainer communication |
| [08-interview-prep](08-interview-prep/README.md) | Question cards, system design from this repo, STAR stories, cram plan |
| [09-reference](09-reference/command-cheatsheet.md) | Commands, risk register, rubrics, verification log |

## How to use it

- **One weekend** — [00-fast-track.md](00-fast-track.md) end to end. Run the app, trace two
  flows, make one safe change, do one teach-back.
- **Two weeks** — Fast track, then 01 (all), 03/05-pattern-catalog, 04/01-annotation-drills,
  05/03-systematic-debugging, and two junior tickets from 06.
- **Eight weeks** — Everything in order 01 → 08, one module per ~week, doing every drill
  and at least one mid-level ticket and one senior project.
- **Ongoing** — Use 06-contribution-practice as a backlog; use 08 before any interview.

### Recommended paths by starting point

| You are | Do this |
|---|---|
| Brand-new junior | 00 → 01 → 02 → 04 (drills before theory) → 05 → 06 junior tickets |
| Junior who knows React/TS | 00 → 01/05-key-flows → 03 → 04/04-review-katas → 06 mid tickets |
| Mid-level, new to the repo | 01/01 + 01/05, then 03/06-architecture-critique, then 06/03 projects |
| Senior doing arch review | [03/06-architecture-critique](03-architecture-and-patterns/06-architecture-critique.md) + [09/risk-register](09-reference/risk-register.md) directly |
| **Interview in two weeks** | Go straight to [08/07-two-week-cram-plan.md](08-interview-prep/07-two-week-cram-plan.md) |

## Conventions in these docs

- **Anchors.** Every claim about this codebase links to file and lines:
  [JobTracker.jsx#L530-L538](../src/JobTracker.jsx#L530-L538). Line numbers were verified
  against the working tree on 2026-07-31 (see [verification-log](09-reference/verification-log.md)).
  If the code moves, trust the path + symbol name over the line number.
- **Fake code is labeled.** Any snippet not from this repo starts with
  `// Illustrative fake code: not from this repo`. Everything else is real.
- **Drills are self-graded.** Rubrics use *Basic / Solid / Strong*. Grade honestly; the
  gap between Solid and Strong is exactly the junior→mid gap.
- **Verified vs inferred.** Commands marked __verified__ were actually run during authoring;
  __inferred__ means read from config but not executed.
- **Scaled counts.** This repo is tiny, so content counts sit at the small end of each
  range (5 flows, not 8; 14 pattern cards, not 25). Depth over padding.

## The mindset ladder

- **Junior asks:** "How do I make it work?"
- **Mid-level asks:** "Is this the right pattern? What are the tradeoffs?"
- **Senior asks:** "What does this commit us to? Who pays the cost? How do we reduce risk?"

Mid-level interviews test the second and third questions, not the first. When a doc here
asks "what does a senior notice?", that is interview prep, not decoration.
