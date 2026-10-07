# Fast Track — One Weekend

Goal: by Sunday night you can run the app, trace its two most important flows aloud,
explain three design decisions with tradeoffs, and have made one safe change with a test.

> **Re-anchored 2026-10-06.** The links on this page point at the current 830-line
> `src/JobTracker.jsx`. The rest of the curriculum still cites the v1.0 lines; translate them with
> the remap table in [the curriculum README](README.md).

## 1. Install and run (30 min)

All commands from [package.json](../package.json) scripts:

```bash
npm install        # __verified__ 2026-07-30 (v1.0) — 172 packages
npm run dev        # __verified__ — Vite on http://localhost:5173
npm test           # today: 92 cases in 7 files (counted from source 2026-10-06; 27 at v1.0)
npm run build      # __verified__ (v1.0) — clean production build to dist/
```

Open the app. It starts on the Calendar section (`src/App.jsx:31`); click **Job Tracker**.
Add two applications — one with notes, one without. Switch tabs. Sort A–Z.
Refresh the page and watch the data survive. You've now seen every feature; the rest of
the weekend is understanding *how*.

## 2. First 10 files, in order (60 min)

| # | File | Why now |
|---|---|---|
| 1 | [SPEC.md](../SPEC.md) | The intent. Read fully — you'll diff it against reality all weekend |
| 2 | [README.md](../README.md) | The shape and the deliberate deviations from spec |
| 3 | [index.html](../index.html) | The entire host page: one div, one script tag |
| 4 | [src/main.jsx](../src/main.jsx) | Boot order: shim install **before** mount ([L7](../src/main.jsx#L7)); then [src/App.jsx](../src/App.jsx), the section shell |
| 5 | [src/storage.js](../src/storage.js) | The only external contract in the app |
| 6 | [src/JobTracker.jsx#L432-L470](../src/JobTracker.jsx#L432-L470) | State, the write queue ref, and the load effect |
| 7 | [src/JobTracker.jsx#L471-L596](../src/JobTracker.jsx#L471-L596) | `persist`, backup export/import, form handlers, derived data |
| 8 | [src/JobTracker.jsx#L598-L829](../src/JobTracker.jsx#L598-L829) | The render tree, top to bottom |
| 9 | [test/JobTracker.test.jsx#L19-L67](../test/JobTracker.test.jsx#L19-L67) | The test harness: `fakeStorage`, `lastWrite`, `mount` |
| 10 | [vite.config.js](../vite.config.js) | Build + test config in 16 lines |

Skip for now: the style objects ([L61-L303](../src/JobTracker.jsx#L61-L303)) and the CSS
string ([src/theme.js#L24](../src/theme.js#L24)) — skim, don't study.

## 3. Trace two flows aloud (90 min)

Do these as if an interviewer said *"walk me through what happens when…"*. Full traces
with tables live in [01-codebase-cartography/05-key-flows.md](01-codebase-cartography/05-key-flows.md);
try it yourself first.

**Flow A — cold start.** Browser hits `index.html` → `main.jsx` installs the shim →
`App` mounts with the calendar → user clicks Job Tracker → `JobTracker` mounts → effect at
[L450-L470](../src/JobTracker.jsx#L450-L470) calls
`storage.get` → *pause and predict: what happens on the very first run when the key
doesn't exist?* → check [storage.js#L17-L23](../src/storage.js#L17-L23) and the catch at
[JobTracker.jsx#L459-L462](../src/JobTracker.jsx#L459-L462). Why does the UI show
"Loading…" instead of the empty state during this? ([L791-L792](../src/JobTracker.jsx#L791-L792))

**Flow B — create.** Type a company → submit → [`submit`](../src/JobTracker.jsx#L546-L569)
trims, builds the record, appends → [`persist`](../src/JobTracker.jsx#L472-L480) sets state
*first*, then queues the write behind any earlier one (`writeQueue.current`). *Pause and
predict: what does the user see if the write fails?* Check [L701-L705](../src/JobTracker.jsx#L701-L705).

## 4. One safe change (60 min)

Make the delete confirmation name the company:
`"Delete the application to Vercel? This can't be undone."`

- Change: [`remove`](../src/JobTracker.jsx#L571-L576).
- Breakage to expect: one assertion checks the exact old string —
  [test/JobTracker.test.jsx#L228](../test/JobTracker.test.jsx#L228), inside the "deleting" suite
  (L221-L245). Update it. (The calendar's own "Delete this event?" string, `test/Calendar.test.jsx:281`,
  is a separate component and should not change.)
- Run `npx vitest run` until green. Revert afterwards if you like; the point is the loop:
  read → change → watch tests catch you → fix.

## 5. One test to study, one to write (45 min)

Study ["falls back to empty on corrupt JSON…"](../test/JobTracker.test.jsx#L97-L105) —
note it asserts what *didn't* happen (`storage.set` never called) as much as what did.
Then write one of your own: *sorting by A–Z then deleting the first row renumbers the
gutter*. You'll find every helper you need in the first 70 lines of the test file.

## 6. Teach-back (30 min)

Explain aloud, no notes, as if in an interview:

> "Notes appear in two views but are stored once. How does the app keep them in sync?"

Strong answer: it doesn't have to — the Notes tab is a **filtered projection**
([`noted`, L591](../src/JobTracker.jsx#L591)) of the same array (after search and status filters), so there is no second copy
to sync; consistency holds *by construction*. Contrast with the failure mode of a copied
list. If your answer didn't include the word "projection" or the by-construction argument,
re-read [03-architecture-and-patterns/05-pattern-catalog.md](03-architecture-and-patterns/05-pattern-catalog.md) card 4 and retry.

## What the fast path skips

Styling architecture, the full pattern catalog, security/performance thinking, all
contribution tickets, and interview prep. That's the other 90% of this curriculum —
start with [01-codebase-cartography](01-codebase-cartography/README.md).
