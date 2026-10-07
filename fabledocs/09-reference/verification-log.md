# Verification Log

Kept during authoring. Anything not listed under "verified" should be treated as inferred
from reading code/config.

## 2026-07-30 — repo built and verified (pre-curriculum)

The codebase itself was built this day against [SPEC.md](../../SPEC.md) (spec provided;
implementation + tests written and run):

- `npm install` — completed, 172 packages.
- `npx vitest run` — final state **27 tests / 3 files, all passing** (intermediate runs
  during development: 24/26 → fixes → 26/26 → smoke test added → 27/27).
- `npx vite build` — clean; output `dist/assets/index-*.js` ~157.85 kB (gzip ~50.84 kB).
- `npm run dev` — served on http://localhost:5173; `index.html`, `/src/main.jsx`,
  transformed `/src/JobTracker.jsx` fetched with HTTP 200 via curl.
- **Not verified visually:** no real-browser session was possible (browser-automation
  extension unavailable). Layout/typography claims in these docs derive from the style
  code, not from observation. The smoke test (`test/smoke.test.jsx`) covers the boot
  chain in jsdom as a partial substitute.

## 2026-07-31 — curriculum authoring

- Re-read [src/JobTracker.jsx](../../src/JobTracker.jsx) in full (779 lines) immediately
  before writing anchors; all `#L` references to it were taken from that read.
- Confirmed anchor lines for [src/storage.js](../../src/storage.js),
  [src/main.jsx](../../src/main.jsx), and all four test files via line-numbered search
  (`installStorage` L11, get/set/delete L17/L25/L30; `fakeStorage` L32, `lastWrite` L53,
  suite describe-blocks L80-L392; smoke test L9).
- Verified-by-search claims made in the docs (each performed against the working tree):
  - `localStorage` appears nowhere in JobTracker.jsx code — one mention exists in the
    header doc comment (L12) only (adapter isolation claim).
  - Exactly one `storage.set` call site (L533) and one `storage.get` call site (L512) in
    the component (mutation-funnel claim).
  - No `console.*` in src/ (observability claim).
  - No `storage` event listener anywhere in src/ (risk R6).
- Commands: no *new* command executions on this date; statuses in the
  [cheatsheet](command-cheatsheet.md) carry over from 2026-07-30 where marked verified.

## 2026-10-06 — drift check (no commands that need `node_modules`)

- The code has moved past v1.0: `src/JobTracker.jsx` is 830 lines, and `src/App.jsx`,
  `src/calendar/CalendarHome.jsx`, `src/dates.js`, `src/theme.js`, and `src/jobBackup.js` exist.
  An anchor remap and status update for R2, R7, R8, J11, M2, M6, and M8 is in
  [the curriculum README](../README.md).
- Test count by source: 7 test files, 84 `it` blocks, two `it.each` tables (4 and 6 rows), so
  92 reported cases. `npm test` was not re-run (no install in this pass).
- Executed with plain Node (pure ES modules, no dependencies): `parseISO('2026-02-31')` returns
  `null` (R8 fixed); `parseJobBackup` rejects a `javascript:` URL with the message
  "URL must be an absolute http or https URL."
- The single-`storage.set` claim above no longer holds: `persist` (L477) and backup import via
  `commitJobBackup` (L503, `src/jobBackup.js:62`) both write, on the same queue.

## Uncertainties and open items

- `npm run preview`, `test:watch`, `-t` name filtering, coverage: **inferred** from
  Vite/Vitest documentation-standard behavior + config; not executed here.
- R7 (stale success masking a newer failure's error bar) is labeled **hypothesis**: the
  interleaving was reasoned about, not exhaustively traced or reproduced in a test.
- `parseISO` rollover behavior (R8) verified by reading the code path + knowledge of JS
  `Date` semantics; not executed as a unit test (helpers are unexported — see
  [ticket J11](../06-contribution-practice/01-good-first-tickets.md)).
- The 5,000-record performance expectations in [05/04](../05-quality-engineering/04-performance-thinking.md)
  are **expectations**, explicitly framed as predict-then-measure exercises; no profiling
  was performed during authoring.
- Line anchors will drift as the code is edited. Trust path + symbol name over raw line
  numbers; re-verify before quoting in a PR or interview.

## Areas not covered by this curriculum

- Real-browser E2E behavior (visual layout, fonts, scrolling, native date-picker UX).
- `dist/` bundle internals beyond size (no bundle analysis was run).
- Accessibility beyond code-level review (no screen-reader session was performed —
  claims about announcements are based on ARIA semantics, not observation).
