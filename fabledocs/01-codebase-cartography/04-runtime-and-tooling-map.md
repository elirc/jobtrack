# Runtime and Tooling Map

## Toolchain

| Tool | Configured in | Role |
|---|---|---|
| npm | [package.json](../../package.json) | Package manager (lockfile: package-lock.json) |
| Vite 5 | [vite.config.js](../../vite.config.js) | Dev server (port 5173), production bundler |
| @vitejs/plugin-react | [vite.config.js#L5](../../vite.config.js#L5) | JSX transform + Fast Refresh |
| Vitest 2 | [vite.config.js#L7-L12](../../vite.config.js#L7-L12) | Test runner, jsdom environment, globals on |
| Testing Library | [test/setup.js](../../test/setup.js) | DOM assertions + user-event simulation |

No linter, no formatter, no TypeScript, no CI config. That's a fact about the repo, not a
recommendation — [ticket J14](../06-contribution-practice/01-good-first-tickets.md) adds CI.

## Scripts

| Command | What it does | Status |
|---|---|---|
| `npm run dev` | Vite dev server, HMR, http://localhost:5173 | __verified__ |
| `npm run build` | Production bundle → `dist/` (~158 kB js, ~51 kB gzip) | __verified__ |
| `npm run preview` | Serve the built `dist/` locally | __inferred__ |
| `npm test` | `vitest run` — single pass; 27 tests at v1.0, 92 cases in 7 files today (counted from source 2026-10-06) | __verified__ (v1.0) |
| `npm run test:watch` | Vitest watch mode | __inferred__ (watch flag read from config, not run to completion) |
| `npx vitest run test/storage.test.js` | One file only | __verified__ |

## Runtime boundaries

Three distinct runtimes execute this code. Knowing *which line runs where* is a
transferable skill — in fullstack repos the equivalent question ("server or client or
edge?") is a top source of bugs.

| Runtime | What runs there | Sharp edges |
|---|---|---|
| **Browser** | Everything in `src/` after Vite serves/bundles it | The real `localStorage`, real layout (`scrollHeight` works) |
| **Node (Vite/Vitest process)** | `vite.config.js`, test orchestration | ESM (`"type": "module"` in [package.json](../../package.json)) |
| **jsdom** (inside Node, during tests) | `src/` + `test/` during `npm test` | **No layout engine**: `scrollHeight` is 0 — see the guard at [JobTracker.jsx#L414-L415](../../src/JobTracker.jsx#L414-L415); `scrollTo` missing — stubbed at [setup.js#L7](../../test/setup.js#L7); `confirm` must be mocked — [JobTracker.test.jsx#L70-L72](../../test/JobTracker.test.jsx#L70-L72) |

The two jsdom accommodations *inside product code and setup* are worth studying: this is
what "the test environment leaks into design" looks like at minimal scale. The
`scrollHeight > 0` guard is defensive coding for a runtime difference; the `scrollTo`
try/catch at [JobTracker.jsx#L561-L565](../../src/JobTracker.jsx#L561-L565) is the same idea.

## Environment variables

None. No secrets, no config. The only "environment detection" is
[storage.js#L11](../../src/storage.js#L11) (`typeof window !== "undefined"`) and the jsdom
guards above.

## One external network dependency

The Google Fonts `@import` at [JobTracker.jsx#L36](../../src/JobTracker.jsx#L36). Offline,
fonts fall back to the system stacks defined at [L29-L31](../../src/JobTracker.jsx#L29-L31).
This is the app's *only* network request — worth saying in an interview when discussing
what "local-first" means concretely.

## Drill

Without looking: which of these breaks under jsdom and how is each handled?
`window.confirm`, `el.scrollHeight`, `window.scrollTo`, `localStorage`.
(Answers above; `localStorage` is the trick — jsdom *does* implement it, which is why
[storage.test.js](../../test/storage.test.js) works unmocked.)
**Solid:** 3/4 with the handling mechanism. **Strong:** 4/4 plus you can articulate the
general rule — *product code should degrade gracefully across runtimes; tests should stub
what the runtime lacks; and you should be able to say which strategy was used where and why*.
