# jobtrack Upskill Curriculum

> **Note — this curriculum was written against v1.0 (2026-07-31).** The repo has since grown
> a calendar section and an app shell — "Daybook", [SPEC.md](../SPEC.md) v2.0. JobTracker's
> behavior and every anchor's *content* are intact, but line numbers have shifted and a few
> file claims have drifted: the app is no longer single-file, and styles and date helpers now
> live in `src/theme.js` and `src/dates.js`. Trust path + symbol over line number. Everything
> here still holds for the job-tracker section — and
> [ticket M8](06-contribution-practice/02-mid-level-feature-tickets.md)'s premise has changed:
> its extraction condition has genuinely occurred, and the `theme.js` extraction has happened.

### Anchor remap and status update (verified against the code on 2026-10-06)

Most `JobTracker.jsx#L...` links in this curriculum point at the 779-line v1.0 file. Use this
table to translate the most-cited ones; the symbol names did not change.

| v1.0 anchor (as cited) | What it pointed at | Current location in `src/JobTracker.jsx` (830 lines) |
|---|---|---|
| L6-L12 | header doc comment (`window.storage` contract) | L6-L18 |
| L35-L82 | injected CSS string | moved to `src/theme.js:24` (`CSS`), injected by `src/App.jsx:35` |
| L141-L379 | style objects `S` | L61-L303 |
| L496-L505 | `useState` declarations | L433-L447 (now includes `importing`, `backupMessage`, `writeQueue`) |
| L508-L527 | load-once effect | L450-L470 |
| L512 / L515 | `storage.get` / `JSON.parse` | L454 / L456 |
| L517-L519 | catch that conflates first run and corrupt JSON | L459-L462 |
| L530-L538 | `persist` | L472-L480 |
| L533 | the `storage.set` call | L477, now chained onto `writeQueue.current` |
| L541 | `setField` | L515 |
| L553-L556 | `startEdit` field guards | L525-L544 |
| L568-L582 | `submit` | L546-L569 |
| L577 / L579 | edit / create `persist` calls (`Date.now().toString(36)` id) | L564 / L566 |
| L584-L589 | `remove` | L571-L576 |
| L592-L598 | derived data (`sorted`, `filtered`, `noted`) | L579-L591 |
| L595-L596 | sort comparators | L581-L583 |
| L598 | `noted` projection | L591 (`filtered.filter(hasNotes)`) |
| L602-L778 | render tree | L598-L829 |
| L672-L676 | save-error bar | L701-L705 |
| L89-L94 | `parseISO` | `src/dates.js:23-40` |

What changed in substance (check each claim with the cited line before relying on the older text):

- **Tests:** 7 test files with 84 `it` blocks; two `it.each` tables in `test/jobBackup.test.js`
  expand to 4 and 6 cases, so Vitest reports 92 (counted from source; `test/setup.js` holds no
  tests). Every "27 tests" in these pages describes v1.0.
- **Writes are serialized.** `persist` chains onto `writeQueue.current` (L447, L474-L477), which
  is ticket M6 implemented. R2's out-of-order half and R7 (stale success masking a newer failure)
  are therefore closed; R2's stale-closure half remains, because handlers still build `next`
  from the render-time `apps` (L564, L566, L575).
- **There are now two write paths,** not one. Backup import (L494-L512) calls
  `commitJobBackup(window.storage, text)` (`src/jobBackup.js:60-64`) on the same queue and then
  calls `setApps` directly, bypassing `persist`. Pages that teach "every mutation goes through
  `persist`" describe v1.0. Ticket M2 (export/import) is implemented this way; the
  `astraupskill/` folder walks through it.
- **R8 is fixed:** `parseISO` (`src/dates.js:23-40`) now returns `null` for `2026-02-31`
  (check: `node --input-type=module -e "import {parseISO} from './src/dates.js'; console.log(parseISO('2026-02-31'))"` prints `null`).
  Ticket J11 is done too: `dates.js` exports its helpers and `test/dates.test.js` covers them.
- **New latent risk:** `src/App.jsx:56` renders `section === "calendar" ? <CalendarHome /> : <JobTracker />`,
  so switching sections unmounts the tracker and the remount runs the load effect again. The
  write queue lives in the old instance's `useRef` (L447). With the synchronous `localStorage`
  shim the write lands first, but with a slow asynchronous host the new instance could read the
  value from before a still-pending write. Treat this as a hypothesis to test with a fake storage
  whose `set` resolves on demand.

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
verified 27 behaviors at v1.0 (92 test cases across 7 files on 2026-10-06; see the remap above). It was built to a written spec ([SPEC.md](../SPEC.md)) — rare in open
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
