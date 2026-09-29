# Fast Track — One Weekend

Goal: by Sunday night you can run the app, trace its two most important flows aloud,
explain three design decisions with tradeoffs, and have made one safe change with a test.

## 1. Install and run (30 min)

All commands from [package.json](../package.json) scripts:

```bash
npm install        # __verified__ 2026-07-30 — 172 packages
npm run dev        # __verified__ — Vite on http://localhost:5173
npm test           # __verified__ — 27 tests, 3 files, all green
npm run build      # __verified__ — clean production build to dist/
```

Open the app. Add two applications — one with notes, one without. Switch tabs. Sort A–Z.
Refresh the page and watch the data survive. You've now seen every feature; the rest of
the weekend is understanding *how*.

## 2. First 10 files, in order (60 min)

| # | File | Why now |
|---|---|---|
| 1 | [SPEC.md](../SPEC.md) | The intent. Read fully — you'll diff it against reality all weekend |
| 2 | [README.md](../README.md) | The shape and the deliberate deviations from spec |
| 3 | [index.html](../index.html) | The entire host page: one div, one script tag |
| 4 | [src/main.jsx](../src/main.jsx) | Boot order: shim install **before** mount ([L7](../src/main.jsx#L7)) |
| 5 | [src/storage.js](../src/storage.js) | The only external contract in the app |
| 6 | [src/JobTracker.jsx#L495-L527](../src/JobTracker.jsx#L495-L527) | State + the load effect |
| 7 | [src/JobTracker.jsx#L529-L600](../src/JobTracker.jsx#L529-L600) | `persist`, form handlers, derived data |
| 8 | [src/JobTracker.jsx#L602-L778](../src/JobTracker.jsx#L602-L778) | The render tree, top to bottom |
| 9 | [test/JobTracker.test.jsx#L19-L67](../test/JobTracker.test.jsx#L19-L67) | The test harness: `fakeStorage`, `lastWrite`, `mount` |
| 10 | [vite.config.js](../vite.config.js) | Build + test config in 14 lines |

Skip for now: the style objects ([L141-L379](../src/JobTracker.jsx#L141-L379)) and CSS
string ([L35-L82](../src/JobTracker.jsx#L35-L82)) — skim, don't study.

## 3. Trace two flows aloud (90 min)

Do these as if an interviewer said *"walk me through what happens when…"*. Full traces
with tables live in [01-codebase-cartography/05-key-flows.md](01-codebase-cartography/05-key-flows.md);
try it yourself first.

**Flow A — cold start.** Browser hits `index.html` → `main.jsx` installs the shim →
`JobTracker` mounts → effect at [L508-L527](../src/JobTracker.jsx#L508-L527) calls
`storage.get` → *pause and predict: what happens on the very first run when the key
doesn't exist?* → check [storage.js#L17-L23](../src/storage.js#L17-L23) and the catch at
[JobTracker.jsx#L517-L519](../src/JobTracker.jsx#L517-L519). Why does the UI show
"Loading…" instead of the empty state during this? ([L738-L739](../src/JobTracker.jsx#L738-L739))

**Flow B — create.** Type a company → submit → [`submit`](../src/JobTracker.jsx#L568-L582)
trims, builds the record, appends → [`persist`](../src/JobTracker.jsx#L530-L538) sets state
*first*, then writes. *Pause and predict: what does the user see if the write fails?*
Check [L672-L676](../src/JobTracker.jsx#L672-L676).

## 4. One safe change (60 min)

Make the delete confirmation name the company:
`"Delete the application to Vercel? This can't be undone."`

- Change: [`remove`](../src/JobTracker.jsx#L584-L589).
- Breakage to expect: two tests assert the exact old string —
  [test/JobTracker.test.jsx#L222-L243](../test/JobTracker.test.jsx#L222-L243). Update them.
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
([`noted`, L598](../src/JobTracker.jsx#L598)) of the same array, so there is no second copy
to sync; consistency holds *by construction*. Contrast with the failure mode of a copied
list. If your answer didn't include the word "projection" or the by-construction argument,
re-read [03-architecture-and-patterns/05-pattern-catalog.md](03-architecture-and-patterns/05-pattern-catalog.md) card 4 and retry.

## What the fast path skips

Styling architecture, the full pattern catalog, security/performance thinking, all
contribution tickets, and interview prep. That's the other 90% of this curriculum —
start with [01-codebase-cartography](01-codebase-cartography/README.md).
